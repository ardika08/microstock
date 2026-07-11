import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '~/server/db/schema-pg'
import { eq } from 'drizzle-orm'
import type { NextApiRequest, NextApiResponse } from 'next'

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions'

// Rate limiting map (in-memory, resets on server restart)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const FAIR_USE_LIMIT = 200 // per day for starter plan
const FAIR_USE_WINDOW = 24 * 60 * 60 * 1000

function checkFairUse(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + FAIR_USE_WINDOW })
    return true
  }
  if (entry.count >= FAIR_USE_LIMIT) return false
  entry.count++
  return true
}

async function callOpenAI(apiKey: string, assetBrief: string, model: string) {
  const systemPrompt = 'You are a metadata assistant for microstock contributors. Output only valid JSON.'
  const textInstruction = [
    'Generate microstock contributor metadata for this digital asset.',
    'Return strict JSON only with this shape:',
    '{"title":"...","description":"...","keywords":[...],"category":"..."}',
    'Rules: description must be 120-190 characters, one sentence, no line breaks. Title under 180 characters. Keywords must contain 45-49 unique relevant microstock search terms. Category must be one of the standard microstock categories.',
  ].join('\n')

  // ✅ Deteksi apakah input adalah base64 image atau teks biasa
  const isBase64Image = assetBrief.startsWith('data:image/')

  let userMessage: any

  if (isBase64Image) {
    // Gunakan Vision API — kirim gambar langsung ke OpenAI
    userMessage = {
      role: 'user',
      content: [
        {
          type: 'text',
          text: textInstruction,
        },
        {
          type: 'image_url',
          image_url: {
            url: assetBrief,
            detail: 'low', // hemat token, cukup untuk metadata
          },
        },
      ],
    }
  } else {
    // Fallback: gunakan teks brief (manual input)
    userMessage = {
      role: 'user',
      content: `${textInstruction}\n\nAsset brief: ${assetBrief || 'A general commercial stock asset.'}`,
    }
  }

  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        userMessage,
      ],
    }),
  })

  const body = await response.json()
  if (!response.ok) {
    throw new Error(body?.error?.message || 'Gagal menghubungi OpenAI API.')
  }

  const content = body?.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('OpenAI tidak mengembalikan konten.')

  // Parse JSON — handle fenced code blocks and bare JSON
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced?.[1] ?? content
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('Respons AI tidak berisi JSON.')
  return JSON.parse(raw.slice(start, end + 1))
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Silakan login terlebih dahulu.' })
  }

  const dbConn = neon(process.env.DATABASE_URL!)
  const db = drizzle(dbConn, { schema })

  // Fetch user record from DB (session data may be stale for credits)
  const users = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, session.user.email))
    .limit(1)

  const user = users[0]
  if (!user) return res.status(404).json({ error: 'User tidak ditemukan.' })

  const { assetBrief, filename, platform, userApiKey } = req.body

  if (!assetBrief) {
    return res.status(400).json({ error: 'Asset brief wajib diisi.' })
  }

  let apiKey: string
  let model: string

  if (user.planType === 'starter' || user.planType === 'free' || user.planType === 'topup') {
    // Server provides the API key for free/topup/starter users (credit-based)
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'Server belum dikonfigurasi dengan API key.' })
    }
    if (user.planType === 'starter' && !checkFairUse(user.id)) {
      return res.status(429).json({ error: 'Batas fair use harian tercapai (200 generate/hari). Coba lagi besok.' })
    }
    // free/topup: check credits
    if ((user.planType === 'free' || user.planType === 'topup') && (user.credits ?? 0) <= 0) {
      return res.status(402).json({ error: 'Kredit habis. Silakan top up kredit.' })
    }
    apiKey = process.env.OPENAI_API_KEY
    model = 'gpt-4o'
  } else {
    // lifetime: pakai API key sendiri
    if (userApiKey && String(userApiKey).startsWith('sk-')) {
      apiKey = String(userApiKey)
    } else {
      const dbUserWithKey = await db
        .select({ openaiApiKey: schema.users.openaiApiKey })
        .from(schema.users)
        .where(eq(schema.users.id, user.id))
        .limit(1)
      if (dbUserWithKey[0]?.openaiApiKey) {
        apiKey = dbUserWithKey[0].openaiApiKey
      } else {
        return res.status(400).json({ error: 'API key OpenAI diperlukan. Tambahkan di halaman Pengaturan.' })
      }
    }
    model = 'gpt-4o'
  }

  try {
    const metadata = await callOpenAI(apiKey, String(assetBrief), model)

    // Deduct 1 credit for free / topup plans
    if (user.planType !== 'starter' && user.planType !== 'lifetime') {
      await db
        .update(schema.users)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .set({
          credits: (user.credits ?? 0) - 1,
          creditsUsed: (user.creditsUsed ?? 0) + 1,
          updatedAt: new Date(),
        } as any)
        .where(eq(schema.users.id, user.id))
    } else if (user.planType === 'starter') {
      // Track usage for starter without deducting credits
      await db
        .update(schema.users)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .set({
          creditsUsed: (user.creditsUsed ?? 0) + 1,
          updatedAt: new Date(),
        } as any)
        .where(eq(schema.users.id, user.id))
    }

    // Persist to history
    await db.insert(schema.generateHistory).values({
      userId: user.id,
      platform: platform || 'web',
      filename: filename || 'unknown',
      title: metadata.title || '',
      creditsUsed: 1,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    return res.status(200).json({
      success: true,
      metadata,
      creditsRemaining:
        user.planType === 'starter' || user.planType === 'lifetime'
          ? null
          : (user.credits ?? 0) - 1,
    })
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Gagal generate metadata.',
    })
  }
}

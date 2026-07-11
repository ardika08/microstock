import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '~/server/db/schema-pg'
import { eq, sql } from 'drizzle-orm'
import type { NextApiRequest, NextApiResponse } from 'next'

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions'
const ALLOWED_ORIGIN = process.env.ACTIVATION_ALLOWED_ORIGIN || ''

function getDb() {
  const client = neon(process.env.DATABASE_URL!)
  return drizzle(client, { schema })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS — izinkan dari extension Chrome (content script atau popup)
  const origin = req.headers.origin || ''
  const isExtension = origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://')
  const isAdobeStock = origin.includes('stock.adobe.com')
  const isShutterstock = origin.includes('shutterstock.com')
  const isAllowed = isExtension || isAdobeStock || isShutterstock || origin === ALLOWED_ORIGIN

  if (origin && !isAllowed) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  res.setHeader('Access-Control-Allow-Origin', origin || ALLOWED_ORIGIN || '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { activationCode, assetBrief, filename, platform } = req.body

  if (!activationCode || typeof activationCode !== 'string') {
    return res.status(401).json({ error: 'Kode aktivasi diperlukan.' })
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'Server belum dikonfigurasi dengan API key.' })
  }

  try {
    const db = getDb()

    // Validasi activation code + ambil user
    const codes = await db
      .select({
        id: schema.activationCodes.id,
        userId: schema.activationCodes.userId,
        status: schema.activationCodes.status,
        planType: schema.activationCodes.planType,
      })
      .from(schema.activationCodes)
      .where(eq(schema.activationCodes.code, activationCode.toUpperCase()))
      .limit(1)

    if (codes.length === 0 || codes[0].status !== 'ACTIVE') {
      return res.status(401).json({ error: 'Kode aktivasi tidak valid atau sudah tidak aktif.' })
    }

    const code = codes[0]

    // Ambil user
    const users = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, code.userId!))
      .limit(1)

    if (users.length === 0) {
      return res.status(401).json({ error: 'User tidak ditemukan.' })
    }

    const user = users[0] as any

    // Cek credits untuk topup/basic/value plan
    if (user.planType !== 'lifetime' && user.planType !== 'starter') {
      const result = await db
        .update(schema.users)
        .set({
          credits: sql`${schema.users.credits} - 1`,
          creditsUsed: sql`${schema.users.creditsUsed} + 1`,
        } as any)
        .where(eq(schema.users.id, user.id))
        .returning({ credits: schema.users.credits })

      if (!result.length || (result[0].credits ?? 0) < 0) {
        // Rollback
        await db
          .update(schema.users)
          .set({ credits: sql`${schema.users.credits} + 1` } as any)
          .where(eq(schema.users.id, user.id))
        return res.status(402).json({ error: 'Kredit habis. Silakan top up kredit.' })
      }
    }

    // Generate metadata via OpenAI Vision API
    const isBase64Image = typeof assetBrief === 'string' && assetBrief.startsWith('data:image/')
    const textInstruction = [
      'Generate microstock contributor metadata for this digital asset.',
      'Return strict JSON only with this shape:',
      '{"title":"...","description":"...","keywords":[...],"category":"..."}',
      'Rules: description must be 120-190 characters, one sentence, no line breaks. Title under 180 characters. Keywords must contain 45-49 unique relevant microstock search terms. Category must be one of the standard microstock categories.',
    ].join('\n')

    const userMessage = isBase64Image
      ? {
          role: 'user',
          content: [
            { type: 'text', text: textInstruction },
            { type: 'image_url', image_url: { url: assetBrief, detail: 'low' } },
          ],
        }
      : {
          role: 'user',
          content: `${textInstruction}\n\nAsset brief: ${assetBrief || filename || 'A general commercial stock asset.'}`,
        }

    const openaiRes = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You are a metadata assistant for microstock contributors. Output only valid JSON.' },
          userMessage,
        ],
      }),
    })

    const openaiBody = await openaiRes.json()
    if (!openaiRes.ok) {
      throw new Error(openaiBody?.error?.message || 'Gagal menghubungi OpenAI API.')
    }

    const content = openaiBody?.choices?.[0]?.message?.content
    if (typeof content !== 'string') {
      throw new Error('OpenAI tidak mengembalikan konten.')
    }

    const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    const raw = fenced?.[1] ?? content
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    const metadata = JSON.parse(raw.slice(start, end + 1))

    // Log ke history
    await db.insert(schema.generateHistory).values({
      userId: user.id,
      platform: platform || 'extension',
      filename: filename || 'unknown',
      title: metadata.title || '',
      creditsUsed: 1,
    } as any)

    return res.status(200).json({
      success: true,
      metadata,
      creditsRemaining: user.planType === 'lifetime' || user.planType === 'starter' ? null : (user.credits ?? 0) - 1,
    })

  } catch (err) {
    console.error('[api/extension/generate]', err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' })
  }
}

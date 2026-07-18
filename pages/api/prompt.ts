import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '~/server/db/schema-pg'
import { eq } from 'drizzle-orm'
import type { NextApiRequest, NextApiResponse } from 'next'

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions'

export const config = { api: { bodyParser: { sizeLimit: '8mb' } } }

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const FAIR_USE_LIMIT = 200
const FAIR_USE_WINDOW = 24 * 60 * 60 * 1000

type PromptStyle = 'general' | 'midjourney' | 'flux' | 'sdxl'

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

function styleInstruction(style: PromptStyle): string {
  switch (style) {
    case 'midjourney':
      return 'Optimize the prompt for Midjourney (natural descriptive language, optional light parameters like --stylize only if useful; do not invent fake seeds).'
    case 'flux':
      return 'Optimize the prompt for Flux / modern diffusion models (clear subject, composition, lighting, materials; avoid Midjourney-only flags).'
    case 'sdxl':
      return 'Optimize the prompt for SDXL (comma-separated descriptors ok, strong visual tokens, lighting, camera).'
    default:
      return 'Write a general high-quality image generation prompt usable across tools.'
  }
}

async function callOpenAIImageToPrompt(
  apiKey: string,
  imageBase64: string,
  model: string,
  style: PromptStyle
) {
  const systemPrompt =
    'You are an expert image-to-prompt engineer for generative AI and microstock workflows. Output only valid JSON.'

  const textInstruction = [
    'Analyze the image and write a detailed English prompt that could recreate a similar image.',
    styleInstruction(style),
    'Return strict JSON only with this shape:',
    '{"prompt":"...","negativePrompt":"...","tags":["..."]}',
    'Rules:',
    '- prompt: 40-120 words, concrete visual details (subject, setting, composition, lighting, colors, style, camera/lens if relevant).',
    '- No markdown, no quotes wrapping the whole prompt, no AI disclaimers.',
    '- Do NOT invent celebrity names, brands, logos, or copyrighted characters.',
    '- negativePrompt: short comma-separated list of quality issues to avoid.',
    '- tags: 5-12 short searchable tags.',
  ].join('\n')

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
        {
          role: 'user',
          content: [
            { type: 'text', text: textInstruction },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64,
                detail: 'low',
              },
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(
      `OpenAI error ${response.status}${errText ? `: ${errText.slice(0, 200)}` : ''}`
    )
  }

  const data = await response.json()
  const content: string = data?.choices?.[0]?.message?.content ?? ''
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced?.[1] ?? content
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('Respons AI tidak berisi JSON.')
  const parsed = JSON.parse(raw.slice(start, end + 1))

  if (!parsed?.prompt || typeof parsed.prompt !== 'string') {
    throw new Error('Respons AI tidak berisi prompt yang valid.')
  }

  return {
    prompt: String(parsed.prompt).trim(),
    negativePrompt:
      typeof parsed.negativePrompt === 'string' ? parsed.negativePrompt.trim() : '',
    tags: Array.isArray(parsed.tags)
      ? parsed.tags.map((t: unknown) => String(t)).filter(Boolean).slice(0, 12)
      : [],
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Silakan login terlebih dahulu.' })
  }

  // Admin-only while testing before public release
  const ADMIN_EMAIL = 'ardika.yudha08@gmail.com'
  if (session.user.email !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Fitur ini masih dalam pengujian internal.' })
  }

  const dbConn = neon(process.env.DATABASE_URL!)
  const db = drizzle(dbConn, { schema })

  const users = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, session.user.email))
    .limit(1)

  const user = users[0]
  if (!user) return res.status(404).json({ error: 'User tidak ditemukan.' })

  const { imageBase64, style: rawStyle, userApiKey, filename } = req.body ?? {}
  const style = (['general', 'midjourney', 'flux', 'sdxl'].includes(rawStyle)
    ? rawStyle
    : 'general') as PromptStyle

  if (!imageBase64 || typeof imageBase64 !== 'string' || !imageBase64.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Gambar wajib diunggah (format data URL image).' })
  }

  // Rough guard: ~8mb body limit already; reject absurd strings early
  if (imageBase64.length > 10 * 1024 * 1024) {
    return res.status(413).json({ error: 'Gambar terlalu besar. Kompres atau gunakan resolusi lebih kecil.' })
  }

  let apiKey: string
  let model: string

  if (user.planType === 'starter' || user.planType === 'free' || user.planType === 'topup') {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'Server belum dikonfigurasi dengan API key.' })
    }
    if (user.planType === 'starter' && !checkFairUse(user.id)) {
      return res
        .status(429)
        .json({ error: 'Batas fair use harian tercapai (200 generate/hari). Coba lagi besok.' })
    }
    if ((user.planType === 'free' || user.planType === 'topup') && (user.credits ?? 0) <= 0) {
      return res.status(402).json({ error: 'Kredit habis. Silakan top up kredit.' })
    }
    apiKey = process.env.OPENAI_API_KEY
    model = 'gpt-4o'
  } else {
    // lifetime: own API key
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
        return res
          .status(400)
          .json({ error: 'API key OpenAI diperlukan. Tambahkan di halaman Pengaturan.' })
      }
    }
    model = 'gpt-4o'
  }

  try {
    const result = await callOpenAIImageToPrompt(apiKey, String(imageBase64), model, style)

    // Deduct only after successful generation
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
      await db
        .update(schema.users)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .set({
          creditsUsed: (user.creditsUsed ?? 0) + 1,
          updatedAt: new Date(),
        } as any)
        .where(eq(schema.users.id, user.id))
    }

    await db.insert(schema.generateHistory).values({
      userId: user.id,
      platform: 'image_prompt',
      filename: filename || 'image-prompt',
      title: result.prompt.slice(0, 180),
      creditsUsed: 1,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    return res.status(200).json({
      success: true,
      prompt: result.prompt,
      negativePrompt: result.negativePrompt,
      tags: result.tags,
      creditsRemaining:
        user.planType === 'starter' || user.planType === 'lifetime'
          ? null
          : (user.credits ?? 0) - 1,
    })
  } catch (error) {
    console.error('[api/prompt]', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Gagal generate prompt dari gambar.',
    })
  }
}

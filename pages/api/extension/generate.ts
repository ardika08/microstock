import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '~/server/db/schema-pg'
import { eq, sql } from 'drizzle-orm'
import type { NextApiRequest, NextApiResponse } from 'next'

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions'
const ALLOWED_ORIGIN = process.env.ACTIVATION_ALLOWED_ORIGIN || ''

const SHUTTERSTOCK_CATEGORIES_STR = [
  "Animals/Wildlife", "Arts", "Backgrounds/Textures", "Buildings/Landmarks",
  "Business/Finance", "Education", "Food and drink", "Healthcare/Medical",
  "Holidays", "Industrial", "Nature", "Objects", "People", "Religion",
  "Science", "Signs/Symbols", "Sports/Recreation", "Technology", "Transportation"
].join(', ')

// ✅ Naikkan body size limit — base64 image bisa 3x ukuran file asli
export const config = { api: { bodyParser: { sizeLimit: '8mb' } } }

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

    // Detect file type from brief or filename
    const briefStr = typeof assetBrief === 'string' ? assetBrief : ''
    const isVideoContent = briefStr.toLowerCase().includes('file type: video') ||
      /\.(mp4|mov|avi|wmv|mkv|webm|m4v)$/i.test(filename || '')
    const isVectorContent = briefStr.toLowerCase().includes('file type: vector') ||
      /\.(eps|svg|ai)$/i.test(filename || '')
    const contentType = isVideoContent ? 'video' : isVectorContent ? 'vector/illustration' : 'photo/image'
    const platformHint = platform?.includes('shutterstock') ? 'Shutterstock' : 'Adobe Stock'

    const textInstruction = [
      `You are a professional microstock metadata expert for ${platformHint}.`,
      `Generate accurate metadata for this ${contentType} asset.`,
      isVideoContent
        ? `IMPORTANT: This is a VIDEO/MOTION file. Describe the actual visual motion, animation style, mood, colors, and use-case of THIS specific video. DO NOT use generic landscape/nature descriptions. The metadata must match the actual video content inferred from the filename and keywords.`
        : isVectorContent
        ? `IMPORTANT: This is a VECTOR/ILLUSTRATION file. Describe the actual design style, elements, and use-case.`
        : '',
      `Return strict JSON only — no extra text, no markdown:`,
      `{"title":"...","description":"...","keywords":[...],"category":"..."}`,
      `STRICT RULES:`,
      `- title: under 180 chars, specific and descriptive of actual content`,
      `- description: 120-190 chars, one sentence, NO line breaks, describes actual ${contentType} content precisely`,
      `- keywords: EXACTLY 50 unique single or multi-word terms relevant to the actual content (not generic)`,
      `- category: MUST be EXACTLY one of these values: ${SHUTTERSTOCK_CATEGORIES_STR}`,
      `- Choose category based on primary subject of the asset, not generic defaults`,
      `- Base everything on the actual filename, keyword suggestions, and content clues — NOT generic templates`,
    ].filter(Boolean).join('\n')

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

    // Text-only brief → gpt-4o for quality. Vision/base64 image → gpt-4o.
    const model = 'gpt-4o'
    const openaiController = new AbortController()
    const openaiTimeout = setTimeout(() => openaiController.abort(), 90_000)

    let openaiRes: Response
    try {
      openaiRes = await fetch(OPENAI_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'You are a metadata assistant for microstock contributors. Output only valid JSON.' },
            userMessage,
          ],
        }),
        signal: openaiController.signal,
      })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('OpenAI timeout. Coba generate lagi.')
      }
      throw err
    } finally {
      clearTimeout(openaiTimeout)
    }

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

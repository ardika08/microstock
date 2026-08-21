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

async function generateOpenAIPrompt(contentType: string, platformHint: string): Promise<{systemPrompt: string; userInstruction: string}> {
  return {
    systemPrompt: `You are a professional microstock contributor specializing in analyzing images and writing accurate metadata based SOLELY on what you see in the image. 

CRITICAL RULES:
1. NEVER invent or hallucinate content not visible in the image
2. Only describe objects, colors, text, people, landscapes, etc. that are actually present
3. If something is unclear, use generic terms like "abstract background", "blurred foreground"
4. Description must be factual - no assumptions about context outside frame
5. If image contains text, quote it exactly as shown
6. Keywords MUST match what's actually visible

DO NOT guess:
- The photographer's intent
- Locations not clearly identifiable  
- Brand names unless explicitly visible
- Hidden meanings or symbolism
- Information beyond the frame`,
    
    userInstruction: [
      `Generate microstock metadata for this ${contentType} asset with STRICT visual analysis.`,
      `Return EXACTLY valid JSON only: {"title":"...","description":"...","keywords":[...],"category":"..."}`,
      '',
      'SPECIFIC REQUIREMENTS:',
      `- title: 5-15 words, under 180 chars, describes MAIN subject VISIBLE in image`,
      `- description: ONE sentence ONLY, 120-190 chars, FACTUAL description of what you ACTUALLY SEE`,
      `- keywords: 45-49 unique search terms ALL BASED ON VISIBLE ELEMENTS in the image`,
      `- category: Choose from: ${SHUTTERSTOCK_CATEGORIES_STR}`,
      '',
      'IMPORTANT: For ${contentType}, focus on VISIBLE details only - style, composition, colors, elements present.',
      'IF IMAGE IS BLURRY/DARK/UNCLEAR: Use honest language like "blurred", "dim lighting", "out of focus" - DO NOT invent precise details.',
      ''
    ].filter(Boolean).join('\n')
  }
}

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
    
    // Generate optimized prompt with strict hallucination prevention
    const { systemPrompt, userInstruction } = await generateOpenAIPrompt(contentType, platformHint)

    const userMessage = isBase64Image
      ? {
          role: 'user',
          content: [
            { type: 'text', text: userInstruction },
            { type: 'image_url', image_url: { url: assetBrief, detail: 'high' } }, // HIGH detail untuk akurasi maksimal
          ],
        }
      : {
          role: 'user',
          content: `${userInstruction}\n\nAsset brief: ${assetBrief || filename || 'A general commercial stock asset.'}`,
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
          temperature: 0, // MINIMAL temp untuk akurasi maksimal
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
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

    // Parse JSON — handle fenced code blocks and bare JSON
    let rawContent = content
    
    // Try regex first for fenced code blocks
    const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenced && fenced[1]) {
      rawContent = fenced[1]
    }
    
    // Extract JSON object
    const start = rawContent.indexOf('{')
    const end = rawContent.lastIndexOf('}')
    if (start === -1 || end === -1) {
      console.error('[extension/generate] No JSON found in response:', rawContent.substring(0, 200))
      throw new Error(`Respons AI tidak berisi JSON. Received: ${rawContent.substring(0, 200)}`)
    }
    
    let jsonStr
    try {
      jsonStr = rawContent.slice(start, end + 1)
      
      const metadata = JSON.parse(jsonStr)
      
      // Validate structure
      if (!metadata.title || !metadata.description || !Array.isArray(metadata.keywords) || !metadata.category) {
        console.error('[extension/generate] Invalid metadata structure:', metadata)
        throw new Error('Format metadata tidak lengkap (missing title/description/keywords/category)')
      }
      
      // Validate keyword count
      if (metadata.keywords.length < 45 || metadata.keywords.length > 49) {
        console.warn('[extension/generate] Keyword count warning:', metadata.keywords.length, 'keywords')
        if (metadata.keywords.length < 45) {
          const extraKeywords = ['commercial', 'stock photo', 'microstock']
          while (metadata.keywords.length < 45 && extraKeywords.length > 0) {
            metadata.keywords.push(extraKeywords.shift())
          }
        } else {
          metadata.keywords = metadata.keywords.slice(0, 49)
        }
      }
      
      // Log ke history before returning
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
      
    } catch (parseError: any) {
      console.error('[extension/generate] JSON parse error:', parseError.message)
      console.error('[extension/generate] Raw content received:', rawContent.substring(0, 500))
      throw new Error(`Parsing metadata gagal: ${parseError.message}. Response: ${jsonStr.substring(0, 200)}`)
    }
  } catch (err) {
    console.error('[api/extension/generate]', err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' })
  }
}

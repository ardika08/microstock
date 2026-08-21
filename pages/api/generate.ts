import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '~/server/db/schema-pg'
import { eq } from 'drizzle-orm'
import type { NextApiRequest, NextApiResponse } from 'next'

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions'

// ✅ Naikkan body size limit — base64 image bisa 3x ukuran file asli
export const config = { api: { bodyParser: { sizeLimit: '8mb' } } }

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
  const systemPrompt = `You are a professional microstock contributor specializing in analyzing images and writing accurate metadata based SOLELY on what you see in the image. 

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
- Information beyond the frame`
  
  const textInstruction = [
    'Analyze this image and generate microstock metadata.',
    'Return strict JSON only with this EXACT shape:',
    '{"title":"...","description":"...","keywords":[...],\n"category":"..."}',
    '',
    'SPECIFIC REQUIREMENTS:',
    '- Title: 5-15 words, under 180 characters, describes main subject',
    '- Description: Exactly ONE sentence, 120-190 characters, FACTUAL only',
    '- Keywords: 45-49 unique search terms ALL visible in image',
    '- Category: Choose from: ["people", "animals", "nature", "business", "technology", "food", "travel", "education", "healthcare", "sports", "entertainment", "transportation", "architecture", "lifestyle"]',
    '',
    'IF IMAGE IS BLURRY/OVERCAST/DARK:',
    '- Use descriptive but honest language: "blurred background", "dim lighting", "out of focus"'
    '- Do NOT force precise details if you cannot see them clearly',
    ''
  ].join('\n')
  
  // ✅ Deteksi apakah input adalah base64 image atau teks biasa
  const isBase64Image = assetBrief.startsWith('data:image/')
  
  let userMessage: any
  
  if (isBase64Image) {
    // Gunakan Vision API dengan high detail untuk akurasi maksimal
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
            detail: 'high', // HIGH detail for maximum accuracy
          },
        },
      ],
    }
  } else {
    // Fallback: gunakan teks brief (manual input)
    userMessage = {
      role: 'user',
      content: `${textInstruction}\n\nAsset description: ${assetBrief || 'A general commercial stock asset.'}`,
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
      temperature: 0, // MINIMAL temp untuk akurasi maksimal
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
    throw new Error(`Respons AI tidak berisi JSON. Received: ${rawContent.substring(0, 200)}`)
  }
  
  let jsonStr
  try {
    jsonStr = rawContent.slice(start, end + 1)
    
    // ✅ Robust validation - parse dengan error handling lengkap
    const metadata = JSON.parse(jsonStr)
    
    // Validate structure
    if (!metadata.title || !metadata.description || !Array.isArray(metadata.keywords) || !metadata.category) {
      console.error('[generate] Invalid metadata structure:', metadata)
      throw new Error('Format metadata tidak lengkap (missing title/description/keywords/category)')
    }
    
    // Validate keyword count
    if (metadata.keywords.length < 45 || metadata.keywords.length > 49) {
      console.warn('[generate] Keyword count warning:', metadata.keywords.length, 'keywords')
      // Auto-adjust to acceptable range by padding or trimming
      if (metadata.keywords.length < 45) {
        const extraKeywords = ['commercial', 'stock photo', 'microstock']
        while (metadata.keywords.length < 45 && extraKeywords.length > 0) {
          metadata.keywords.push(extraKeywords.shift())
        }
      } else {
        metadata.keywords = metadata.keywords.slice(0, 49)
      }
    }
    
    return metadata
    
  } catch (parseError: any) {
    console.error('[generate] JSON parse error:', parseError.message)
    console.error('[generate] Raw content received:', rawContent.substring(0, 500))
    throw new Error(`Parsing metadata gagal: ${parseError.message}. Response: ${jsonStr.substring(0, 200)}`)
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

  // Credit-based plans: server provides API key
  const isCreditPlan = ['starter', 'free', 'topup', 'intro', 'basic', 'value'].includes(user.planType)

  if (isCreditPlan) {
    // Server provides the API key for credit-based users
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'Server belum dikonfigurasi dengan API key.' })
    }
    if (user.planType === 'starter' && !checkFairUse(user.id)) {
      return res.status(429).json({ error: 'Batas fair use harian tercapai (200 generate/hari). Coba lagi besok.' })
    }
    // free/topup/intro/basic/value: check credits
    if (user.planType !== 'starter' && (user.credits ?? 0) <= 0) {
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
        .select({ openaiApiKey: schema...iKey })
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

    // Deduct 1 credit for credit-based plans (not starter/lifetime)
    if (!['starter', 'lifetime'].includes(user.planType)) {
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

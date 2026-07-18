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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface PromptResult {
  prompt: string
  negativePrompt: string
  tags: string[]
  variants?: string[]
}

function extractPromptFields(content: string): PromptResult {
  const text = (content || '').trim()
  if (!text) throw new Error('Respons AI kosong.')

  // 1) fenced json
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidates: string[] = []
  if (fenced?.[1]) candidates.push(fenced[1].trim())
  candidates.push(text)

  // 2) raw object slice
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end > start) candidates.push(text.slice(start, end + 1))

  for (const raw of candidates) {
    try {
      const parsed = JSON.parse(raw)
      const prompt =
        typeof parsed?.prompt === 'string'
          ? parsed.prompt
          : typeof parsed?.image_prompt === 'string'
            ? parsed.image_prompt
            : typeof parsed?.description === 'string'
              ? parsed.description
              : ''
      if (!prompt.trim()) continue

      const negativePrompt =
        typeof parsed?.negativePrompt === 'string'
          ? parsed.negativePrompt
          : typeof parsed?.negative_prompt === 'string'
            ? parsed.negative_prompt
            : ''

      const tags = Array.isArray(parsed?.tags)
        ? parsed.tags.map((t: unknown) => String(t)).filter(Boolean).slice(0, 12)
        : []

      // Extract variants array
      let variants: string[] = []
      if (Array.isArray(parsed?.variants)) {
        variants = parsed.variants
          .map((v: unknown) => (typeof v === 'string' ? v.trim() : ''))
          .filter(Boolean)
          .slice(0, 3)
      }

      return {
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim(),
        tags,
        variants,
      }
    } catch {
      // try next candidate
    }
  }

  // 3) fallback: plain text prompt (no JSON)
  let plain = text
    .replace(/^```(?:json|text)?/i, '')
    .replace(/```$/i, '')
    .replace(/^(prompt|image prompt)\s*:\s*/i, '')
    .trim()

  const soft = plain.match(/"prompt"\s*:\s*"((?:\\.|[^"\\])*)"/i)
  if (soft?.[1]) {
    plain = soft[1].replace(/\\n/g, ' ').replace(/\\"/g, '"').trim()
  }

  if (!plain || (plain.startsWith('{') && plain.endsWith('}') && plain.length < 40)) {
    throw new Error('Respons AI tidak berisi prompt yang valid.')
  }

  return {
    prompt: plain.replace(/\s+/g, ' ').slice(0, 800).trim(),
    negativePrompt: '',
    tags: [],
    variants: [],
  }
}

async function callOpenAIImageToPrompt(
  apiKey: string,
  imageBase64: string,
  model: string,
  attempt = 1
): Promise<PromptResult> {
  const useJsonObject = attempt === 1
  const imageDetail = attempt === 1 ? 'low' : 'auto'

  const systemPrompt = useJsonObject
    ? 'You are an expert microstock prompt engineer. You specialize in writing prompts that faithfully reproduce the SAME subject, style, and mood of a reference image — while making just enough subtle changes (slight angle shift, minor prop addition/removal, small framing difference) to avoid being flagged as "similar" by Adobe Stock similarity detection. You produce images that look like they belong to the SAME photoshoot series. Always return valid JSON only.'
    : 'You are an expert microstock prompt engineer. You write prompts that faithfully describe images while making subtle variations to avoid stock similarity flags.'

  const textInstruction = useJsonObject
    ? [
        'Analyze this reference image carefully. Write a HIGHLY DETAILED prompt that reproduces approximately 80% of this image faithfully — same subject, same style, same mood, same color palette, same general composition — while introducing only 20% subtle variation to avoid Adobe Stock similarity detection.',
        '',
        'FAITHFULNESS rules (keep 80% the same):',
        '- KEEP the exact same main subject (if it is a calendar, prompt a calendar — not a tablet/phone)',
        '- KEEP the same overall color palette and mood',
        '- KEEP the same general style (vintage stays vintage, modern stays modern)',
        '- KEEP the same type of lighting (warm stays warm, cool stays cool)',
        '- KEEP the same medium/feel (photo stays photo, illustration stays illustration)',
        '- KEEP similar props and context elements',
        '- Describe the subject with PRECISE detail matching the reference',
        '',
        'VARIATION rules (change only 20% — subtle differences):',
        '- Shift camera angle SLIGHTLY (5-15 degrees, not 180°)',
        '- Adjust framing/crop minimally (slightly tighter or wider)',
        '- Add or remove 1-2 small background/foreground details',
        '- Shift color temperature SLIGHTLY (not warm→cool, just warm→slightly warmer)',
        '- Change a minor texture detail (e.g. wood grain direction, paper texture)',
        '- Adjust depth of field subtly (slightly more or less bokeh)',
        '- Think of it as "the next frame in the same photoshoot" — NOT a different photoshoot',
        '',
        'Return a single JSON object with this exact shape:',
        '{"prompt":"...","negativePrompt":"...","tags":["..."],"variants":["...","...","..."]}',
        '',
        'Field rules:',
        '- prompt: 150-250 words. HIGHLY DETAILED faithful reproduction with subtle variation. Describe: exact subject (matching reference closely), precise camera angle (close to reference but slightly shifted), lighting setup (matching reference mood), environment/background (same feel, minor detail changes), textures and materials (as seen in reference), color palette (matching reference), composition (similar framing with micro-adjustment). Write as one flowing dense paragraph.',
        '- negativePrompt: 20-40 words. Elements that would make it look TOO different from reference or generic/cliché.',
        '- tags: 10-20 highly searchable microstock keywords matching the reference concept.',
        '- variants: exactly 3 alternative prompts (each 100-150 words). Each variant is STILL 80% faithful to the reference but with a DIFFERENT subtle 20% variation — one might shift angle slightly left, another might change time of day slightly, another might adjust one prop. All variants should look like they belong to the SAME series/photoshoot as the reference.',
        '',
        'Additional rules:',
        '- Do NOT invent celebrity names, brands, logos, or copyrighted characters.',
        '- Do NOT add tool-specific flags (--ar, --stylize, --v).',
        '- No markdown fences, no commentary outside JSON.',
        '- Every prompt must produce images commercially viable for microstock.',
        '- Describe textures, materials, and surfaces accurately as seen in reference.',
        '- Include atmospheric details that MATCH the reference mood.',
        '- The result should look like a SIBLING of the reference, not a distant cousin.',
      ].join('\n')
    : [
        'Analyze this reference image. Write a HIGHLY DETAILED prompt (150-250 words) that reproduces 80% of this image faithfully (same subject, style, mood, palette) while introducing only 20% subtle variation (slight angle shift, minor detail change).',
        'Keep: same subject, same palette, same mood, same style, same props.',
        'Vary: slight camera shift, minor crop change, 1-2 small detail additions/removals.',
        'The result should look like the next frame from the same photoshoot.',
        'Write as one dense flowing paragraph. No JSON, no markdown, no labels.',
        'Do NOT invent celebrity names, brands, logos, or copyrighted characters.',
      ].join('\n')

  const body: Record<string, unknown> = {
    model,
    temperature: attempt === 1 ? 0.3 : 0.2,
    max_tokens: 2000,
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
              detail: imageDetail,
            },
          },
        ],
      },
    ],
  }

  if (useJsonObject) {
    body.response_format = { type: 'json_object' }
  }

  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    // Retry transient OpenAI errors
    if ((response.status === 429 || response.status >= 500) && attempt < 3) {
      await sleep(1200 * attempt)
      return callOpenAIImageToPrompt(apiKey, imageBase64, model, attempt + 1)
    }
    throw new Error(
      `OpenAI error ${response.status}${errText ? `: ${errText.slice(0, 200)}` : ''}`
    )
  }

  const data = await response.json()
  const choice = data?.choices?.[0]
  const message = choice?.message ?? {}
  const finishReason = choice?.finish_reason ?? data?.choices?.[0]?.finish_reason
  const refusal =
    typeof message.refusal === 'string' && message.refusal.trim()
      ? message.refusal.trim()
      : ''

  // content can be string or (rarely) array of parts
  let content = ''
  if (typeof message.content === 'string') {
    content = message.content
  } else if (Array.isArray(message.content)) {
    content = message.content
      .map((part: { type?: string; text?: string }) =>
        typeof part?.text === 'string' ? part.text : ''
      )
      .join('\n')
      .trim()
  }

  if (refusal) {
    console.error('[api/prompt] model refusal:', refusal.slice(0, 200))
    if (attempt < 3) {
      await sleep(600 * attempt)
      return callOpenAIImageToPrompt(apiKey, imageBase64, model, attempt + 1)
    }
    throw new Error(`Model menolak memproses gambar: ${refusal.slice(0, 160)}`)
  }

  if (finishReason === 'content_filter') {
    throw new Error('Gambar diblokir content filter OpenAI. Coba gambar lain.')
  }

  if (!content.trim()) {
    console.error('[api/prompt] empty content meta:', {
      finishReason,
      hasChoices: Array.isArray(data?.choices),
      choiceKeys: choice ? Object.keys(choice) : [],
      messageKeys: message ? Object.keys(message) : [],
      model: data?.model,
      usage: data?.usage,
    })

    if (attempt < 3) {
      await sleep(700 * attempt)
      return callOpenAIImageToPrompt(apiKey, imageBase64, model, attempt + 1)
    }
    throw new Error(
      `Respons AI kosong${finishReason ? ` (finish_reason: ${finishReason})` : ''}. Coba lagi atau ganti gambar.`
    )
  }

  try {
    return extractPromptFields(content)
  } catch (err) {
    if (attempt < 3) {
      await sleep(700 * attempt)
      return callOpenAIImageToPrompt(apiKey, imageBase64, model, attempt + 1)
    }
    console.error('[api/prompt] unparseable content sample:', String(content).slice(0, 300))
    throw err
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

  const { imageBase64, userApiKey, filename } = req.body ?? {}

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
    const result = await callOpenAIImageToPrompt(apiKey, String(imageBase64), model)

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
      variants: result.variants || [],
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

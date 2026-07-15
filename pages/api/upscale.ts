import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '~/server/db/schema-pg'
import { eq } from 'drizzle-orm'
import type { NextApiRequest, NextApiResponse } from 'next'

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }

const ADMIN_EMAIL = 'ardika.yudha08@gmail.com'

const MODELS = {
  standard: {
    version: 'nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa',
    input: (imageUrl: string) => ({ image: imageUrl, scale: 4, face_enhance: false }),
    credits: 2,
  },
  premium: {
    version: 'philz1337x/clarity-upscaler:dfad41707589d68ecdccd1dfa600d55a208f9310748e44bfe35b4a6291453d5e',
    input: (imageUrl: string) => ({
      image: imageUrl,
      scale_factor: 2,
      prompt: 'masterpiece, best quality, highres',
    }),
    credits: 5,
  },
}

function getDb() {
  const client = neon(process.env.DATABASE_URL!)
  return drizzle(client, { schema })
}

async function pollReplicate(
  predictionId: string,
  token: string,
  maxWait = 120000
): Promise<string> {
  const start = Date.now()
  while (Date.now() - start < maxWait) {
    await new Promise((r) => setTimeout(r, 3000))
    const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (data.status === 'succeeded') {
      const output = Array.isArray(data.output) ? data.output[0] : data.output
      return output
    }
    if (data.status === 'failed' || data.status === 'canceled') {
      throw new Error(data.error || 'Upscaling gagal di Replicate.')
    }
  }
  throw new Error('Timeout: upscaling memakan waktu terlalu lama.')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) return res.status(401).json({ error: 'Silakan login terlebih dahulu.' })

  // Admin only check untuk sekarang
  if (session.user.email !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Fitur ini belum tersedia untuk umum.' })
  }

  const { imageBase64, tier = 'standard' } = req.body
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 wajib diisi.' })
  if (!['standard', 'premium'].includes(tier))
    return res.status(400).json({ error: 'Tier tidak valid.' })

  const model = MODELS[tier as 'standard' | 'premium']
  const replicateToken = process.env.REPLICATE_API_TOKEN!

  const db = getDb()
  const users = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, session.user.email))
    .limit(1)
  if (!users[0]) return res.status(404).json({ error: 'User tidak ditemukan.' })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = users[0] as any

  // Cek credits untuk non-lifetime (admin is lifetime, skip check)
  if (user.planType !== 'lifetime' && session.user.email !== ADMIN_EMAIL) {
    const credits = user.credits ?? 0
    if (credits < model.credits) {
      return res.status(402).json({
        error: `Kredit tidak cukup. Butuh ${model.credits} kredit, kamu punya ${credits} kredit.`,
      })
    }
  }

  try {
    // Kirim ke Replicate dengan Prefer: wait (sync jika selesai < 60s)
    const prediction = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${replicateToken}`,
        'Content-Type': 'application/json',
        Prefer: 'wait',
      },
      body: JSON.stringify({
        version: model.version,
        input: model.input(imageBase64),
      }),
    })

    const predData = await prediction.json()
    if (!predData.id) throw new Error(predData.detail || 'Gagal membuat prediction di Replicate.')

    let outputUrl: string
    if (predData.status === 'succeeded') {
      outputUrl = Array.isArray(predData.output) ? predData.output[0] : predData.output
    } else {
      outputUrl = await pollReplicate(predData.id, replicateToken)
    }

    // Fetch hasil dan convert ke base64 untuk di-download di frontend
    const imgRes = await fetch(outputUrl)
    const imgBuffer = await imgRes.arrayBuffer()
    const imgBase64Out = `data:image/png;base64,${Buffer.from(imgBuffer).toString('base64')}`

    // Deduct credits (skip untuk admin)
    if (user.planType !== 'lifetime' && session.user.email !== ADMIN_EMAIL) {
      await db
        .update(schema.users)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .set({ credits: (user.credits ?? 0) - model.credits } as any)
        .where(eq(schema.users.id, user.id))
    }

    // Log ke generate_history
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.insert(schema.generateHistory).values({
      userId: user.id,
      filename: `upscale-${tier}-${Date.now()}.png`,
      title: `Upscale ${tier}`,
      platform: 'web',
      creditsUsed: model.credits,
    } as any)

    const creditsRemaining =
      user.planType === 'lifetime' || session.user.email === ADMIN_EMAIL
        ? null
        : (user.credits ?? 0) - model.credits

    return res.status(200).json({ upscaledImageBase64: imgBase64Out, creditsRemaining })
  } catch (err: unknown) {
    console.error('[upscale] Error:', err)
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat upscaling.'
    return res.status(500).json({ error: message })
  }
}

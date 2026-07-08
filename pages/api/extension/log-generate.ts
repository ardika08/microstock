import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '~/server/db/schema-pg'
import { eq, sql } from 'drizzle-orm'
import type { NextApiRequest, NextApiResponse } from 'next'

function getDb() {
  const sql = neon(process.env.DATABASE_URL!)
  return drizzle(sql, { schema })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ✅ CORS — wajib ada ACTIVATION_ALLOWED_ORIGIN, tidak ada fallback ke wildcard
  const origin = req.headers.origin || ''
  const allowedOrigin = process.env.ACTIVATION_ALLOWED_ORIGIN || ''

  if (!allowedOrigin) {
    console.error('[log-generate] ACTIVATION_ALLOWED_ORIGIN env var not set')
    return res.status(500).json({ error: 'Server misconfiguration' })
  }

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }

  if (origin && origin !== allowedOrigin) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin)

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { activationCode, platform, filename, title } = req.body

  if (!activationCode) {
    return res.status(400).json({ error: 'Activation code required' })
  }

  // ✅ Sanitasi input — batasi panjang dan karakter
  const safePlatform = String(platform || 'extension').slice(0, 50)
  const safeFilename = String(filename || 'unknown').slice(0, 255)
  const safeTitle = String(title || '').slice(0, 500)

  try {
    const db = getDb()

    // Find activation code in PostgreSQL
    const codes = await db.select().from(schema.activationCodes)
      .where(eq(schema.activationCodes.code, activationCode)).limit(1)

    if (!codes[0] || !codes[0].userId) {
      return res.status(401).json({ error: 'Kode aktivasi tidak valid' })
    }

    const userId = codes[0].userId

    // Get user
    const users = await db.select().from(schema.users)
      .where(eq(schema.users.id, userId)).limit(1)

    if (!users[0]) {
      return res.status(404).json({ error: 'User tidak ditemukan' })
    }

    const user = users[0]

    // ✅ Atomic credit deduction — cegah double-spend pada concurrent requests
    // Gunakan SQL-level decrement dengan guard credits > 0
    if (user.planType !== 'starter' && user.planType !== 'lifetime') {
      if ((user.credits ?? 0) <= 0) {
        return res.status(402).json({ error: 'Kredit habis. Silakan top up.' })
      }
      // Atomic: decrement hanya jika credits > 0, cek di level DB
      const result = await db.execute(
        sql`UPDATE users SET credits = credits - 1, credits_used = COALESCE(credits_used, 0) + 1 WHERE id = ${userId} AND credits > 0 RETURNING credits`
      )
      // Jika 0 rows ter-update berarti kredit sudah habis (concurrent request)
      if (!result.rows || result.rows.length === 0) {
        return res.status(402).json({ error: 'Kredit habis. Silakan top up.' })
      }
    } else {
      // Starter/lifetime: just increment creditsUsed for tracking
      await db.update(schema.users)
        .set({ creditsUsed: (user.creditsUsed ?? 0) + 1 } as any)
        .where(eq(schema.users.id, userId))
    }

    // Save to generate_history — gunakan variabel safe yang sudah disanitasi
    await db.insert(schema.generateHistory).values({
      userId,
      platform: safePlatform,
      filename: safeFilename,
      title: safeTitle,
      creditsUsed: 1,
    } as any)

    const creditsRemaining = user.planType === 'starter' || user.planType === 'lifetime'
      ? null
      : (user.credits ?? 1) - 1

    return res.status(200).json({
      success: true,
      creditsRemaining
    })

  } catch (err) {
    console.error('[log-generate] Error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

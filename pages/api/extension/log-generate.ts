import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '~/server/db/schema-pg'
import { eq, sql } from 'drizzle-orm'
import type { NextApiRequest, NextApiResponse } from 'next'

function getDb() {
  const client = neon(process.env.DATABASE_URL!)
  return drizzle(client, { schema })
}

function isAllowedOrigin(origin: string) {
  if (!origin) return true
  if (origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://')) return true
  if (origin.includes('stock.adobe.com')) return true
  if (origin.includes('shutterstock.com')) return true
  const allowed = process.env.ACTIVATION_ALLOWED_ORIGIN || ''
  if (allowed && origin === allowed) return true
  if (origin.includes('autofillstock.my.id')) return true
  return false
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin || ''

  if (origin && !isAllowedOrigin(origin)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  // Reflect allowed origin so content-script requests from Adobe/Shutterstock work
  res.setHeader('Access-Control-Allow-Origin', origin || process.env.ACTIVATION_ALLOWED_ORIGIN || '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { activationCode, platform, filename, title } = req.body

  if (!activationCode) {
    return res.status(400).json({ error: 'Activation code required' })
  }

  const safePlatform = String(platform || 'extension').slice(0, 50)
  const safeFilename = String(filename || 'unknown').slice(0, 255)
  const safeTitle = String(title || '').slice(0, 500)

  try {
    const db = getDb()

    const codes = await db
      .select()
      .from(schema.activationCodes)
      .where(eq(schema.activationCodes.code, String(activationCode).toUpperCase()))
      .limit(1)

    if (!codes[0] || !codes[0].userId) {
      return res.status(401).json({ error: 'Kode aktivasi tidak valid' })
    }

    const userId = codes[0].userId

    const users = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1)
    if (!users[0]) {
      return res.status(404).json({ error: 'User tidak ditemukan' })
    }

    const user = users[0]

    // ⚠️ Credit sudah dipotong di /api/extension/generate.
    // Endpoint ini HANYA log history (tanpa potong kredit lagi).
    await db.insert(schema.generateHistory).values({
      userId,
      platform: safePlatform,
      filename: safeFilename,
      title: safeTitle,
      creditsUsed: 0,
    } as any)

    // Soft tracking only for starter/lifetime usage counter
    if (user.planType === 'starter' || user.planType === 'lifetime') {
      await db
        .update(schema.users)
        .set({ creditsUsed: sql`COALESCE(${schema.users.creditsUsed}, 0) + 1` } as any)
        .where(eq(schema.users.id, userId))
    }

    return res.status(200).json({
      success: true,
      creditsRemaining:
        user.planType === 'starter' || user.planType === 'lifetime' ? null : user.credits ?? 0,
    })
  } catch (err) {
    console.error('[log-generate] Error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

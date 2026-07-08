import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '~/server/db/schema-pg'
import { eq } from 'drizzle-orm'
import type { NextApiRequest, NextApiResponse } from 'next'

function getDb() {
  const sql = neon(process.env.DATABASE_URL!)
  return drizzle(sql, { schema })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' })

  const db = getDb()
  const users = await db.select().from(schema.users)
    .where(eq(schema.users.email, session.user.email)).limit(1)

  if (!users[0]) return res.status(404).json({ error: 'User not found' })

  if (req.method === 'GET') {
    // Return masked key for display (only show last 4 chars)
    const key = users[0].openaiApiKey
    return res.status(200).json({
      hasKey: !!key,
      maskedKey: key ? `sk-...${key.slice(-4)}` : null
    })
  }

  if (req.method === 'POST') {
    const { apiKey } = req.body
    if (!apiKey || !String(apiKey).startsWith('sk-')) {
      return res.status(400).json({ error: 'API key tidak valid' })
    }
    await db.update(schema.users)
      .set({ openaiApiKey: String(apiKey).trim() } as any)
      .where(eq(schema.users.id, users[0].id))
    return res.status(200).json({ success: true })
  }

  if (req.method === 'DELETE') {
    await db.update(schema.users)
      .set({ openaiApiKey: null } as any)
      .where(eq(schema.users.id, users[0].id))
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

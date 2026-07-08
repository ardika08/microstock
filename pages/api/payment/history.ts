import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '~/server/db/schema-pg'
import { eq, desc } from 'drizzle-orm'
import type { NextApiRequest, NextApiResponse } from 'next'

function getDb() {
  const sql = neon(process.env.DATABASE_URL!)
  return drizzle(sql, { schema })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const db = getDb()
    const users = await db.select().from(schema.users)
      .where(eq(schema.users.email, session.user.email)).limit(1)

    if (!users[0]) return res.status(404).json({ error: 'User not found' })

    const payments = await db.select()
      .from(schema.payments)
      .where(eq(schema.payments.userId, users[0].id))
      .orderBy(desc(schema.payments.createdAt))
      .limit(20)

    return res.status(200).json({ payments })
  } catch (err) {
    console.error('[api/payment/history]', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

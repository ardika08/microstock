import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '~/server/db/schema-pg'
import { eq, desc } from 'drizzle-orm'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' })

  const dbConn = neon(process.env.DATABASE_URL!)
  const db = drizzle(dbConn, { schema })

  const users = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, session.user.email))
    .limit(1)

  if (!users[0]) return res.status(404).json({ error: 'User not found' })

  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = 20
  const offset = (page - 1) * limit

  const history = await db
    .select()
    .from(schema.generateHistory)
    .where(eq(schema.generateHistory.userId, users[0].id))
    .orderBy(desc(schema.generateHistory.createdAt))
    .limit(limit)
    .offset(offset)

  return res.status(200).json({ history, page })
}

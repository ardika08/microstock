import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '~/server/db/schema-pg'
import { eq } from 'drizzle-orm'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const sql = neon(process.env.DATABASE_URL!)
  const db = drizzle(sql, { schema })

  // GET — ambil data user
  if (req.method === 'GET') {
    try {
      const user = await db.select().from(schema.users)
        .where(eq(schema.users.email, session.user.email)).limit(1)

      if (!user[0]) {
        return res.status(404).json({ error: 'User not found' })
      }

      return res.status(200).json({
        id: user[0].id,
        email: user[0].email,
        name: user[0].name,
        image: user[0].image,
        credits: user[0].credits,
        creditsUsed: user[0].creditsUsed,
        planType: user[0].planType,
        isActive: user[0].isActive,
        createdAt: user[0].createdAt,
      })
    } catch (err) {
      console.error('[api/user/me GET]', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  // PATCH — update nama user
  if (req.method === 'PATCH') {
    try {
      const { name } = req.body

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Nama tidak boleh kosong' })
      }

      const sanitizedName = name.trim().slice(0, 100)

      await db.update(schema.users)
        .set({ name: sanitizedName } as any)
        .where(eq(schema.users.email, session.user.email))

      return res.status(200).json({ success: true, name: sanitizedName })
    } catch (err) {
      console.error('[api/user/me PATCH]', err)
      return res.status(500).json({ error: 'Gagal menyimpan profil' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

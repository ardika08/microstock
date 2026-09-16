import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '~/server/db/schema-pg'
import { eq } from 'drizzle-orm'
import type { NextApiRequest, NextApiResponse } from 'next'

const ADMIN_EMAIL = 'ardika.yudha08@gmail.com'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' })
  if (session.user.email !== ADMIN_EMAIL) return res.status(403).json({ error: 'Forbidden' })

  const { id } = req.query
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'User ID diperlukan' })
  }

  // Cegah admin menghapus dirinya sendiri — cek via email di bawah

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const db = drizzle(sql, { schema })

    // Cek user ada
    const [user] = await db.select({ id: schema.users.id, email: schema.users.email })
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1)

    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan' })
    }

    // Cegah hapus admin
    if (user.email === ADMIN_EMAIL) {
      return res.status(400).json({ error: 'Tidak bisa menghapus akun admin' })
    }

    // Hapus user (cascade akan hapus accounts, sessions, generate_history, payments)
    await db.delete(schema.users).where(eq(schema.users.id, id))

    return res.status(200).json({ success: true, message: 'User berhasil dihapus' })
  } catch (err) {
    console.error('[admin/users/delete]', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

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

async function generateActivationCode(): Promise<string> {
  const { randomBytes } = await import('crypto')
  const seg = () => randomBytes(3).toString('hex').toUpperCase()
  return `ASAF-${seg()}-${seg()}`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const db = getDb()
    const users = await db.select().from(schema.users)
      .where(eq(schema.users.email, session.user.email)).limit(1)

    if (!users[0]) return res.status(404).json({ code: null })

    const user = users[0]

    // Get most recent ACTIVE activation code for this user
    const codes = await db.select().from(schema.activationCodes)
      .where(eq(schema.activationCodes.userId, user.id))
      .orderBy(desc(schema.activationCodes.createdAt))
      .limit(5)

    // Return first ACTIVE code, or most recent code regardless of status
    let activeCode = codes.find(c => c.status === 'ACTIVE') || codes[0] || null

    // Jika user FREE dan belum punya activation code, buat otomatis
    if (!activeCode && user.planType === 'free') {
      const newCode = await generateActivationCode()
      await db.insert(schema.activationCodes).values({
        code: newCode,
        userId: user.id,
        status: 'ACTIVE',
        planType: 'free',
      } as any)
      console.log('[api/user/activation-code] Auto-generated code for FREE user:', session.user.email, newCode)
      
      return res.status(200).json({
        code: newCode,
        status: 'ACTIVE',
        planType: 'free'
      })
    }

    return res.status(200).json({
      code: activeCode?.code ?? null,
      status: activeCode?.status ?? null,
      planType: activeCode?.planType ?? null
    })
  } catch (err) {
    console.error('[api/user/activation-code]', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

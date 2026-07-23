import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '~/server/db/schema-pg'
import { desc, count, sum, eq } from 'drizzle-orm'
import type { NextApiRequest, NextApiResponse } from 'next'

const ADMIN_EMAIL = 'ardika.yudha08@gmail.com'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' })
  if (session.user.email !== ADMIN_EMAIL) return res.status(403).json({ error: 'Forbidden' })

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const db = drizzle(sql, { schema })

    // Semua users
    const users = await db.select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      planType: schema.users.planType,
      credits: schema.users.credits,
      creditsUsed: schema.users.creditsUsed,
      isActive: schema.users.isActive,
      createdAt: schema.users.createdAt,
    }).from(schema.users).orderBy(desc(schema.users.createdAt))

    // Semua payments
    const payments = await db.select({
      id: schema.payments.id,
      userId: schema.payments.userId,
      mayarOrderId: schema.payments.mayarOrderId,
      productType: schema.payments.productType,
      amount: schema.payments.amount,
      status: schema.payments.status,
      paidAt: schema.payments.paidAt,
      createdAt: schema.payments.createdAt,
    }).from(schema.payments).orderBy(desc(schema.payments.createdAt))

    // Stats
    const totalUsers = users.length
    const paidUsers = users.filter(u => u.planType !== 'free').length
    const successPayments = payments.filter(p => p.status === 'success')
    const totalRevenue = successPayments.reduce((sum, p) => sum + (p.amount ?? 0), 0)

    const planBreakdown = {
      free: users.filter(u => u.planType === 'free').length,
      topup: users.filter(u => u.planType === 'topup').length,
      starter: users.filter(u => u.planType === 'starter').length,
      lifetime: users.filter(u => u.planType === 'lifetime').length,
    }

    // Semua generate history
    const generateHistory = await db.select({
      id: schema.generateHistory.id,
      userId: schema.generateHistory.userId,
      platform: schema.generateHistory.platform,
      createdAt: schema.generateHistory.createdAt,
    }).from(schema.generateHistory).orderBy(desc(schema.generateHistory.createdAt))

    // Gabungkan email user ke payment
    const userMap = Object.fromEntries(users.map(u => [u.id, u]))
    const paymentsWithEmail = payments.map(p => ({
      ...p,
      userEmail: userMap[p.userId ?? '']?.email ?? '—',
      userName: userMap[p.userId ?? '']?.name ?? '—',
    }))

    // Generate stats per user
    const generateByUser: Record<string, { total: number; platforms: Record<string, number> }> = {}
    for (const g of generateHistory) {
      const uid = g.userId ?? ''
      if (!generateByUser[uid]) generateByUser[uid] = { total: 0, platforms: {} }
      generateByUser[uid].total += 1
      const plat = g.platform ?? 'unknown'
      generateByUser[uid].platforms[plat] = (generateByUser[uid].platforms[plat] ?? 0) + 1
    }

    return res.status(200).json({
      stats: {
        totalUsers,
        paidUsers,
        totalRevenue,
        totalTransactions: successPayments.length,
        planBreakdown,
      },
      users,
      payments: paymentsWithEmail,
      generateByUser,
    })
  } catch (err) {
    console.error('[admin/stats]', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '~/server/db/schema-pg'
import { eq, count, gte, desc, and } from 'drizzle-orm'
import type { NextApiRequest, NextApiResponse } from 'next'

function getDb() {
  const sql = neon(process.env.DATABASE_URL!)
  return drizzle(sql, { schema })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' })

  const db = getDb()
  const users = await db.select().from(schema.users)
    .where(eq(schema.users.email, session.user.email)).limit(1)

  if (!users[0]) return res.status(404).json({ error: 'User not found' })
  const user = users[0]

  // Total generates all time
  const totalResult = await db.select({ count: count() })
    .from(schema.generateHistory)
    .where(eq(schema.generateHistory.userId, user.id))
  const totalGenerates = totalResult[0]?.count ?? 0

  // Generates this month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const monthResult = await db.select({ count: count() })
    .from(schema.generateHistory)
    .where(
      and(
        eq(schema.generateHistory.userId, user.id),
        gte(schema.generateHistory.createdAt, startOfMonth)
      )
    )
  const monthGenerates = monthResult[0]?.count ?? 0

  // Daily average based on last 30 days count
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const dailyResult = await db.select({ count: count() })
    .from(schema.generateHistory)
    .where(
      and(
        eq(schema.generateHistory.userId, user.id),
        gte(schema.generateHistory.createdAt, thirtyDaysAgo)
      )
    )
  const dailyAvg = Math.round((dailyResult[0]?.count ?? 0) / 30 * 10) / 10

  // Recent activity (last 10)
  const recentActivity = await db.select()
    .from(schema.generateHistory)
    .where(eq(schema.generateHistory.userId, user.id))
    .orderBy(desc(schema.generateHistory.createdAt))
    .limit(10)

  // Chart data — last 200 entries to bucket into 30-day map
  const historyForChart = await db.select()
    .from(schema.generateHistory)
    .where(
      and(
        eq(schema.generateHistory.userId, user.id),
        gte(schema.generateHistory.createdAt, thirtyDaysAgo)
      )
    )
    .orderBy(desc(schema.generateHistory.createdAt))
    .limit(500)

  // Build daily chart data (last 30 days)
  const dayMap: Record<string, number> = {}
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    dayMap[key] = 0
  }
  historyForChart.forEach(h => {
    if (!h.createdAt) return
    const key = new Date(h.createdAt).toISOString().slice(0, 10)
    if (dayMap[key] !== undefined) dayMap[key]++
  })
  const chartData = Object.entries(dayMap).map(([date, cnt]) => ({ date, count: cnt }))

  // Platform breakdown
  const platformResult = await db.select({
    platform: schema.generateHistory.platform,
    count: count(),
  })
    .from(schema.generateHistory)
    .where(eq(schema.generateHistory.userId, user.id))
    .groupBy(schema.generateHistory.platform)

  const platformBreakdown = platformResult.map(r => ({
    name: r.platform === 'adobe_stock' ? 'Adobe Stock'
      : r.platform === 'shutterstock' ? 'Shutterstock'
      : r.platform === 'web' ? 'Web Dashboard'
      : r.platform === 'extension' ? 'Extension'
      : r.platform || 'Lainnya',
    value: r.count,
    platform: r.platform,
  }))

  return res.status(200).json({
    totalGenerates,
    monthGenerates,
    dailyAvg,
    credits: user.credits,
    creditsUsed: user.creditsUsed,
    planType: user.planType,
    recentActivity,
    chartData,
    platformBreakdown,
  })
}

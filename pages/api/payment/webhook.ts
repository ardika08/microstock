import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '~/server/db/schema-pg'
import { eq } from 'drizzle-orm'
import type { NextApiRequest, NextApiResponse } from 'next'
import Database from 'better-sqlite3'
import path from 'path'

// Disable body parser so we can read the raw body
export const config = { api: { bodyParser: false } }

async function getRawBody(req: NextApiRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk: Buffer) => { body += chunk.toString() })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

function getDb() {
  const sql = neon(process.env.DATABASE_URL!)
  return drizzle(sql, { schema })
}

async function generateActivationCode(): Promise<string> {
  const chars = '0123456789ABCDEF'
  const seg = () => Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * 16)]).join('')
  return `ASAF-${seg()}-${seg()}`
}

function saveCodeToSQLite(code: string) {
  try {
    const dbPath = path.join(process.cwd(), 'data', 'activation.sqlite')
    const sqlite = new Database(dbPath)
    sqlite.prepare(`
      INSERT OR IGNORE INTO activation_codes (code, status, created_at) 
      VALUES (?, 'ACTIVE', datetime('now'))
    `).run(code)
    sqlite.close()
  } catch (err) {
    console.error('[webhook] Failed to save code to SQLite:', err)
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const rawBody = await getRawBody(req)

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  console.log('[webhook] Mayar payload:', JSON.stringify(payload, null, 2))

  // Mayar webhook payload normalisation — covers both flat and nested shapes
  const event = payload?.event || payload?.type
  const customerEmail = payload?.data?.customerEmail || payload?.customerEmail
  const orderStatus = payload?.data?.status || payload?.status
  const orderId = payload?.data?.id || payload?.id
  // For invoices, productName is "INVOICE" — use productDescription instead
  const productName = (
    payload?.data?.productDescription ||
    payload?.data?.productName ||
    payload?.data?.items?.[0]?.name ||
    payload?.productName ||
    ''
  ).toLowerCase()

  // Only act on successful payments
  // Mayar sends: event='payment.received', status='SUCCESS' OR event='payment.success', status='paid'
  const isPaid = 
    orderStatus === 'paid' || 
    orderStatus === 'SUCCESS' || 
    orderStatus === 'success' ||
    event === 'payment.success' || 
    event === 'payment.received'
  
  if (!isPaid) {
    console.log('[webhook] Ignoring non-paid event:', event, orderStatus)
    return res.status(200).json({ received: true })
  }

  if (!customerEmail) {
    console.log('[webhook] No customer email in payload')
    return res.status(200).json({ received: true })
  }

  // Resolve product type from product name
  let productType = ''
  let creditsToAdd = 0
  let planType = ''

  if (productName.includes('top up') || productName.includes('kredit')) {
    productType = 'topup_500'
    creditsToAdd = 500
    planType = 'topup'
  } else if (productName.includes('starter') || productName.includes('bulanan')) {
    productType = 'starter_monthly'
    creditsToAdd = 0
    planType = 'starter'
  } else if (
    productName.includes('one-time') ||
    productName.includes('lifetime') ||
    productName.includes('selamanya')
  ) {
    productType = 'lifetime'
    creditsToAdd = 0
    planType = 'lifetime'
  } else {
    console.log('[webhook] Unknown product name:', productName)
    return res.status(200).json({ received: true })
  }

  try {
    const db = getDb()

    // Find or create user
    const existing = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, customerEmail))
      .limit(1)

    let userId: string

    if (existing.length === 0) {
      const newUsers = await db
        .insert(schema.users)
        .values({
          email: customerEmail,
          planType,
          credits: creditsToAdd,
        } as any)
        .returning()
      userId = (newUsers[0] as any).id
      console.log('[webhook] Created new user:', customerEmail)
    } else {
      userId = existing[0].id
      if (productType === 'topup_500') {
        await db
          .update(schema.users)
          .set({ credits: (existing[0].credits ?? 0) + 500 } as any)
          .where(eq(schema.users.id, userId))
      } else if (productType === 'starter_monthly') {
        await db
          .update(schema.users)
          .set({ planType: 'starter', credits: 0 } as any)
          .where(eq(schema.users.id, userId))
      } else if (productType === 'lifetime') {
        await db
          .update(schema.users)
          .set({ planType: 'lifetime', credits: 0 } as any)
          .where(eq(schema.users.id, userId))
      }
    }

    // Record the payment
    await db.insert(schema.payments).values({
      userId,
      mayarOrderId: orderId ?? null,
      productType,
      amount: payload?.data?.amount ?? payload?.amount ?? 0,
      status: 'success',
      paidAt: new Date(),
    } as any)

    // Generate an activation code for all paid product types
    if (productType === 'topup_500' || productType === 'lifetime' || productType === 'starter_monthly') {
      const code = await generateActivationCode()
      await db.insert(schema.activationCodes).values({
        code,
        userId,
        status: 'ACTIVE',
        planType: productType,
      } as any)
      saveCodeToSQLite(code)
      console.log('[webhook] Generated activation code:', code, 'for', customerEmail)
    }

    console.log('[webhook] Payment processed:', customerEmail, productType)
    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('[webhook] Error processing payment:', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}

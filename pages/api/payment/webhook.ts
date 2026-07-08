import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '~/server/db/schema-pg'
import { eq } from 'drizzle-orm'
import type { NextApiRequest, NextApiResponse } from 'next'
import Database from 'better-sqlite3'
import path from 'path'
import crypto from 'crypto'

// Disable body parser so we can read the raw body
export const config = { api: { bodyParser: false } }

async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function getDb() {
  const sql = neon(process.env.DATABASE_URL!)
  return drizzle(sql, { schema })
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (err: any) {
      if (i === retries - 1) throw err
      const isRetryable = err?.message?.includes('retryable') || err?.message?.includes('Control plane')
      if (!isRetryable) throw err
      console.log(`[webhook] DB retry ${i + 1}/${retries}...`)
      await new Promise(r => setTimeout(r, delay * (i + 1)))
    }
  }
  throw new Error('Max retries exceeded')
}

async function generateActivationCode(): Promise<string> {
  const { randomBytes } = await import('crypto')
  const seg = () => randomBytes(3).toString('hex').toUpperCase()
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

  // ✅ Verifikasi HMAC signature dari Mayar
  const webhookSecret = process.env.MAYAR_WEBHOOK_SECRET
  if (webhookSecret) {
    const signature = req.headers['x-mayar-signature'] as string | undefined
    if (!signature) {
      console.warn('[webhook] Missing x-mayar-signature header')
      return res.status(401).json({ error: 'Missing signature' })
    }
    const expected = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex')
    try {
      const sigBuf = Buffer.from(signature, 'hex')
      const expBuf = Buffer.from(expected, 'hex')
      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        console.warn('[webhook] Invalid signature')
        return res.status(401).json({ error: 'Invalid signature' })
      }
    } catch {
      return res.status(401).json({ error: 'Invalid signature' })
    }
  } else {
    console.warn('[webhook] MAYAR_WEBHOOK_SECRET not set — skipping signature check')
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody.toString())
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  // ✅ Log hanya field yang relevan, bukan full payload (hindari PII di log)
  const logEvent = payload?.event || payload?.type
  const logOrderId = payload?.data?.id || payload?.id
  console.log('[webhook] Mayar event:', logEvent, '| orderId:', logOrderId)

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

  // Only act on successful payments — ignore reminders and other non-payment events
  // Mayar sends: event='payment.received', status='SUCCESS' OR event='payment.success', status='paid'
  const isPaid = 
    orderStatus === 'paid' || 
    orderStatus === 'SUCCESS' || 
    orderStatus === 'success' ||
    event === 'payment.success' || 
    event === 'payment.received'
  
  // Always ignore reminder events
  if (event === 'payment.reminder' || event === 'invoice.reminder') {
    return res.status(200).json({ received: true })
  }

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

    // Idempotency check — skip if already processed
    if (orderId) {
      const existing_payment = await withRetry(() => db
        .select()
        .from(schema.payments)
        .where(eq(schema.payments.mayarOrderId, orderId))
        .limit(1)
      )
      if (existing_payment.length > 0) {
        console.log('[webhook] Already processed orderId:', orderId)
        return res.status(200).json({ received: true, duplicate: true })
      }
    }

    // Find or create user (with retry for transient Neon errors)
    const existing = await withRetry(() => db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, customerEmail))
      .limit(1)
    )

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

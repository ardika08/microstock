import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'
dotenv.config()

const sql = neon(process.env.DATABASE_URL!)

async function migrate() {
  console.log('Running migrations...')

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      image TEXT,
      phone TEXT,
      plan_type TEXT DEFAULT 'free',
      credits INTEGER DEFAULT 20,
      credits_used INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_account_id TEXT NOT NULL,
      refresh_token TEXT,
      access_token TEXT,
      expires_at INTEGER,
      token_type TEXT,
      scope TEXT,
      id_token TEXT,
      session_state TEXT
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_token TEXT UNIQUE NOT NULL,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires TIMESTAMPTZ NOT NULL
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS verification_tokens (
      identifier TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires TIMESTAMPTZ NOT NULL
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS activation_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code TEXT UNIQUE NOT NULL,
      user_id UUID REFERENCES users(id),
      status TEXT DEFAULT 'ACTIVE',
      plan_type TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS generate_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      platform TEXT,
      filename TEXT,
      title TEXT,
      credits_used INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      mayar_order_id TEXT UNIQUE,
      product_type TEXT,
      amount INTEGER,
      status TEXT DEFAULT 'pending',
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  console.log('✅ Migrations complete!')
}

migrate().catch(console.error)

import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'
dotenv.config()

const sql = neon(process.env.DATABASE_URL!)

async function migrate() {
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS openai_api_key TEXT`
  console.log('✅ Added openai_api_key column')
}

migrate().catch(console.error)

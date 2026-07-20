import { randomBytes } from "node:crypto"

import * as dotenv from "dotenv"
import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import { sql } from "drizzle-orm"

// Load env vars (DATABASE_URL wajib ada)
dotenv.config()

if (!process.env.DATABASE_URL) {
  console.error("[create-activation-code] ERROR: DATABASE_URL tidak dikonfigurasi di .env")
  process.exit(1)
}

function getArg(name: string) {
  const prefix = `--${name}=`
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length)
}

function makeCode() {
  return `ASAF-${randomBytes(3).toString("hex").toUpperCase()}-${randomBytes(3)
    .toString("hex")
    .toUpperCase()}`
}

async function main() {
  const code = (getArg("code") || makeCode()).trim().toUpperCase()
  const expiresAt = getArg("expires-at") || null
  const planType = getArg("plan-type") || null

  // ✅ Gunakan Neon PostgreSQL — sama dengan yang dibaca server production
  const sqlClient = neon(process.env.DATABASE_URL!)
  const db = drizzle(sqlClient)

  await db.execute(
    sql`
      INSERT INTO activation_codes (code, status, plan_type, created_at, expires_at)
      VALUES (
        ${code},
        'ACTIVE',
        ${planType},
        NOW(),
        ${expiresAt ? new Date(expiresAt) : null}
      )
      ON CONFLICT (code) DO NOTHING
    `
  )

  console.log(`✅ Kode aktivasi siap: ${code}`)
  if (planType) console.log(`   Plan: ${planType}`)
  if (expiresAt) console.log(`   Berlaku sampai: ${expiresAt}`)
  console.log(`   Database: Neon PostgreSQL (${process.env.DATABASE_URL!.split("@")[1]?.split("/")[0] ?? "neon"})`)
}

main().catch((err) => {
  console.error("[create-activation-code] Gagal:", err)
  process.exit(1)
})

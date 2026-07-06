import { randomBytes } from "node:crypto"

import { sql } from "drizzle-orm"

import { db } from "~/server/db"

function getArg(name: string) {
  const prefix = `--${name}=`
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length)
}

function makeCode() {
  return `ASAF-${randomBytes(3).toString("hex").toUpperCase()}-${randomBytes(3)
    .toString("hex")
    .toUpperCase()}`
}

const code = (getArg("code") || makeCode()).trim().toUpperCase()
const expiresAt = getArg("expires-at") || null

db.run(sql`
  INSERT OR IGNORE INTO activation_codes (code, status, created_at, expires_at)
  VALUES (${code}, 'ACTIVE', ${new Date().toISOString()}, ${expiresAt})
`)

console.log(`Kode aktivasi siap: ${code}`)
if (expiresAt) {
  console.log(`Berlaku sampai: ${expiresAt}`)
}

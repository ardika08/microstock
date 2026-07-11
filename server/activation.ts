import { eq, sql } from "drizzle-orm"
import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import * as schema from "~/server/db/schema-pg"

// ✅ Gunakan Neon PostgreSQL sebagai single source of truth
// SQLite (server/db/index.ts) sudah tidak dipakai — semua activation codes ada di Neon
function getDb() {
  const sqlClient = neon(process.env.DATABASE_URL!)
  return drizzle(sqlClient, { schema })
}

export type ActivationValidationResult =
  | {
      valid: true
      status: "ACTIVE"
      code: string
      expires_at: string | null
    }
  | {
      valid: false
      status?: "USED" | "REVOKED" | "EXPIRED" | "NOT_FOUND"
      message: string
    }

export async function validateActivationCode(
  rawCode: string
): Promise<ActivationValidationResult> {
  const code = rawCode.trim().toUpperCase()

  if (!code) {
    return {
      valid: false,
      message: "Kode aktivasi wajib diisi."
    }
  }

  const db = getDb()

  try {
    // ✅ Baca kode dari Neon PostgreSQL
    const records = await db
      .select()
      .from(schema.activationCodes)
      .where(eq(schema.activationCodes.code, code))
      .limit(1)

    const record = records[0]

    if (!record) {
      return { valid: false, status: "NOT_FOUND", message: "Kode aktivasi tidak ditemukan." }
    }

    if (record.status === "REVOKED") {
      return { valid: false, status: "REVOKED", message: "Kode aktivasi sudah dicabut." }
    }

    if (record.status === "USED") {
      return { valid: false, status: "USED", message: "Kode aktivasi sudah digunakan." }
    }

    if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
      return { valid: false, status: "EXPIRED", message: "Kode aktivasi sudah kedaluwarsa." }
    }

    // ✅ Kode valid dan ACTIVE — tidak di-mark USED
    // Kode aktivasi bersifat permanen selama user aktif
    return {
      valid: true,
      status: "ACTIVE",
      code: record.code,
      expires_at: record.expiresAt ? record.expiresAt.toISOString() : null
    }
  } catch (err) {
    console.error("[activation] Error validating code:", err)
    return { valid: false, message: "Kode tidak dapat diproses. Coba lagi." }
  }
}

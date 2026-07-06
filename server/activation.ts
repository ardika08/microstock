import { eq } from "drizzle-orm"

import { db } from "~/server/db"
import { activationCodes } from "~/server/db/schema"

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

  const record = db
    .select()
    .from(activationCodes)
    .where(eq(activationCodes.code, code))
    .get()

  if (!record) {
    return {
      valid: false,
      status: "NOT_FOUND",
      message: "Kode aktivasi tidak ditemukan."
    }
  }

  if (record.status === "REVOKED") {
    return {
      valid: false,
      status: "REVOKED",
      message: "Kode aktivasi sudah dicabut."
    }
  }

  if (record.status === "USED") {
    return {
      valid: false,
      status: "USED",
      message: "Kode aktivasi sudah digunakan."
    }
  }

  if (record.expiresAt && Date.parse(record.expiresAt) < Date.now()) {
    return {
      valid: false,
      status: "EXPIRED",
      message: "Kode aktivasi sudah kedaluwarsa."
    }
  }

  // Mark code as USED dalam transaksi untuk mencegah concurrent reuse
  db.transaction(() => {
    db.update(activationCodes)
      .set({ status: "USED" })
      .where(eq(activationCodes.code, code))
      .run()
  })

  return {
    valid: true,
    status: "ACTIVE",
    code: record.code,
    expires_at: record.expiresAt
  }
}

import { eq, sql } from "drizzle-orm"

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

  // ✅ Atomic UPDATE — cegah race condition TOCTOU
  // Hanya update jika status masih ACTIVE, cek expiry sekaligus
  // Jika 0 rows ter-update berarti kode sudah USED/REVOKED/EXPIRED/NOT_FOUND
  try {
    const updated = db.transaction(() => {
      // Cek dulu apakah kode ada dan statusnya
      const record = db
        .select()
        .from(activationCodes)
        .where(eq(activationCodes.code, code))
        .get()

      if (!record) return { result: 'NOT_FOUND' as const, record: null }
      if (record.status === 'REVOKED') return { result: 'REVOKED' as const, record }
      if (record.status === 'USED') return { result: 'USED' as const, record }
      if (record.expiresAt && Date.parse(record.expiresAt) < Date.now()) {
        return { result: 'EXPIRED' as const, record }
      }

      // ✅ Atomic: UPDATE hanya jika status masih ACTIVE
      // Gunakan WHERE code = ? AND status = 'ACTIVE' untuk mencegah double-use
      const stmt = db.run(
        sql`UPDATE activation_codes SET status = 'USED' WHERE code = ${code} AND status = 'ACTIVE'`
      )

      // Jika 0 rows berubah berarti concurrent request sudah mark USED duluan
      if (stmt.changes === 0) return { result: 'USED' as const, record }

      return { result: 'SUCCESS' as const, record }
    })

    if (updated.result === 'NOT_FOUND') {
      return { valid: false, status: 'NOT_FOUND', message: 'Kode aktivasi tidak ditemukan.' }
    }
    if (updated.result === 'REVOKED') {
      return { valid: false, status: 'REVOKED', message: 'Kode aktivasi sudah dicabut.' }
    }
    if (updated.result === 'USED') {
      return { valid: false, status: 'USED', message: 'Kode aktivasi sudah digunakan.' }
    }
    if (updated.result === 'EXPIRED') {
      return { valid: false, status: 'EXPIRED', message: 'Kode aktivasi sudah kedaluwarsa.' }
    }

    return {
      valid: true,
      status: 'ACTIVE',
      code: updated.record!.code,
      expires_at: updated.record!.expiresAt
    }
  } catch (err) {
    console.error('[activation] Error validating code:', err)
    return { valid: false, message: 'Kode tidak dapat diproses. Coba lagi.' }
  }
}

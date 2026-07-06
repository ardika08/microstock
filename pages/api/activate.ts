import type { NextApiRequest, NextApiResponse } from "next"

import { validateActivationCode } from "~/server/activation"

// CORS: set ACTIVATION_ALLOWED_ORIGIN ke chrome-extension://<id> di production
// Jangan biarkan wildcard "*" di production — siapapun bisa hit endpoint ini
const allowedOrigin = process.env.ACTIVATION_ALLOWED_ORIGIN

if (!allowedOrigin || allowedOrigin === "*") {
  console.warn(
    "[activate] WARNING: ACTIVATION_ALLOWED_ORIGIN tidak dikonfigurasi atau masih wildcard. " +
    "Set ke chrome-extension://<extension-id> di production."
  )
}

// Simple in-memory rate limiter: max 10 request per IP per menit
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60_000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return true
  }

  entry.count++
  return false
}

function setCorsHeaders(res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin || "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  setCorsHeaders(res)

  if (req.method === "OPTIONS") {
    return res.status(204).end()
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      valid: false,
      message: "Method tidak didukung. Gunakan POST."
    })
  }

  // Rate limiting berdasarkan IP
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown"

  if (isRateLimited(ip)) {
    return res.status(429).json({
      valid: false,
      message: "Terlalu banyak percobaan. Coba lagi dalam 1 menit."
    })
  }

  // Validasi panjang input sebelum query DB
  const code = typeof req.body?.code === "string" ? req.body.code : ""
  if (code.length === 0 || code.length > 32) {
    return res.status(400).json({
      valid: false,
      message: "Kode aktivasi tidak valid."
    })
  }

  const result = await validateActivationCode(code)

  if (!result.valid) {
    // Sembunyikan detail status — jangan leak USED/REVOKED/NOT_FOUND ke client
    return res.status(403).json({
      valid: false,
      message: "Kode aktivasi tidak valid."
    })
  }

  return res.status(200).json(result)
}

import type { NextApiRequest, NextApiResponse } from "next"

import { validateActivationCode } from "~/server/activation"

const allowedOrigin = process.env.ACTIVATION_ALLOWED_ORIGIN || "*"

function setCorsHeaders(res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin)
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

  const code = typeof req.body?.code === "string" ? req.body.code : ""
  const result = await validateActivationCode(code)

  if (!result.valid) {
    return res.status(403).json(result)
  }

  return res.status(200).json(result)
}

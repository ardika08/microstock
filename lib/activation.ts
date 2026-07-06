type ActivationResponse = {
  valid?: boolean
  status?: "ACTIVE" | "USED" | "REVOKED"
  message?: string
}

const activationApiUrl = process.env.PLASMO_PUBLIC_ACTIVATION_API_URL

export async function validateActivationCode(code: string) {
  if (!activationApiUrl) {
    throw new Error("Endpoint validasi belum dikonfigurasi.")
  }

  const response = await fetch(activationApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ code })
  })

  let body: ActivationResponse = {}
  try {
    body = await response.json()
  } catch {
    body = {}
  }

  if (!response.ok || body.valid === false || body.status === "REVOKED") {
    throw new Error(body.message || "Kode aktivasi tidak valid.")
  }

  return body
}

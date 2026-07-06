type ActivationResponse = {
  valid?: boolean
  status?: "ACTIVE" | "USED" | "REVOKED"
  message?: string
}

// Plasmo menggunakan import.meta.env untuk env vars di extension bundle
// process.env.PLASMO_PUBLIC_* hanya bekerja di Next.js backend
const activationApiUrl =
  typeof process !== "undefined"
    ? process.env.PLASMO_PUBLIC_ACTIVATION_API_URL
    : undefined

export async function validateActivationCode(code: string) {
  // Coba baca dari import.meta.env sebagai fallback (Plasmo/Parcel bundler)
  const url = activationApiUrl || (import.meta as any).env?.PLASMO_PUBLIC_ACTIVATION_API_URL

  if (!url) {
    throw new Error("Endpoint validasi belum dikonfigurasi.")
  }

  const response = await fetch(url, {
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

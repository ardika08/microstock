import type { MetadataResult } from "~/lib/types"

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions"
const SERVER_GENERATE_ENDPOINT = "https://autofillstock.my.id/api/extension/generate"

function normalizeMetadata(value: unknown): MetadataResult {
  const data = value as Partial<MetadataResult>

  if (
    !data ||
    typeof data.title !== "string" ||
    typeof data.description !== "string" ||
    !Array.isArray(data.keywords) ||
    typeof data.category !== "string"
  ) {
    throw new Error("Respons AI tidak sesuai format metadata.")
  }

  const cleanText = (text: string) => text.replace(/\s+/g, " ").trim()
  const clampText = (text: string, maxLength: number) => {
    const cleaned = cleanText(text)

    if (cleaned.length <= maxLength) {
      return cleaned
    }

    const sliced = cleaned.slice(0, maxLength)
    const lastSpace = sliced.lastIndexOf(" ")
    return `${sliced.slice(0, lastSpace > 80 ? lastSpace : maxLength).trim()}`
  }

  return {
    title: clampText(data.title, 180),
    description: clampText(data.description, 190),
    keywords: data.keywords
      .map((keyword) => String(keyword).trim())
      .filter(Boolean)
      .slice(0, 50),
    category: data.category.trim()
  }
}

function extractJson(content: string) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced?.[1] ?? content
  const start = raw.indexOf("{")
  const end = raw.lastIndexOf("}")

  if (start === -1 || end === -1) {
    throw new Error("Respons AI tidak berisi JSON.")
  }

  return JSON.parse(raw.slice(start, end + 1))
}

// ✅ Generate via server API (untuk free/topup/basic/value plan)
export async function generateMetadataViaServer(
  activationCode: string,
  assetBrief: string,
  filename: string,
  platform: string
): Promise<MetadataResult> {
  if (!activationCode?.trim()) {
    throw new Error("Kode aktivasi tidak ditemukan. Buka popup extension dan aktivasi ulang.")
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 120_000)

  let response: Response
  try {
    response = await fetch(SERVER_GENERATE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activationCode, assetBrief, filename, platform }),
      signal: controller.signal
    })
  } catch (networkError) {
    if (networkError instanceof Error && networkError.name === "AbortError") {
      throw new Error("Generate timeout. Server terlalu lama merespons. Coba lagi.")
    }
    throw new Error("Tidak dapat menghubungi server. Periksa koneksi internet dan coba lagi.")
  } finally {
    clearTimeout(timeoutId)
  }

  const rawText = await response.text()
  let body: Record<string, unknown> = {}
  try {
    body = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {}
  } catch {
    if (response.status === 504 || /gateway time-?out/i.test(rawText)) {
      throw new Error("Server timeout saat generate. Coba lagi beberapa detik.")
    }
    throw new Error(`Server error (${response.status}). Coba lagi.`)
  }

  if (!response.ok) {
    throw new Error(
      (body?.error as string) || `Gagal generate metadata (${response.status}).`
    )
  }

  return normalizeMetadata(body.metadata)
}

// Legacy: generate langsung ke OpenAI (hanya untuk lifetime plan dengan API key sendiri)
export async function generateMetadata(apiKey: string, assetBrief: string) {
  const prompt = [
    "Generate microstock contributor metadata for a digital asset.",
    "Return strict JSON only with this shape:",
    '{"title":"...","description":"...","keywords":["..."],"category":"..."}',
    "Rules: description is the primary contributor text that will be pasted into the microstock description field and it must be 120 to 190 characters, one sentence, no line breaks. Title can be a short fallback summary under 180 characters. Keywords must contain 45 to 49 unique, relevant microstock search terms, ordered from most important to supporting terms. Avoid duplicates, filler, brand names, and irrelevant words. Category must match the user's supplied category when one is present. When available categories are supplied, choose only one category from that list. Strongly prioritize the original file name over generic keyword suggestions.",
    `Asset brief: ${assetBrief || "A general commercial stock asset; infer broadly useful metadata."}`
  ].join("\n")

  let response: Response
  try {
    response = await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a metadata assistant for microstock contributors. Output only valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      })
    })
  } catch (networkError) {
    throw new Error(
      "Tidak dapat menghubungi OpenAI. Periksa koneksi internet dan coba lagi."
    )
  }

  let body: Record<string, unknown>
  try {
    body = await response.json()
  } catch {
    throw new Error("OpenAI mengembalikan respons yang tidak valid.")
  }

  if (!response.ok) {
    throw new Error(
      (body?.error as { message?: string })?.message ||
        "Gagal menghubungi OpenAI API."
    )
  }

  const content = body?.choices?.[0]?.message?.content
  if (typeof content !== "string") {
    throw new Error("OpenAI tidak mengembalikan konten metadata.")
  }

  return normalizeMetadata(extractJson(content))
}

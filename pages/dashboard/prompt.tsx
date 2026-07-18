import React, { useCallback, useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  ImagePlus,
  Loader2,
  RefreshCw,
  ScanText,
  X,
} from "lucide-react"
import DashboardLayout from "~/components/dashboard/DashboardLayout"
import { useSession } from "next-auth/react"
import { useUser } from "~/hooks/useUser"

const ADMIN_EMAIL = "ardika.yudha08@gmail.com"
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_EDGE = 1280
const CREDITS_PER_GENERATE = 1

async function fileToCompressedDataUrl(file: File): Promise<string> {
  const rawUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Gagal membaca file."))
    reader.readAsDataURL(file)
  })

  // Compress/resize large images client-side to keep payload small
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error("Gagal memuat preview gambar."))
    el.src = rawUrl
  })

  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) return rawUrl
  ctx.drawImage(img, 0, 0, w, h)

  // Prefer JPEG for photos to shrink base64; keep PNG for transparency-ish files
  if (file.type === "image/png" && file.size < 1.5 * 1024 * 1024) {
    return canvas.toDataURL("image/png")
  }
  return canvas.toDataURL("image/jpeg", 0.85)
}

export default function ImageToPromptPage() {
  const { data: session } = useSession()
  const { credits, planType } = useUser()
  const isAdmin = session?.user?.email === ADMIN_EMAIL
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>("")
  const [isDragging, setIsDragging] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [negativePrompt, setNegativePrompt] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [creditsLeft, setCreditsLeft] = useState<number | null>(null)

  useEffect(() => {
    if (credits !== undefined) setCreditsLeft(credits)
  }, [credits])

  const isUnlimited = planType === "starter" || planType === "lifetime"
  const displayCredits = isUnlimited ? "∞" : creditsLeft ?? credits ?? 0
  const canAfford =
    isUnlimited || (typeof (creditsLeft ?? credits) === "number" && (creditsLeft ?? credits) >= CREDITS_PER_GENERATE)

  const resetResult = () => {
    setPrompt("")
    setNegativePrompt("")
    setTags([])
    setInfo(null)
  }

  const processFile = useCallback(async (file: File) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Format tidak didukung. Gunakan JPG, PNG, atau WebP.")
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Ukuran file maksimal 5 MB.")
      return
    }
    setError(null)
    resetResult()
    setFileName(file.name)
    try {
      const dataUrl = await fileToCompressedDataUrl(file)
      setPreview(dataUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses gambar.")
      setPreview(null)
    }
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) void processFile(file)
      e.target.value = ""
    },
    [processFile]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) void processFile(file)
    },
    [processFile]
  )

  const handleGenerate = async () => {
    if (!preview) {
      setError("Upload gambar dulu.")
      return
    }
    if (!canAfford) {
      setError("Kredit habis. Silakan top up kredit.")
      return
    }

    setIsGenerating(true)
    setError(null)
    setInfo(null)

    try {
      const savedApiKey =
        typeof window !== "undefined"
          ? localStorage.getItem("autofillstock_openai_key") || ""
          : ""

      const res = await fetch("/api/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: preview,
          filename: fileName || "image-prompt",
          userApiKey: savedApiKey || undefined,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Gagal generate prompt.")
      }

      setPrompt(data.prompt || "")
      setNegativePrompt(data.negativePrompt || "")
      setTags(Array.isArray(data.tags) ? data.tags : [])
      if (data.creditsRemaining !== null && data.creditsRemaining !== undefined) {
        setCreditsLeft(data.creditsRemaining)
      }
      setInfo("Prompt berhasil dibuat.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal generate prompt.")
    } finally {
      setIsGenerating(false)
    }
  }

  const copyText = async (text: string, label: string) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setInfo(`${label} disalin ke clipboard.`)
    } catch {
      setError("Gagal menyalin ke clipboard.")
    }
  }

  const clearAll = () => {
    setPreview(null)
    setFileName("")
    resetResult()
    setError(null)
  }

  // Admin-only while testing — non-admin sees Coming Soon
  if (!isAdmin) {
    return (
      <DashboardLayout title="Image to Prompt">
        <div className="flex flex-col items-center justify-center min-h-[32rem] gap-5">
          <div className="w-20 h-20 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
            <ScanText className="w-10 h-10 text-cyan-400" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-100">Coming Soon</h2>
            <p className="text-gray-400 max-w-md">
              Fitur Image to Prompt sedang diuji. Segera hadir untuk semua pengguna!
            </p>
          </div>
          <span className="px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs rounded-lg font-medium">
            1 kredit / generate
          </span>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Image to Prompt">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <ScanText className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-100">Image to Prompt</h1>
              <p className="text-sm text-gray-500">
                Upload gambar → AI tulis prompt siap pakai
              </p>
            </div>
          </div>
          <div className="sm:ml-auto flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-medium">
              {CREDITS_PER_GENERATE} kredit / generate
            </span>
            <span className="text-sm text-gray-500">
              Kredit:{" "}
              <span
                className={`font-medium ${
                  !isUnlimited && (creditsLeft ?? 0) <= 5
                    ? "text-red-400"
                    : "text-gray-200"
                }`}
              >
                {displayCredits}
              </span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: upload + controls */}
          <div className="space-y-4">
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <div className="text-sm font-medium text-gray-200">Gambar</div>

              {!preview ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDragging(true)
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`cursor-pointer rounded-xl border-2 border-dashed transition-all min-h-[220px] flex flex-col items-center justify-center gap-3 px-4 ${
                    isDragging
                      ? "border-cyan-400 bg-cyan-500/10"
                      : "border-white/10 hover:border-cyan-500/40 hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <ImagePlus className="w-7 h-7 text-gray-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-300 font-medium">
                      Drag & drop atau klik untuk upload
                    </p>
                    <p className="text-xs text-gray-500 mt-1">JPG, PNG, WebP · max 5 MB</p>
                  </div>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden border border-white/10 bg-slate-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full max-h-[320px] object-contain bg-slate-950"
                  />
                  <button
                    type="button"
                    onClick={clearAll}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 border border-white/10 text-gray-200 hover:bg-black/80"
                    aria-label="Hapus gambar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {fileName && (
                    <div className="absolute bottom-0 inset-x-0 bg-black/50 px-3 py-1.5 text-[11px] text-gray-300 truncate">
                      {fileName}
                    </div>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </section>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!preview || isGenerating || !canAfford}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:from-slate-700 disabled:to-slate-700 disabled:text-gray-500 text-white font-medium text-sm px-4 py-3 shadow-lg shadow-cyan-500/20 disabled:shadow-none transition-all"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <ScanText className="w-4 h-4" />
                    Generate Prompt
                    <span className="text-[11px] opacity-90 bg-black/20 px-1.5 py-0.5 rounded-md">
                      −{CREDITS_PER_GENERATE}
                    </span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetResult()
                  setError(null)
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 hover:bg-white/5 text-gray-300 text-sm px-4 py-3"
              >
                <RefreshCw className="w-4 h-4" />
                Reset
              </button>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-200"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
              {info && !error && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-200"
                >
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{info}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-xs text-gray-500 leading-relaxed">
              1 gambar = 1 kredit. Lifetime memakai API key OpenAI sendiri (tanpa potong kredit).
              Gambar besar otomatis di-resize agar request lebih cepat.
            </p>
          </div>

          {/* Right: result */}
          <div className="space-y-4">
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 min-h-[28rem] flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-gray-200">Hasil prompt</div>
                {prompt && (
                  <button
                    type="button"
                    onClick={() => copyText(prompt, "Prompt")}
                    className="inline-flex items-center gap-1.5 text-xs text-cyan-300 hover:text-cyan-200"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </button>
                )}
              </div>

              {!prompt && !isGenerating ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-16">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <ScanText className="w-8 h-8 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-300 font-medium">Belum ada prompt</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs">
                      Upload gambar, lalu klik Generate Prompt.
                    </p>
                  </div>
                </div>
              ) : isGenerating ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                  <p className="text-sm text-gray-300">Menganalisis gambar...</p>
                </div>
              ) : (
                <div className="space-y-4 flex-1">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={10}
                    className="w-full rounded-xl bg-slate-950/60 border border-white/10 px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 resize-y min-h-[180px]"
                  />

                  {negativePrompt && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[11px] uppercase tracking-wide text-gray-500">
                          Negative prompt
                        </p>
                        <button
                          type="button"
                          onClick={() => copyText(negativePrompt, "Negative prompt")}
                          className="text-[11px] text-cyan-300 hover:text-cyan-200"
                        >
                          Copy
                        </button>
                      </div>
                      <textarea
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl bg-slate-950/60 border border-white/10 px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 resize-y"
                      />
                    </div>
                  )}

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[11px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => copyText(prompt, "Prompt")}
                      className="inline-flex items-center gap-2 rounded-xl bg-white text-slate-900 hover:bg-gray-100 text-sm font-medium px-4 py-2.5"
                    >
                      <Copy className="w-4 h-4" />
                      Copy Prompt
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={!preview || isGenerating || !canAfford}
                      className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/15 text-cyan-300 text-sm px-4 py-2.5 disabled:opacity-50"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Generate Ulang
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

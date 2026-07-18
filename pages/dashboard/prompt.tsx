import React, { useCallback, useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Download,
  ImagePlus,
  Layers,
  Loader2,
  RefreshCw,
  ScanText,
  Square,
  X,
} from "lucide-react"
import DashboardLayout from "~/components/dashboard/DashboardLayout"
import { useSession } from "next-auth/react"
import { useUser } from "~/hooks/useUser"

const ADMIN_EMAIL = "ardika.yudha08@gmail.com"
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_EDGE = 1280
const CREDITS_PER_GENERATE = 1
const MAX_BULK_FILES = 10

type Mode = "single" | "bulk"
type BulkStatus = "queued" | "generating" | "done" | "failed" | "skipped"

interface BulkItem {
  id: string
  fileName: string
  preview: string
  status: BulkStatus
  prompt: string
  negativePrompt: string
  tags: string[]
  variants?: string[]
  error?: string
}

async function fileToCompressedDataUrl(file: File): Promise<string> {
  const rawUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Gagal membaca file."))
    reader.readAsDataURL(file)
  })

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

  if (file.type === "image/png" && file.size < 1.5 * 1024 * 1024) {
    return canvas.toDataURL("image/png")
  }
  return canvas.toDataURL("image/jpeg", 0.85)
}

function getSavedApiKey(): string {
  if (typeof window === "undefined") return ""
  return localStorage.getItem("autofillstock_openai_key") || ""
}

function csvEscape(value: string): string {
  const v = value ?? ""
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`
  return v
}

function downloadCsv(items: BulkItem[]) {
  const rows = [
    ["filename", "status", "prompt", "negative_prompt", "tags", "variant_A", "variant_B", "variant_C"],
    ...items.map((item) => [
      item.fileName,
      item.status,
      item.prompt,
      item.negativePrompt,
      item.tags.join("; "),
      item.variants?.[0] || "",
      item.variants?.[1] || "",
      item.variants?.[2] || "",
    ]),
  ]
  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `image-to-prompt-bulk-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function statusBadge(status: BulkStatus) {
  switch (status) {
    case "queued":
      return "bg-white/5 text-gray-400 border-white/10"
    case "generating":
      return "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
    case "done":
      return "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
    case "failed":
      return "bg-red-500/10 text-red-300 border-red-500/30"
    case "skipped":
      return "bg-amber-500/10 text-amber-300 border-amber-500/30"
  }
}

function statusLabel(status: BulkStatus) {
  switch (status) {
    case "queued":
      return "Queued"
    case "generating":
      return "Generating"
    case "done":
      return "Done"
    case "failed":
      return "Failed"
    case "skipped":
      return "Skipped"
  }
}

export default function ImageToPromptPage() {
  const { data: session } = useSession()
  const { credits, planType } = useUser()
  const isAdmin = session?.user?.email === ADMIN_EMAIL

  const singleInputRef = useRef<HTMLInputElement>(null)
  const bulkInputRef = useRef<HTMLInputElement>(null)
  const stopBulkRef = useRef(false)

  const [mode, setMode] = useState<Mode>("single")
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [creditsLeft, setCreditsLeft] = useState<number | null>(null)

  // Single
  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [negativePrompt, setNegativePrompt] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [variants, setVariants] = useState<string[]>([])

  // Bulk
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([])
  const [isBulkRunning, setIsBulkRunning] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 })

  useEffect(() => {
    if (credits !== undefined) setCreditsLeft(credits)
  }, [credits])

  const isUnlimited = planType === "starter" || planType === "lifetime"
  const displayCredits = isUnlimited ? "∞" : creditsLeft ?? credits ?? 0
  const currentCredits =
    typeof (creditsLeft ?? credits) === "number" ? Number(creditsLeft ?? credits) : 0
  const canAffordOne = isUnlimited || currentCredits >= CREDITS_PER_GENERATE

  const pendingBulkCount = bulkItems.filter(
    (i) => i.status === "queued" || i.status === "failed" || i.status === "skipped"
  ).length
  const doneBulkCount = bulkItems.filter((i) => i.status === "done").length
  const failedBulkCount = bulkItems.filter((i) => i.status === "failed").length
  const estimatedCredits = pendingBulkCount * CREDITS_PER_GENERATE

  const resetSingleResult = () => {
    setPrompt("")
    setNegativePrompt("")
    setTags([])
    setVariants([])
  }

  const processSingleFile = useCallback(async (file: File) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Format tidak didukung. Gunakan JPG, PNG, atau WebP.")
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Ukuran file maksimal 5 MB.")
      return
    }
    setError(null)
    resetSingleResult()
    setInfo(null)
    setFileName(file.name)
    try {
      const dataUrl = await fileToCompressedDataUrl(file)
      setPreview(dataUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses gambar.")
      setPreview(null)
    }
  }, [])

  const addBulkFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList)
    if (!files.length) return

    setError(null)
    setInfo(null)

    const accepted: File[] = []
    const rejected: string[] = []

    for (const file of files) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        rejected.push(`${file.name}: format tidak didukung`)
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        rejected.push(`${file.name}: > 5 MB`)
        continue
      }
      accepted.push(file)
    }

    let room = 0
    setBulkItems((prev) => {
      room = Math.max(0, MAX_BULK_FILES - prev.length)
      return prev
    })

    // Read current length more reliably
    room = Math.max(0, MAX_BULK_FILES - bulkItems.length)
    if (room <= 0) {
      setError(`Maksimal ${MAX_BULK_FILES} gambar per batch.`)
      return
    }

    const slice = accepted.slice(0, room)
    if (accepted.length > room) {
      setError(`Hanya ${room} slot tersisa (max ${MAX_BULK_FILES}/batch).`)
    } else if (rejected.length) {
      setError(`${rejected.length} file ditolak. ${rejected.slice(0, 2).join(" · ")}`)
    }

    const prepared: BulkItem[] = []
    for (const file of slice) {
      try {
        const dataUrl = await fileToCompressedDataUrl(file)
        prepared.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name}`,
          fileName: file.name,
          preview: dataUrl,
          status: "queued",
          prompt: "",
          negativePrompt: "",
          tags: [],
        })
      } catch {
        prepared.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name}`,
          fileName: file.name,
          preview: "",
          status: "failed",
          prompt: "",
          negativePrompt: "",
          tags: [],
          error: "Gagal memproses gambar.",
        })
      }
    }

    if (prepared.length) {
      setBulkItems((curr) => {
        const remaining = Math.max(0, MAX_BULK_FILES - curr.length)
        return [...curr, ...prepared.slice(0, remaining)]
      })
    }
  }, [bulkItems.length])

  const handleSingleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) void processSingleFile(file)
      e.target.value = ""
    },
    [processSingleFile]
  )

  const handleBulkFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) void addBulkFiles(e.target.files)
      e.target.value = ""
    },
    [addBulkFiles]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (!e.dataTransfer.files?.length) return
      if (mode === "single") {
        const file = e.dataTransfer.files[0]
        if (file) void processSingleFile(file)
      } else {
        void addBulkFiles(e.dataTransfer.files)
      }
    },
    [mode, processSingleFile, addBulkFiles]
  )

  const callPromptApi = async (imageBase64: string, filename: string) => {
    const res = await fetch("/api/prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64,
        filename,
        userApiKey: getSavedApiKey() || undefined,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error || "Gagal generate prompt.")
    }
    return data as {
      prompt?: string
      negativePrompt?: string
      tags?: string[]
      variants?: string[]
      creditsRemaining?: number | null
    }
  }

  const handleSingleGenerate = async () => {
    if (!preview) {
      setError("Upload gambar dulu.")
      return
    }
    if (!canAffordOne) {
      setError("Kredit habis. Silakan top up kredit.")
      return
    }

    setIsGenerating(true)
    setError(null)
    setInfo(null)

    try {
      const data = await callPromptApi(preview, fileName || "image-prompt")
      setPrompt(data.prompt || "")
      setNegativePrompt(data.negativePrompt || "")
      setTags(Array.isArray(data.tags) ? data.tags : [])
      setVariants(Array.isArray(data.variants) ? data.variants : [])
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

  const updateBulkItem = (id: string, patch: Partial<BulkItem>) => {
    setBulkItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const handleBulkGenerate = async (onlyFailed = false) => {
    if (isBulkRunning) return

    const targets = bulkItems.filter((item) =>
      onlyFailed
        ? item.status === "failed" || item.status === "skipped"
        : item.status === "queued" || item.status === "failed" || item.status === "skipped"
    )

    if (!targets.length) {
      setError("Tidak ada gambar yang perlu di-generate.")
      return
    }

    if (!isUnlimited && currentCredits < CREDITS_PER_GENERATE) {
      setError("Kredit habis. Silakan top up kredit.")
      return
    }

    stopBulkRef.current = false
    setIsBulkRunning(true)
    setError(null)
    setInfo(null)
    setBulkProgress({ done: 0, total: targets.length })

    let localCredits = currentCredits
    let success = 0
    let failed = 0
    let processed = 0

    for (const item of targets) {
      if (stopBulkRef.current) {
        // mark remaining queued as skipped? leave as queued so user can continue
        setInfo(`Dihentikan. ${success} sukses, ${failed} gagal, sisa di-queue.`)
        break
      }

      if (!isUnlimited && localCredits < CREDITS_PER_GENERATE) {
        for (let i = processed; i < targets.length; i++) {
          updateBulkItem(targets[i].id, {
            status: "skipped",
            error: "Kredit tidak cukup",
          })
        }
        setError("Kredit habis di tengah batch. Item tersisa di-skip.")
        break
      }

      if (!item.preview) {
        updateBulkItem(item.id, { status: "failed", error: "Preview gambar kosong." })
        failed++
        processed++
        setBulkProgress({ done: processed, total: targets.length })
        continue
      }

      updateBulkItem(item.id, { status: "generating", error: undefined })

      try {
        const data = await callPromptApi(item.preview, item.fileName || "image-prompt")
        updateBulkItem(item.id, {
          status: "done",
          prompt: data.prompt || "",
          negativePrompt: data.negativePrompt || "",
          tags: Array.isArray(data.tags) ? data.tags : [],
          variants: Array.isArray(data.variants) ? data.variants : [],
          error: undefined,
        })
        if (data.creditsRemaining !== null && data.creditsRemaining !== undefined) {
          localCredits = data.creditsRemaining
          setCreditsLeft(data.creditsRemaining)
        } else if (!isUnlimited) {
          localCredits = Math.max(0, localCredits - CREDITS_PER_GENERATE)
          setCreditsLeft(localCredits)
        }
        success++
      } catch (err) {
        updateBulkItem(item.id, {
          status: "failed",
          error: err instanceof Error ? err.message : "Gagal generate prompt.",
        })
        failed++
      }

      processed++
      setBulkProgress({ done: processed, total: targets.length })

      // Small gap between items to reduce OpenAI rate-limit flakes
      if (processed < targets.length && !stopBulkRef.current) {
        await new Promise((r) => setTimeout(r, 400))
      }
    }

    setIsBulkRunning(false)
    if (!stopBulkRef.current) {
      setInfo(`Bulk selesai: ${success} sukses, ${failed} gagal.`)
    }
  }

  const stopBulk = () => {
    stopBulkRef.current = true
  }

  const removeBulkItem = (id: string) => {
    if (isBulkRunning) return
    setBulkItems((prev) => prev.filter((i) => i.id !== id))
  }

  const clearBulk = () => {
    if (isBulkRunning) return
    setBulkItems([])
    setBulkProgress({ done: 0, total: 0 })
    setError(null)
    setInfo(null)
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

  const copyAllPrompts = async () => {
    const lines = bulkItems
      .filter((i) => i.status === "done" && i.prompt)
      .map((i) => `## ${i.fileName}\n${i.prompt}`)
    if (!lines.length) {
      setError("Belum ada prompt sukses untuk di-copy.")
      return
    }
    await copyText(lines.join("\n\n"), "Semua prompt")
  }

  const clearSingle = () => {
    setPreview(null)
    setFileName("")
    resetSingleResult()
    setError(null)
    setInfo(null)
  }

  // Admin-only while testing
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
            1 kredit / generate · bulk support
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
          <div className="sm:ml-auto flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-medium">
              {CREDITS_PER_GENERATE} kredit / generate
            </span>
            <span className="text-sm text-gray-500">
              Kredit:{" "}
              <span
                className={`font-medium ${
                  !isUnlimited && currentCredits <= 5 ? "text-red-400" : "text-gray-200"
                }`}
              >
                {displayCredits}
              </span>
            </span>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.02] p-1">
          <button
            type="button"
            disabled={isBulkRunning}
            onClick={() => {
              setMode("single")
              setError(null)
              setInfo(null)
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === "single"
                ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                : "text-gray-400 hover:text-gray-200 border border-transparent"
            }`}
          >
            <ScanText className="w-4 h-4" />
            Single
          </button>
          <button
            type="button"
            disabled={isGenerating}
            onClick={() => {
              setMode("bulk")
              setError(null)
              setInfo(null)
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === "bulk"
                ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                : "text-gray-400 hover:text-gray-200 border border-transparent"
            }`}
          >
            <Layers className="w-4 h-4" />
            Bulk
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10">
              max {MAX_BULK_FILES}
            </span>
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

        {mode === "single" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    onClick={() => singleInputRef.current?.click()}
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
                      onClick={clearSingle}
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
                  ref={singleInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleSingleFileChange}
                />
              </section>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleSingleGenerate}
                  disabled={!preview || isGenerating || !canAffordOne}
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
                    resetSingleResult()
                    setError(null)
                    setInfo(null)
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 hover:bg-white/5 text-gray-300 text-sm px-4 py-3"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset
                </button>
              </div>

              <p className="text-xs text-gray-500 leading-relaxed">
                1 gambar = 1 kredit. Lifetime memakai API key OpenAI sendiri (tanpa potong kredit).
              </p>
            </div>

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

                    {variants.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-white/5">
                        <div className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
                          Variant Prompts (Anti-Similar)
                        </div>
                        {variants.map((v, i) => (
                          <div
                            key={i}
                            className="group relative rounded-xl border border-white/5 bg-white/[0.02] p-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="shrink-0 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                {String.fromCharCode(65 + i)}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyText(v, `Variant ${String.fromCharCode(65 + i)}`)}
                                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-white"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-xs text-gray-300 mt-1.5 leading-relaxed">
                              {v}
                            </p>
                          </div>
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
                        onClick={handleSingleGenerate}
                        disabled={!preview || isGenerating || !canAffordOne}
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
        ) : (
          <div className="space-y-4">
            {/* Bulk upload */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-gray-200">Bulk upload</div>
                <div className="text-xs text-gray-500">
                  {bulkItems.length}/{MAX_BULK_FILES} gambar · estimasi{" "}
                  <span className="text-gray-300 font-medium">
                    {isUnlimited ? "∞" : estimatedCredits} kredit
                  </span>
                </div>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => !isBulkRunning && bulkInputRef.current?.click()}
                className={`rounded-xl border-2 border-dashed transition-all min-h-[140px] flex flex-col items-center justify-center gap-2 px-4 ${
                  isBulkRunning ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                } ${
                  isDragging
                    ? "border-cyan-400 bg-cyan-500/10"
                    : "border-white/10 hover:border-cyan-500/40 hover:bg-white/[0.03]"
                }`}
              >
                <Layers className="w-7 h-7 text-gray-500" />
                <p className="text-sm text-gray-300 font-medium">
                  Drag & drop banyak gambar, atau klik untuk pilih
                </p>
                <p className="text-xs text-gray-500">
                  JPG, PNG, WebP · max 5 MB/file · max {MAX_BULK_FILES}/batch
                </p>
              </div>

              <input
                ref={bulkInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={handleBulkFileChange}
              />

              <div className="flex flex-wrap gap-2">
                {!isBulkRunning ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleBulkGenerate(false)}
                      disabled={!bulkItems.length || (!isUnlimited && currentCredits < 1)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:from-slate-700 disabled:to-slate-700 disabled:text-gray-500 text-white font-medium text-sm px-4 py-2.5 shadow-lg shadow-cyan-500/20 disabled:shadow-none"
                    >
                      <ScanText className="w-4 h-4" />
                      Generate All
                      <span className="text-[11px] opacity-90 bg-black/20 px-1.5 py-0.5 rounded-md">
                        sequential
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkGenerate(true)}
                      disabled={!failedBulkCount && !bulkItems.some((i) => i.status === "skipped")}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/15 text-cyan-300 text-sm px-4 py-2.5 disabled:opacity-40"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Retry Failed
                    </button>
                    <button
                      type="button"
                      onClick={copyAllPrompts}
                      disabled={!doneBulkCount}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 hover:bg-white/5 text-gray-300 text-sm px-4 py-2.5 disabled:opacity-40"
                    >
                      <Copy className="w-4 h-4" />
                      Copy All
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadCsv(bulkItems)}
                      disabled={!bulkItems.length}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 hover:bg-white/5 text-gray-300 text-sm px-4 py-2.5 disabled:opacity-40"
                    >
                      <Download className="w-4 h-4" />
                      Export CSV
                    </button>
                    <button
                      type="button"
                      onClick={clearBulk}
                      disabled={!bulkItems.length}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 hover:bg-white/5 text-gray-400 text-sm px-4 py-2.5 disabled:opacity-40"
                    >
                      <X className="w-4 h-4" />
                      Clear
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-700 text-gray-300 font-medium text-sm px-4 py-2.5"
                    >
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing {bulkProgress.done}/{bulkProgress.total}
                    </button>
                    <button
                      type="button"
                      onClick={stopBulk}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/15 text-red-300 text-sm px-4 py-2.5"
                    >
                      <Square className="w-4 h-4" />
                      Stop
                    </button>
                  </>
                )}
              </div>

              {isBulkRunning && bulkProgress.total > 0 && (
                <div className="space-y-1.5">
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((bulkProgress.done / bulkProgress.total) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Sequential · 1 request / gambar · kredit dipotong setelah sukses
                  </p>
                </div>
              )}
            </section>

            {/* Bulk list */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
              {!bulkItems.length ? (
                <div className="py-16 text-center text-sm text-gray-500">
                  Belum ada gambar di batch. Upload dulu untuk mulai bulk generate.
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {bulkItems.map((item, idx) => (
                    <div key={item.id} className="p-4 flex flex-col sm:flex-row gap-4">
                      <div className="flex gap-3 sm:w-56 shrink-0">
                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-white/10 bg-slate-950 shrink-0">
                          {item.preview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.preview}
                              alt={item.fileName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-600">
                              N/A
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs text-gray-500">#{idx + 1}</div>
                          <div className="text-sm text-gray-200 truncate" title={item.fileName}>
                            {item.fileName}
                          </div>
                          <span
                            className={`inline-flex mt-1 text-[10px] px-1.5 py-0.5 rounded-md border ${statusBadge(
                              item.status
                            )}`}
                          >
                            {item.status === "generating" && (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            )}
                            {statusLabel(item.status)}
                          </span>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 space-y-2">
                        {item.status === "done" ? (
                          <>
                            <textarea
                              value={item.prompt}
                              onChange={(e) => updateBulkItem(item.id, { prompt: e.target.value })}
                              rows={3}
                              className="w-full rounded-xl bg-slate-950/60 border border-white/10 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 resize-y"
                            />
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => copyText(item.prompt, "Prompt")}
                                className="inline-flex items-center gap-1.5 text-xs text-cyan-300 hover:text-cyan-200"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                Copy prompt
                              </button>
                              {item.negativePrompt && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    copyText(item.negativePrompt, "Negative prompt")
                                  }
                                  className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200"
                                >
                                  Copy negative
                                </button>
                              )}
                            </div>
                          </>
                        ) : item.status === "failed" || item.status === "skipped" ? (
                          <p className="text-sm text-red-300/90">{item.error || "Gagal"}</p>
                        ) : item.status === "generating" ? (
                          <p className="text-sm text-cyan-300/90">Menganalisis gambar...</p>
                        ) : (
                          <p className="text-sm text-gray-500">Menunggu antrian...</p>
                        )}
                      </div>

                      {!isBulkRunning && (
                        <button
                          type="button"
                          onClick={() => removeBulkItem(item.id)}
                          className="self-start p-1.5 rounded-lg border border-white/10 text-gray-500 hover:text-gray-200 hover:bg-white/5"
                          aria-label="Hapus item"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <p className="text-xs text-gray-500 leading-relaxed">
              Bulk memakai endpoint yang sama (`/api/prompt`) secara berurutan. Tutup tab =
              batch berhenti. Kredit hanya terpotong untuk item yang sukses.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ImagePlus,
  Sparkles,
  FileText,
  Tags,
  Copy,
  Check,
  X,
  RefreshCw,
  Download,
  Clipboard,
  Upload,
  Plus,
  AlertCircle,
} from "lucide-react"
import DashboardLayout from "~/components/dashboard/DashboardLayout"
import { useUser } from "~/hooks/useUser"

// Types
type Relevance = "high" | "medium" | "low"
type FilterTab = "all" | "high" | "medium" | "low"

interface Keyword {
  id: string
  text: string
  relevance: Relevance
}

// Page states
type PageState = "upload" | "processing" | "results" | "batch-processing" | "batch-results"

interface BatchResult {
  filename: string
  preview: string
  title: string
  description: string
  keywords: string[]
  category: string
  status: "success" | "error"
  error?: string
}

// Copy button component
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.9 }}
      onClick={handleCopy}
      className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all"
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.div
            key="check"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          </motion.div>
        ) : (
          <motion.div
            key="copy"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Copy className="w-3.5 h-3.5" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

function getTagClasses(relevance: Relevance): string {
  switch (relevance) {
    case "high":
      return "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
    case "medium":
      return "bg-amber-500/10 border-amber-500/30 text-amber-300"
    case "low":
      return "bg-red-500/10 border-red-500/30 text-red-300"
      return "bg-slate-700/50 border-white/10 text-gray-400"
  }
}

export default function GeneratePage() {
  const [pageState, setPageState] = useState<PageState>("upload")
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [generatedTitle, setGeneratedTitle] = useState("")
  const [generatedDescription, setGeneratedDescription] = useState("")
  const [filterTab, setFilterTab] = useState<FilterTab>("all")
  const [newKeyword, setNewKeyword] = useState("")
  const [copyMetaCopied, setCopyMetaCopied] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [currentFilename, setCurrentFilename] = useState("asset.jpg")
  const [creditsLeft, setCreditsLeft] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Batch state
  const [batchFiles, setBatchFiles] = useState<File[]>([])
  const [batchPreviews, setBatchPreviews] = useState<string[]>([])
  const [batchResults, setBatchResults] = useState<BatchResult[]>([])
  const [batchProgress, setBatchProgress] = useState(0)
  const [batchTotal, setBatchTotal] = useState(0)

  const { planType, credits } = useUser()
  const isBatchMode = batchFiles.length > 1

  // Sync credits from session on mount
  useEffect(() => {
    if (credits !== undefined) setCreditsLeft(credits)
  }, [credits])

  const handleGenerate = async (brief: string, filename: string) => {
    setPageState("processing")
    setError(null)

    // Read API key from localStorage — hanya diperlukan untuk lifetime plan
    const savedApiKey = typeof window !== "undefined" ? localStorage.getItem("autofillstock_openai_key") || "" : ""

    // Guard: hanya lifetime plan yang wajib punya API key sendiri
    if (planType === "lifetime" && !savedApiKey) {
      setError("API key OpenAI belum diatur. Silakan masuk ke Pengaturan untuk menambahkan API key Anda.")
      setPageState("upload")
      return
    }

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetBrief: brief,
          filename,
          platform: "web",
          userApiKey: planType === "lifetime" ? savedApiKey : undefined
        }),
      })

      // Cek apakah response adalah JSON — kalau HTML berarti session expired atau error server
      const contentType = res.headers.get("content-type") || ""
      if (!contentType.includes("application/json")) {
        if (res.status === 401 || res.redirected) {
          throw new Error("Sesi login habis. Silakan refresh halaman dan login ulang.")
        }
        if (res.status === 413) {
          throw new Error("Ukuran gambar terlalu besar. Kompres gambar terlebih dahulu.")
        }
        throw new Error("Terjadi kesalahan server. Silakan coba lagi.")
      }

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Gagal generate metadata.")
      }

      // Map API keywords to keyword objects with relevance tiers
      const kwds: Keyword[] = (data.metadata.keywords ?? []).map(
        (kw: string, i: number) => ({
          id: i.toString(),
          text: kw,
          relevance: (i < 12 ? "high" : i < 32 ? "medium" : "low") as Relevance,
        })
      )
      setKeywords(kwds)
      setGeneratedTitle(data.metadata.title ?? "")
      setGeneratedDescription(data.metadata.description ?? "")
      setPageState("results")

      if (data.creditsRemaining !== null && data.creditsRemaining !== undefined) {
        setCreditsLeft(data.creditsRemaining)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.")
      setPageState("upload")
    }
  }

  const handleFileSelected = async (file: File) => {
    // ✅ Validasi format — hanya gambar JPG/PNG/WebP/GIF
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) {
      setError('Format file tidak didukung. Gunakan JPG, PNG, atau WebP.')
      return
    }
    // ✅ Validasi ukuran — maksimal 2MB
    if (file.size > 2 * 1024 * 1024) {
      setError('Ukuran file terlalu besar. Maksimal 2 MB.')
      return
    }

    if (imagePreview) URL.revokeObjectURL(imagePreview)
    const previewUrl = URL.createObjectURL(file)
    setImagePreview(previewUrl)
    const filename = file.name
    setCurrentFilename(filename)

    // ✅ Konversi gambar ke base64 agar AI bisa melihat isi gambar
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      void handleGenerate(base64, filename)
    }
    reader.readAsDataURL(file)
  }

  const handleMultipleFiles = (fileList: FileList) => {
    setError(null)
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    const files: File[] = []
    const errors: string[] = []

    Array.from(fileList).forEach((file) => {
      if (!allowed.includes(file.type)) {
        errors.push(`${file.name}: format tidak didukung`)
        return
      }
      if (file.size > 2 * 1024 * 1024) {
        errors.push(`${file.name}: ukuran melebihi 2MB`)
        return
      }
      files.push(file)
    })

    if (files.length === 0) {
      setError(errors.length > 0 ? errors[0] : 'Tidak ada file valid.')
      return
    }
    if (files.length > 10) {
      setError('Maksimal 10 file sekaligus.')
      return
    }

    if (files.length === 1) {
      void handleFileSelected(files[0])
      return
    }

    // Batch mode: buat preview URLs dulu sebelum processing
    const previews = files.map((f) => URL.createObjectURL(f))
    setBatchFiles(files)
    setBatchPreviews(previews)
    void handleBatchGenerate(files, previews)
  }

  const handleBatchGenerate = async (files: File[], previews: string[]) => {
    // ✅ Cek kredit cukup sebelum mulai batch (hanya untuk free/topup plan)
    if (planType !== "lifetime" && planType !== "starter") {
      const currentCredits = creditsLeft ?? credits ?? 0
      if (currentCredits < files.length) {
        setError(`Kredit tidak cukup. Kamu punya ${currentCredits} kredit, butuh ${files.length} kredit untuk ${files.length} gambar.`)
        return
      }
    }

    setPageState("batch-processing")
    setBatchTotal(files.length)
    setBatchProgress(0)
    const results: BatchResult[] = []

    for (let i = 0; i < files.length; i++) {
      setBatchProgress(i + 1)
      try {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(files[i])
        })

        const savedApiKey = typeof window !== "undefined" ? localStorage.getItem("autofillstock_openai_key") || "" : ""

        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assetBrief: base64,
            filename: files[i].name,
            platform: "web",
            userApiKey: planType === "lifetime" ? savedApiKey : undefined
          }),
        })

        const contentType = res.headers.get("content-type") || ""
        if (!contentType.includes("application/json")) {
          if (res.status === 401 || res.redirected) throw new Error("Sesi login habis. Silakan refresh halaman.")
          if (res.status === 413) throw new Error("Ukuran gambar terlalu besar.")
          throw new Error("Terjadi kesalahan server. Silakan coba lagi.")
        }

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Gagal generate metadata.")

        // ✅ Update creditsLeft setelah setiap iterasi sukses
        if (data.creditsRemaining !== null && data.creditsRemaining !== undefined) {
          setCreditsLeft(data.creditsRemaining)
        }

        results.push({
          filename: files[i].name,
          preview: previews[i],
          title: data.metadata.title || "",
          description: data.metadata.description || "",
          keywords: data.metadata.keywords || [],
          category: data.metadata.category || "",
          status: "success"
        })
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Gagal generate"
        results.push({
          filename: files[i].name,
          preview: previews[i],
          title: "",
          description: "",
          keywords: [],
          category: "",
          status: "error",
          error: errMsg
        })
        // ✅ Stop early jika kredit habis — iterasi selanjutnya pasti gagal
        if (errMsg.includes("Kredit habis") || errMsg.includes("top up")) break
      }
    }

    setBatchResults(results)
    setPageState("batch-results")
  }

  const exportBatchCSV = () => {
    const header = "Filename,Title,Description,Keywords,Category"
    const rows = batchResults.map((r) => {
      const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
      return [
        esc(r.filename),
        esc(r.title),
        esc(r.description),
        esc(r.keywords.join("; ")),
        esc(r.category),
      ].join(",")
    })
    const csv = [header, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "batch-metadata.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetBatchToUpload = () => {
    batchPreviews.forEach((url) => URL.revokeObjectURL(url))
    setBatchFiles([])
    setBatchPreviews([])
    setBatchResults([])
    setBatchProgress(0)
    setBatchTotal(0)
    setPageState("upload")
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = e.dataTransfer.files
    if (!files || files.length === 0) return
    if (files.length > 1 && planType !== 'free') {
      handleMultipleFiles(files)
    } else {
      void handleFileSelected(files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    if (files.length > 1 && planType !== 'free') {
      handleMultipleFiles(files)
    } else {
      void handleFileSelected(files[0])
    }
    // reset input so same files can be re-selected
    e.target.value = ""
  }

  const addKeyword = () => {
    const trimmed = newKeyword.trim()
    if (!trimmed) return
    setKeywords((prev) => [
      ...prev,
      { id: Date.now().toString(), text: trimmed, relevance: "medium" },
    ])
    setNewKeyword("")
    inputRef.current?.focus()
  }

  const removeKeyword = (id: string) => {
    setKeywords((prev) => prev.filter((k) => k.id !== id))
  }

  const filteredKeywords =
    filterTab === "all" ? keywords : keywords.filter((k) => k.relevance === filterTab)

  const handleCopyAllMeta = () => {
    const allText = [
      `Title: ${generatedTitle}`,
      `\nDescription: ${generatedDescription}`,
      `\nKeywords: ${keywords.map((k) => k.text).join(", ")}`,
    ].join("")
    navigator.clipboard.writeText(allText).catch(() => {})
    setCopyMetaCopied(true)
    setTimeout(() => setCopyMetaCopied(false), 2000)
  }

  const resetToUpload = () => {
    setPageState("upload")
    setKeywords([])
    setGeneratedTitle("")
    setGeneratedDescription("")
    setFilterTab("all")
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <DashboardLayout title="Generate Metadata">
      <div className="w-full space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Generate Metadata</h1>
          <p className="text-gray-400 mt-1">
            Upload aset dan dapatkan metadata siap pakai untuk microstock.
          </p>
        </div>

        {/* Credits badge */}
        {planType === "lifetime" && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>
              Paket <span className="text-purple-400 font-semibold">One-time</span> — Unlimited (pakai API key sendiri)
            </span>
          </div>
        )}
        {planType !== "starter" && planType !== "lifetime" && creditsLeft !== null && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>
              Kredit tersisa:{" "}
              <span
                className={`font-semibold ${
                  creditsLeft <= 5 ? "text-red-400" : "text-emerald-400"
                }`}
              >
                {creditsLeft}
              </span>
            </span>
          </div>
        )}
        {planType === "starter" && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>
              Paket <span className="text-blue-400 font-semibold">Starter</span> — API key
              disediakan sistem (fair use 200/hari)
            </span>
          </div>
        )}

        {/* Error alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4"
            >
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400/60 hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {/* ── UPLOAD STATE ── */}
          {pageState === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple={planType !== 'free'}
                className="hidden"
                onChange={handleFileInput}
              />
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragOver(true)
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed p-16 cursor-pointer transition-all duration-300 ${
                  isDragOver
                    ? "border-blue-500/70 bg-blue-500/5 scale-[1.01]"
                    : "border-white/10 bg-slate-900 hover:border-white/20 hover:bg-slate-900/80"
                }`}
              >
                <div
                  className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    isDragOver ? "bg-blue-500/20" : "bg-slate-800"
                  }`}
                >
                  <ImagePlus
                    className={`w-10 h-10 transition-colors duration-300 ${
                      isDragOver ? "text-blue-400" : "text-gray-500"
                    }`}
                  />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-gray-200">
                    {isDragOver
                      ? "Lepas file di sini"
                      : planType !== 'free'
                      ? "Drop hingga 10 file atau klik untuk upload"
                      : "Drop file atau klik untuk upload"}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    JPG, PNG, WebP — maks 2 MB{planType !== 'free' ? ' · hingga 10 file' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <Upload className="w-3.5 h-3.5" />
                  <span>File tidak disimpan di server</span>
                </div>
              </div>

              {/* Quick test — manual brief */}
              <div className="mt-4 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Atau ketik deskripsi aset secara manual..."
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const val = (e.target as HTMLInputElement).value.trim()
                      if (val) {
                        setCurrentFilename("manual-input.jpg")
                        void handleGenerate(val, "manual-input.jpg")
                      }
                    }
                  }}
                />
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all flex items-center gap-2"
                  onClick={(e) => {
                    const input = (e.currentTarget.previousSibling as HTMLInputElement)
                    const val = input?.value?.trim()
                    if (val) {
                      setCurrentFilename("manual-input.jpg")
                      void handleGenerate(val, "manual-input.jpg")
                    }
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                  Generate
                </motion.button>
              </div>
              {planType === 'free' && (
                <div className="mt-3 flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                  <span>💡</span>
                  <span>Upgrade ke paket berbayar untuk generate hingga <strong>10 gambar sekaligus</strong></span>
                  <a href="/dashboard/billing" className="ml-auto underline whitespace-nowrap">Upgrade →</a>
                </div>
              )}
            </motion.div>
          )}

          {/* ── BATCH PROCESSING STATE ── */}
          {pageState === "batch-processing" && (
            <motion.div
              key="batch-processing"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center gap-6 py-24 rounded-2xl bg-slate-900 border border-white/10"
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-2 border-blue-500/20 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 rounded-full border-t-2 border-blue-500"
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-blue-400" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-lg font-semibold text-gray-100">Memproses batch…</p>
                <p className="text-sm text-gray-500">
                  Memproses <span className="text-gray-300 font-medium">{batchProgress}</span> dari{" "}
                  <span className="text-gray-300 font-medium">{batchTotal}</span> gambar...
                </p>
              </div>
              {/* Progress bar */}
              <div className="w-full max-w-xs bg-slate-800 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: batchTotal > 0 ? `${(batchProgress / batchTotal) * 100}%` : "0%" }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <p className="text-xs text-gray-600">
                {batchTotal > 0 ? Math.round((batchProgress / batchTotal) * 100) : 0}% selesai
              </p>
            </motion.div>
          )}

          {/* ── BATCH RESULTS STATE ── */}
          {pageState === "batch-results" && (
            <motion.div
              key="batch-results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Top action bar */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-100">Hasil Batch Generate</h2>
                  <p className="text-sm text-gray-500">
                    {batchResults.filter((r) => r.status === "success").length} berhasil ·{" "}
                    {batchResults.filter((r) => r.status === "error").length} gagal dari {batchResults.length} gambar
                  </p>
                </div>
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={exportBatchCSV}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 border border-white/10 hover:bg-slate-700 text-gray-300 text-sm font-medium rounded-xl transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={resetBatchToUpload}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 border border-white/10 hover:bg-slate-700 text-gray-300 text-sm font-medium rounded-xl transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Generate Ulang
                  </motion.button>
                </div>
              </div>

              {/* Grid cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {batchResults.map((result, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden flex flex-col"
                  >
                    {/* Thumbnail */}
                    <div className="relative w-full aspect-video bg-slate-800 overflow-hidden">
                      {result.preview ? (
                        <img
                          src={result.preview}
                          alt={result.filename}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText className="w-8 h-8 text-gray-600" />
                        </div>
                      )}
                      {/* Status badge */}
                      <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                        result.status === "success"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-red-500/20 text-red-300 border border-red-500/30"
                      }`}>
                        {result.status === "success" ? "✅ Berhasil" : "❌ Gagal"}
                      </div>
                    </div>

                    <div className="p-4 flex flex-col gap-3 flex-1">
                      {/* Filename */}
                      <p className="text-xs text-gray-500 truncate">{result.filename}</p>

                      {result.status === "error" ? (
                        <p className="text-xs text-red-400 bg-red-500/10 rounded-lg p-2">{result.error}</p>
                      ) : (
                        <>
                          {/* Title */}
                          <div className="bg-slate-800/50 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Title</span>
                              <CopyButton text={result.title} />
                            </div>
                            <p className="text-sm text-gray-200 line-clamp-2">{result.title}</p>
                          </div>

                          {/* Description */}
                          <div className="bg-slate-800/50 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Description</span>
                              <CopyButton text={result.description} />
                            </div>
                            <p className="text-xs text-gray-400 line-clamp-3">{result.description}</p>
                          </div>

                          {/* Keywords */}
                          <div className="bg-slate-800/50 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Keywords</span>
                              <CopyButton text={result.keywords.join(", ")} />
                            </div>
                            <p className="text-xs text-gray-400 line-clamp-2">{result.keywords.join(", ")}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Bottom export button */}
              <div className="flex justify-center pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={exportBatchCSV}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20"
                >
                  <Download className="w-4 h-4" />
                  Export Semua ke CSV
                </motion.button>
              </div>
            </motion.div>
          )}
          {pageState === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center gap-6 py-24 rounded-2xl bg-slate-900 border border-white/10"
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-2 border-blue-500/20 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 rounded-full border-t-2 border-blue-500"
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-blue-400" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-lg font-semibold text-gray-100">Generating metadata…</p>
                <p className="text-sm text-gray-500">
                  AI sedang menganalisis{" "}
                  <span className="text-gray-300 font-medium">{currentFilename}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                {["Title", "Description", "Keywords"].map((step, i) => (
                  <React.Fragment key={step}>
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4 }}
                      className="text-gray-400"
                    >
                      {step}
                    </motion.span>
                    {i < 2 && <span className="text-gray-700">→</span>}
                  </React.Fragment>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── RESULTS STATE ── */}
          {pageState === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* LEFT — Image Preview (col-span-2) */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Image preview card */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden"
                  >
                    {imagePreview ? (
                      <div className="w-full aspect-video overflow-hidden">
                        <img
                          src={imagePreview}
                          alt={currentFilename}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-full aspect-video flex items-center justify-center bg-slate-800">
                        <div className="text-center">
                          <FileText className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">Preview tidak tersedia</p>
                        </div>
                      </div>
                    )}
                    <div className="p-4 space-y-2">
                      <p className="text-sm font-medium text-gray-200 truncate">{currentFilename}</p>
                      <p className="text-xs text-gray-500">File tidak disimpan di server</p>
                    </div>
                  </motion.div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCopyAllMeta}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-sm font-semibold rounded-xl transition-all"
                    >
                      <Clipboard className="w-4 h-4" />
                      {copyMetaCopied ? "Tersalin!" : "Copy Semua Metadata"}
                    </motion.button>
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={resetToUpload}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 border border-white/10 hover:bg-slate-700 text-gray-300 text-sm font-medium rounded-xl transition-all"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Generate Baru
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          const csv = `Title,Description,Keywords\n"${generatedTitle}","${generatedDescription}","${keywords.map(k => k.text).join('; ')}"`
                          const blob = new Blob([csv], { type: 'text/csv' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `${currentFilename.replace(/\.[^/.]+$/, '')}-metadata.csv`
                          a.click()
                          URL.revokeObjectURL(url)
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 border border-white/10 hover:bg-slate-700 text-gray-300 text-sm font-medium rounded-xl transition-all"
                      >
                        <Download className="w-4 h-4" />
                        Export CSV
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* RIGHT — Metadata Results (col-span-3) */}
                <div className="lg:col-span-3 space-y-4">

                {/* Title card */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-slate-900 border border-white/10 rounded-2xl p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-semibold text-gray-200">Title</span>
                    </div>
                    <CopyButton text={generatedTitle} />
                  </div>
                  <p className="text-gray-100 text-sm leading-relaxed">{generatedTitle}</p>
                  <p className="text-xs text-gray-600 mt-2">{generatedTitle.length} karakter</p>
                </motion.div>

                {/* Description card */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-slate-900 border border-white/10 rounded-2xl p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-semibold text-gray-200">Description</span>
                    </div>
                    <CopyButton text={generatedDescription} />
                  </div>
                  <p className="text-gray-100 text-sm leading-relaxed">{generatedDescription}</p>
                  <p className="text-xs text-gray-600 mt-2">
                    {generatedDescription.length} karakter
                  </p>
                </motion.div>

                {/* Keywords card */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-slate-900 border border-white/10 rounded-2xl p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Tags className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-semibold text-gray-200">
                        Keywords{" "}
                        <span className="text-gray-500 font-normal">({keywords.length})</span>
                      </span>
                    </div>
                    <CopyButton text={keywords.map((k) => k.text).join(", ")} />
                  </div>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-1 mb-4">
                    {(["all", "high", "medium", "low"] as FilterTab[]).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setFilterTab(tab)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                          filterTab === tab
                            ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                        }`}
                      >
                        {tab === "all" ? `Semua (${keywords.length})` : tab}
                      </button>
                    ))}
                  </div>

                  {/* Tags grid */}
                  <div className="flex flex-wrap gap-2 mb-4 max-h-64 overflow-y-auto pr-1">
                    <AnimatePresence>
                      {filteredKeywords.map((kw) => (
                        <motion.div
                          key={kw.id}
                          layout
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          whileHover={{ scale: 1.05, y: -2 }}
                          transition={{ duration: 0.2 }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${getTagClasses(kw.relevance)}`}
                        >
                          <span>{kw.text}</span>
                          <button
                            onClick={() => removeKeyword(kw.id)}
                            className="opacity-50 hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Add keyword input */}
                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addKeyword()
                      }}
                      placeholder="Tambah keyword..."
                      className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={addKeyword}
                      className="px-4 py-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 text-sm font-medium hover:bg-blue-500/25 transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </motion.button>
                  </div>
                </motion.div>

                {/* Bottom action bar */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="sticky bottom-0 rounded-2xl bg-slate-900/95 backdrop-blur-sm border border-white/10 p-4 flex flex-wrap items-center gap-3"
                >
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      const filename2 = currentFilename
                      const brief = `File: ${filename2}. Generate relevant microstock metadata based on the filename.`
                      void handleGenerate(brief, filename2)
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-sm text-gray-300 font-medium hover:bg-slate-700 transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Regenerate
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleCopyAllMeta}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ml-auto ${
                      copyMetaCopied
                        ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-300"
                        : "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
                    }`}
                  >
                    {copyMetaCopied ? <Check className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
                    {copyMetaCopied ? "Copied!" : "Copy All Metadata"}
                  </motion.button>

                  <div className="w-full mt-2 flex justify-end">
                    <span className="text-xs text-gray-500">
                      {planType === "starter" || planType === "lifetime"
                        ? "Unlimited"
                        : creditsLeft !== null
                        ? `${creditsLeft} kredit tersisa`
                        : "1 kredit digunakan"}
                    </span>
                  </div>
                </motion.div>
              </div>{/* end right col */}
            </div>{/* end 2-col grid */}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  )
}

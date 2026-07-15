import React, { useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ImagePlus,
  Download,
  ArrowUpFromLine,
  Crown,
  Zap,
  AlertCircle,
  X,
  RefreshCw,
  CheckCircle2,
} from "lucide-react"
import DashboardLayout from "~/components/dashboard/DashboardLayout"
import { useSession } from "next-auth/react"
import { useUser } from "~/hooks/useUser"

const ADMIN_EMAIL = "ardika.yudha08@gmail.com"
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

type Tier = "standard" | "premium"

const TIERS: Record<Tier, { label: string; credits: number; color: string; icon: React.ReactNode; description: string }> = {
  standard: {
    label: "Standard",
    credits: 2,
    color: "emerald",
    icon: <Zap className="w-5 h-5" />,
    description: "4× upscale — cocok untuk foto & ilustrasi umum",
  },
  premium: {
    label: "Premium",
    credits: 5,
    color: "purple",
    icon: <Crown className="w-5 h-5" />,
    description: "2× upscale dengan detail & ketajaman ekstra tinggi",
  },
}

export default function UpscalePage() {
  const { data: session } = useSession()
  const { credits } = useUser()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [tier, setTier] = useState<Tier>("standard")
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isAdmin = session?.user?.email === ADMIN_EMAIL

  // ── Coming Soon for non-admin ─────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <DashboardLayout title="Upscale">
        <div className="flex flex-col items-center justify-center min-h-[32rem] gap-5">
          <div className="w-20 h-20 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <ArrowUpFromLine className="w-10 h-10 text-purple-400" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-100">Coming Soon</h2>
            <p className="text-gray-400 max-w-md">
              Fitur upscaling gambar sedang dalam pengembangan. Segera hadir untuk semua pengguna!
            </p>
          </div>
          <div className="flex gap-3 flex-wrap justify-center">
            <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-lg font-medium">
              Standard — 2 kredit · Real-ESRGAN 4×
            </span>
            <span className="px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs rounded-lg font-medium">
              Premium — 5 kredit · Clarity 2×
            </span>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function processFile(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Format tidak didukung. Gunakan JPG, PNG, atau WebP.")
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Ukuran file maksimal 5 MB.")
      return
    }
    setError(null)
    setResult(null)
    setSelectedFile(file)

    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleReset = () => {
    setSelectedFile(null)
    setPreview(null)
    setResult(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleUpscale = async () => {
    if (!preview) return
    setIsProcessing(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch("/api/upscale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: preview, tier }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Terjadi kesalahan.")
      setResult(data.upscaledImageBase64)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat upscaling.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownload = () => {
    if (!result) return
    const a = document.createElement("a")
    a.href = result
    a.download = `upscale-${tier}-${Date.now()}.png`
    a.click()
  }

  // ── Admin UI ──────────────────────────────────────────────────────────────
  return (
    <DashboardLayout title="Upscale">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <ArrowUpFromLine className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-100">Image Upscaling</h1>
            <p className="text-sm text-gray-500">Tingkatkan resolusi gambar dengan AI</p>
          </div>
          <div className="ml-auto text-sm text-gray-500">
            Kredit: <span className="text-gray-200 font-medium">{credits}</span>
          </div>
        </div>

        {/* Tier selector */}
        <div className="grid grid-cols-2 gap-3">
          {(Object.entries(TIERS) as [Tier, typeof TIERS.standard][]).map(([key, t]) => {
            const isActive = tier === key
            const colorMap: Record<string, string> = {
              emerald: isActive
                ? "border-emerald-500/60 bg-emerald-500/10"
                : "border-white/10 hover:border-emerald-500/30 hover:bg-emerald-500/5",
              purple: isActive
                ? "border-purple-500/60 bg-purple-500/10"
                : "border-white/10 hover:border-purple-500/30 hover:bg-purple-500/5",
            }
            const iconColor = t.color === "emerald" ? "text-emerald-400" : "text-purple-400"
            const badgeColor =
              t.color === "emerald"
                ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                : "bg-purple-500/10 text-purple-300 border border-purple-500/30"

            return (
              <button
                key={key}
                onClick={() => setTier(key)}
                className={`p-4 rounded-xl border text-left transition-all duration-200 ${colorMap[t.color]}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className={`${iconColor} mt-0.5`}>{t.icon}</div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeColor}`}>
                    {t.credits} kredit
                  </span>
                </div>
                <p className="mt-2 font-semibold text-gray-100 text-sm">{t.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t.credits} kredit</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{t.description}</p>
              </button>
            )
          })}
        </div>

        {/* Drop zone / Preview */}
        {!preview ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200 ${
              isDragging
                ? "border-purple-500/60 bg-purple-500/10"
                : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center">
              <ImagePlus className="w-7 h-7 text-gray-500" />
            </div>
            <div className="text-center">
              <p className="text-gray-300 font-medium">Drag & drop gambar ke sini</p>
              <p className="text-gray-600 text-sm mt-1">atau klik untuk memilih file</p>
              <p className="text-gray-700 text-xs mt-2">JPG, PNG, WebP · maks 5 MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Before / After */}
            <div className={`grid gap-4 ${result ? "grid-cols-2" : "grid-cols-1 max-w-md mx-auto w-full"}`}>
              {/* Original */}
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider px-1">Original</p>
                <div className="rounded-xl overflow-hidden border border-white/10 bg-slate-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt="Original"
                    className="w-full h-auto object-contain max-h-80"
                  />
                </div>
                <p className="text-xs text-gray-600 px-1">{selectedFile?.name}</p>
              </div>

              {/* Result */}
              {result && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider px-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Hasil Upscale
                  </p>
                  <div className="rounded-xl overflow-hidden border border-emerald-500/30 bg-slate-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={result}
                      alt="Upscaled"
                      className="w-full h-auto object-contain max-h-80"
                    />
                  </div>
                  <p className="text-xs text-gray-600 px-1">
                    {TIERS[tier].label} · {TIERS[tier].credits} kredit
                  </p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 flex-wrap">
              {!result ? (
                <>
                  <button
                    onClick={handleUpscale}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Sedang memproses gambar...
                      </>
                    ) : (
                      <>
                        <ArrowUpFromLine className="w-4 h-4" />
                        Upscale Sekarang
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-4 py-2.5 border border-white/10 hover:bg-white/5 disabled:opacity-40 text-gray-400 hover:text-gray-200 text-sm font-medium rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Ganti Gambar
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download Hasil
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2.5 border border-white/10 hover:bg-white/5 text-gray-400 hover:text-gray-200 text-sm font-medium rounded-lg transition-colors"
                  >
                    <ImagePlus className="w-4 h-4" />
                    Upscale Gambar Lain
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4"
            >
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-300 flex-1">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-400/60 hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info card */}
        <div className="rounded-xl border border-white/5 bg-slate-900/50 p-4 text-xs text-gray-600 space-y-1">
          <p>• Standard: upscale 4× — cepat, konsumsi 2 kredit</p>
          <p>• Premium: upscale 2× dengan detail & ketajaman ekstra — konsumsi 5 kredit</p>
          <p>• Proses biasanya selesai dalam 30–90 detik tergantung ukuran gambar</p>
        </div>
      </div>
    </DashboardLayout>
  )
}

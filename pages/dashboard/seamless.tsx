import React, { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Download,
  Grid2X2,
  Loader2,
  Palette,
  RefreshCw,
  Sparkles,
  Wand2,
} from "lucide-react"
import DashboardLayout from "~/components/dashboard/DashboardLayout"
import { useSession } from "next-auth/react"
import { useUser } from "~/hooks/useUser"

const ADMIN_EMAIL = "ardika.yudha08@gmail.com"
const CREDITS_PER_GENERATE = 3

type StyleKey = "floral" | "geometric" | "abstract" | "kids" | "seasonal"
type OutputSize = 1024 | 2048

const STYLES: Record<
  StyleKey,
  { label: string; emoji: string; hint: string; sample: string; colors: [string, string, string] }
> = {
  floral: {
    label: "Floral",
    emoji: "🌸",
    hint: "Daun, bunga, botanical",
    sample:
      "soft watercolor tropical leaves, monstera and fern, pastel green and sage, clean white background, seamless repeating pattern",
    colors: ["#86efac", "#34d399", "#064e3b"],
  },
  geometric: {
    label: "Geometric",
    emoji: "🔷",
    hint: "Shape, line, modern",
    sample:
      "modern geometric seamless pattern, clean triangles and hexagons, muted navy and gold, minimal flat design, tileable",
    colors: ["#93c5fd", "#3b82f6", "#1e3a8a"],
  },
  abstract: {
    label: "Abstract",
    emoji: "🎨",
    hint: "Texture, brush, artistic",
    sample:
      "abstract organic shapes seamless pattern, soft grain texture, coral peach and cream, contemporary wallpaper style",
    colors: ["#f9a8d4", "#a78bfa", "#4c1d95"],
  },
  kids: {
    label: "Kids",
    emoji: "🧸",
    hint: "Cute, playful, soft",
    sample:
      "cute kids seamless pattern, friendly animals and stars, pastel rainbow colors, simple flat illustration, nursery wallpaper",
    colors: ["#fde68a", "#fca5a5", "#7c3aed"],
  },
  seasonal: {
    label: "Seasonal",
    emoji: "🎄",
    hint: "Holiday, season theme",
    sample:
      "christmas seamless pattern, pine branches berries and snowflakes, elegant red green gold on cream, festive but clean",
    colors: ["#fca5a5", "#86efac", "#7f1d1d"],
  },
}

const SIZES: { value: OutputSize; label: string; note: string }[] = [
  { value: 1024, label: "1024×1024", note: "Cepat · preview" },
  { value: 2048, label: "2048×2048", note: "Lebih tajam" },
]

function buildMockPatternDataUrl(style: StyleKey, seed: string) {
  const { colors } = STYLES[style]
  const [c1, c2, c3] = colors
  // Deterministic-ish hash for slight variation
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  const rot = h % 360
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="50%" stop-color="${c2}"/>
      <stop offset="100%" stop-color="${c3}"/>
    </linearGradient>
    <pattern id="p" width="128" height="128" patternUnits="userSpaceOnUse" patternTransform="rotate(${rot})">
      <rect width="128" height="128" fill="${c3}" opacity="0.9"/>
      <circle cx="32" cy="32" r="18" fill="${c1}" opacity="0.85"/>
      <circle cx="96" cy="96" r="18" fill="${c1}" opacity="0.85"/>
      <rect x="64" y="16" width="28" height="28" rx="6" fill="${c2}" opacity="0.8" transform="rotate(15 78 30)"/>
      <path d="M16 90 Q40 60 64 90 T112 90" fill="none" stroke="${c1}" stroke-width="6" opacity="0.7"/>
    </pattern>
  </defs>
  <rect width="512" height="512" fill="url(#g)" opacity="0.35"/>
  <rect width="512" height="512" fill="url(#p)"/>
  <rect width="512" height="512" fill="none" stroke="white" stroke-opacity="0.08"/>
</svg>`.trim()
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export default function SeamlessPage() {
  const { data: session } = useSession()
  const { credits } = useUser()
  const isAdmin = session?.user?.email === ADMIN_EMAIL

  const [style, setStyle] = useState<StyleKey>("floral")
  const [prompt, setPrompt] = useState(STYLES.floral.sample)
  const [size, setSize] = useState<OutputSize>(1024)
  const [isGenerating, setIsGenerating] = useState(false)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [showTile, setShowTile] = useState(true)
  const [lastMeta, setLastMeta] = useState<{ title: string; keywords: string } | null>(null)

  const creditLabel = useMemo(() => {
    if (isAdmin) return "∞ Unlimited"
    if (typeof credits === "number") return String(credits)
    return "—"
  }, [credits, isAdmin])

  const canGenerate =
    prompt.trim().length >= 8 && !isGenerating && (isAdmin || (typeof credits === "number" && credits >= CREDITS_PER_GENERATE))

  const applyStyle = (key: StyleKey) => {
    setStyle(key)
    // Only auto-fill if prompt empty or still equal to previous style sample
    const previousSamples = Object.values(STYLES).map((s) => s.sample)
    if (!prompt.trim() || previousSamples.includes(prompt.trim())) {
      setPrompt(STYLES[key].sample)
    }
  }

  const handleGenerate = async () => {
    if (!canGenerate) return
    setIsGenerating(true)
    setError(null)
    setInfo(null)
    setResultUrl(null)
    setLastMeta(null)

    try {
      // Frontend-only MVP: UI fully wired, API still stubbed.
      // When /api/seamless is ready, replace this block with real fetch.
      await new Promise((r) => setTimeout(r, 1400))

      const mock = buildMockPatternDataUrl(style, `${style}-${prompt}-${size}-${Date.now()}`)
      setResultUrl(mock)
      setLastMeta({
        title: `${STYLES[style].label} seamless pattern — ${prompt.trim().slice(0, 48)}`,
        keywords: [
          "seamless pattern",
          "tileable",
          "background",
          "texture",
          style,
          "wallpaper",
          "surface design",
          "repeating pattern",
          "digital paper",
          "microstock",
        ].join(", "),
      })
      setInfo(
        "Preview UI only — ini mock pattern (bukan AI final). Backend generate akan dihubungkan berikutnya."
      )
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal generate pattern.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = () => {
    if (!resultUrl) return
    const a = document.createElement("a")
    a.href = resultUrl
    a.download = `seamless-${style}-${size}-${Date.now()}.svg`
    a.click()
  }

  const handleCopyMeta = async () => {
    if (!lastMeta) return
    const text = `Title: ${lastMeta.title}\nKeywords: ${lastMeta.keywords}`
    try {
      await navigator.clipboard.writeText(text)
      setInfo("Metadata disalin ke clipboard.")
    } catch {
      setError("Gagal menyalin metadata.")
    }
  }

  const handleReset = () => {
    setResultUrl(null)
    setError(null)
    setInfo(null)
    setLastMeta(null)
    setPrompt(STYLES[style].sample)
  }

  // Non-admin: coming soon (same gate style as Upscale)
  if (!isAdmin) {
    return (
      <DashboardLayout title="Seamless Pattern">
        <div className="flex flex-col items-center justify-center min-h-[32rem] gap-5">
          <div className="w-20 h-20 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Grid2X2 className="w-10 h-10 text-emerald-400" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-100">Coming Soon</h2>
            <p className="text-gray-400 max-w-md">
              AI Seamless Pattern Generator sedang disiapkan. Tulis prompt → dapat pattern tileable siap upload microstock.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap justify-center">
            <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-lg font-medium">
              Text prompt · no upload
            </span>
            <span className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs rounded-lg font-medium">
              {CREDITS_PER_GENERATE} kredit / generate
            </span>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Seamless Pattern">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Grid2X2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-100">AI Seamless Pattern</h1>
              <p className="text-sm text-gray-500">
                Generate pattern tileable dari prompt — siap untuk microstock
              </p>
            </div>
          </div>
          <div className="sm:ml-auto flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-medium">
              {CREDITS_PER_GENERATE} kredit / generate
            </span>
            <span className="text-sm text-gray-500">
              Kredit: <span className="text-gray-200 font-medium">{creditLabel}</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: controls */}
          <div className="lg:col-span-2 space-y-4">
            {/* Style */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-200">
                <Palette className="w-4 h-4 text-emerald-400" />
                Style
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-2 gap-2">
                {(Object.entries(STYLES) as [StyleKey, (typeof STYLES)[StyleKey]][]).map(
                  ([key, s]) => {
                    const active = style === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => applyStyle(key)}
                        className={`text-left rounded-xl border px-3 py-2.5 transition-all ${
                          active
                            ? "border-emerald-500/60 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(16,185,129,0.15)]"
                            : "border-white/10 hover:border-white/20 hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{s.emoji}</span>
                          <span className="text-sm font-medium text-gray-100">{s.label}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5 pl-7">{s.hint}</p>
                      </button>
                    )
                  }
                )}
              </div>
            </section>

            {/* Prompt */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-200">
                  <Wand2 className="w-4 h-4 text-emerald-400" />
                  Prompt
                </div>
                <button
                  type="button"
                  onClick={() => setPrompt(STYLES[style].sample)}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300"
                >
                  Pakai contoh
                </button>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={6}
                placeholder="Contoh: soft watercolor tropical leaves, pastel green, seamless repeating pattern..."
                className="w-full rounded-xl bg-slate-950/60 border border-white/10 px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 resize-y min-h-[140px]"
              />
              <p className="text-[11px] text-gray-500">
                Tips: sebutkan motif, warna, mood, dan kata <span className="text-gray-400">seamless / tileable</span>.
              </p>
            </section>

            {/* Size */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <div className="text-sm font-medium text-gray-200">Output size</div>
              <div className="grid grid-cols-2 gap-2">
                {SIZES.map((s) => {
                  const active = size === s.value
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setSize(s.value)}
                      className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                        active
                          ? "border-blue-500/60 bg-blue-500/10"
                          : "border-white/10 hover:border-white/20 hover:bg-white/5"
                      }`}
                    >
                      <div className="text-sm font-medium text-gray-100">{s.label}</div>
                      <div className="text-[11px] text-gray-500">{s.note}</div>
                    </button>
                  )
                })}
              </div>
            </section>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-slate-700 disabled:to-slate-700 disabled:text-gray-500 text-white font-medium text-sm px-4 py-3 shadow-lg shadow-emerald-500/20 disabled:shadow-none transition-all"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Pattern
                    <span className="text-[11px] opacity-90 bg-black/20 px-1.5 py-0.5 rounded-md">
                      −{CREDITS_PER_GENERATE}
                    </span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleReset}
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
                  className="flex items-start gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2.5 text-sm text-blue-200"
                >
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{info}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: preview */}
          <div className="lg:col-span-3 space-y-4">
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 min-h-[28rem]">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-gray-200">Preview</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTile(false)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                      !showTile
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                        : "border-white/10 text-gray-400 hover:bg-white/5"
                    }`}
                  >
                    Single
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTile(true)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                      showTile
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                        : "border-white/10 text-gray-400 hover:bg-white/5"
                    }`}
                  >
                    Tile 2×2
                  </button>
                </div>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-white/10 bg-slate-950 aspect-square">
                {!resultUrl && !isGenerating && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-6">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Grid2X2 className="w-8 h-8 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-300 font-medium">Belum ada hasil</p>
                      <p className="text-xs text-gray-500 mt-1 max-w-xs">
                        Pilih style, sesuaikan prompt, lalu klik Generate. Preview tile 2×2 bantu cek seamless.
                      </p>
                    </div>
                  </div>
                )}

                {isGenerating && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/80">
                    <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                    <p className="text-sm text-gray-300">Membuat seamless pattern...</p>
                    <p className="text-xs text-gray-500">Style: {STYLES[style].label} · {size}px</p>
                  </div>
                )}

                {resultUrl && !isGenerating && (
                  <div
                    className="absolute inset-0"
                    style={
                      showTile
                        ? {
                            backgroundImage: `url("${resultUrl}")`,
                            backgroundSize: "50% 50%",
                            backgroundRepeat: "repeat",
                          }
                        : {
                            backgroundImage: `url("${resultUrl}")`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            backgroundRepeat: "no-repeat",
                          }
                    }
                  />
                )}
              </div>

              {resultUrl && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex items-center gap-2 rounded-xl bg-white text-slate-900 hover:bg-gray-100 text-sm font-medium px-4 py-2.5"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyMeta}
                    disabled={!lastMeta}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 hover:bg-white/5 text-gray-200 text-sm px-4 py-2.5 disabled:opacity-50"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Metadata
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={!canGenerate}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-300 text-sm px-4 py-2.5 disabled:opacity-50"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Generate Ulang
                  </button>
                </div>
              )}
            </section>

            {/* Meta card */}
            {lastMeta && (
              <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                <div className="text-sm font-medium text-gray-200">Metadata draft</div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Title</p>
                  <p className="text-sm text-gray-200">{lastMeta.title}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Keywords</p>
                  <p className="text-sm text-gray-400 leading-relaxed">{lastMeta.keywords}</p>
                </div>
              </section>
            )}

            {/* Notes */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <p className="text-xs text-gray-500 leading-relaxed">
                <span className="text-gray-300 font-medium">Catatan Adobe Stock:</span> label AI-generated,
                usahakan resolusi tinggi (4K+ via Upscale), pastikan benar-benar seamless, hindari brand/karakter
                copyright. Colorway berbeda = peluang jual lebih banyak.
              </p>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

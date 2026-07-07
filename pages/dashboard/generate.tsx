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
} from "lucide-react"
import DashboardLayout from "~/components/dashboard/DashboardLayout"

// Types
type Relevance = "high" | "medium" | "low"
type FilterTab = "all" | "high" | "medium" | "low"

interface Keyword {
  id: string
  text: string
  relevance: Relevance
}

// Dummy data
const HIGH_KEYWORDS = [
  "sunset", "beach", "tropical", "palm trees", "ocean", "golden hour",
  "seascape", "nature", "paradise", "coastline", "waves", "horizon",
]
const MEDIUM_KEYWORDS = [
  "travel", "vacation", "summer", "relaxation", "scenic", "landscape",
  "twilight", "dusk", "silhouette", "warm colors", "reflection", "sky",
  "clouds", "sand", "peaceful", "serene", "tranquil", "beautiful", "outdoor", "tourism",
]
const LOW_KEYWORDS = [
  "wallpaper", "background", "screensaver", "stock photo", "editorial",
  "commercial", "lifestyle", "wellness", "destination", "island",
  "getaway", "exotic", "escape", "retreat", "bliss", "wanderlust",
]

function buildKeywords(): Keyword[] {
  const all: Keyword[] = []
  HIGH_KEYWORDS.forEach((t, i) => all.push({ id: `h-${i}`, text: t, relevance: "high" }))
  MEDIUM_KEYWORDS.forEach((t, i) => all.push({ id: `m-${i}`, text: t, relevance: "medium" }))
  LOW_KEYWORDS.forEach((t, i) => all.push({ id: `l-${i}`, text: t, relevance: "low" }))
  return all
}

const DUMMY_TITLE = "Dramatic Sunset Over Tropical Beach with Silhouetted Palm Trees and Golden Reflections"
const DUMMY_DESCRIPTION = "A breathtaking tropical sunset captures the golden hour as warm light bathes a pristine beach. Silhouetted palm trees frame the composition while gentle waves reflect the amber and purple hues of the sky. Perfect for travel, nature, and lifestyle content."

// Page states
type PageState = "upload" | "processing" | "results"

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
      whileTap={{ scale: 0.95 }}
      onClick={handleCopy}
      className={`p-2 rounded-lg border transition-all duration-300 ${
        copied
          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
          : "border-white/10 bg-white/5 text-gray-400 hover:text-white hover:border-white/20"
      }`}
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.div
            key="check"
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 90 }}
            transition={{ duration: 0.2 }}
          >
            <Check className="w-4 h-4" />
          </motion.div>
        ) : (
          <motion.div
            key="copy"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Copy className="w-4 h-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

export default function GeneratePage() {
  const [pageState, setPageState] = useState<PageState>("upload")
  const [isDragOver, setIsDragOver] = useState(false)
  const [keywords, setKeywords] = useState<Keyword[]>(buildKeywords())
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all")
  const [newKeyword, setNewKeyword] = useState("")
  const [copyAllCopied, setCopyAllCopied] = useState(false)
  const [copyMetaCopied, setCopyMetaCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredKeywords = keywords.filter((k) => {
    if (activeFilter === "all") return true
    return k.relevance === activeFilter
  })

  const highCount = keywords.filter((k) => k.relevance === "high").length
  const mediumCount = keywords.filter((k) => k.relevance === "medium").length
  const lowCount = keywords.filter((k) => k.relevance === "low").length

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: `Semua (${keywords.length})` },
    { key: "high", label: `Tinggi (${highCount})` },
    { key: "medium", label: `Sedang (${mediumCount})` },
    { key: "low", label: `Rendah (${lowCount})` },
  ]

  const handleUploadClick = () => {
    setPageState("processing")
    setTimeout(() => {
      setPageState("results")
    }, 2000)
  }

  const handleReset = () => {
    setPageState("upload")
    setKeywords(buildKeywords())
    setActiveFilter("all")
    setNewKeyword("")
  }

  const removeKeyword = (id: string) => {
    setKeywords((prev) => prev.filter((k) => k.id !== id))
  }

  const addKeyword = () => {
    if (!newKeyword.trim()) return
    const newKw: Keyword = {
      id: `custom-${Date.now()}`,
      text: newKeyword.trim(),
      relevance: "medium",
    }
    setKeywords((prev) => [...prev, newKw])
    setNewKeyword("")
    inputRef.current?.focus()
  }

  const handleCopyAll = () => {
    const text = keywords.map((k) => k.text).join(", ")
    navigator.clipboard.writeText(text).catch(() => {})
    setCopyAllCopied(true)
    setTimeout(() => setCopyAllCopied(false), 2000)
  }

  const handleCopyMetadata = () => {
    const meta = `Title: ${DUMMY_TITLE}\nDescription: ${DUMMY_DESCRIPTION}\nKeywords: ${keywords.map((k) => k.text).join(", ")}`
    navigator.clipboard.writeText(meta).catch(() => {})
    setCopyMetaCopied(true)
    setTimeout(() => setCopyMetaCopied(false), 2000)
  }

  const getTagClasses = (relevance: Relevance) => {
    switch (relevance) {
      case "high":
        return "border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:border-emerald-400/70 hover:bg-emerald-500/15"
      case "medium":
        return "border-blue-500/50 bg-blue-500/10 text-blue-300 hover:border-blue-400/70 hover:bg-blue-500/15"
      case "low":
        return "border-gray-500/50 bg-gray-500/10 text-gray-400 hover:border-gray-400/70 hover:bg-gray-500/15"
    }
  }

  return (
    <DashboardLayout title="Generate Metadata">
      <AnimatePresence mode="wait">
        {/* STATE 1: Upload */}
        {pageState === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Generate Metadata</h1>
              <p className="text-gray-400 text-base">
                Upload gambar dan dapatkan keyword, title &amp; deskripsi yang SEO-optimized
              </p>
            </div>

            {/* Upload Zone */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragOver(true)
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragOver(false)
                handleUploadClick()
              }}
              onClick={handleUploadClick}
              className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-16 flex flex-col items-center justify-center text-center transition-all duration-300 ${
                isDragOver
                  ? "border-blue-500 bg-blue-500/5 scale-[1.02]"
                  : "border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 hover:shadow-[0_0_40px_rgba(59,130,246,0.1)]"
              }`}
            >
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="mb-6"
              >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center">
                  <ImagePlus className="w-10 h-10 text-blue-400" />
                </div>
              </motion.div>

              <h3 className="text-xl font-semibold text-white mb-2">
                Drag &amp; drop gambar di sini
              </h3>
              <p className="text-gray-400 mb-4">atau klik untuk memilih file</p>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                <span className="text-xs text-gray-400">PNG, JPG, WEBP, SVG</span>
              </div>
            </motion.div>

            {/* Credits badge */}
            <div className="mt-6 flex justify-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-white/10">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm text-gray-300">Credits tersisa: <span className="font-semibold text-white">847</span></span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Processing State */}
        {pageState === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center py-20"
          >
            {/* Image placeholder */}
            <div className="w-64 h-48 rounded-2xl bg-gradient-to-br from-orange-500/30 via-pink-500/20 to-purple-500/30 border border-white/10 mb-8 overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-amber-500/10 to-purple-500/10 animate-pulse" />
            </div>

            {/* Progress bar */}
            <div className="w-80 h-2 rounded-full bg-slate-800 border border-white/5 overflow-hidden mb-6">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                className="h-full w-1/2 bg-gradient-to-r from-transparent via-blue-500 to-transparent rounded-full"
              />
            </div>

            {/* Text with bouncing dots */}
            <p className="text-gray-300 text-lg flex items-center gap-1">
              AI sedang menganalisis gambar
              <span className="flex gap-0.5 ml-1">
                <motion.span
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                  className="text-blue-400"
                >.</motion.span>
                <motion.span
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                  className="text-blue-400"
                >.</motion.span>
                <motion.span
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                  className="text-blue-400"
                >.</motion.span>
              </span>
            </p>
          </motion.div>
        )}

        {/* STATE 2: Results */}
        {pageState === "results" && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
              className="mb-8"
            >
              <h1 className="text-3xl font-bold text-white mb-2">Generate Metadata</h1>
              <p className="text-gray-400 text-base">
                Upload gambar dan dapatkan keyword, title &amp; deskripsi yang SEO-optimized
              </p>
            </motion.div>

            {/* Two column grid */}
            <div className="grid lg:grid-cols-5 gap-6">
              {/* Left column - Image */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-2"
              >
                <div className="rounded-2xl bg-slate-900 border border-white/10 overflow-hidden">
                  {/* Image placeholder */}
                  <div className="aspect-[4/3] bg-gradient-to-br from-orange-400/40 via-pink-500/30 to-purple-600/40 relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="w-12 h-1 bg-white/30 rounded mb-2" />
                      <div className="w-20 h-1 bg-white/20 rounded" />
                    </div>
                  </div>

                  {/* File info */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Filename</span>
                      <span className="text-gray-200 font-mono text-xs">tropical_sunset_beach.jpg</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Dimensi</span>
                      <span className="text-gray-200 font-mono text-xs">5472 × 3648</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Format</span>
                      <span className="text-gray-200 font-mono text-xs">JPEG</span>
                    </div>
                  </div>

                  {/* Reset button */}
                  <div className="px-4 pb-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleReset}
                      className="w-full py-2.5 rounded-xl border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Gambar Baru
                    </motion.button>
                  </div>
                </div>
              </motion.div>

              {/* Right column - Metadata */}
              <div className="lg:col-span-3 space-y-6">
                {/* Section 1: Title */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="rounded-2xl bg-slate-900 border border-white/10 p-5"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-semibold text-white">Title</span>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-1 rounded-xl bg-slate-950 border border-white/5 p-4">
                      <p className="text-gray-200 text-sm leading-relaxed">{DUMMY_TITLE}</p>
                    </div>
                    <CopyButton text={DUMMY_TITLE} />
                  </div>

                  <div className="mt-3 flex justify-end">
                    <span className="text-xs px-2 py-1 rounded-md bg-white/5 border border-white/10 text-gray-400">
                      {DUMMY_TITLE.length}/200
                    </span>
                  </div>
                </motion.div>

                {/* Section 2: Description */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-2xl bg-slate-900 border border-white/10 p-5"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-semibold text-white">Deskripsi</span>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-1 rounded-xl bg-slate-950 border border-white/5 p-4">
                      <p className="text-gray-200 text-sm leading-relaxed">{DUMMY_DESCRIPTION}</p>
                    </div>
                    <CopyButton text={DUMMY_DESCRIPTION} />
                  </div>

                  <div className="mt-3 flex justify-end">
                    <span className="text-xs px-2 py-1 rounded-md bg-white/5 border border-white/10 text-gray-400">
                      {DUMMY_DESCRIPTION.length}/500
                    </span>
                  </div>
                </motion.div>

                {/* Section 3: Keywords */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="rounded-2xl bg-slate-900 border border-white/10 p-5"
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Tags className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-semibold text-white">Keywords</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300">
                        {keywords.length} keywords
                      </span>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleCopyAll}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        copyAllCopied
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                          : "border-white/10 bg-white/5 text-gray-400 hover:text-white hover:border-white/20"
                      }`}
                    >
                      {copyAllCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copyAllCopied ? "Copied!" : "Copy All"}
                    </motion.button>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-white/5 mb-4">
                    {filterTabs.map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveFilter(tab.key)}
                        className={`relative flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          activeFilter === tab.key ? "text-white" : "text-gray-400 hover:text-gray-200"
                        }`}
                      >
                        {activeFilter === tab.key && (
                          <motion.div
                            layoutId="activeFilterTab"
                            className="absolute inset-0 bg-blue-500/15 border border-blue-500/30 rounded-lg"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                          />
                        )}
                        <span className="relative z-10">{tab.label}</span>
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
                      setPageState("processing")
                      setTimeout(() => setPageState("results"), 2000)
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-all text-sm font-medium"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Regenerate
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-all text-sm font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleCopyMetadata}
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
                    <span className="text-xs text-gray-500">1 kredit digunakan</span>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  )
}

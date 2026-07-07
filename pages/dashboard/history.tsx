import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import DashboardLayout from "~/components/dashboard/DashboardLayout"
import { Search, Download, Eye, Trash2, Calendar, FileText, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

// Shape from generate_history table
interface HistoryItem {
  id: string
  filename: string | null
  title: string | null
  platform: string | null
  creditsUsed: number | null
  createdAt: string | null
  // derived for display
  status: "success" | "failed"
  keywords?: number
}

// Dummy fallback data shown when real history is empty
const DUMMY_DATA: HistoryItem[] = [
  { id: "d1", filename: "sunset-beach.jpg", title: "Beautiful Sunset Over Ocean Beach With Golden Sky", platform: "web", creditsUsed: 1, createdAt: new Date(Date.now() - 1 * 86400000).toISOString(), status: "success", keywords: 47 },
  { id: "d2", filename: "mountain-vista.jpg", title: "Mountain Vista With Snow Caps and Blue Sky", platform: "web", creditsUsed: 1, createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), status: "success", keywords: 45 },
  { id: "d3", filename: "city-skyline.jpg", title: "Modern City Skyline at Night With Lights", platform: "web", creditsUsed: 1, createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), status: "success", keywords: 48 },
  { id: "d4", filename: "forest-path.jpg", title: "Peaceful Forest Path Through Green Trees", platform: "web", creditsUsed: 1, createdAt: new Date(Date.now() - 4 * 86400000).toISOString(), status: "success", keywords: 46 },
  { id: "d5", filename: "ocean-waves.jpg", title: "Ocean Waves Crashing on Rocky Shore", platform: "web", creditsUsed: 1, createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), status: "failed", keywords: 0 },
]

function formatDate(iso: string | null): string {
  if (!iso) return "-"
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [data, setData] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isDummy, setIsDummy] = useState(false)
  const itemsPerPage = 10

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true)
      try {
        const res = await fetch(`/api/user/history?page=${currentPage}`)
        if (!res.ok) throw new Error("Fetch failed")
        const json = await res.json()
        const rows: HistoryItem[] = (json.history ?? []).map((h: any) => ({
          id: h.id,
          filename: h.filename,
          title: h.title,
          platform: h.platform,
          creditsUsed: h.creditsUsed,
          createdAt: h.createdAt,
          status: "success" as const,
          keywords: undefined,
        }))
        if (rows.length === 0 && currentPage === 1) {
          setData(DUMMY_DATA)
          setIsDummy(true)
        } else {
          setData(rows)
          setIsDummy(false)
        }
      } catch {
        setData(DUMMY_DATA)
        setIsDummy(true)
      } finally {
        setLoading(false)
      }
    }
    void fetchHistory()
  }, [currentPage])

  const filteredData = data.filter(
    (item) =>
      (item.filename ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.title ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage))
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <DashboardLayout title="History">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Riwayat Generate</h1>
          <p className="text-gray-400 mt-1">
            Semua metadata yang pernah Anda generate.
          </p>
        </div>

        {/* Search + stats bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Cari file atau judul..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 shrink-0">
            <Calendar className="w-4 h-4" />
            <span>{filteredData.length} entri</span>
            {isDummy && (
              <span className="text-xs text-amber-500/70 ml-1">(contoh data)</span>
            )}
          </div>
        </div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-20 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Memuat riwayat…</span>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <FileText className="w-10 h-10 text-gray-700" />
              <p className="text-gray-500 text-sm">Belum ada riwayat generate.</p>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-white/5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                <span className="col-span-1">No</span>
                <span className="col-span-3">Tanggal</span>
                <span className="col-span-4">File</span>
                <span className="col-span-3">Judul</span>
                <span className="col-span-1 text-right">Status</span>
              </div>

              {/* Rows */}
              <AnimatePresence>
                {paginatedData.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="grid grid-cols-12 gap-4 px-5 py-4 items-center hover:bg-white/5 transition-colors duration-150 border-b border-white/5 last:border-b-0"
                  >
                    <span className="col-span-1 text-sm text-gray-600">
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </span>
                    <span className="col-span-3 text-xs text-gray-500">
                      {formatDate(item.createdAt)}
                    </span>
                    <span className="col-span-4 text-sm font-medium text-gray-200 truncate">
                      {item.filename ?? "—"}
                    </span>
                    <span className="col-span-3 text-xs text-gray-400 truncate">
                      {item.title ?? "—"}
                    </span>
                    <span className="col-span-1 flex justify-end">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          item.status === "success"
                            ? "bg-emerald-500/10 text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.15)]"
                            : "bg-red-500/10 text-red-400 shadow-[0_0_8px_rgba(248,113,113,0.15)]"
                        }`}
                      >
                        {item.status === "success" ? "Berhasil" : "Gagal"}
                      </span>
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-4 border-t border-white/5">
                  <span className="text-xs text-gray-500">
                    Halaman {currentPage} dari {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  )
}

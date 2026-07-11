import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import DashboardLayout from "~/components/dashboard/DashboardLayout"
import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface HistoryItem {
  id: string
  filename: string | null
  title: string | null
  platform: string | null
  creditsUsed: number | null
  createdAt: string | null
  status: "success" | "failed"
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

function platformLabel(p: string | null | undefined): string {
  switch (p) {
    case "adobe_stock": return "Adobe Stock"
    case "shutterstock": return "Shutterstock"
    case "web": return "Web Dashboard"
    default: return p ?? "—"
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [data, setData] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [totalFromApi, setTotalFromApi] = useState(0)
  const [fetchError, setFetchError] = useState(false)
  const itemsPerPage = 20

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true)
      setFetchError(false)
      try {
        const res = await fetch(`/api/user/history?page=${currentPage}&q=${encodeURIComponent(searchQuery)}`)
        if (!res.ok) throw new Error("Fetch failed")
        const json = await res.json()
        const rows: HistoryItem[] = (json.history ?? []).map((h: any) => ({
          id: h.id,
          filename: h.filename,
          title: h.title,
          platform: h.platform,
          creditsUsed: h.creditsUsed,
          createdAt: h.createdAt,
          // All saved history records are successful generates
          status: "success" as const,
        }))
        setData(rows)
        setTotalFromApi(json.total ?? rows.length)
      } catch {
        setData([])
        setFetchError(true)
      } finally {
        setLoading(false)
      }
    }
    void fetchHistory()
  }, [currentPage, searchQuery])

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const totalPages = Math.max(1, Math.ceil(totalFromApi / itemsPerPage))

  return (
    <DashboardLayout title="History">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Riwayat Generate</h1>
          <p className="text-gray-400 mt-1">Semua metadata yang pernah Anda generate.</p>
        </div>

        {/* Search bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari file atau judul..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
            />
          </div>
          {!loading && (
            <span className="text-sm text-gray-500 shrink-0">
              {totalFromApi} total
            </span>
          )}
        </div>

        {/* Error banner */}
        {fetchError && !loading && (
          <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm mb-4">
            <span>Gagal memuat data. Coba refresh halaman.</span>
            <button onClick={() => { setFetchError(false); setCurrentPage(1) }} className="ml-auto underline">Coba lagi</button>
          </div>
        )}

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden"
        >
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Memuat riwayat...</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-900 border-b border-white/10">
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">File / Judul</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Kredit</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-14 text-center">
                          <div className="flex flex-col items-center gap-2 text-gray-500">
                            <Search className="w-8 h-8 opacity-40" />
                            <p className="text-sm">
                              {searchQuery
                                ? "Tidak ada hasil yang cocok."
                                : "Belum ada riwayat generate. Mulai generate metadata sekarang!"}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      data.map((item, idx) => (
                        <tr
                          key={item.id}
                          className="bg-slate-950 border-b border-white/5 hover:bg-white/5 transition-colors duration-150"
                        >
                          <td className="px-4 py-3 text-sm text-gray-400">
                            {(currentPage - 1) * itemsPerPage + idx + 1}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">
                            {formatDate(item.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-200 max-w-xs">
                            <p className="truncate">{item.filename ?? "—"}</p>
                            {item.title && (
                              <p className="text-xs text-gray-500 truncate mt-0.5">{item.title}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">
                            {platformLabel(item.platform)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400">
                            -{item.creditsUsed ?? 1}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                                item.status === "success"
                                  ? "bg-emerald-500/10 text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.15)]"
                                  : "bg-red-500/10 text-red-400 shadow-[0_0_8px_rgba(248,113,113,0.15)]"
                              }`}
                            >
                              {item.status === "success" ? "Berhasil" : "Gagal"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
                  <span className="text-sm text-gray-500">
                    Halaman {currentPage} dari {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-2 py-1 text-xs rounded bg-slate-800 text-gray-400 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >«</button>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-2 py-1 text-xs rounded bg-slate-800 text-gray-400 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >‹</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .reduce((acc: (number | string)[], p, i, arr) => {
                        if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...')
                        acc.push(p)
                        return acc
                      }, [])
                      .map((p, i) => p === '...'
                        ? <span key={`e-${i}`} className="px-2 py-1 text-xs text-gray-600">…</span>
                        : <button
                            key={p}
                            onClick={() => setCurrentPage(p as number)}
                            className={`px-2.5 py-1 text-xs rounded transition-colors ${currentPage === p ? 'bg-blue-500 text-white' : 'bg-slate-800 text-gray-400 hover:bg-slate-700'}`}
                          >{p}</button>
                      )
                    }
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 text-xs rounded bg-slate-800 text-gray-400 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >›</button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 text-xs rounded bg-slate-800 text-gray-400 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >»</button>
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

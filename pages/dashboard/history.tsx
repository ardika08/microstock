import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import DashboardLayout from "~/components/dashboard/DashboardLayout"
import { Search, Download, Eye, Trash2, Calendar, FileText, ChevronLeft, ChevronRight } from "lucide-react"

// Dummy data generator
const generateDummyData = () => {
  const files = [
    "sunset-beach.jpg", "mountain-vista.jpg", "city-skyline.jpg", "forest-path.jpg",
    "ocean-waves.jpg", "desert-dunes.jpg", "lake-reflection.jpg", "autumn-leaves.jpg",
    "snowy-peaks.jpg", "tropical-paradise.jpg", "urban-street.jpg", "countryside.jpg",
    "waterfall-cascade.jpg", "starry-night.jpg", "flower-meadow.jpg", "rocky-cliff.jpg",
    "sunrise-horizon.jpg", "vintage-car.jpg", "modern-architecture.jpg", "wildlife-safari.jpg"
  ]

  const titles = [
    "Beautiful Sunset Over Ocean Beach With Golden Sky",
    "Mountain Vista With Snow Caps and Blue Sky",
    "Modern City Skyline at Night With Lights",
    "Peaceful Forest Path Through Green Trees",
    "Ocean Waves Crashing on Rocky Shore",
    "Desert Sand Dunes Under Clear Sky",
    "Lake Reflection of Mountains at Dawn",
    "Colorful Autumn Leaves in Forest",
    "Snow Covered Mountain Peaks in Winter",
    "Tropical Paradise Beach With Palm Trees",
    "Busy Urban Street in Downtown Area",
    "Rural Countryside With Rolling Hills",
    "Majestic Waterfall Cascading Down Rocks",
    "Starry Night Sky With Milky Way",
    "Vibrant Flower Meadow in Spring",
    "Dramatic Rocky Cliff Overlooking Sea",
    "Beautiful Sunrise Over the Horizon",
    "Classic Vintage Car in Street",
    "Contemporary Modern Architecture Design",
    "Wild Safari Animals in Natural Habitat"
  ]

  return Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString("id-ID"),
    file: files[i],
    title: titles[i],
    keywords: Math.floor(Math.random() * 20) + 30,
    status: Math.random() > 0.15 ? "success" as const : "failed" as const,
  }))
}

export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const data = generateDummyData()
  const filteredData = data.filter(
    (item) =>
      item.file.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <DashboardLayout title="History" userName="Budi Santoso" userEmail="budi@example.com">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-100">History Generate</h1>
          <p className="text-gray-400 mt-1">Riwayat semua metadata yang pernah Anda generate</p>
        </div>

        {/* Filters */}
        <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                placeholder="Cari nama file atau title..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-white/10 rounded-lg text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-slate-700 transition-colors">
              <Calendar className="w-4 h-4" />
              Filter Tanggal
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-lg font-semibold text-gray-100">Daftar History</h2>
            <p className="text-sm text-gray-400">Total {filteredData.length} record ditemukan</p>
          </div>

          {paginatedData.length === 0 ? (
            <div className="text-center py-16 px-4">
              {/* Empty state SVG illustration */}
              <svg className="w-24 h-24 mx-auto mb-4 text-gray-600" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="14" y="16" width="52" height="48" rx="4" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
                <path d="M30 36h20M30 44h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="40" cy="56" r="3" stroke="currentColor" strokeWidth="2" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-200 mb-2">Tidak ada data ditemukan</h3>
              <p className="text-gray-500 text-sm">Coba ubah filter atau kata kunci pencarian Anda</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-900 border-b border-white/10">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">No</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Tanggal</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Nama File</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Title Generated</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Keywords</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <AnimatePresence mode="wait">
                    <motion.tbody
                      key={currentPage}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {paginatedData.map((item, idx) => (
                        <tr
                          key={item.id}
                          className="bg-slate-950 border-b border-white/5 hover:bg-white/5 transition-colors duration-150"
                        >
                          <td className="px-4 py-3 text-sm text-gray-300">
                            {(currentPage - 1) * itemsPerPage + idx + 1}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400">{item.date}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-200">{item.file}</td>
                          <td className="px-4 py-3 text-sm text-gray-400 max-w-xs truncate">{item.title}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-1 bg-slate-800 border border-white/10 rounded-md text-gray-300">
                              {item.keywords} kata
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                                item.status === "success"
                                  ? "bg-emerald-500/10 text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.2)]"
                                  : "bg-red-500/10 text-red-400 shadow-[0_0_8px_rgba(248,113,113,0.2)]"
                              }`}
                            >
                              {item.status === "success" ? "Berhasil" : "Gagal"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors" title="Lihat detail">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors" title="Download">
                                <Download className="w-4 h-4" />
                              </button>
                              <button className="p-1.5 rounded-md hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors" title="Hapus">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </motion.tbody>
                  </AnimatePresence>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
                  <p className="text-sm text-gray-400">
                    Halaman {currentPage} dari {totalPages}
                  </p>
                  <div className="flex gap-2">
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
        </div>
      </div>
    </DashboardLayout>
  )
}

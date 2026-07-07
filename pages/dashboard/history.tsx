import React, { useState } from "react"
import DashboardLayout from "~/components/dashboard/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Badge } from "~/components/ui/badge"
import { Search, Download, Eye, Trash2, Calendar, FileText } from "lucide-react"

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
    status: Math.random() > 0.15 ? "success" : "failed",
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
          <h1 className="text-3xl font-bold text-gray-900">History Generate</h1>
          <p className="text-gray-500 mt-1">Riwayat semua metadata yang pernah Anda generate</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Cari nama file atau title..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" className="gap-2">
                <Calendar className="w-4 h-4" />
                Filter Tanggal
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar History</CardTitle>
            <CardDescription>Total {filteredData.length} record ditemukan</CardDescription>
          </CardHeader>
          <CardContent>
            {paginatedData.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Tidak ada data ditemukan</h3>
                <p className="text-gray-500">Coba ubah filter atau kata kunci pencarian Anda</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">No</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tanggal</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nama File</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Title Generated</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Keywords</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((item, idx) => (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {(currentPage - 1) * itemsPerPage + idx + 1}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.date}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.file}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{item.title}</td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary">{item.keywords} kata</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={item.status === "success" ? "default" : "destructive"}
                              className={
                                item.status === "success"
                                  ? "bg-green-100 text-green-700 hover:bg-green-100"
                                  : ""
                              }
                            >
                              {item.status === "success" ? "Berhasil" : "Gagal"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" title="Lihat detail">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" title="Download">
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" title="Hapus">
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <p className="text-sm text-gray-600">
                      Halaman {currentPage} dari {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

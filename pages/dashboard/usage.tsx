import React, { useState } from "react"
import DashboardLayout from "~/components/dashboard/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Button } from "~/components/ui/button"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { TrendingUp, CreditCard, Calendar, BarChart2 } from "lucide-react"

// Dummy chart data
const generateChartData = (period: "day" | "week" | "month") => {
  if (period === "day") {
    return Array.from({ length: 7 }, (_, i) => ({
      name: ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"][i],
      usage: Math.floor(Math.random() * 30) + 10,
    }))
  } else if (period === "week") {
    return Array.from({ length: 4 }, (_, i) => ({
      name: `Minggu ${i + 1}`,
      usage: Math.floor(Math.random() * 100) + 50,
    }))
  } else {
    return Array.from({ length: 6 }, (_, i) => ({
      name: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"][i],
      usage: Math.floor(Math.random() * 400) + 200,
    }))
  }
}

// Dummy recent activity
const recentActivity = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  action: "Generate Metadata",
  file: `file-${i + 1}.jpg`,
  credits: Math.floor(Math.random() * 5) + 1,
  time: `${Math.floor(Math.random() * 24)} jam lalu`,
  date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString("id-ID"),
}))

export default function UsagePage() {
  const [chartPeriod, setChartPeriod] = useState<"day" | "week" | "month">("day")
  const chartData = generateChartData(chartPeriod)

  const stats = [
    {
      title: "Total Penggunaan",
      value: "1,234",
      subtitle: "Generate",
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Kredit Tersisa",
      value: "847",
      subtitle: "dari 2,000",
      progress: 42.35,
      icon: CreditCard,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Periode Aktif",
      value: "23 Hari",
      subtitle: "tersisa",
      icon: Calendar,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Rata-rata Harian",
      value: "12",
      subtitle: "generate/hari",
      icon: BarChart2,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ]

  return (
    <DashboardLayout title="Usage" userName="Budi Santoso" userEmail="budi@example.com">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Usage Analytics</h1>
          <p className="text-gray-500 mt-1">Monitor penggunaan kredit dan aktivitas Anda</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.title} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                      <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
                    </div>
                    <div className={`${stat.bgColor} p-3 rounded-lg`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                  {stat.progress !== undefined && (
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all"
                          style={{ width: `${stat.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{stat.progress.toFixed(1)}% terpakai</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Grafik Penggunaan</CardTitle>
                <CardDescription>Tren penggunaan kredit Anda</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={chartPeriod === "day" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setChartPeriod("day")}
                >
                  Hari
                </Button>
                <Button
                  variant={chartPeriod === "week" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setChartPeriod("week")}
                >
                  Minggu
                </Button>
                <Button
                  variant={chartPeriod === "month" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setChartPeriod("month")}
                >
                  Bulan
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="usage"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ fill: "#2563eb" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity Table */}
        <Card>
          <CardHeader>
            <CardTitle>Aktivitas Terkini</CardTitle>
            <CardDescription>10 aktivitas terakhir Anda</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">No</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tanggal</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Aksi</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">File</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Kredit</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((item, idx) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{idx + 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.date}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.action}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.file}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">-{item.credits} kredit</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

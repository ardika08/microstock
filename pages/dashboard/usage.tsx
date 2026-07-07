import React, { useState, useMemo } from "react"
import { motion } from "framer-motion"
import DashboardLayout from "~/components/dashboard/DashboardLayout"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts"
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

const periods = [
  { key: "day" as const, label: "Hari" },
  { key: "week" as const, label: "Minggu" },
  { key: "month" as const, label: "Bulan" },
]

// Custom dark tooltip
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 shadow-xl">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-100">{payload[0].value} generate</p>
      </div>
    )
  }
  return null
}

export default function UsagePage() {
  const [chartPeriod, setChartPeriod] = useState<"day" | "week" | "month">("day")
  const chartData = useMemo(() => generateChartData(chartPeriod), [chartPeriod])

  const stats = [
    {
      title: "Total Penggunaan",
      value: "1,234",
      subtitle: "Generate",
      icon: TrendingUp,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-400",
    },
    {
      title: "Kredit Tersisa",
      value: "847",
      subtitle: "dari 2,000",
      progress: 42.35,
      icon: CreditCard,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
    },
    {
      title: "Periode Aktif",
      value: "23 Hari",
      subtitle: "tersisa",
      icon: Calendar,
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-400",
    },
    {
      title: "Rata-rata Harian",
      value: "12",
      subtitle: "generate/hari",
      icon: BarChart2,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-400",
    },
  ]

  const activeIndex = periods.findIndex((p) => p.key === chartPeriod)

  return (
    <DashboardLayout title="Usage" userName="Budi Santoso" userEmail="budi@example.com">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Usage Analytics</h1>
          <p className="text-gray-400 mt-1">Monitor penggunaan kredit dan aktivitas Anda</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-slate-900 border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-400">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-100 mt-2">{stat.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
                  </div>
                  <div className={`${stat.iconBg} p-3 rounded-lg`}>
                    <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                  </div>
                </div>
                {stat.progress !== undefined && (
                  <div className="mt-3">
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${stat.progress}%` }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                        className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{stat.progress.toFixed(1)}% terpakai</p>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Chart */}
        <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-100">Grafik Penggunaan</h2>
              <p className="text-sm text-gray-400">Tren penggunaan kredit Anda</p>
            </div>
            {/* Tab toggle with sliding indicator */}
            <div className="relative flex bg-slate-800 border border-white/10 rounded-lg p-1">
              <motion.div
                className="absolute top-1 bottom-1 bg-blue-500/20 border border-blue-500/30 rounded-md"
                initial={false}
                animate={{
                  left: `${activeIndex * 33.33 + 0.5}%`,
                  width: "32.33%",
                }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                style={{ position: "absolute" }}
              />
              {periods.map((period) => (
                <button
                  key={period.key}
                  onClick={() => setChartPeriod(period.key)}
                  className={`relative z-10 px-4 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 ${
                    chartPeriod === period.key ? "text-blue-400" : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="name"
                  stroke="rgba(255,255,255,0.3)"
                  tick={{ fill: "#9ca3af", fontSize: 12 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.3)"
                  tick={{ fill: "#9ca3af", fontSize: 12 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="usage"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#usageGradient)"
                  dot={{ fill: "#3b82f6", strokeWidth: 0, r: 4 }}
                  activeDot={{ fill: "#60a5fa", strokeWidth: 0, r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity Table */}
        <div className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-lg font-semibold text-gray-100">Aktivitas Terkini</h2>
            <p className="text-sm text-gray-400">10 aktivitas terakhir Anda</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-900 border-b border-white/10">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Tanggal</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Aksi</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">File</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Kredit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Waktu</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((item, idx) => (
                  <tr key={item.id} className="bg-slate-950 border-b border-white/5 hover:bg-white/5 transition-colors duration-150">
                    <td className="px-4 py-3 text-sm text-gray-300">{idx + 1}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{item.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-200">{item.action}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-200">{item.file}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">-{item.credits} kredit</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

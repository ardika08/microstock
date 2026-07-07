import React, { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import DashboardLayout from "~/components/dashboard/DashboardLayout"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { TrendingUp, CreditCard, Calendar, BarChart2 } from "lucide-react"
import { useUser } from "~/hooks/useUser"

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChartPoint { date: string; count: number }
interface ActivityItem {
  id: string
  platform: string | null
  filename: string | null
  title: string | null
  creditsUsed: number | null
  createdAt: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function platformLabel(p: string | null | undefined): string {
  switch (p) {
    case "adobe_stock": return "Adobe Stock"
    case "shutterstock": return "Shutterstock"
    case "web": return "Web Dashboard"
    default: return p ?? "—"
  }
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—"
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} menit lalu`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} jam lalu`
  return `${Math.floor(hrs / 24)} hari lalu`
}

// Aggregate daily chartData into weekly buckets (last 4 weeks)
function toWeekly(daily: ChartPoint[]): { name: string; usage: number }[] {
  const weeks: { name: string; usage: number }[] = [
    { name: "Minggu 1", usage: 0 },
    { name: "Minggu 2", usage: 0 },
    { name: "Minggu 3", usage: 0 },
    { name: "Minggu 4", usage: 0 },
  ]
  const last28 = daily.slice(-28)
  last28.forEach((d, i) => {
    const weekIdx = Math.floor(i / 7)
    if (weekIdx < 4) weeks[weekIdx]!.usage += d.count
  })
  return weeks
}

// Aggregate daily chartData into monthly buckets (last 6 months)
function toMonthly(daily: ChartPoint[]): { name: string; usage: number }[] {
  const monthMap: Record<string, number> = {}
  daily.forEach(d => {
    const m = d.date.slice(0, 7) // "2025-06"
    monthMap[m] = (monthMap[m] ?? 0) + d.count
  })
  const entries = Object.entries(monthMap).sort().slice(-6)
  const MONTH_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
  return entries.map(([ym, usage]) => {
    const monthIdx = parseInt(ym.slice(5, 7), 10) - 1
    return { name: MONTH_ID[monthIdx] ?? ym, usage }
  })
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-slate-900 border border-white/10 rounded-xl p-6 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="space-y-2">
          <div className="h-3 w-28 bg-slate-800 rounded" />
          <div className="h-7 w-16 bg-slate-800 rounded" />
          <div className="h-3 w-20 bg-slate-800 rounded" />
        </div>
        <div className="h-12 w-12 bg-slate-800 rounded-lg" />
      </div>
    </div>
  )
}

// ─── Periods ─────────────────────────────────────────────────────────────────

const periods = [
  { key: "day" as const, label: "Hari" },
  { key: "week" as const, label: "Minggu" },
  { key: "month" as const, label: "Bulan" },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function UsagePage() {
  const [chartPeriod, setChartPeriod] = useState<"day" | "week" | "month">("day")
  const [apiData, setApiData] = useState<any>(null)
  const { credits, isLoading: sessionLoading } = useUser()

  useEffect(() => {
    fetch("/api/user/stats")
      .then(r => r.json())
      .then(d => setApiData(d))
      .catch(() => {})
  }, [])

  // Build chart data from the 30-day daily points based on selected period
  const chartData = useMemo(() => {
    const daily: ChartPoint[] = apiData?.chartData ?? []
    if (chartPeriod === "day") {
      return daily.slice(-7).map(d => ({
        name: new Date(d.date).toLocaleDateString("id-ID", { weekday: "short" }),
        usage: d.count,
      }))
    }
    if (chartPeriod === "week") return toWeekly(daily)
    return toMonthly(daily)
  }, [apiData, chartPeriod])

  const totalGenerates = apiData?.totalGenerates ?? null
  const dailyAvg = apiData?.dailyAvg ?? null
  const recentActivity: ActivityItem[] = apiData?.recentActivity ?? []

  const stats = [
    {
      title: "Total Penggunaan",
      value: totalGenerates !== null ? String(totalGenerates) : "—",
      subtitle: "Generate",
      icon: TrendingUp,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-400",
    },
    {
      title: "Kredit Tersisa",
      value: sessionLoading ? "..." : String(credits ?? 0),
      subtitle: "kredit",
      icon: CreditCard,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
    },
    {
      title: "Bulan Ini",
      value: apiData ? String(apiData.monthGenerates ?? 0) : "—",
      subtitle: "generate",
      icon: Calendar,
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-400",
    },
    {
      title: "Rata-rata Harian",
      value: dailyAvg !== null ? String(dailyAvg) : "—",
      subtitle: "generate/hari",
      icon: BarChart2,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-400",
    },
  ]

  const activeIndex = periods.findIndex(p => p.key === chartPeriod)

  return (
    <DashboardLayout title="Usage">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Usage Analytics</h1>
          <p className="text-gray-400 mt-1">Monitor penggunaan kredit dan aktivitas Anda</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {!apiData && sessionLoading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : stats.map((stat, i) => {
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
                      <div className={`p-3 rounded-lg ${stat.iconBg}`}>
                        <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                      </div>
                    </div>
                  </motion.div>
                )
              })}
        </div>

        {/* Chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
          className="bg-slate-900 border border-white/10 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h3 className="text-lg font-semibold text-gray-100">Grafik Penggunaan</h3>
            <div className="relative flex items-center bg-slate-800 rounded-lg p-1">
              {/* Sliding indicator */}
              <motion.div
                className="absolute top-1 bottom-1 bg-slate-700 rounded-md"
                style={{ width: `${100 / periods.length}%` }}
                animate={{ left: `calc(${activeIndex * (100 / periods.length)}% + 4px)` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
              {periods.map(p => (
                <button
                  key={p.key}
                  onClick={() => setChartPeriod(p.key)}
                  className={`relative z-10 px-4 py-1.5 text-sm font-medium rounded-md transition-colors duration-150 ${
                    chartPeriod === p.key ? "text-gray-100" : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {!apiData ? (
            <div className="h-64 bg-slate-800 rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="usage"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#usageGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#3b82f6" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Recent Activity Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-white/10">
            <h3 className="text-lg font-semibold text-gray-100">Aktivitas Terbaru</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900 border-b border-white/10">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">File / Judul</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Kredit</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Waktu</th>
                </tr>
              </thead>
              <tbody>
                {!apiData ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-slate-800 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : recentActivity.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-500 text-sm">
                      Belum ada aktivitas generate.
                    </td>
                  </tr>
                ) : (
                  recentActivity.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="bg-slate-950 border-b border-white/5 hover:bg-white/5 transition-colors duration-150"
                    >
                      <td className="px-4 py-3 text-sm text-gray-300">{idx + 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{formatDate(item.createdAt)}</td>
                      <td className="px-4 py-3 text-sm text-gray-200">Generate Metadata</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-200 max-w-xs truncate">
                        {item.filename ?? item.title ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{platformLabel(item.platform)}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">-{item.creditsUsed ?? 1} kredit</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{timeAgo(item.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}

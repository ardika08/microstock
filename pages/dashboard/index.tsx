import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import DashboardLayout from "~/components/dashboard/DashboardLayout"
import { useUser } from "~/hooks/useUser"
import { Copy, Check, TrendingUp, CreditCard, Package, BarChart2, ArrowRight } from "lucide-react"

function SkeletonCard() {
  return (
    <div className="bg-slate-900 border border-white/10 rounded-xl p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <div className="h-3 w-24 bg-slate-800 rounded" />
          <div className="h-7 w-16 bg-slate-800 rounded" />
        </div>
        <div className="h-12 w-12 bg-slate-800 rounded-lg" />
      </div>
    </div>
  )
}

function planLabel(pt: string | null | undefined): string {
  switch (pt) {
    case "starter": return "Starter"
    case "lifetime": return "One-time"
    case "topup": return "Top Up"
    default: return "Free Trial"
  }
}

function platformLabel(p: string | null | undefined): string {
  switch (p) {
    case "adobe_stock": return "Adobe Stock"
    case "shutterstock": return "Shutterstock"
    case "web": return "Web Dashboard"
    default: return p ?? "—"
  }
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

export default function DashboardPage() {
  const [copied, setCopied] = useState(false)
  const [statsData, setStatsData] = useState<any>(null)
  const [activationCode, setActivationCode] = useState<string | null>(null)
  const { credits, planType, isLoading: sessionLoading } = useUser()

  useEffect(() => {
    fetch("/api/user/stats")
      .then(r => r.json())
      .then(d => setStatsData(d))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch("/api/user/me")
      .then(r => r.json())
      .then(() => {
        // Activation codes are per-purchase; free users get null
        setActivationCode(null)
      })
      .catch(() => {})
  }, [])

  const handleCopy = () => {
    if (!activationCode) return
    navigator.clipboard.writeText(activationCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const stats = [
    {
      title: "Total Generate",
      value: statsData ? String(statsData.totalGenerates) : (sessionLoading ? "..." : "—"),
      icon: TrendingUp,
      borderColor: "border-l-blue-500",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-400",
    },
    {
      title: "Kredit Tersisa",
      value: sessionLoading ? "..." : String(credits ?? 0),
      icon: CreditCard,
      borderColor: "border-l-emerald-500",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
    },
    {
      title: "Paket Aktif",
      value: sessionLoading ? "..." : planLabel(planType),
      icon: Package,
      borderColor: "border-l-amber-500",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-400",
    },
    {
      title: "Rata-rata Harian",
      value: statsData ? `${statsData.dailyAvg}/hari` : "—",
      icon: BarChart2,
      borderColor: "border-l-purple-500",
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-400",
    },
  ]

  const recentActivity: any[] = statsData?.recentActivity ?? []

  return (
    <DashboardLayout title="Dashboard">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Dashboard</h1>
          <p className="text-gray-400 mt-1">Selamat datang kembali! Berikut ringkasan aktivitas Anda.</p>
        </div>

        {/* Activation Code Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative group"
        >
          <div className="absolute -inset-[1px] bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 rounded-xl opacity-70 group-hover:opacity-100 blur-[2px] transition-opacity duration-300" />
          <div className="relative bg-slate-900 rounded-xl p-6 border border-white/10">
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-gray-100">Kode Aktivasi Anda</h2>
              <p className="text-sm text-gray-400">Gunakan kode ini untuk mengaktifkan extension Chrome</p>
            </div>
            {activationCode ? (
              <div className="flex items-center gap-3">
                <code className="flex-1 px-4 py-3 bg-slate-800 border border-white/10 rounded-lg font-mono text-sm font-semibold text-gray-100">
                  {activationCode}
                </code>
                <button
                  onClick={handleCopy}
                  className="relative flex items-center gap-2 px-4 py-3 bg-slate-800 border border-white/10 rounded-lg hover:bg-slate-700 transition-all duration-200 text-sm font-medium"
                >
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.span
                        key="copied"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-1.5 text-emerald-400"
                      >
                        <Check className="w-4 h-4" />
                        Copied!
                      </motion.span>
                    ) : (
                      <motion.span
                        key="copy"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-1.5 text-gray-300"
                      >
                        <Copy className="w-4 h-4" />
                        Salin
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 italic">
                  {sessionLoading ? "Memuat..." : "Belum ada kode — kode aktivasi didapat setelah pembelian paket"}
                </p>
                {!sessionLoading && (
                  <a
                    href="/dashboard/billing"
                    className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Upgrade <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {sessionLoading && !statsData
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : stats.map((stat, i) => {
                const Icon = stat.icon
                return (
                  <motion.div
                    key={stat.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.06 }}
                    className={`bg-slate-900 border border-white/10 border-l-4 ${stat.borderColor} rounded-xl p-6 hover:border-white/20 transition-all duration-200`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-400">{stat.title}</p>
                        <p className="text-2xl font-bold text-gray-100 mt-2">{stat.value}</p>
                      </div>
                      <div className={`p-3 rounded-lg ${stat.iconBg}`}>
                        <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                      </div>
                    </div>
                  </motion.div>
                )
              })}
        </div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-slate-900 border border-white/10 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-gray-100">Aktivitas Terbaru</h3>
            <a
              href="/dashboard/history"
              className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Lihat semua <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {!statsData ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 bg-slate-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="py-10 text-center text-gray-500 text-sm">
              Belum ada aktivitas. Mulai generate metadata sekarang!
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {recentActivity.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-3 hover:bg-white/5 transition-colors duration-150 -mx-2 px-2 rounded-lg"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-200 truncate">
                      {item.filename ?? item.title ?? "Generate Metadata"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {platformLabel(item.platform)} · {timeAgo(item.createdAt)}
                    </p>
                  </div>
                  <span className="ml-3 text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-500/10 text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.15)] shrink-0">
                    Berhasil
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  )
}

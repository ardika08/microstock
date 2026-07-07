import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import DashboardLayout from "~/components/dashboard/DashboardLayout"
import { Copy, Check, TrendingUp, CreditCard, Package, BarChart2, Plus, Zap, ArrowRight } from "lucide-react"

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

export default function DashboardPage() {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const activationCode = "ACTV-2024-XXXX-YYYY-ZZZZ"

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

  const handleCopy = () => {
    navigator.clipboard.writeText(activationCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const stats = [
    {
      title: "Total Generate",
      value: "1,234",
      icon: TrendingUp,
      borderColor: "border-l-blue-500",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-400",
    },
    {
      title: "Kredit Tersisa",
      value: "847",
      icon: CreditCard,
      borderColor: "border-l-emerald-500",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
    },
    {
      title: "Paket Aktif",
      value: "Starter",
      icon: Package,
      borderColor: "border-l-amber-500",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-400",
    },
    {
      title: "Rata-rata Harian",
      value: "12/hari",
      icon: BarChart2,
      borderColor: "border-l-purple-500",
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-400",
    },
  ]

  return (
    <DashboardLayout title="Dashboard" userName="Budi Santoso" userEmail="budi@example.com">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Dashboard</h1>
          <p className="text-gray-400 mt-1">Selamat datang kembali! Berikut ringkasan aktivitas Anda.</p>
        </div>

        {/* Activation Code Card - gradient border + glow */}
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
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnimatePresence>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={`skel-${i}`} />)
              : stats.map((stat, i) => {
                  const Icon = stat.icon
                  return (
                    <motion.div
                      key={stat.title}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className={`bg-slate-900 border border-white/10 rounded-xl p-6 border-l-4 ${stat.borderColor} hover:border-white/20 transition-all duration-200`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-400">{stat.title}</p>
                          <p className="text-2xl font-bold text-gray-100 mt-2">{stat.value}</p>
                        </div>
                        <div className={`${stat.iconBg} p-3 rounded-lg`}>
                          <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
          </AnimatePresence>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-900 border border-white/10 rounded-xl p-6"
        >
          <h2 className="text-lg font-semibold text-gray-100 mb-1">Aksi Cepat</h2>
          <p className="text-sm text-gray-400 mb-4">Mulai generate metadata untuk file Anda</p>
          <div className="flex flex-wrap gap-3">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/25">
              <Plus className="w-4 h-4" />
              Generate Baru
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-gray-300 border border-white/10 rounded-lg font-medium text-sm transition-all duration-200 hover:-translate-y-0.5">
              <Zap className="w-4 h-4" />
              Batch Generate
            </button>
          </div>
        </motion.div>

        {/* Recent Activity Preview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-slate-900 border border-white/10 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-100">Aktivitas Terakhir</h2>
              <p className="text-sm text-gray-400">5 generate terakhir Anda</p>
            </div>
            <button className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors">
              Lihat semua
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1">
            {[
              { file: "sunset-beach.jpg", time: "2 menit lalu", status: "success" },
              { file: "mountain-view.jpg", time: "15 menit lalu", status: "success" },
              { file: "city-night.jpg", time: "1 jam lalu", status: "success" },
              { file: "forest-path.jpg", time: "3 jam lalu", status: "failed" },
              { file: "ocean-wave.jpg", time: "5 jam lalu", status: "success" },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-white/5 transition-colors duration-150 border-b border-white/5 last:border-b-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-200">{item.file}</p>
                  <p className="text-xs text-gray-500">{item.time}</p>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    item.status === "success"
                      ? "bg-emerald-500/10 text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.15)]"
                      : "bg-red-500/10 text-red-400 shadow-[0_0_8px_rgba(248,113,113,0.15)]"
                  }`}
                >
                  {item.status === "success" ? "Berhasil" : "Gagal"}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}

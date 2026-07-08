import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ResponsiveContainer, LineChart, Line } from "recharts"
import DashboardLayout from "~/components/dashboard/DashboardLayout"
import { useUser } from "~/hooks/useUser"
import { Copy, Check, TrendingUp, CreditCard, Package, BarChart2, ArrowRight, CheckCircle2, Circle, ChevronDown, ChevronUp } from "lucide-react"

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

// ── Sparkline for Total Generate card ──────────────────────────────────────
function SparklineChart({ chartData }: { chartData: { date: string; count: number }[] }) {
  const last7 = chartData.slice(-7)
  if (last7.length === 0) return null
  return (
    <div className="mt-3 h-10 w-full opacity-70">
      <ResponsiveContainer width="100%" height={40}>
        <LineChart data={last7}>
          <defs>
            <linearGradient id="sparkGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity={1} />
            </linearGradient>
          </defs>
          <Line
            type="monotone"
            dataKey="count"
            stroke="url(#sparkGradient)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Credit progress bar ─────────────────────────────────────────────────────
function CreditProgressBar({
  credits,
  creditsUsed,
  planType,
  dailyAvg,
}: {
  credits: number
  creditsUsed: number
  planType: string | null | undefined
  dailyAvg: number
}) {
  if (planType === "starter") {
    return (
      <div className="mt-3">
        <span className="text-xs font-semibold text-cyan-400 tracking-wide">Unlimited</span>
      </div>
    )
  }

  const maxCredits = planType === "topup" ? credits + creditsUsed : 20
  const used = planType === "topup" ? creditsUsed : Math.max(0, maxCredits - credits)
  const pct = maxCredits > 0 ? Math.min(100, Math.round((used / maxCredits) * 100)) : 0
  const daysLeft = Math.ceil(credits / Math.max(dailyAvg, 0.1))

  return (
    <div className="mt-3 space-y-1.5">
      {/* track */}
      <div className="relative h-1.5 w-full rounded-full bg-slate-700 overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #60a5fa, #22d3ee)",
            transition: "width 0.6s ease",
          }}
        />
      </div>
      <p className="text-[10px] text-gray-500 leading-tight">
        Estimasi habis dalam <span className="text-gray-400 font-medium">{daysLeft} hari</span>
      </p>
    </div>
  )
}

// ── Onboarding checklist ────────────────────────────────────────────────────
interface OnboardingStep {
  title: string
  description: string
  done: boolean
}

function OnboardingChecklist({
  steps,
  isOpen,
  onToggle,
}: {
  steps: OnboardingStep[]
  isOpen: boolean
  onToggle: () => void
}) {
  const doneCount = steps.filter(s => s.done).length
  const pct = Math.round((doneCount / steps.length) * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="relative group"
    >
      {/* gradient border */}
      <div className="absolute -inset-[1px] bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 rounded-xl opacity-60 group-hover:opacity-90 blur-[2px] transition-opacity duration-300" />
      <div className="relative bg-slate-900 rounded-xl border border-white/10">
        {/* header — always visible */}
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between px-6 py-4 text-left"
        >
          <div>
            <h2 className="text-base font-semibold text-gray-100">🚀 Mulai Setup</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Selesaikan langkah berikut untuk mulai menggunakan Autofillstock
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
              {doneCount}/{steps.length} langkah selesai
            </span>
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </button>

        {/* overall progress bar */}
        <div className="px-6 pb-2">
          <div className="h-1 w-full rounded-full bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: "linear-gradient(90deg, #3b82f6, #a855f7)",
              }}
            />
          </div>
        </div>

        {/* collapsible steps */}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              key="steps"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-5 pt-2 space-y-3">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    {step.done ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className={`text-sm font-medium ${step.done ? "text-gray-200" : "text-gray-400"}`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [copied, setCopied] = useState(false)
  const [statsData, setStatsData] = useState<any>(null)
  const [activationCode, setActivationCode] = useState<string | null>(null)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [checklistOpen, setChecklistOpen] = useState(true)
  const { credits, planType, creditsUsed, isLoading: sessionLoading } = useUser()

  useEffect(() => {
    fetch("/api/user/stats")
      .then(r => r.json())
      .then(d => setStatsData(d))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch("/api/user/activation-code")
      .then(r => r.json())
      .then(d => {
        setActivationCode(d.code ?? null)
      })
      .catch(() => {})
  }, [])

  // Check localStorage for API key (client-side only)
  useEffect(() => {
    try {
      const key = localStorage.getItem("autofillstock_openai_key")
      setHasApiKey(!!key)
    } catch {
      setHasApiKey(false)
    }
  }, [])

  const handleCopy = () => {
    if (!activationCode) return
    navigator.clipboard.writeText(activationCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Onboarding steps ──
  const onboardingSteps: OnboardingStep[] = [
    {
      title: "Login berhasil",
      description: "Akun Anda sudah aktif dan siap digunakan.",
      done: true,
    },
    {
      title: "Aktivasi Extension",
      description: "Masukkan kode aktivasi ke Chrome Extension Autofillstock.",
      done: !!activationCode,
    },
    {
      title: "Tambah API Key",
      description: "Tambahkan OpenAI API Key agar bisa generate metadata.",
      done: planType === "starter" || hasApiKey,
    },
    {
      title: "Generate Pertama",
      description: "Coba generate metadata untuk foto pertama Anda.",
      done: (statsData?.totalGenerates ?? 0) > 0,
    },
  ]

  const allOnboardingDone = onboardingSteps.every(s => s.done)

  // ── Stats ──
  const dailyAvg: number = statsData?.dailyAvg ?? 0
  const sparkData: { date: string; count: number }[] = statsData?.chartData ?? []

  const stats = [
    {
      title: "Total Generate",
      value: statsData ? String(statsData.totalGenerates) : (sessionLoading ? "..." : "—"),
      icon: TrendingUp,
      borderColor: "border-l-blue-500",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-400",
      extra: "sparkline",
    },
    {
      title: "Kredit Tersisa",
      value: sessionLoading ? "..." : String(credits ?? 0),
      icon: CreditCard,
      borderColor: "border-l-emerald-500",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
      extra: "creditbar",
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

        {/* Onboarding Checklist — only when not all done and data loaded */}
        <AnimatePresence>
          {!sessionLoading && !allOnboardingDone && (
            <OnboardingChecklist
              steps={onboardingSteps}
              isOpen={checklistOpen}
              onToggle={() => setChecklistOpen(o => !o)}
            />
          )}
        </AnimatePresence>

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
                  {sessionLoading
                    ? "Memuat..."
                    : "Belum ada kode — kode aktivasi didapat setelah pembelian paket. Jika baru saja membayar, tunggu beberapa menit."}
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
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-400">{stat.title}</p>
                        <p className="text-2xl font-bold text-gray-100 mt-2">{stat.value}</p>
                      </div>
                      <div className={`p-3 rounded-lg ${stat.iconBg} shrink-0`}>
                        <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                      </div>
                    </div>

                    {/* Sparkline — Total Generate */}
                    {stat.extra === "sparkline" && sparkData.length > 0 && (
                      <SparklineChart chartData={sparkData} />
                    )}

                    {/* Credit progress bar — Kredit Tersisa */}
                    {stat.extra === "creditbar" && !sessionLoading && (
                      <CreditProgressBar
                        credits={credits ?? 0}
                        creditsUsed={creditsUsed ?? 0}
                        planType={planType}
                        dailyAvg={dailyAvg}
                      />
                    )}
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

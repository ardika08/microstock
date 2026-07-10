import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useSession } from "next-auth/react"
import DashboardLayout from "~/components/dashboard/DashboardLayout"
import { useUser } from "~/hooks/useUser"
import { Check, CreditCard, Zap, Crown, TrendingUp, BarChart2, Loader2 } from "lucide-react"

function productLabel(productType: string | null | undefined): string {
  switch (productType) {
    case "intro": return "Intro Pack 150 Kredit"
    case "basic": return "Basic Pack 450 Kredit"
    case "value": return "Value Pack 1.200 Kredit"
    case "topup_500": return "Top Up Kredit"
    case "starter_monthly": return "Starter Bulanan"
    case "lifetime": return "One-time Lifetime"
    default: return productType ?? "—"
  }
}

function formatRupiah(amount: number | null | undefined): string {
  if (amount == null) return "—"
  return "Rp " + amount.toLocaleString("id-ID")
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

function planLabel(planType: string) {
  switch (planType) {
    case "lifetime": return "One-time Lifetime"
    case "topup": return "Top Up Kredit"
    default: return "Free Trial"
  }
}

const PRODUCTS = [
  {
    key: "intro",
    name: "Intro Pack",
    price: "Rp9.900",
    originalPrice: "Rp50.000",
    credits: "150 kredit",
    badge: "🔥 Terlaris",
    icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
    features: [
      "150 kredit ditambahkan",
      "Tidak ada masa berlaku",
      "Pakai kapan saja",
    ],
    cta: "Beli Intro Pack",
    highlight: true,
    color: "border-emerald-500/50 bg-emerald-500/5",
    btnClass: "bg-emerald-600 hover:bg-emerald-500 text-white",
  },
  {
    key: "basic",
    name: "Basic Pack",
    price: "Rp25.000",
    originalPrice: null,
    credits: "450 kredit",
    badge: null,
    icon: <Zap className="w-5 h-5 text-blue-400" />,
    features: [
      "450 kredit ditambahkan",
      "Tidak ada masa berlaku",
      "Hemat ~Rp56/kredit",
    ],
    cta: "Beli Basic Pack",
    highlight: false,
    color: "border-slate-800 bg-slate-900",
    btnClass: "bg-slate-700 hover:bg-slate-600 text-gray-100",
  },
  {
    key: "value",
    name: "Value Pack",
    price: "Rp50.000",
    originalPrice: null,
    credits: "1.200 kredit",
    badge: null,
    icon: <BarChart2 className="w-5 h-5 text-purple-400" />,
    features: [
      "1.200 kredit ditambahkan",
      "Tidak ada masa berlaku",
      "Hemat ~Rp42/kredit",
    ],
    cta: "Beli Value Pack",
    highlight: false,
    color: "border-slate-800 bg-slate-900",
    btnClass: "bg-slate-700 hover:bg-slate-600 text-gray-100",
  },
  {
    key: "lifetime",
    name: "One-time Lifetime",
    price: "Rp249.000",
    originalPrice: "Rp349.000",
    credits: "Unlimited selamanya",
    badge: "👑 Terbaik",
    icon: <Crown className="w-5 h-5 text-purple-400" />,
    features: [
      "Generate unlimited selamanya",
      "Pakai API key OpenAI sendiri",
      "Tidak ada biaya bulanan",
      "Update gratis selamanya",
    ],
    cta: "Beli Lifetime",
    highlight: false,
    color: "border-purple-500/50 bg-purple-500/5",
    btnClass: "bg-purple-600 hover:bg-purple-500 text-white",
  },
]

export default function BillingPage() {
  const { data: session } = useSession()
  const { planType, credits, isLoading } = useUser()
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [paymentHistory, setPaymentHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  const user = session?.user as any

  useEffect(() => {
    setHistoryLoading(true)
    fetch("/api/payment/history")
      .then(r => r.json())
      .then(d => setPaymentHistory(d.payments ?? []))
      .catch(() => setPaymentHistory([]))
      .finally(() => setHistoryLoading(false))
  }, [])

  const handleUpgrade = async (productKey: string) => {
    setLoadingKey(productKey)
    setError(null)
    try {
      const res = await fetch("/api/payment/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productType: productKey }),
      })
      const data = await res.json()
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, "_blank", "noopener,noreferrer")
      } else {
        setError(data.error ?? "Gagal membuka halaman pembayaran")
      }
    } catch (err) {
      console.error(err)
      setError("Terjadi kesalahan. Coba lagi.")
    } finally {
      setLoadingKey(null)
    }
  }

  return (
    <DashboardLayout title="Billing">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Billing & Kredit</h1>
          <p className="text-gray-400 mt-1">Beli kredit, pakai kapanpun. Kredit tidak pernah expire.</p>
        </div>

        {/* Active Plan Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative">
          <div className="absolute -inset-[1px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-xl opacity-40 blur-sm" />
          <div className="relative bg-slate-900 rounded-xl p-6 border border-slate-800">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Paket Aktif</p>
                {isLoading ? (
                  <div className="h-7 w-32 bg-slate-800 animate-pulse rounded" />
                ) : (
                  <h2 className="text-2xl font-bold text-gray-100">{planLabel(planType)}</h2>
                )}
              </div>
              <div className="flex items-center gap-6">
                {planType !== "lifetime" && (
                  <div className="text-center">
                    <p className="text-sm text-gray-400">Kredit tersisa</p>
                    {isLoading ? (
                      <div className="h-8 w-16 bg-slate-800 animate-pulse rounded mt-1" />
                    ) : (
                      <p className="text-3xl font-bold text-blue-400">{credits}</p>
                    )}
                  </div>
                )}
                {planType === "lifetime" && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                    <span className="text-emerald-400 font-semibold">∞ Unlimited</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Pricing cards */}
        <div>
          <h2 className="text-xl font-semibold text-gray-100 mb-4">Pilih Paket Kredit</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PRODUCTS.map((product) => {
              const isCurrent = product.key === "lifetime" && planType === "lifetime"
              const isProcessing = loadingKey === product.key

              return (
                <motion.div
                  key={product.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`relative flex flex-col rounded-xl border p-6 ${product.color}`}
                >
                  {product.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-slate-800 border border-white/10 text-white text-xs font-semibold rounded-full whitespace-nowrap">
                      {product.badge}
                    </span>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    {product.icon}
                    <span className="font-semibold text-gray-100">{product.name}</span>
                  </div>

                  <div className="mb-1">
                    {product.originalPrice && (
                      <span className="text-sm text-gray-500 line-through mr-1">{product.originalPrice}</span>
                    )}
                    <span className="text-2xl font-bold text-gray-100">{product.price}</span>
                  </div>
                  <p className="text-sm text-emerald-400 font-medium mb-4">{product.credits}</p>

                  <ul className="space-y-2 mb-6 flex-1">
                    {product.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                        <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <div className="w-full py-2 text-center text-sm font-medium text-emerald-400 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                      Paket Aktif
                    </div>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(product.key)}
                      disabled={isProcessing}
                      className={`w-full py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${product.btnClass}`}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Memproses...
                        </>
                      ) : (
                        product.cta
                      )}
                    </button>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Payment history */}
        <div>
          <h2 className="text-xl font-semibold text-gray-100 mb-4">Riwayat Pembayaran</h2>
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="px-4 py-3 text-left text-gray-400 font-medium">Tanggal</th>
                  <th className="px-4 py-3 text-left text-gray-400 font-medium">Produk</th>
                  <th className="px-4 py-3 text-left text-gray-400 font-medium">Jumlah</th>
                  <th className="px-4 py-3 text-left text-gray-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {historyLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      {Array.from({ length: 4 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-slate-800 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : paymentHistory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      Belum ada riwayat pembayaran.
                    </td>
                  </tr>
                ) : (
                  paymentHistory.map((p: any) => (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{formatDate(p.createdAt)}</td>
                      <td className="px-4 py-3 text-gray-200">{productLabel(p.productType)}</td>
                      <td className="px-4 py-3 text-gray-200 whitespace-nowrap">{formatRupiah(p.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          p.status === "success"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : p.status === "pending"
                            ? "bg-yellow-500/10 text-yellow-400"
                            : "bg-red-500/10 text-red-400"
                        }`}>
                          {p.status === "success" ? "Berhasil" : p.status === "pending" ? "Pending" : "Gagal"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

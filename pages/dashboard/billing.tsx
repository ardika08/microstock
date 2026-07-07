import React from "react"
import { motion } from "framer-motion"
import DashboardLayout from "~/components/dashboard/DashboardLayout"
import { Check, Download, CreditCard, Calendar, Zap } from "lucide-react"

const plans = [
  {
    name: "Starter",
    price: "Rp 99.000",
    period: "/bulan",
    credits: 1000,
    features: [
      "1.000 kredit/bulan",
      "Generate unlimited",
      "Export CSV/JSON",
      "Email support",
      "7 hari trial gratis",
    ],
    current: true,
    popular: false,
  },
  {
    name: "Professional",
    price: "Rp 249.000",
    period: "/bulan",
    credits: 3000,
    features: [
      "3.000 kredit/bulan",
      "Generate unlimited",
      "Export CSV/JSON",
      "Priority support",
      "API access",
      "Custom templates",
    ],
    current: false,
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Rp 499.000",
    period: "/bulan",
    credits: 10000,
    features: [
      "10.000 kredit/bulan",
      "Generate unlimited",
      "Export CSV/JSON",
      "24/7 Priority support",
      "API access",
      "Custom templates",
      "Team collaboration",
      "Dedicated account manager",
    ],
    current: false,
    popular: false,
  },
]

const paymentHistory = [
  { id: "INV-2024-001", date: "15 Jun 2024", plan: "Starter", amount: "Rp 99.000", status: "paid" },
  { id: "INV-2024-002", date: "15 Mei 2024", plan: "Starter", amount: "Rp 99.000", status: "paid" },
  { id: "INV-2024-003", date: "15 Apr 2024", plan: "Starter", amount: "Rp 99.000", status: "paid" },
  { id: "INV-2024-004", date: "15 Mar 2024", plan: "Free Trial", amount: "Rp 0", status: "paid" },
]

export default function BillingPage() {
  return (
    <DashboardLayout title="Billing" userName="Budi Santoso" userEmail="budi@example.com">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Billing & Paket</h1>
          <p className="text-gray-400 mt-1">Kelola paket langganan dan riwayat pembayaran Anda</p>
        </div>

        {/* Active Plan Card - gradient border */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative group"
        >
          <div className="absolute -inset-[1px] bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl opacity-70 group-hover:opacity-100 blur-[2px] transition-opacity duration-300" />
          <div className="relative bg-slate-900 rounded-xl p-6 border border-white/10">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-100">Paket Starter</h2>
                <p className="text-gray-400 mt-1">Paket langganan aktif Anda</p>
              </div>
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-full shadow-[0_0_8px_rgba(52,211,153,0.2)]">
                Aktif
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/10 p-2 rounded-lg">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Kredit Tersisa</p>
                  <p className="text-lg font-bold text-gray-100">847 / 1,000</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-purple-500/10 p-2 rounded-lg">
                  <Calendar className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Berakhir Pada</p>
                  <p className="text-lg font-bold text-gray-100">15 Jul 2024</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-amber-500/10 p-2 rounded-lg">
                  <Zap className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Harga</p>
                  <p className="text-lg font-bold text-gray-100">Rp 99.000/bln</p>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-400">Penggunaan Kredit</span>
                <span className="font-medium text-gray-200">15.3% terpakai</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "15.3%" }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                  className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button className="px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-slate-700 transition-colors">
                Perpanjang Sekarang
              </button>
              <button className="px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-slate-700 transition-colors">
                Batalkan Paket
              </button>
            </div>
          </div>
        </motion.div>

        {/* Plan Cards */}
        <div>
          <h2 className="text-2xl font-bold text-gray-100 mb-4">Pilih Paket Langganan</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.02, y: -4 }}
                className={`relative bg-slate-900 border rounded-xl p-6 transition-all duration-300 ${
                  plan.popular
                    ? "border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                    : "border-white/10 hover:border-white/20"
                } ${plan.current ? "opacity-80" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-full">
                      Paling Populer
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-100">{plan.name}</h3>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-gray-100">{plan.price}</span>
                    <span className="text-gray-500">{plan.period}</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-2">{plan.credits.toLocaleString()} kredit/bulan</p>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  disabled={plan.current}
                  className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    plan.current
                      ? "bg-slate-800 text-gray-500 cursor-not-allowed border border-white/5"
                      : plan.popular
                      ? "bg-blue-500 hover:bg-blue-600 text-white hover:shadow-lg hover:shadow-blue-500/25"
                      : "bg-slate-800 border border-white/10 text-gray-300 hover:bg-slate-700"
                  }`}
                >
                  {plan.current ? "Paket Aktif" : "Pilih Paket"}
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Payment History */}
        <div className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-lg font-semibold text-gray-100">Riwayat Pembayaran</h2>
            <p className="text-sm text-gray-400">Histori transaksi dan invoice Anda</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-900 border-b border-white/10">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Invoice ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Tanggal</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Paket</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Jumlah</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((payment) => (
                  <tr key={payment.id} className="bg-slate-950 border-b border-white/5 hover:bg-white/5 transition-colors duration-150">
                    <td className="px-4 py-3 text-sm font-medium text-gray-200">{payment.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{payment.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-200">{payment.plan}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-200">{payment.amount}</td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-full shadow-[0_0_8px_rgba(52,211,153,0.2)]">
                        Lunas
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button className="group flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors">
                        <Download className="w-4 h-4 group-hover:animate-bounce" />
                        Download
                      </button>
                    </td>
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

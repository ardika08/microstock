import React from "react"
import DashboardLayout from "~/components/dashboard/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Button } from "~/components/ui/button"
import { Badge } from "~/components/ui/badge"
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
  {
    id: "INV-2024-001",
    date: "15 Jun 2024",
    plan: "Starter",
    amount: "Rp 99.000",
    status: "paid",
  },
  {
    id: "INV-2024-002",
    date: "15 Mei 2024",
    plan: "Starter",
    amount: "Rp 99.000",
    status: "paid",
  },
  {
    id: "INV-2024-003",
    date: "15 Apr 2024",
    plan: "Starter",
    amount: "Rp 99.000",
    status: "paid",
  },
  {
    id: "INV-2024-004",
    date: "15 Mar 2024",
    plan: "Free Trial",
    amount: "Rp 0",
    status: "paid",
  },
]

export default function BillingPage() {
  return (
    <DashboardLayout title="Billing" userName="Budi Santoso" userEmail="budi@example.com">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Billing & Paket</h1>
          <p className="text-gray-500 mt-1">Kelola paket langganan dan riwayat pembayaran Anda</p>
        </div>

        {/* Active Plan Card */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">Paket Starter</CardTitle>
                <CardDescription className="text-base mt-1">Paket langganan aktif Anda</CardDescription>
              </div>
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Aktif</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Kredit Tersisa</p>
                  <p className="text-lg font-bold text-gray-900">847 / 1,000</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Berakhir Pada</p>
                  <p className="text-lg font-bold text-gray-900">15 Jul 2024</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <Zap className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Harga</p>
                  <p className="text-lg font-bold text-gray-900">Rp 99.000/bln</p>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Penggunaan Kredit</span>
                <span className="font-medium text-gray-900">15.3% terpakai</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-blue-600 h-3 rounded-full" style={{ width: "15.3%" }} />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline">Perpanjang Sekarang</Button>
              <Button variant="outline">Batalkan Paket</Button>
            </div>
          </CardContent>
        </Card>

        {/* Plan Cards */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Pilih Paket Langganan</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative ${
                  plan.popular ? "border-blue-500 border-2 shadow-lg" : ""
                } ${plan.current ? "bg-gray-50" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-600">Paling Populer</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-500">{plan.period}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{plan.credits.toLocaleString()} kredit/bulan</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.current ? "outline" : plan.popular ? "default" : "outline"}
                    disabled={plan.current}
                  >
                    {plan.current ? "Paket Aktif" : "Pilih Paket"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Pembayaran</CardTitle>
            <CardDescription>Histori transaksi dan invoice Anda</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Invoice ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tanggal</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Paket</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Jumlah</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((payment) => (
                    <tr key={payment.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{payment.id}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{payment.date}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{payment.plan}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{payment.amount}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="default"
                          className="bg-green-100 text-green-700 hover:bg-green-100"
                        >
                          Lunas
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" className="gap-2">
                          <Download className="w-4 h-4" />
                          Download
                        </Button>
                      </td>
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

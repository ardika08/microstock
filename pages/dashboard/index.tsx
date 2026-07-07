import React, { useState } from "react"
import DashboardLayout from "~/components/dashboard/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Button } from "~/components/ui/button"
import { Copy, Check, TrendingUp, CreditCard, Package, BarChart2, Plus } from "lucide-react"

export default function DashboardPage() {
  const [copied, setCopied] = useState(false)
  const activationCode = "ACTV-2024-XXXX-YYYY-ZZZZ"

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
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Kredit Tersisa",
      value: "847",
      icon: CreditCard,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Paket Aktif",
      value: "Starter",
      icon: Package,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Rata-rata Harian",
      value: "12/hari",
      icon: BarChart2,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ]

  return (
    <DashboardLayout title="Dashboard" userName="Budi Santoso" userEmail="budi@example.com">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Selamat datang kembali! Berikut ringkasan aktivitas Anda.</p>
        </div>

        {/* Activation Code Card */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader>
            <CardTitle className="text-lg">Kode Aktivasi Anda</CardTitle>
            <CardDescription>Gunakan kode ini untuk mengaktifkan extension Chrome</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <code className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-lg font-mono text-sm font-semibold text-gray-900">
                {activationCode}
              </code>
              <Button
                onClick={handleCopy}
                variant="outline"
                size="icon"
                className="relative"
                title={copied ? "Tersalin!" : "Salin kode"}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            {copied && (
              <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Kode berhasil disalin ke clipboard!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.title} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                    </div>
                    <div className={`${stat.bgColor} p-3 rounded-lg`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Aksi Cepat</CardTitle>
            <CardDescription>Mulai generate metadata untuk file Anda</CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="lg" className="gap-2">
              <Plus className="w-5 h-5" />
              Generate Baru
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Aktivitas Terakhir</CardTitle>
            <CardDescription>5 generate terakhir Anda</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { file: "sunset-beach.jpg", time: "2 menit lalu", status: "success" },
                { file: "mountain-view.jpg", time: "15 menit lalu", status: "success" },
                { file: "city-night.jpg", time: "1 jam lalu", status: "success" },
                { file: "forest-path.jpg", time: "3 jam lalu", status: "failed" },
                { file: "ocean-wave.jpg", time: "5 jam lalu", status: "success" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.file}</p>
                    <p className="text-xs text-gray-500">{item.time}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      item.status === "success"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {item.status === "success" ? "Berhasil" : "Gagal"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import DashboardLayout from '~/components/dashboard/DashboardLayout'
import {
  Users, CreditCard, TrendingUp, DollarSign,
  Crown, Zap, RefreshCw, Shield
} from 'lucide-react'

const ADMIN_EMAIL = 'ardika.yudha08@gmail.com'

const PLAN_LABEL: Record<string, string> = {
  free: 'Free',
  topup: 'Top Up',
  starter: 'Starter',
  lifetime: 'One-time',
}

const PLAN_COLOR: Record<string, string> = {
  free: 'bg-slate-700/50 text-gray-400',
  topup: 'bg-emerald-500/20 text-emerald-400',
  starter: 'bg-blue-500/20 text-blue-400',
  lifetime: 'bg-purple-500/20 text-purple-400',
}

const PRODUCT_LABEL: Record<string, string> = {
  topup_500: 'Top Up Kredit',
  starter_monthly: 'Starter Bulanan',
  lifetime: 'One-time License',
}

function formatDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'payments'>('overview')

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/login'); return }
    if (status === 'loading') return
    if (session?.user?.email !== ADMIN_EMAIL) { router.push('/dashboard'); return }
    fetchData()
  }, [status])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/stats')
      if (!res.ok) throw new Error('Gagal memuat data')
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout title="Admin">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout title="Admin">
        <div className="text-center py-20 text-red-400">{error}</div>
      </DashboardLayout>
    )
  }

  const { stats, users, payments } = data ?? {}

  return (
    <DashboardLayout title="Admin">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-100">Admin Panel</h1>
              <p className="text-sm text-gray-500">autofillstock.my.id — akses terbatas</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-slate-700 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'Total User', value: stats?.totalUsers ?? 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { title: 'User Berbayar', value: stats?.paidUsers ?? 0, icon: Crown, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { title: 'Total Transaksi', value: stats?.totalTransactions ?? 0, icon: CreditCard, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { title: 'Total Revenue', value: formatRupiah(stats?.totalRevenue ?? 0), icon: DollarSign, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          ].map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-slate-900 border border-white/10 rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-400">{s.title}</p>
                <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-100">{s.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Plan Breakdown */}
        <div className="bg-slate-900 border border-white/10 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-400 mb-4">Distribusi Plan</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(stats?.planBreakdown ?? {}).map(([plan, count]: any) => (
              <div key={plan} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_COLOR[plan] ?? 'bg-slate-700 text-gray-400'}`}>
                  {PLAN_LABEL[plan] ?? plan}
                </span>
                <span className="text-lg font-bold text-gray-100">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10">
          {(['users', 'payments'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab === 'users' ? `Users (${users?.length ?? 0})` : `Payments (${payments?.length ?? 0})`}
            </button>
          ))}
        </div>

        {/* Users Table */}
        {activeTab === 'users' && (
          <div className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">User</th>
                    <th className="px-4 py-3 text-left">Plan</th>
                    <th className="px-4 py-3 text-right">Kredit</th>
                    <th className="px-4 py-3 text-right">Digunakan</th>
                    <th className="px-4 py-3 text-left">Daftar</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map((u: any) => (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-gray-100 font-medium">{u.name ?? '—'}</p>
                        <p className="text-gray-500 text-xs">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_COLOR[u.planType ?? 'free']}`}>
                          {PLAN_LABEL[u.planType ?? 'free'] ?? u.planType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {u.planType === 'starter' || u.planType === 'lifetime' ? '∞' : u.credits ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">{u.creditsUsed ?? 0}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!users || users.length === 0) && (
                <div className="text-center py-12 text-gray-600">Belum ada user</div>
              )}
            </div>
          </div>
        )}

        {/* Payments Table */}
        {activeTab === 'payments' && (
          <div className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">User</th>
                    <th className="px-4 py-3 text-left">Paket</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {payments?.map((p: any) => (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-gray-100 font-medium">{p.userName ?? '—'}</p>
                        <p className="text-gray-500 text-xs">{p.userEmail}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {PRODUCT_LABEL[p.productType] ?? p.productType}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-400">
                        {p.amount ? formatRupiah(p.amount) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          p.status === 'success'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(p.paidAt ?? p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!payments || payments.length === 0) && (
                <div className="text-center py-12 text-gray-600">Belum ada transaksi</div>
              )}
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}

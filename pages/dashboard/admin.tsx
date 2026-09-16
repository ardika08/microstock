import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import DashboardLayout from '~/components/dashboard/DashboardLayout'
import {
  Users, CreditCard, TrendingUp, DollarSign,
  Crown, Zap, RefreshCw, Shield, X, Eye, Trash2,
  Calendar, Activity, CheckCircle2, XCircle
} from 'lucide-react'

const ADMIN_EMAIL = 'ardika.yudha08@gmail.com'

const PLAN_LABEL: Record<string, string> = {
  free: 'Free',
  intro: 'Intro Pack',
  basic: 'Basic Pack',
  value: 'Value Pack',
  topup: 'Top Up',
  starter: 'Starter',
  lifetime: 'One-time',
}

const PLAN_COLOR: Record<string, string> = {
  free: 'bg-slate-700/50 text-gray-400',
  intro: 'bg-emerald-500/20 text-emerald-400',
  basic: 'bg-blue-500/20 text-blue-400',
  value: 'bg-violet-500/20 text-violet-400',
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
  const [userPage, setUserPage] = useState(1)
  const [paymentPage, setPaymentPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [deletingUser, setDeletingUser] = useState<any>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false)
  const PAGE_SIZE = 10

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

  const handleDeleteUser = async (userId: string) => {
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Gagal menghapus user')
      setDeletingUser(null)
      setSelectedUsers(prev => { const next = new Set(prev); next.delete(userId); return next })
      fetchData() // Refresh data
    } catch (e: any) {
      alert(e.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedUsers.size === 0) return
    setDeleteLoading(true)
    try {
      const results = await Promise.allSettled(
        Array.from(selectedUsers).map(id =>
          fetch(`/api/admin/users/${id}`, { method: 'DELETE' }).then(r => r.json())
        )
      )
      const failed = results.filter(r => r.status === 'rejected').length
      setBulkDeleteModal(false)
      setSelectedUsers(new Set())
      fetchData()
      if (failed > 0) alert(`${failed} user gagal dihapus`)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  const toggleSelectUser = (id: string) => {
    setSelectedUsers(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    const pageUserIds = pagedUsers.map((u: any) => u.id)
    const allSelected = pageUserIds.every((id: string) => selectedUsers.has(id))
    setSelectedUsers(prev => {
      const next = new Set(prev)
      if (allSelected) {
        pageUserIds.forEach((id: string) => next.delete(id))
      } else {
        pageUserIds.forEach((id: string) => next.add(id))
      }
      return next
    })
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

  // Pagination helpers
  const userTotalPages = Math.ceil((users?.length ?? 0) / PAGE_SIZE)
  const paymentTotalPages = Math.ceil((payments?.length ?? 0) / PAGE_SIZE)
  const pagedUsers = (users ?? []).slice((userPage - 1) * PAGE_SIZE, userPage * PAGE_SIZE)
  const pagedPayments = (payments ?? []).slice((paymentPage - 1) * PAGE_SIZE, paymentPage * PAGE_SIZE)

  const Pagination = ({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) => {
    if (totalPages <= 1) return null
    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
        <p className="text-xs text-gray-500">
          Halaman {page} dari {totalPages}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPage(1)}
            disabled={page === 1}
            className="px-2 py-1 text-xs rounded bg-slate-800 text-gray-400 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >«</button>
          <button
            onClick={() => onPage(page - 1)}
            disabled={page === 1}
            className="px-2 py-1 text-xs rounded bg-slate-800 text-gray-400 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >‹</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce((acc: (number | string)[], p, i, arr) => {
              if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...')
              acc.push(p)
              return acc
            }, [])
            .map((p, i) => p === '...'
              ? <span key={`ellipsis-${i}`} className="px-2 py-1 text-xs text-gray-600">…</span>
              : <button
                  key={p}
                  onClick={() => onPage(p as number)}
                  className={`px-2.5 py-1 text-xs rounded transition-colors ${
                    page === p
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
                  }`}
                >{p}</button>
            )
          }
          <button
            onClick={() => onPage(page + 1)}
            disabled={page === totalPages}
            className="px-2 py-1 text-xs rounded bg-slate-800 text-gray-400 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >›</button>
          <button
            onClick={() => onPage(totalPages)}
            disabled={page === totalPages}
            className="px-2 py-1 text-xs rounded bg-slate-800 text-gray-400 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >»</button>
        </div>
      </div>
    )
  }

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
            {/* Bulk Actions Bar */}
            {selectedUsers.size > 0 && (
              <div className="flex items-center justify-between px-4 py-3 bg-red-500/10 border-b border-red-500/20">
                <span className="text-sm text-red-400">
                  {selectedUsers.size} user dipilih
                </span>
                <button
                  onClick={() => setBulkDeleteModal(true)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus Terpilih
                </button>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left w-10">
                      <input
                        type="checkbox"
                        checked={pagedUsers.length > 0 && pagedUsers.every((u: any) => selectedUsers.has(u.id))}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3 text-left">User</th>
                    <th className="px-4 py-3 text-left">Plan</th>
                    <th className="px-4 py-3 text-right">Kredit</th>
                    <th className="px-4 py-3 text-right">Digunakan</th>
                    <th className="px-4 py-3 text-left">Daftar</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedUsers.map((u: any) => (
                    <tr key={u.id} className={`border-b border-white/5 hover:bg-white/2 transition-colors ${selectedUsers.has(u.id) ? 'bg-blue-500/5' : ''}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(u.id)}
                          onChange={() => toggleSelectUser(u.id)}
                          className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                        />
                      </td>
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
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedUser(u)}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            Detail
                          </button>
                          <button
                            onClick={() => setDeletingUser(u)}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!users || users.length === 0) && (
                <div className="text-center py-12 text-gray-600">Belum ada user</div>
              )}
              <Pagination page={userPage} totalPages={userTotalPages} onPage={setUserPage} />
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
                  {pagedPayments.map((p: any) => (
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
              <Pagination page={paymentPage} totalPages={paymentTotalPages} onPage={setPaymentPage} />
            </div>
          </div>
        )}

      </div>

      {/* User Detail Modal */}
      <AnimatePresence>
        {selectedUser && (() => {
          const userPayments = (data?.payments ?? []).filter((p: any) => p.userId === selectedUser.id)
          const totalSpent = userPayments.filter((p: any) => p.status === 'success').reduce((s: number, p: any) => s + (p.amount ?? 0), 0)
          const genStats = data?.generateByUser?.[selectedUser.id] ?? { total: 0, platforms: {} }
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.7)' }}
              onClick={() => setSelectedUser(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.2 }}
                className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10">
                  <h2 className="text-base font-semibold text-gray-100">Detail User</h2>
                  <button onClick={() => setSelectedUser(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-5">
                  {/* Profil */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {(selectedUser.name ?? selectedUser.email ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-gray-100 font-semibold truncate">{selectedUser.name ?? '—'}</p>
                      <p className="text-gray-400 text-sm truncate">{selectedUser.email}</p>
                    </div>
                    <div className="ml-auto flex-shrink-0">
                      {selectedUser.isActive !== false
                        ? <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20"><CheckCircle2 className="w-3 h-3" />Aktif</span>
                        : <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded-full border border-red-500/20"><XCircle className="w-3 h-3" />Nonaktif</span>
                      }
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Plan', value: <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_COLOR[selectedUser.planType ?? 'free']}`}>{PLAN_LABEL[selectedUser.planType ?? 'free'] ?? selectedUser.planType}</span> },
                      { label: 'Kredit Sisa', value: selectedUser.planType === 'lifetime' ? '∞' : (selectedUser.credits ?? 0) },
                      { label: 'Kredit Digunakan', value: selectedUser.creditsUsed ?? 0 },
                      { label: 'Total Belanja', value: formatRupiah(totalSpent) },
                      { label: 'Tanggal Daftar', value: formatDate(selectedUser.createdAt) },
                      { label: 'Total Transaksi', value: userPayments.length },
                      { label: 'Total Generate', value: genStats.total },
                      { label: 'Platform Generate', value: Object.keys(genStats.platforms).length > 0
                        ? Object.entries(genStats.platforms).map(([p, c]: any) => `${p} (${c})`).join(', ')
                        : '—'
                      },
                    ].map((item, i) => (
                      <div key={i} className="bg-slate-800/50 rounded-xl p-3">
                        <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                        <div className="text-sm font-semibold text-gray-100">{item.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Riwayat Payment */}
                  {userPayments.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Riwayat Transaksi</p>
                      <div className="space-y-2">
                        {userPayments.map((p: any) => (
                          <div key={p.id} className="flex items-center justify-between bg-slate-800/50 rounded-xl px-4 py-3">
                            <div>
                              <p className="text-sm text-gray-200 font-medium">{PRODUCT_LABEL[p.productType] ?? p.productType}</p>
                              <p className="text-xs text-gray-500">{formatDate(p.paidAt ?? p.createdAt)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-gray-100">{formatRupiah(p.amount ?? 0)}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                {p.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {userPayments.length === 0 && (
                    <div className="text-center py-4 text-gray-600 text-sm">Belum ada transaksi</div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => !deleteLoading && setDeletingUser(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <h2 className="text-lg font-semibold text-gray-100">Hapus User?</h2>
              </div>
              
              <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
                <p className="text-gray-100 font-medium">{deletingUser.name ?? '—'}</p>
                <p className="text-gray-400 text-sm">{deletingUser.email}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span>Plan: {PLAN_LABEL[deletingUser.planType ?? 'free']}</span>
                  <span>•</span>
                  <span>Kredit: {deletingUser.credits ?? 0}</span>
                  <span>•</span>
                  <span>Digunakan: {deletingUser.creditsUsed ?? 0}</span>
                </div>
              </div>

              <p className="text-sm text-gray-400 mb-5">
                Semua data user akan dihapus permanen termasuk riwayat generate dan transaksi. Aksi ini tidak bisa dibatalkan.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingUser(null)}
                  disabled={deleteLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-800 text-gray-300 border border-white/10 hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleDeleteUser(deletingUser.id)}
                  disabled={deleteLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleteLoading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full" />
                      Menghapus...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Hapus Permanen
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Confirmation Modal */}
      <AnimatePresence>
        {bulkDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => !deleteLoading && setBulkDeleteModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <h2 className="text-lg font-semibold text-gray-100">Hapus {selectedUsers.size} User?</h2>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 mb-4 max-h-48 overflow-y-auto">
                {Array.from(selectedUsers).map(id => {
                  const u = (users ?? []).find((user: any) => user.id === id)
                  if (!u) return null
                  return (
                    <div key={id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <div>
                        <p className="text-gray-200 text-sm font-medium">{u.name ?? '—'}</p>
                        <p className="text-gray-500 text-xs">{u.email}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${PLAN_COLOR[u.planType ?? 'free']}`}>
                        {PLAN_LABEL[u.planType ?? 'free']}
                      </span>
                    </div>
                  )
                })}
              </div>

              <p className="text-sm text-gray-400 mb-5">
                Semua data {selectedUsers.size} user akan dihapus permanen. Aksi ini tidak bisa dibatalkan.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setBulkDeleteModal(false)}
                  disabled={deleteLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-800 text-gray-300 border border-white/10 hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={deleteLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleteLoading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full" />
                      Menghapus...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Hapus {selectedUsers.size} User
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </DashboardLayout>
  )
}

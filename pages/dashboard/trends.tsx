import React, { useState, useMemo, useEffect } from "react"
import type { GetServerSideProps } from "next"
import { getServerSession } from "next-auth/next"
import { authOptions } from "~/pages/api/auth/[...nextauth]"
import { useRouter } from "next/router"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  X,
  Calendar,
  Clock,
  Copy,
  Check,
  CheckCircle2,
  Bookmark,
  BookmarkCheck,
  ShieldAlert,
  Filter,
  Palette,
  Layers,
  Image as ImageIcon,
} from "lucide-react"
import DashboardLayout from "~/components/dashboard/DashboardLayout"
import TrendCard from "~/components/dashboard/TrendCard"
import { MONTHS, TREND_YEAR, TREND_UPDATED, type Trend, type Demand } from "~/data/trends-types"
import { isAdminEmail } from "~/lib/admin"

const PLANNER_KEY = "asaf-trend-planner-2026"

const DEMAND_ORDER: Demand[] = ["Puncak", "Tinggi", "Sedang"]

type PlannerState = Record<string, boolean>

interface TrendsPageProps {
  /** Event dikirim dari server HANYA untuk admin. Non-admin menerima array kosong. */
  trends: Trend[]
  /** Hasil gate dari server — dipakai untuk render awal tanpa flicker. */
  isAdmin: boolean
}

export const getServerSideProps: GetServerSideProps<TrendsPageProps> = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions)
  const email = session?.user?.email

  // Gate sebenarnya: data tidak pernah dikirim ke browser non-admin.
  if (!isAdminEmail(email)) {
    return { props: { trends: [], isAdmin: false } }
  }

  // Import dinamis supaya modul data hanya dimuat di server.
  const { trends } = await import("~/data/trends-2026.server")

  return { props: { trends, isAdmin: true } }
}

export default function TrendsPage({ trends, isAdmin: serverIsAdmin }: TrendsPageProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [search, setSearch] = useState("")
  const [month, setMonth] = useState<string>("ALL")
  const [demand, setDemand] = useState<string>("ALL")
  const [onlyPlanned, setOnlyPlanned] = useState(false)
  const [active, setActive] = useState<Trend | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [planner, setPlanner] = useState<PlannerState>({})

  // Server adalah sumber kebenaran. Client hanya dipakai sebagai cadangan
  // saat sesi belum termuat (status === "loading").
  const isAdmin = serverIsAdmin || (status !== "loading" && isAdminEmail(session?.user?.email))

  // ── Planner persistence ───────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = localStorage.getItem(PLANNER_KEY)
      if (raw) setPlanner(JSON.parse(raw))
    } catch {
      /* ignore corrupt state */
    }
  }, [])

  function persistPlanner(next: PlannerState) {
    setPlanner(next)
    try {
      localStorage.setItem(PLANNER_KEY, JSON.stringify(next))
    } catch {
      /* quota / private mode */
    }
  }

  function togglePlan(id: string) {
    persistPlanner({ ...planner, [id]: !planner[id] })
  }

  const plannedCount = Object.values(planner).filter(Boolean).length

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return trends.filter((t) => {
      if (month !== "ALL" && t.month !== month) return false
      if (demand !== "ALL" && t.demand !== demand) return false
      if (onlyPlanned && !planner[t.id]) return false
      if (!q) return true
      return (
        t.title.toLowerCase().includes(q) ||
        t.eventDate.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.region.toLowerCase().includes(q) ||
        t.keywords.some((k) => k.toLowerCase().includes(q)) ||
        t.prompts.some((p) => p.toLowerCase().includes(q))
      )
    })
  }, [search, month, demand, onlyPlanned, planner])

  // ── Copy helper ───────────────────────────────────────────────────────────
  async function copyText(text: string, tag: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(tag)
      setTimeout(() => setCopied(null), 1800)
    } catch {
      setCopied("error")
      setTimeout(() => setCopied(null), 1800)
    }
  }

  // ── Gate admin ────────────────────────────────────────────────────────────
  // Server sudah memutuskan (data hanya dikirim ke admin). Karena layout
  // mendapat serverAuthenticated, panel ini tampil sejak HTML pertama.
  if (!serverIsAdmin) {
    return (
      <DashboardLayout title="Trend Calendar" serverAuthenticated>
        <div className="mx-auto max-w-md rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 text-center">
          <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-amber-400" />
          <h2 className="mb-1 text-base font-bold text-gray-100">Halaman ini belum dibuka</h2>
          <p className="mb-4 text-sm text-gray-500">
            Trend Calendar masih dalam tahap penyempurnaan dan baru tersedia untuk admin.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </DashboardLayout>
    )
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="Trend Calendar" serverAuthenticated>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Trend Calendar" serverAuthenticated>
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-100">Trend Calendar {TREND_YEAR}</h1>
          <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
            Admin Preview
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Kalender event komersial microstock — target pasar US. Upload 60–90 hari sebelum event.
        </p>
        <p className="mt-1 text-xs text-gray-600">
          {trends.length} event · update terakhir {TREND_UPDATED}
        </p>
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="mb-5 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari event, keyword, atau prompt… (mis. thanksgiving, black friday)"
            className="w-full rounded-lg border border-white/10 bg-slate-900 py-2.5 pl-10 pr-9 text-sm text-gray-200 placeholder-gray-600 outline-none transition-colors focus:border-blue-500/50"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Month chips */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setMonth("ALL")}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
              month === "ALL"
                ? "bg-blue-600 text-white"
                : "border border-white/10 bg-white/5 text-gray-400 hover:text-gray-200"
            }`}
          >
            Semua
          </button>
          {MONTHS.map((m) => (
            <button
              key={m}
              onClick={() => setMonth(m)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                month === m
                  ? "bg-blue-600 text-white"
                  : "border border-white/10 bg-white/5 text-gray-400 hover:text-gray-200"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Demand + planner filter */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-gray-600" />
          <button
            onClick={() => setDemand("ALL")}
            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              demand === "ALL"
                ? "bg-slate-700 text-gray-100"
                : "border border-white/10 text-gray-500 hover:text-gray-300"
            }`}
          >
            Semua demand
          </button>
          {DEMAND_ORDER.map((d) => (
            <button
              key={d}
              onClick={() => setDemand(d)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                demand === d
                  ? "bg-slate-700 text-gray-100"
                  : "border border-white/10 text-gray-500 hover:text-gray-300"
              }`}
            >
              {d}
            </button>
          ))}

          <span className="mx-1 h-4 w-px bg-white/10" />

          <button
            onClick={() => setOnlyPlanned(!onlyPlanned)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              onlyPlanned
                ? "bg-emerald-500/15 text-emerald-400"
                : "border border-white/10 text-gray-500 hover:text-gray-300"
            }`}
          >
            <BookmarkCheck className="h-3 w-3" />
            Planner saya ({plannedCount})
          </button>
        </div>
      </div>

      {/* ── Grid ───────────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-slate-900/40 p-10 text-center">
          <p className="text-sm text-gray-500">Tidak ada event yang cocok dengan filter.</p>
          <button
            onClick={() => {
              setSearch("")
              setMonth("ALL")
              setDemand("ALL")
              setOnlyPlanned(false)
            }}
            className="mt-3 text-xs font-semibold text-blue-400 hover:text-blue-300"
          >
            Reset filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => (
            <TrendCard
              key={t.id}
              trend={t}
              onOpen={setActive}
              onCopyPrompt={(tr) => copyText(tr.prompts[0], `card-${tr.id}`)}
            />
          ))}
        </div>
      )}

      {/* ── Detail modal ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setActive(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="my-8 w-full max-w-2xl rounded-xl border border-white/10 bg-slate-900 shadow-2xl"
            >
              {/* Modal header */}
              <div className="flex items-start gap-3 border-b border-white/10 p-5">
                <div className="flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-blue-400">
                      {active.month} · {active.monthName}
                    </span>
                    <span className="rounded-md border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-gray-400">
                      {active.demand}
                    </span>
                    <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-500">
                      {active.category}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold leading-snug text-gray-100">{active.title}</h2>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" /> {active.eventDate}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> Upload {active.uploadWindow}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setActive(null)}
                  className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal body */}
              <div className="max-h-[65vh] space-y-5 overflow-y-auto p-5">
                {active.note && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300/90">
                    {active.note}
                  </div>
                )}

                {/* Prompts */}
                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Prompts ({active.prompts.length})
                    </h3>
                    <button
                      onClick={() => copyText(active.prompts.join("\n\n"), `all-${active.id}`)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300"
                    >
                      {copied === `all-${active.id}` ? (
                        <>
                          <Check className="h-3 w-3" /> Tersalin
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" /> Copy semua
                        </>
                      )}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {active.prompts.map((p, i) => (
                      <div
                        key={i}
                        className="group relative rounded-lg border border-white/5 bg-slate-950/60 p-3 pr-10 text-xs leading-relaxed text-gray-300"
                      >
                        {p}
                        <button
                          onClick={() => copyText(p, `p-${active.id}-${i}`)}
                          className="absolute right-2 top-2 rounded p-1 text-gray-600 transition-colors hover:bg-white/5 hover:text-blue-400"
                        >
                          {copied === `p-${active.id}-${i}` ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Keywords */}
                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Keywords ({active.keywords.length})
                    </h3>
                    <button
                      onClick={() => copyText(active.keywords.join(", "), `kw-${active.id}`)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300"
                    >
                      {copied === `kw-${active.id}` ? (
                        <>
                          <Check className="h-3 w-3" /> Tersalin
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" /> Copy keywords
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {active.keywords.map((k) => (
                      <span
                        key={k}
                        className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-gray-400"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </section>

                {/* Palette + styles + asset types */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <section>
                    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                      <Palette className="h-3.5 w-3.5" /> Palet
                    </h3>
                    <p className="text-xs leading-relaxed text-gray-400">{active.palette}</p>
                  </section>
                  <section>
                    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                      <Layers className="h-3.5 w-3.5" /> Gaya visual
                    </h3>
                    <ul className="space-y-1 text-xs text-gray-400">
                      {active.styles.map((s) => (
                        <li key={s}>· {s}</li>
                      ))}
                    </ul>
                  </section>
                </div>

                <section>
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                    <ImageIcon className="h-3.5 w-3.5" /> Tipe aset
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {active.assetTypes.map((a) => (
                      <span
                        key={a}
                        className="rounded-md bg-blue-500/10 px-2 py-1 text-[11px] font-medium text-blue-300"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </section>

                <p className="text-[11px] text-gray-600">
                  Region: {active.region} · ID: {active.id}
                </p>
              </div>

              {/* Modal footer */}
              <div className="flex items-center gap-2 border-t border-white/10 p-4">
                <button
                  onClick={() => togglePlan(active.id)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    planner[active.id]
                      ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20"
                      : "border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  {planner[active.id] ? (
                    <>
                      <BookmarkCheck className="h-3.5 w-3.5" /> Ada di planner
                    </>
                  ) : (
                    <>
                      <Bookmark className="h-3.5 w-3.5" /> Tambah ke planner
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    const json = JSON.stringify(active, null, 2)
                    copyText(json, `json-${active.id}`)
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
                >
                  {copied === `json-${active.id}` ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Tersalin
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy JSON
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

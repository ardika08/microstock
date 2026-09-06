"use client"

import iconUrl from "data-base64:~assets/icon.png"
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Play,
  Square,
  Zap,
  Crown,
  Clock,
  Settings as SettingsIcon,
  LogOut,
  ExternalLink,
  Image as ImageIcon,
} from "lucide-react"
import { useEffect, useState, useCallback } from "react"
import "~/style.css"

import { validateActivationCode } from "~/lib/activation"
import { getSettings, updateSettings } from "~/lib/storage"
import type { AppSettings, MicrostockPlatform } from "~/lib/types"

type BusyState = "idle" | "activating" | "running"
type Notice = { type: "success" | "error"; title: string; message: string } | null

const PLATFORMS: Array<{ id: MicrostockPlatform; label: string; url: string }> = [
  { id: "adobe_stock", label: "Adobe Stock", url: "https://contributor.stock.adobe.com/uploads" },
  { id: "shutterstock", label: "Shutterstock", url: "https://submit.shutterstock.com/upload" },
  { id: "vecteezy", label: "Vecteezy", url: "https://contributors.vecteezy.com/portfolio" },
]

function detectPlatform(url?: string): { isAdobe: boolean; isShutter: boolean; isVecteezy: boolean; isStock: boolean } {
  if (!url) return { isAdobe: false, isShutter: false, isVecteezy: false, isStock: false }
  try {
    const host = new URL(url).host
    const isAdobe = host.includes("stock.adobe.com") || host.includes("contributor.stock.adobe.com")
    const isShutter = host.includes("submit.shutterstock.com") || host.includes("contributor-accounts.shutterstock.com")
    const isVecteezy = host.includes("contributors.vecteezy.com")
    return { isAdobe, isShutter, isVecteezy, isStock: isAdobe || isShutter || isVecteezy }
  } catch {
    return { isAdobe: false, isShutter: false, isVecteezy: false, isStock: false }
  }
}

export default function Popup() {
  const [settings, setSettings] = useState<AppSettings>({
    activation_status: false,
    panel_enabled: false,
    selected_microstock: "adobe_stock",
    usage_count: 0,
  })
  const [activationCode, setActivationCode] = useState("")
  const [busy, setBusy] = useState<BusyState>("idle")
  const [notice, setNotice] = useState<Notice>(null)
  const [autoMode, setAutoMode] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [activeTabUrl, setActiveTabUrl] = useState("")
  const [creditRemaining, setCreditRemaining] = useState<number | null>(null)
  const [creditTotal, setCreditTotal] = useState<number | null>(null)
  const [planType, setPlanType] = useState<string>("free")
  const [userData, setUserData] = useState<{ name?: string; email?: string; avatar?: string } | null>(null)
  const [contentScriptReady, setContentScriptReady] = useState(false)
  const [vzAiGenerated, setVzAiGenerated] = useState(false)

  const platform = detectPlatform(activeTabUrl)
  const isBusy = busy !== "idle"
  const isReady = settings.activation_status
  const isOnStockPage = platform.isStock
  const activePlatformLabel = platform.isAdobe ? "Adobe Stock" : platform.isShutter ? "Shutterstock" : platform.isVecteezy ? "Vecteezy" : null

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    getSettings().then((stored) => {
      setSettings(stored)
      setActivationCode(stored.activation_code || "")
      setAutoMode(stored.panel_enabled || false)
      setVzAiGenerated(stored.vzAiGenerated || false)
    })

    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
        setActiveTabUrl(tab?.url || "")
        // Ping content script — check if it's loaded
        if (tab?.id && detectPlatform(tab.url).isStock) {
          chrome.tabs.sendMessage(tab.id, { type: "GET_RUN_STATUS" })
            .then(() => setContentScriptReady(true))
            .catch(() => setContentScriptReady(false))
        }
      })
    }

    // Fetch user data — refresh every popup open (like Automeda)
    fetch("https://autofillstock.my.id/api/user/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        setUserData({ name: data.name, email: data.email, avatar: data.image })
        setCreditRemaining(data.credits ?? null)
        setCreditTotal(data.creditsUsed ? data.credits + data.creditsUsed : null)
        setPlanType(data.planType || "free")
      })
      .catch(() => {})

    // Poll run status
    const statusInterval = setInterval(() => {
      if (typeof chrome !== "undefined" && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
          if (!tab?.id) return
          chrome.tabs
            .sendMessage(tab.id, { type: "GET_RUN_STATUS" })
            .then((res: any) => setIsRunning(res?.running ?? false))
            .catch(() => {})
        })
      }
    }, 1000)
    return () => clearInterval(statusInterval)
  }, [])

  const sendToTab = useCallback((message: any) => {
    if (typeof chrome === "undefined" || !chrome.tabs) return Promise.reject(new Error("No chrome.tabs"))
    return chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (!tab?.id) throw new Error("No active tab")
      if (!detectPlatform(tab.url).isStock)
        throw new Error("Buka halaman Adobe Stock, Shutterstock, atau Vecteezy dulu.")
      return chrome.tabs.sendMessage(tab.id, message).catch(() => {
        // Content script not loaded — likely tab was open before extension install
        throw new Error("Extension belum aktif di tab ini. Refresh halaman Adobe Stock, lalu buka popup lagi.")
      })
    })
  }, [])

  async function handleActivate() {
    setBusy("activating")
    setNotice(null)
    try {
      await validateActivationCode(activationCode.trim())
      const next = { activation_status: true, activation_code: activationCode.trim() }
      await updateSettings(next)
      setSettings((c) => ({ ...c, ...next }))
      setNotice({ type: "success", title: "Aktivasi berhasil", message: "Extension siap digunakan." })
    } catch (error) {
      setNotice({
        type: "error",
        title: "Aktivasi gagal",
        message: error instanceof Error ? error.message : "Kode tidak valid.",
      })
    } finally {
      setBusy("idle")
    }
  }

  async function handleRunBatch() {
    setNotice(null)
    setBusy("running")
    try {
      await sendToTab({ type: "RUN_BATCH_GENERATE" })
    } catch (error) {
      setNotice({
        type: "error",
        title: "Tidak dapat menjalankan batch",
        message: error instanceof Error ? error.message : "Kirim ke tab gagal.",
      })
    } finally {
      setBusy("idle")
    }
  }

  async function handleStop() {
    try {
      await sendToTab({ type: "STOP_GENERATE" })
    } catch {}
  }

  async function handleMicrostockSelect(p: typeof PLATFORMS[number]) {
    await updateSettings({ selected_microstock: p.id })
    setSettings((c) => ({ ...c, selected_microstock: p.id }))
    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.create({ url: p.url })
      window.close()
    }
  }

  async function handleAutoModeToggle(enabled: boolean) {
    setAutoMode(enabled)
    await updateSettings({ panel_enabled: enabled })
  }

  async function handleVzAiGeneratedToggle(enabled: boolean) {
    setVzAiGenerated(enabled)
    await updateSettings({ vzAiGenerated: enabled })
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const planLabel = (() => {
    switch (planType) {
      case "lifetime": return "Pro ∞"
      case "intro": return "Pro"
      case "basic": return "Pro"
      case "value": return "Pro"
      case "topup": return "Pro"
      default: return "Free"
    }
  })()

  const isPro = planType !== "free"

  const creditLabel = planType === "lifetime"
    ? "∞ Unlimited"
    : creditRemaining !== null && creditTotal !== null
    ? `${creditRemaining} / ${creditTotal}`
    : creditRemaining !== null
    ? `${creditRemaining} credits`
    : "—"

  const creditPct = creditRemaining !== null && creditTotal && creditTotal > 0
    ? Math.min(100, Math.round((creditRemaining / creditTotal) * 100))
    : 0

  const openDashboard = (path: string) => {
    window.open(`https://autofillstock.my.id${path}`, "_blank")
  }

  // ── Shared styles ─────────────────────────────────────────────────────────
  const cardBg = "bg-white/[0.03] border border-white/[0.07]"

  return (
    <main
      className="w-[360px] text-slate-200 font-sans antialiased"
      style={{
        background: "linear-gradient(165deg, #0a0e1a 0%, #0d1220 50%, #0a0f1c 100%)",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      }}
    >
      {/* ════════════════════════════════════════════════════════════════════════
           HEADER — User profile + plan badge (Automeda style)
           ════════════════════════════════════════════════════════════════════════ */}
      <div
        className="px-4 py-4 flex items-center gap-3 border-b border-white/[0.06]"
        style={{ background: "rgba(255,255,255,0.015)" }}
      >
        {/* Avatar */}
        <div className="h-9 w-9 rounded-full overflow-hidden shrink-0 border border-white/10 flex items-center justify-center bg-slate-800">
          {userData?.avatar ? (
            <img src={userData.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-emerald-400">
              {(userData?.name || userData?.email || "A")[0]?.toUpperCase()}
            </span>
          )}
        </div>

        {/* Name + email */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-white truncate leading-tight">
            {userData?.name || "Ardika Yudha"}
          </p>
          <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">
            {userData?.email || "—"}
          </p>
        </div>

        {/* Plan badge */}
        <span
          className="text-[9px] font-bold px-2 py-1 rounded-full tracking-wide shrink-0"
          style={{
            background: isPro ? "rgba(16,185,129,0.12)" : "rgba(100,116,139,0.12)",
            border: `1px solid ${isPro ? "rgba(16,185,129,0.25)" : "rgba(100,116,139,0.2)"}`,
            color: isPro ? "#6ee7b7" : "#94a3b8",
          }}
        >
          {planLabel}
        </span>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
           STATUS BAR — Active platform indicator (Automeda style)
           ════════════════════════════════════════════════════════════════════════ */}
      <div className="px-4 py-2.5 flex items-center gap-2 border-b border-white/[0.04]">
        <span
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{
            background: isOnStockPage ? "#34d399" : "#475569",
            boxShadow: isOnStockPage ? "0 0 6px rgba(52,211,153,0.6)" : "none",
          }}
        />
        <span className="text-[11px] font-medium" style={{ color: isOnStockPage ? "#6ee7b7" : "#64748b" }}>
          {activePlatformLabel ? (
            <>Active on <strong className="font-semibold">{activePlatformLabel}</strong></>
          ) : (
            "Open a stock platform to begin"
          )}
        </span>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
           BODY
           ════════════════════════════════════════════════════════════════════════ */}
      <div className="p-4 flex flex-col gap-3">
        {/* ── Notice ─────────────────────────────────────────────────────────── */}
        {notice && (
          <div
            className="rounded-lg p-3 flex items-start gap-2.5"
            style={{
              background: notice.type === "error" ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)",
              border: `1px solid ${notice.type === "error" ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"}`,
            }}
          >
            {notice.type === "error" ? (
              <AlertCircle className="h-4 w-4 mt-0.5 text-red-400 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-400 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="font-semibold text-[11px]" style={{ color: notice.type === "error" ? "#fca5a5" : "#6ee7b7" }}>
                {notice.title}
              </p>
              <p className="text-[10px] mt-0.5 text-slate-400 leading-relaxed">{notice.message}</p>
            </div>
          </div>
        )}

        {/* ─── NOT ACTIVATED ─────────────────────────────────────────────────── */}
        {!isReady ? (
          <div className={`rounded-xl p-4 flex flex-col gap-3 ${cardBg}`}>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Activation Code
              </label>
              <input
                type="text"
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value)}
                placeholder="ASAF-XXXXXX-XXXXXX"
                className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:ring-1 focus:ring-emerald-500/40 bg-white/[0.03] border border-white/[0.08]"
              />
            </div>
            <button
              className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-all disabled:opacity-50"
              disabled={isBusy || !activationCode.trim()}
              onClick={handleActivate}
              style={{ background: "linear-gradient(135deg, #10b981, #06b6d4)", color: "#022c22" }}
            >
              {busy === "activating" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Validate & Activate
            </button>
            <p className="text-center text-[10px] text-slate-600">Ambil kode di dashboard → Settings</p>
          </div>
        ) : (
          /* ─── ACTIVATED: CONTROL CENTER ────────────────────────────────────── */
          <>
            {/* ── Content script not ready warning ─────────────────────────────── */}
            {isOnStockPage && !contentScriptReady && (
              <div
                className="rounded-lg p-3 flex items-start gap-2.5"
                style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
              >
                <AlertCircle className="h-4 w-4 mt-0.5 text-amber-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[11px] text-amber-300">Extension belum aktif</p>
                  <p className="text-[10px] mt-0.5 text-slate-400 leading-relaxed mb-2">
                    Tab ini dibuka sebelum extension terinstall. Refresh halaman untuk mengaktifkan.
                  </p>
                  <button
                    className="text-[10px] font-bold text-amber-300 hover:text-amber-200"
                    onClick={() => {
                      if (typeof chrome !== "undefined" && chrome.tabs) {
                        chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
                          if (tab?.id) {
                            chrome.tabs.reload(tab.id)
                            window.close()
                          }
                        })
                      }
                    }}
                  >
                    ↻ Refresh Tab
                  </button>
                </div>
              </div>
            )}

            {/* ── Quick Actions — only on stock pages ─────────────────────────── */}
            {isOnStockPage && (
              <div className={`rounded-xl p-3.5 flex flex-col gap-3 ${cardBg}`}>
                {/* Generate AI (single) — always available */}
                <button
                  className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={isBusy || isRunning}
                  onClick={() => sendToTab({ type: "RUN_SINGLE_GENERATE" })}
                  style={{ background: "linear-gradient(135deg, #10b981, #06b6d4)", color: "#022c22" }}
                >
                  <Zap className="h-4 w-4" />
                  Generate AI
                </button>

                {/* Stop — only when running */}
                {isRunning && (
                  <button
                    className="w-full flex items-center justify-center gap-2 rounded-lg py-2 text-[12px] font-semibold transition-all"
                    onClick={handleStop}
                    style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.2)" }}
                  >
                    <Square className="h-3 w-3" />
                    Stop
                  </button>
                )}

                {/* Auto mark AI-generated — Vecteezy only */}
                {platform.isVecteezy && (
                  <label className="flex items-center gap-3 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={vzAiGenerated}
                      onChange={(e) => handleVzAiGeneratedToggle(e.target.checked)}
                    />
                    <div
                      className="relative w-9 h-5 rounded-full shrink-0 transition-colors"
                      style={{ background: vzAiGenerated ? "linear-gradient(135deg, #10b981, #06b6d4)" : "rgba(255,255,255,0.12)" }}
                    >
                      <div
                        className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform"
                        style={{ transform: vzAiGenerated ? "translateX(16px)" : "translateX(0)" }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-slate-200 leading-tight">Auto mark AI-generated</p>
                      <p className="text-[9px] text-slate-500 leading-tight mt-0.5">Centang otomatis + pilih AI tool (Midjourney dulu)</p>
                    </div>
                  </label>
                )}

                {/* Auto Mode toggle — gates Run Batch visibility (Adobe Stock only) */}
                {platform.isAdobe && (
                  <label className="flex items-center gap-3 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={autoMode}
                      onChange={(e) => handleAutoModeToggle(e.target.checked)}
                    />
                    <div
                      className="relative w-9 h-5 rounded-full shrink-0 transition-colors"
                      style={{ background: autoMode ? "linear-gradient(135deg, #10b981, #06b6d4)" : "rgba(255,255,255,0.12)" }}
                    >
                      <div
                        className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform"
                        style={{ transform: autoMode ? "translateX(16px)" : "translateX(0)" }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-slate-200 leading-tight">AI Auto Mode</p>
                      <p className="text-[9px] text-slate-500 leading-tight mt-0.5">Aktifkan untuk memproses semua asset sekaligus</p>
                    </div>
                  </label>
                )}

                {/* Run Batch — only visible when Auto Mode is ON */}
                {autoMode && platform.isAdobe && (
                  <button
                    className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={isBusy || isRunning}
                    onClick={handleRunBatch}
                    style={{ background: "linear-gradient(135deg, #7f1d1d, #991b1b)", color: "#fff" }}
                  >
                    {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    {isRunning ? "Running..." : "▶ Run Batch"}
                  </button>
                )}

                {/* Run Batch — Vecteezy (single button, no Auto Mode gate) */}
                {platform.isVecteezy && (
                  <button
                    className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={isBusy || isRunning}
                    onClick={handleRunBatch}
                    style={{ background: "linear-gradient(135deg, #7f1d1d, #991b1b)", color: "#fff" }}
                  >
                    {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    {isRunning ? "Running..." : "▶ Run Batch"}
                  </button>
                )}
              </div>
            )}

            {/* ── Usage / Credit bar (Automeda style) ─────────────────────────── */}
            <div className={`rounded-xl px-3.5 py-3 ${cardBg}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {planType === "lifetime" ? "Usage" : "Kredit Tersisa"}
                </span>
                <span className="text-[13px] font-bold text-white">{creditLabel}</span>
              </div>
              {planType !== "lifetime" && creditTotal !== null && creditTotal > 0 && (
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${creditPct}%`,
                      background: creditPct < 20
                        ? "linear-gradient(90deg, #ef4444, #f87171)"
                        : "linear-gradient(90deg, #10b981, #06b6d4)",
                    }}
                  />
                </div>
              )}
            </div>

            {/* ── Open Platform grid (Automeda style) ─────────────────────────── */}
            <div className={`rounded-xl px-3.5 py-3 ${cardBg}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2.5">Open Platform</p>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map((p) => {
                  const selected = settings.selected_microstock === p.id
                  const isActive = (p.id === "adobe_stock" && platform.isAdobe) || (p.id === "shutterstock" && platform.isShutter)
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleMicrostockSelect(p)}
                      className="rounded-lg py-2 text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5"
                      style={{
                        background: isActive ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isActive ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.06)"}`,
                        color: isActive ? "#6ee7b7" : "#94a3b8",
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ background: isActive ? "#34d399" : "rgba(148,163,184,0.3)" }}
                      />
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Upgrade card — free only (Automeda pattern) ─────────────────── */}
            {!isPro && (
              <button
                onClick={() => openDashboard("/dashboard/billing")}
                className="w-full flex items-center gap-3 rounded-xl px-3.5 py-3 transition-all hover:opacity-90"
                style={{
                  background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(16,185,129,0.04))",
                  border: "1px solid rgba(139,92,246,0.2)",
                }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(139,92,246,0.12)" }}>
                  <Crown className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-[12px] font-bold text-slate-100 leading-tight">Upgrade to Pro</p>
                  <p className="text-[9px] text-slate-500 leading-tight mt-0.5">Unlimited · QRIS · Bank Transfer</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              </button>
            )}

            {/* ── Footer nav (Automeda style) ─────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => openDashboard("/dashboard/history")}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-lg transition-all hover:bg-white/5 ${cardBg}`}
              >
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-[9px] font-medium text-slate-500">History</span>
              </button>
              <button
                onClick={() => openDashboard("/dashboard/settings")}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-lg transition-all hover:bg-white/5 ${cardBg}`}
              >
                <SettingsIcon className="w-4 h-4 text-slate-400" />
                <span className="text-[9px] font-medium text-slate-500">Settings</span>
              </button>
              <button
                onClick={() => {
                  if (typeof chrome !== "undefined" && chrome.runtime) {
                    chrome.storage.local.clear()
                  }
                  window.open("https://autofillstock.my.id/auth/login", "_blank")
                  window.close()
                }}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-lg transition-all hover:bg-white/5 ${cardBg}`}
              >
                <LogOut className="w-4 h-4 text-slate-400" />
                <span className="text-[9px] font-medium text-slate-500">Logout</span>
              </button>
            </div>

            {/* Brand footer */}
            <p className="text-center text-[9px] text-slate-600 pt-0.5">
              autofillstock.my.id · Usage: {settings.usage_count || 0}
            </p>
          </>
        )}
      </div>
    </main>
  )
}

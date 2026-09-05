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
} from "lucide-react"
import { useEffect, useState, useCallback } from "react"

import { validateActivationCode } from "~/lib/activation"
import { getSettings, updateSettings } from "~/lib/storage"
import type { AppSettings, MicrostockPlatform } from "~/lib/types"

type BusyState = "idle" | "activating" | "running"
type Notice = { type: "success" | "error"; title: string; message: string } | null

const PLATFORMS: Array<{ id: MicrostockPlatform; label: string }> = [
  { id: "adobe_stock", label: "Adobe Stock" },
  { id: "shutterstock", label: "Shutterstock" },
]

function isSupportedUrl(url?: string) {
  if (!url) return false
  try {
    const host = new URL(url).host
    return (
      host.includes("stock.adobe.com") ||
      host.includes("contributor.stock.adobe.com") ||
      host.includes("submit.shutterstock.com") ||
      host.includes("contributor-accounts.shutterstock.com")
    )
  } catch {
    return false
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

  const isBusy = busy !== "idle"
  const isReady = settings.activation_status
  const isOnStockPage = isSupportedUrl(activeTabUrl)

  useEffect(() => {
    getSettings().then((stored) => {
      setSettings(stored)
      setActivationCode(stored.activation_code || "")
      setAutoMode(stored.panel_enabled || false)
    })
    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
        setActiveTabUrl(tab?.url || "")
      })
    }
    fetch("https://autofillstock.my.id/api/user/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setCreditRemaining(data.credits ?? null)
          setCreditTotal(data.creditsUsed ? data.credits + data.creditsUsed : null)
          setPlanType(data.planType || "free")
        }
      })
      .catch(() => {})
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
      if (!isSupportedUrl(tab.url)) throw new Error("Buka halaman Adobe Stock atau Shutterstock dulu.")
      return chrome.tabs.sendMessage(tab.id, message)
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

  async function handleMicrostockSelect(platform: MicrostockPlatform) {
    await updateSettings({ selected_microstock: platform })
    setSettings((c) => ({ ...c, selected_microstock: platform }))
  }

  async function handleAutoModeToggle(enabled: boolean) {
    setAutoMode(enabled)
    await updateSettings({ panel_enabled: enabled })
  }

  const planLabel = (() => {
    switch (planType) {
      case "lifetime": return "LIFETIME"
      case "intro": return "INTRO"
      case "basic": return "BASIC"
      case "value": return "VALUE"
      case "topup": return "TOP UP"
      default: return "FREE"
    }
  })()

  const creditLabel = planType === "lifetime"
    ? "∞ Unlimited"
    : creditRemaining !== null && creditTotal !== null
    ? `${creditRemaining} / ${creditTotal}`
    : creditRemaining !== null
    ? `${creditRemaining}`
    : "—"

  const creditPct = creditRemaining !== null && creditTotal && creditTotal > 0
    ? Math.min(100, Math.round((creditRemaining / creditTotal) * 100))
    : 0

  const openDashboard = (path: string) => {
    window.open(`https://autofillstock.my.id${path}`, "_blank")
  }

  // ── Shared card style ────────────────────────────────────────────────────────
  const cardStyle = {
    background: "rgba(255,255,255,0.025)",
    border: "1px solid rgba(255,255,255,0.07)",
  } as const

  return (
    <main
      className="w-[380px] text-white"
      style={{
        background: "linear-gradient(160deg, #0c1220 0%, #0a0f1a 100%)",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      }}
    >
      {/* ══ Header ══════════════════════════════════════════════════════════════ */}
      <div
        className="px-4 py-4 flex items-center gap-3"
        style={{
          background: "linear-gradient(135deg, rgba(30,35,60,0.6) 0%, rgba(15,40,71,0.4) 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <img alt="Autofillstock" className="h-10 w-10 rounded-xl border border-white/10 shrink-0" src={iconUrl} />
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-white leading-tight tracking-tight">AUTOFILLSTOCK</h1>
          <p className="text-[10px] text-slate-500 leading-tight mt-0.5">Creative Tools</p>
        </div>
        <span
          className="text-[9px] font-bold px-2 py-1 rounded-full tracking-wide shrink-0"
          style={{
            background: planType === "free" ? "rgba(100,116,139,0.15)" : "rgba(16,185,129,0.1)",
            border: `1px solid ${planType === "free" ? "rgba(100,116,139,0.25)" : "rgba(16,185,129,0.2)"}`,
            color: planType === "free" ? "#94a3b8" : "#6ee7b7",
          }}
        >
          {planLabel}
        </span>
      </div>

      {/* ══ Status bar ═════════════════════════════════════════════════════════ */}
      <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <span
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{ background: isOnStockPage ? "#34d399" : "#475569", boxShadow: isOnStockPage ? "0 0 5px rgba(52,211,153,0.5)" : "none" }}
        />
        <span className="text-[11px] font-semibold" style={{ color: isOnStockPage ? "#6ee7b7" : "#64748b" }}>
          {isOnStockPage
            ? `ACTIVE: ${settings.selected_microstock === "shutterstock" ? "SHUTTERSTOCK" : "ADOBE STOCK"}`
            : "Buka halaman Adobe Stock / Shutterstock"}
        </span>
      </div>

      {/* ══ Body ═══════════════════════════════════════════════════════════════ */}
      <div className="p-4 flex flex-col gap-3">
        {/* Notice */}
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

        {/* ─── Not activated: login card ─────────────────────────────────────────── */}
        {!isReady ? (
          <div className="rounded-xl p-4 flex flex-col gap-3" style={cardStyle}>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Activation Code
              </label>
              <input
                type="text"
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value)}
                placeholder="ASAF-XXXXXX-XXXXXX"
                className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:ring-1 focus:ring-emerald-500/40"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
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
          /* ─── Activated: control center ────────────────────────────────────────── */
          <>

            {/* ── Action row: Generate AI + Stop ─────────────────────────────── */}
            <div className="flex gap-2">
              <button
                className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={isBusy || isRunning || !isOnStockPage}
                onClick={() => sendToTab({ type: "RUN_SINGLE_GENERATE" })}
                style={{ background: "linear-gradient(135deg, #10b981, #06b6d4)", color: "#022c22" }}
              >
                <Zap className="h-4 w-4" />
                Generate AI
              </button>
              {isRunning && (
                <button
                  className="flex items-center justify-center rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-all"
                  onClick={handleStop}
                  style={{ background: "#3b1720", color: "#fecaca", border: "1px solid rgba(254,202,202,0.15)" }}
                >
                  <Square className="h-3.5 w-3.5" />
                  Stop
                </button>
              )}
            </div>

            {/* ── Auto Mode + Run Batch in one card ──────────────────────────── */}
            <div className="rounded-xl overflow-hidden" style={cardStyle}>
              <label className="flex items-center gap-3 px-3.5 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={autoMode}
                  onChange={(e) => handleAutoModeToggle(e.target.checked)}
                />
                {/* Toggle switch */}
                <div
                  className="relative w-9 h-4.5 rounded-full shrink-0 transition-colors"
                  style={{ height: "18px", background: autoMode ? "linear-gradient(135deg, #10b981, #06b6d4)" : "rgba(255,255,255,0.12)" }}
                >
                  <div
                    className="absolute top-0.5 left-0.5 h-3.5 w-3.5 rounded-full bg-white transition-transform"
                    style={{ transform: autoMode ? "translateX(18px)" : "translateX(0)" }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-slate-200 leading-tight">Auto Mode</p>
                  <p className="text-[9px] text-slate-500 leading-tight mt-0.5">Proses semua asset sekaligus</p>
                </div>
              </label>
              {autoMode && (
                <div className="px-3.5 pb-3.5">
                  <button
                    className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={isBusy || isRunning || !isOnStockPage}
                    onClick={handleRunBatch}
                    style={{ background: "linear-gradient(135deg, #7f1d1d, #991b1b)", color: "#fff" }}
                  >
                    {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    {isRunning ? "Running..." : "Run Batch"}
                  </button>
                </div>
              )}
            </div>

            {/* ── Credit bar ─────────────────────────────────────────────────── */}
            <div className="rounded-xl px-3.5 py-3" style={cardStyle}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Kredit Tersisa</span>
                <span className="text-[13px] font-bold text-white">{creditLabel}</span>
              </div>
              {planType !== "lifetime" && creditTotal !== null && creditTotal > 0 && (
                <div className="h-1 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${creditPct}%`,
                      background: creditPct < 20 ? "#ef4444" : "linear-gradient(90deg, #10b981, #06b6d4)",
                    }}
                  />
                </div>
              )}
            </div>

            {/* ── Platform grid ──────────────────────────────────────────────── */}
            <div className="rounded-xl px-3.5 py-3" style={cardStyle}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2.5">Open Platform</p>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map((p) => {
                  const selected = settings.selected_microstock === p.id
                  return (
                    <button
                      key={p.id}
                      disabled={isBusy}
                      onClick={() => handleMicrostockSelect(p.id)}
                      className="rounded-lg py-2 text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5"
                      style={{
                        background: selected ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${selected ? "rgba(16,185,129,0.35)" : "rgba(255,255,255,0.06)"}`,
                        color: selected ? "#6ee7b7" : "#94a3b8",
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ background: selected ? "#34d399" : "rgba(148,163,184,0.3)" }}
                      />
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Upgrade card (free only) ───────────────────────────────────── */}
            {planType === "free" && (
              <button
                onClick={() => openDashboard("/dashboard/billing")}
                className="w-full flex items-center gap-3 rounded-xl px-3.5 py-3 transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(16,185,129,0.04))", border: "1px solid rgba(139,92,246,0.2)" }}
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

            {/* ── Footer nav ────────────────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => openDashboard("/dashboard/history")}
                className="flex flex-col items-center gap-1 py-2.5 rounded-lg transition-all hover:bg-white/5"
                style={cardStyle}
              >
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-[9px] font-medium text-slate-500">History</span>
              </button>
              <button
                onClick={() => openDashboard("/dashboard/settings")}
                className="flex flex-col items-center gap-1 py-2.5 rounded-lg transition-all hover:bg-white/5"
                style={cardStyle}
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
                className="flex flex-col items-center gap-1 py-2.5 rounded-lg transition-all hover:bg-white/5"
                style={cardStyle}
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

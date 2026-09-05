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
  CreditCard,
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

  // Load settings on mount
  useEffect(() => {
    getSettings().then((stored) => {
      setSettings(stored)
      setActivationCode(stored.activation_code || "")
      setAutoMode(stored.panel_enabled || false)
    })
    // Check active tab
    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
        setActiveTabUrl(tab?.url || "")
      })
    }
    // Fetch credit info from dashboard
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

  return (
    <main
      className="min-h-[560px] w-[400px] p-0 text-white overflow-hidden"
      style={{
        background: "linear-gradient(145deg, #0a0e1a 0%, #0d1520 40%, #0a1015 100%)",
      }}
    >
      {/* ── Header: Account + Plan badge ──────────────────────────────────── */}
      <div
        className="relative px-5 pt-5 pb-4"
        style={{
          background: "linear-gradient(135deg, rgba(26,26,62,0.6) 0%, rgba(15,40,71,0.5) 50%, rgba(10,22,40,0.4) 100%)",
        }}
      >
        <div className="absolute inset-0 opacity-25" style={{ background: "radial-gradient(ellipse at 25% 15%, rgba(102,126,234,0.15) 0%, transparent 55%)" }} />
        <div className="relative z-10 flex items-center gap-3">
          <img alt="Autofillstock" className="h-12 w-12 rounded-2xl border border-white/10" src={iconUrl} />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-white" style={{ letterSpacing: "-0.02em" }}>
              AUTOFILLSTOCK
            </h1>
            <p className="text-[10px] font-medium tracking-[0.15em] text-slate-400 uppercase">
              Creative Tools
            </p>
          </div>
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{
              background: planType === "free" ? "rgba(100,116,139,0.15)" : "rgba(16,185,129,0.12)",
              border: `1px solid ${planType === "free" ? "rgba(100,116,139,0.3)" : "rgba(16,185,129,0.25)"}`,
              color: planType === "free" ? "#94a3b8" : "#6ee7b7",
            }}
          >
            {planLabel}
          </span>
        </div>

        {/* Status */}
        <div className="relative z-10 mt-3">
          {isOnStockPage ? (
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px rgba(52,211,153,0.5)" }} />
              ACTIVE: {settings.selected_microstock === "shutterstock" ? "SHUTTERSTOCK" : "ADOBE STOCK"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-500">
              <span className="h-2 w-2 rounded-full bg-slate-600" />
              Buka halaman Adobe Stock / Shutterstock
            </span>
          )}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="p-5 space-y-4">
        {/* Notice */}
        {notice && (
          <div
            className="rounded-xl p-3 text-sm flex items-start gap-2.5"
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
            <div>
              <p className="font-semibold text-xs" style={{ color: notice.type === "error" ? "#fca5a5" : "#6ee7b7" }}>
                {notice.title}
              </p>
              <p className="text-[11px] mt-0.5 text-slate-400 leading-relaxed">{notice.message}</p>
            </div>
          </div>
        )}

        {/* ─── Activation (if not ready) ─────────────────────────────────────── */}
        {!isReady ? (
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Activation Code
              </label>
              <input
                type="text"
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value)}
                placeholder="ASAF-XXXXXX-XXXXXX"
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none transition-all focus:ring-2 focus:ring-emerald-500/30"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)" }}
              />
            </div>
            <button
              className="w-full flex items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-50"
              disabled={isBusy || !activationCode.trim()}
              onClick={handleActivate}
              style={{ background: "linear-gradient(135deg, #10b981, #06b6d4)", color: "#022c22" }}
            >
              {busy === "activating" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Validate & Activate
            </button>
            <p className="text-center text-[11px] text-slate-600">Ambil kode di dashboard → Settings</p>
          </div>
        ) : (
          /* ─── Ready state: control center ─────────────────────────────────── */
          <>
            {/* ── Generate AI (single) + Run Batch + Stop ─────────────────────── */}
            <div className="flex items-center gap-2.5">
              <button
                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={isBusy || isRunning || !isOnStockPage}
                onClick={() => sendToTab({ type: "RUN_SINGLE_GENERATE" })}
                style={{ background: "linear-gradient(135deg, #10b981, #06b6d4)", color: "#022c22", boxShadow: "0 4px 20px rgba(16,185,129,0.25)" }}
              >
                <Zap className="h-4 w-4" />
                Generate AI
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={isBusy || isRunning || !isOnStockPage}
                onClick={handleRunBatch}
                style={{ background: "linear-gradient(135deg, #8B0000, #6B1d1d)", color: "#fff", boxShadow: "0 4px 20px rgba(139,0,0,0.25)" }}
              >
                {isRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {isRunning ? "Running..." : "Run Batch"}
              </button>
              <button
                className="flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-semibold transition-all disabled:opacity-40"
                disabled={!isRunning}
                onClick={handleStop}
                style={{ background: "#3b1720", color: "#fecaca", border: "1px solid rgba(254,202,202,0.15)" }}
              >
                <Square className="h-3.5 w-3.5" />
                Stop
              </button>
            </div>

            {/* Auto Mode toggle */}
            <label className="flex items-center gap-3 cursor-pointer rounded-xl p-3" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <input type="checkbox" className="sr-only peer" checked={autoMode} onChange={(e) => handleAutoModeToggle(e.target.checked)} />
              <div className="w-10 h-5 rounded-full peer transition-all peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:rounded-full after:h-4 after:w-4 after:transition-all after:bg-white relative"
                style={{ background: autoMode ? "linear-gradient(135deg, #10b981, #06b6d4)" : "rgba(255,255,255,0.1)" }}
              />
              <div>
                <p className="text-xs font-semibold text-slate-200">Auto Mode</p>
                <p className="text-[10px] text-slate-500">Otomatis isi semua asset yang terdeteksi</p>
              </div>
            </label>

            {/* ── Credit / Usage bar ─────────────────────────────────────────── */}
            <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Kredit Tersisa</span>
                <span className="text-sm font-bold text-white">{creditLabel}</span>
              </div>
              {planType !== "lifetime" && creditTotal !== null && creditTotal > 0 && (
                <div className="h-1.5 w-full rounded-full bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${creditPct}%`,
                      background: creditPct < 20 ? "linear-gradient(90deg, #ef4444, #f87171)" : "linear-gradient(90deg, #10b981, #06b6d4)",
                    }}
                  />
                </div>
              )}
            </div>

            {/* ── Open Platform grid ─────────────────────────────────────────── */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Open Platform</p>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map((p) => {
                  const selected = settings.selected_microstock === p.id
                  return (
                    <button
                      key={p.id}
                      disabled={isBusy}
                      onClick={() => handleMicrostockSelect(p.id)}
                      className="rounded-xl py-2.5 text-xs font-semibold transition-all relative"
                      style={{
                        background: selected ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.02)",
                        border: `1px solid ${selected ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.06)"}`,
                        color: selected ? "#6ee7b7" : "#94a3b8",
                      }}
                    >
                      {selected && <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Upgrade card ─────────────────────────────────────────────── */}
            {planType === "free" && (
              <button
                onClick={() => openDashboard("/dashboard/billing")}
                className="w-full flex items-center gap-3 rounded-xl p-4 transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(16,185,129,0.04))", border: "1px solid rgba(139,92,246,0.2)" }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(139,92,246,0.12)" }}>
                  <Crown className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-xs font-bold text-slate-100">Upgrade to Pro</p>
                  <p className="text-[10px] text-slate-500">Buka semua fitur tanpa batas</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              </button>
            )}

            {/* ── Footer nav ────────────────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={() => openDashboard("/dashboard/history")}
                className="flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all hover:bg-white/5"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] font-medium text-slate-500">History</span>
              </button>
              <button
                onClick={() => openDashboard("/dashboard/settings")}
                className="flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all hover:bg-white/5"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <SettingsIcon className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] font-medium text-slate-500">Settings</span>
              </button>
              <button
                onClick={() => {
                  if (typeof chrome !== "undefined" && chrome.runtime) {
                    chrome.storage.local.clear()
                  }
                  window.open("https://autofillstock.my.id/auth/login", "_blank")
                  window.close()
                }}
                className="flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all hover:bg-white/5"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <LogOut className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] font-medium text-slate-500">Logout</span>
              </button>
            </div>

            {/* Brand footer */}
            <div className="flex items-center justify-between pt-1 text-[10px] text-slate-600">
              <span>Usage: {settings.usage_count || 0}</span>
              <span>autofillstock.my.id</span>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

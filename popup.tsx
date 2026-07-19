import "./style.css"

import iconUrl from "data-base64:~assets/icon.png"
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Zap
} from "lucide-react"
import { useEffect, useState } from "react"

import { validateActivationCode } from "~/lib/activation"
import { getSettings, updateSettings } from "~/lib/storage"
import type { AppSettings, AutofillMessage, MicrostockPlatform } from "~/lib/types"

type BusyState = "idle" | "activating" | "syncing-panel"
type Notice = { type: "success" | "error"; title: string; message: string } | null

const MICROSTOCKS: Array<{
  id: MicrostockPlatform
  label: string
  enabled: boolean
}> = [
  { id: "adobe_stock", label: "Adobe Stock", enabled: true },
  { id: "shutterstock", label: "Shutterstock", enabled: true },
  { id: "vecteezy", label: "Vecteezy", enabled: false },
  { id: "pond5", label: "Pond5", enabled: false },
  { id: "getty_images", label: "Getty", enabled: false }
]

function isSupportedMicrostockUrl(url?: string) {
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

async function syncActiveTabPanel() {
  if (typeof chrome === "undefined" || !chrome.tabs) return

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id || !isSupportedMicrostockUrl(tab.url)) return

  const message: AutofillMessage = { type: "ADOBESTOCK_PANEL_SYNC" }
  try {
    await chrome.tabs.sendMessage(tab.id, message)
  } catch (error) {
    const isExpectedDisconnect =
      error instanceof Error &&
      (error.message.includes("Could not establish connection") ||
        error.message.includes("Receiving end does not exist"))
    if (!isExpectedDisconnect) {
      console.error("[syncActiveTabPanel] Unexpected error:", error)
    }
  }
}

export default function Popup() {
  const [settings, setSettings] = useState<AppSettings>({
    activation_status: false,
    panel_enabled: false,
    selected_microstock: "adobe_stock",
    usage_count: 0
  })
  const [activationCode, setActivationCode] = useState("")
  const [busy, setBusy] = useState<BusyState>("idle")
  const [notice, setNotice] = useState<Notice>(null)

  const isBusy = busy !== "idle"
  const isReady = settings.activation_status

  useEffect(() => {
    getSettings().then((stored) => {
      setSettings(stored)
      setActivationCode(stored.activation_code || "")
    })
  }, [])

  async function handleActivate() {
    setBusy("activating")
    setNotice(null)

    try {
      await validateActivationCode(activationCode.trim())
      const nextSettings = {
        activation_status: true,
        activation_code: activationCode.trim()
      }

      await updateSettings(nextSettings)
      setSettings((current) => ({ ...current, ...nextSettings }))
      setNotice({
        type: "success",
        title: "Aktivasi berhasil",
        message:
          "Extension siap digunakan. Untuk paket One-time, atur API key di dashboard autofillstock.my.id."
      })
    } catch (error) {
      setNotice({
        type: "error",
        title: "Aktivasi gagal",
        message:
          error instanceof Error ? error.message : "Kode aktivasi tidak valid."
      })
    } finally {
      setBusy("idle")
    }
  }

  async function handlePanelToggle(enabled: boolean) {
    setBusy("syncing-panel")
    setNotice(null)

    try {
      if (!isReady) {
        throw new Error("Aktivasi diperlukan sebelum mengaktifkan panel.")
      }

      const nextSettings = {
        panel_enabled: enabled,
        selected_microstock: settings.selected_microstock
      }

      await updateSettings(nextSettings)
      setSettings((current) => ({ ...current, ...nextSettings }))
      await syncActiveTabPanel()
    } catch (error) {
      setNotice({
        type: "error",
        title: "Gagal mengubah panel",
        message: error instanceof Error ? error.message : "Coba ulangi lagi."
      })
    } finally {
      setBusy("idle")
    }
  }

  async function handleMicrostockSelect(platform: MicrostockPlatform) {
    const microstock = MICROSTOCKS.find((item) => item.id === platform)
    if (!microstock?.enabled) {
      setNotice({
        type: "error",
        title: "Coming soon",
        message: "Platform ini belum aktif."
      })
      return
    }

    await updateSettings({ selected_microstock: platform })
    setSettings((current) => ({ ...current, selected_microstock: platform }))
    await syncActiveTabPanel()
  }

  const activePlatformLabel =
    MICROSTOCKS.find((p) => p.id === settings.selected_microstock)?.label || "Adobe Stock"

  return (
    <main className="min-h-[520px] w-[400px] bg-[#0d1117] p-0 text-white overflow-hidden">
      {/* Glass container */}
      <div className="relative overflow-hidden rounded-none">
        {/* Header gradient */}
        <div className="relative px-6 pt-6 pb-5" style={{ background: "linear-gradient(135deg, #1a1a3e 0%, #0f2847 50%, #0a1628 100%)" }}>
          {/* Subtle glass overlay */}
          <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(ellipse at 30% 20%, rgba(102,126,234,0.3) 0%, transparent 60%)" }} />

          <div className="relative z-10 flex items-center gap-4">
            <img
              alt="Autofillstock"
              className="h-14 w-14 rounded-2xl border border-white/10 shadow-lg"
              src={iconUrl}
              style={{ boxShadow: "0 8px 32px rgba(102,126,234,0.2)" }}
            />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white" style={{ letterSpacing: "-0.02em" }}>
                AUTOFILLSTOCK
              </h1>
              <p className="text-[11px] font-medium tracking-[0.15em] text-slate-400 uppercase mt-0.5">
                Creative Tools
              </p>
            </div>
          </div>

          {/* Status badge */}
          {isReady && (
            <div className="relative z-10 mt-4">
              <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold"
                style={{
                  background: "rgba(16,185,129,0.12)",
                  border: "1px solid rgba(16,185,129,0.25)",
                  color: "#6ee7b7"
                }}>
                <span className="h-2 w-2 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px rgba(52,211,153,0.5)" }} />
                ACTIVE: {activePlatformLabel.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Platform tabs */}
        {isReady && (
          <div className="flex border-b border-white/[0.06] bg-[#0d1117]">
            {MICROSTOCKS.filter((p) => p.enabled).map((platform) => {
              const selected = settings.selected_microstock === platform.id
              return (
                <button
                  key={platform.id}
                  className="flex-1 py-3 text-xs font-semibold transition-all relative"
                  style={{
                    color: selected ? "#e2e8f0" : "#64748b",
                    background: selected ? "rgba(255,255,255,0.03)" : "transparent"
                  }}
                  disabled={isBusy}
                  onClick={() => handleMicrostockSelect(platform.id)}
                  type="button"
                >
                  {platform.label}
                  {selected && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-emerald-400" />
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Notice */}
          {notice && (
            <div
              className="rounded-xl p-3.5 text-sm flex items-start gap-3"
              style={{
                background: notice.type === "error" ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)",
                border: `1px solid ${notice.type === "error" ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"}`
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
                <p className="text-[11px] mt-1 text-slate-400 leading-relaxed">{notice.message}</p>
              </div>
            </div>
          )}

          {!settings.activation_status ? (
            /* ─── Activation state ─── */
            <div className="space-y-4">
              <div
                className="rounded-2xl p-5 space-y-4"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backdropFilter: "blur(12px)"
                }}
              >
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
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.1)"
                    }}
                  />
                </div>

                <button
                  className="w-full flex items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isBusy || !activationCode.trim()}
                  onClick={handleActivate}
                  style={{
                    background: "linear-gradient(135deg, #10b981, #06b6d4)",
                    color: "#022c22",
                    boxShadow: "0 4px 20px rgba(16,185,129,0.25)"
                  }}
                  type="button"
                >
                  {busy === "activating" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  Validate & Activate
                </button>
              </div>

              <p className="text-center text-[11px] text-slate-600">
                Ambil kode di dashboard → Settings
              </p>
            </div>
          ) : (
            /* ─── Ready state ─── */
            <div className="space-y-4">
              {/* Panel toggle — glass card */}
              <div
                className="rounded-2xl p-4 flex items-center justify-between gap-3"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)"
                }}
              >
                <div>
                  <p className="text-sm font-semibold text-slate-100">Auto Panel</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tampil otomatis di halaman upload
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.panel_enabled}
                    disabled={busy === "syncing-panel"}
                    onChange={(e) => handlePanelToggle(e.target.checked)}
                  />
                  <div className="w-11 h-6 rounded-full peer transition-all peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:rounded-full after:h-5 after:w-5 after:transition-all after:bg-white"
                    style={{
                      background: settings.panel_enabled
                        ? "linear-gradient(135deg, #10b981, #06b6d4)"
                        : "rgba(255,255,255,0.1)"
                    }}
                  />
                </label>
              </div>

              {/* Auto-select options */}
              <div
                className="rounded-2xl p-4 space-y-3"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)"
                }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Auto-Selection
                </p>
                {[
                  "Auto-select file type (Photo/Illustration)",
                  "Auto-select file category",
                  "Auto-enable 'Created with AI tools'",
                  "Auto-select 'People & property are fictional'"
                ].map((label, i) => (
                  <label key={i} className="flex items-center gap-3 cursor-pointer group">
                    <span className="flex items-center justify-center w-5 h-5 rounded-md border transition-all"
                      style={{
                        background: "rgba(16,185,129,0.15)",
                        borderColor: "rgba(16,185,129,0.4)"
                      }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    </span>
                    <span className="text-[12px] text-slate-300 group-hover:text-slate-100 transition-colors">
                      {label}
                    </span>
                  </label>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all"
                  onClick={() => syncActiveTabPanel()}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#94a3b8"
                  }}
                  type="button"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Sync Panel
                </button>
                <button
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all"
                  onClick={() =>
                    window.open("https://autofillstock.my.id/dashboard", "_blank")
                  }
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#94a3b8"
                  }}
                  type="button"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Dashboard
                </button>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-600">
                <span>Usage: {settings.usage_count || 0}</span>
                <span>autofillstock.my.id</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

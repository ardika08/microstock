import "./style.css"

import iconUrl from "data-base64:~assets/icon.png"
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Loader2,
  RefreshCw
} from "lucide-react"
import { useEffect, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
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

function ToggleSwitch({
  checked,
  disabled,
  onChange,
  label
}: {
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={checked}
      className={[
        "relative h-7 w-12 rounded-full transition-colors",
        checked ? "bg-emerald-500" : "bg-slate-700",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      ].join(" ")}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      type="button">
      <span
        className={[
          "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0"
        ].join(" ")}
      />
    </button>
  )
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

  return (
    <main className="min-h-[420px] w-[380px] bg-slate-950 p-4 text-slate-100">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 shadow-xl">
        {/* Header */}
        <div className="border-b border-white/10 p-4">
          <div className="flex items-start gap-3">
            <img
              alt="Autofillstock"
              className="h-11 w-11 rounded-xl border border-white/10"
              src={iconUrl}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-base font-semibold tracking-tight text-white">
                    Autofillstock
                  </h1>
                  <p className="mt-1 text-xs leading-snug text-slate-400">
                    Generate & isi metadata microstock otomatis.
                  </p>
                </div>
                <Badge
                  className={
                    isReady
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-white/10 bg-white/5 text-slate-300"
                  }
                  variant={isReady ? "success" : "secondary"}>
                  {isReady ? "Siap" : "Setup"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4">
          {notice ? (
            <Alert
              className={
                notice.type === "error"
                  ? "border-red-500/30 bg-red-500/10"
                  : "border-emerald-500/30 bg-emerald-500/10"
              }
              variant={notice.type === "error" ? "destructive" : "default"}>
              {notice.type === "error" ? (
                <AlertCircle className="mb-2 h-4 w-4" />
              ) : (
                <CheckCircle2 className="mb-2 h-4 w-4 text-emerald-400" />
              )}
              <AlertTitle>{notice.title}</AlertTitle>
              <AlertDescription>{notice.message}</AlertDescription>
            </Alert>
          ) : null}

          {!settings.activation_status ? (
            <div className="space-y-3">
              <div>
                <Label className="text-slate-300" htmlFor="activation-code">
                  Kode Aktivasi
                </Label>
                <Input
                  className="mt-1.5 border-white/10 bg-slate-950/80 text-slate-100 placeholder:text-slate-500"
                  id="activation-code"
                  value={activationCode}
                  onChange={(event) => setActivationCode(event.target.value)}
                  placeholder="Masukkan kode aktivasi"
                />
              </div>
              <Button
                className="w-full gap-2 bg-emerald-500 text-white hover:bg-emerald-400"
                disabled={isBusy || !activationCode.trim()}
                onClick={handleActivate}>
                {busy === "activating" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                Verifikasi
              </Button>
              <p className="text-center text-[11px] text-slate-500">
                Ambil kode di dashboard → Settings
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Panel toggle */}
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/50 px-3 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-100">Panel on-page</p>
                  <p className="text-[11px] text-slate-500">
                    Tampil di halaman upload microstock
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={
                      settings.panel_enabled
                        ? "text-xs font-medium text-emerald-400"
                        : "text-xs font-medium text-slate-500"
                    }>
                    {settings.panel_enabled ? "ON" : "OFF"}
                  </span>
                  <ToggleSwitch
                    checked={settings.panel_enabled}
                    disabled={busy === "syncing-panel"}
                    label="Aktifkan panel autofill"
                    onChange={handlePanelToggle}
                  />
                </div>
              </div>

              {/* Platform */}
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Platform
                </p>
                <div
                  className="grid grid-cols-2 gap-2"
                  role="tablist"
                  aria-label="Pilih platform microstock">
                  {MICROSTOCKS.filter((p) => p.enabled || p.id === "vecteezy").map(
                    (platform) => {
                      const selected = settings.selected_microstock === platform.id
                      const isSoon = !platform.enabled

                      return (
                        <button
                          aria-selected={selected}
                          aria-disabled={isSoon}
                          className={[
                            "inline-flex h-9 items-center justify-center rounded-lg border px-2 text-xs font-medium transition-colors",
                            selected
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                              : "border-white/10 bg-slate-950/60 text-slate-400 hover:border-white/20 hover:text-slate-200",
                            isSoon ? "cursor-not-allowed opacity-45" : ""
                          ].join(" ")}
                          disabled={isBusy || isSoon}
                          key={platform.id}
                          onClick={() => handleMicrostockSelect(platform.id)}
                          role="tab"
                          tabIndex={isSoon ? -1 : 0}
                          type="button">
                          {platform.label}
                          {isSoon ? " · Soon" : ""}
                        </button>
                      )
                    }
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-2 border-white/10 bg-transparent text-slate-200 hover:bg-white/5"
                  onClick={() => syncActiveTabPanel()}
                  variant="outline">
                  <RefreshCw className="h-4 w-4" />
                  Sync Panel
                </Button>
                <Button
                  className="flex-1 gap-2 border-white/10 bg-transparent text-slate-200 hover:bg-white/5"
                  onClick={() =>
                    window.open("https://autofillstock.my.id/dashboard", "_blank")
                  }
                  variant="outline">
                  <ExternalLink className="h-4 w-4" />
                  Dashboard
                </Button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Usage lokal: {settings.usage_count || 0}</span>
                <span>autofillstock.my.id</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

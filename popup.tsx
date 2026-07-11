import "./style.css"

import iconUrl from "data-base64:~assets/icon.png"
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Send,
  Settings2
} from "lucide-react"
import { useEffect, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { validateActivationCode } from "~/lib/activation"
import { clearApiKey, getSettings, updateSettings } from "~/lib/storage"
import type { AppSettings, AutofillMessage, MicrostockPlatform } from "~/lib/types"

type BusyState = "idle" | "activating" | "saving-key" | "syncing-panel"
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
  { id: "getty_images", label: "Getty Images", enabled: false }
]

function isSupportedMicrostockUrl(url?: string) {
  if (!url) {
    return false
  }

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
  if (typeof chrome === "undefined" || !chrome.tabs) {
    return
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id || !isSupportedMicrostockUrl(tab.url)) {
    return
  }

  const message: AutofillMessage = { type: "ADOBESTOCK_PANEL_SYNC" }

  try {
    await chrome.tabs.sendMessage(tab.id, message)
  } catch (error) {
    // Content script may not be injected yet — this is expected on first load.
    // Log unexpected errors so they're visible in extension devtools.
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
        "relative h-8 w-14 rounded-full transition-colors",
        checked ? "bg-primary" : "bg-slate-200",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      ].join(" ")}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      type="button">
      <span
        className={[
          "absolute left-0 top-1 h-6 w-6 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-7" : "translate-x-1"
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
  const [apiKey, setApiKey] = useState("")
  const [busy, setBusy] = useState<BusyState>("idle")
  const [notice, setNotice] = useState<Notice>(null)

  const isBusy = busy !== "idle"
  const isReady = settings.activation_status // ✅ cukup aktivasi, API key diatur di dashboard

  useEffect(() => {
    getSettings().then((stored) => {
      setSettings(stored)
      setActivationCode(stored.activation_code || "")
      setApiKey(stored.openai_api_key || "")
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
        message: "Extension siap digunakan. Untuk paket One-time, atur API key di dashboard autofillstock.my.id."
      })
    } catch (error) {
      setNotice({
        type: "error",
        title: "Aktivasi gagal",
        message: error instanceof Error ? error.message : "Kode aktivasi tidak valid."
      })
    } finally {
      setBusy("idle")
    }
  }

  async function handleSaveApiKey() {
    setBusy("saving-key")
    setNotice(null)

    try {
      const trimmedKey = apiKey.trim()
      // OpenAI keys: sk-... atau sk-proj-... diikuti minimal 20 karakter alphanumeric
      if (!trimmedKey.startsWith("sk-") || trimmedKey.length < 20) {
        throw new Error("Format OpenAI API key tidak valid. Key harus dimulai dengan 'sk-' dan minimal 20 karakter.")
      }

      await updateSettings({ openai_api_key: trimmedKey })
      setSettings((current) => ({ ...current, openai_api_key: trimmedKey }))
      setNotice({
        type: "success",
        title: "API key tersimpan",
        message: "Aktifkan toggle untuk menampilkan panel kanan di halaman upload."
      })
    } catch (error) {
      setNotice({
        type: "error",
        title: "Gagal menyimpan API key",
        message: error instanceof Error ? error.message : "Coba periksa API key."
      })
    } finally {
      setBusy("idle")
    }
  }

  async function handleClearApiKey() {
    await clearApiKey()
    await updateSettings({ panel_enabled: false })
    setApiKey("")
    setSettings((current) => ({
      ...current,
      openai_api_key: undefined,
      panel_enabled: false
    }))
    await syncActiveTabPanel()
  }

  async function handlePanelToggle(enabled: boolean) {
    setBusy("syncing-panel")
    setNotice(null)

    try {
      if (!isReady) {
        throw new Error("Aktivasi dan OpenAI API key harus siap terlebih dahulu.")
      }

      const nextSettings = {
        panel_enabled: enabled,
        selected_microstock: settings.selected_microstock
      }

      await updateSettings(nextSettings)
      setSettings((current) => ({ ...current, ...nextSettings }))
      await syncActiveTabPanel()
      setNotice(null)
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
    <main className="min-h-[420px] w-[380px] bg-background p-4 text-foreground">
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <img
              alt="AdobeStock AutoFill"
              className="h-12 w-12 rounded-lg"
              src={iconUrl}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-base font-semibold leading-tight">
                    AdobeStock AutoFill
                  </h1>
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">
                    Generate deskripsi dan keyword otomatis yang teroptimasi SEO.
                  </p>
                </div>
                <Badge variant={isReady ? "success" : "secondary"}>
                  {isReady ? "Siap" : "Setup"}
                </Badge>
              </div>
            </div>
          </div>

          {notice ? (
            <Alert
              className="mt-4"
              variant={notice.type === "error" ? "destructive" : "default"}>
              {notice.type === "error" ? (
                <AlertCircle className="mb-2 h-4 w-4" />
              ) : (
                <CheckCircle2 className="mb-2 h-4 w-4 text-accent" />
              )}
              <AlertTitle>{notice.title}</AlertTitle>
              <AlertDescription>{notice.message}</AlertDescription>
            </Alert>
          ) : null}

          {!settings.activation_status ? (
            <div className="mt-4 space-y-3 border-t pt-4">
              <Label htmlFor="activation-code">Kode Aktivasi</Label>
              <Input
                id="activation-code"
                value={activationCode}
                onChange={(event) => setActivationCode(event.target.value)}
                placeholder="Masukkan kode aktivasi"
              />
              <Button
                className="w-full gap-2"
                disabled={isBusy || !activationCode.trim()}
                onClick={handleActivate}>
                {busy === "activating" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                Verifikasi
              </Button>
            </div>
          ) : (
            <div className="mt-4 space-y-4 border-t pt-4">
              <div className="flex items-center gap-3">
                <ToggleSwitch
                  checked={settings.panel_enabled}
                  disabled={busy === "syncing-panel"}
                  label="Aktifkan panel autofill"
                  onChange={handlePanelToggle}
                />
                <span
                  className={
                    settings.panel_enabled
                      ? "font-medium text-accent"
                      : "font-medium text-muted-foreground"
                  }>
                  {settings.panel_enabled ? "Active" : "Inactive"}
                </span>
              </div>

              <div
                className="grid grid-cols-2 gap-2 border-t pt-4"
                role="tablist"
                aria-label="Pilih platform microstock">
                {MICROSTOCKS.map((platform) => {
                  const selected = settings.selected_microstock === platform.id

                  return (
                    <button
                      aria-selected={selected}
                      aria-disabled={!platform.enabled}
                      className={[
                        "inline-flex h-9 items-center justify-center gap-2 rounded-md border px-2 text-xs font-medium transition-colors",
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-transparent bg-secondary text-muted-foreground",
                        !platform.enabled ? "cursor-not-allowed opacity-50" : ""
                      ].join(" ")}
                      disabled={isBusy || !platform.enabled}
                      key={platform.id}
                      onClick={() => handleMicrostockSelect(platform.id)}
                      role="tab"
                      tabIndex={!platform.enabled ? -1 : 0}
                      type="button">
                      <Send className="h-3.5 w-3.5" />
                      {platform.label}
                    </button>
                  )
                })}
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-2"
                  onClick={() => syncActiveTabPanel()}
                  variant="outline">
                  <Settings2 className="h-4 w-4" />
                  Sync Panel
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Usage lokal: {settings.usage_count || 0}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

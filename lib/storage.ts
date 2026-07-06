import type { AppSettings } from "~/lib/types"

const DEFAULT_SETTINGS: AppSettings = {
  activation_status: false,
  panel_enabled: false,
  selected_microstock: "adobe_stock",
  usage_count: 0
}

function hasChromeStorage() {
  return typeof chrome !== "undefined" && Boolean(chrome.storage?.local)
}

export async function getSettings(): Promise<AppSettings> {
  if (!hasChromeStorage()) {
    return DEFAULT_SETTINGS
  }

  const values = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS))
  const optionalValues = await chrome.storage.local.get([
    "activation_code",
    "openai_api_key",
    "last_generated"
  ])

  return {
    ...DEFAULT_SETTINGS,
    ...values,
    ...optionalValues
  }
}

export async function updateSettings(settings: Partial<AppSettings>) {
  if (!hasChromeStorage()) {
    return
  }

  await chrome.storage.local.set(settings)
}

export async function clearApiKey() {
  if (!hasChromeStorage()) {
    return
  }

  await chrome.storage.local.remove("openai_api_key")
}

import iconUrl from "data-base64:~assets/icon.png"

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "ADOBESTOCK_NOTIFY_COMPLETE") {
    return false
  }

  const processed = Number(message?.payload?.processed || 0)
  const platform = message?.payload?.platform === "shutterstock" ? "shutterstock" : "adobe_stock"
  const title =
    platform === "shutterstock"
      ? "Shutterstock auto-fill selesai"
      : "Proses generate selesai"
  const notificationMessage =
    platform === "shutterstock"
      ? processed > 1
        ? `${processed} aset Shutterstock berhasil diisi. Cek metadata, lalu klik Save atau Submit.`
        : "1 aset Shutterstock berhasil diisi. Cek metadata, lalu klik Save atau Submit."
      : processed > 1
        ? `${processed} aset telah berhasil diproses.`
        : "1 aset telah berhasil diproses."

  chrome.notifications.create(
    {
      type: "basic",
      iconUrl: iconUrl || chrome.runtime.getURL("icon128.plasmo.3c1ed2d2.png"),
      title,
      message: notificationMessage
    },
    () => sendResponse({ ok: true })
  )

  return true
})

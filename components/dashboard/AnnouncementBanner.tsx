import { useState, useEffect } from "react"
import { X, Sparkles } from "lucide-react"
import Link from "next/link"
import { changelog } from "~/data/changelog"

const LATEST_VERSION = changelog[0]?.version || "1.5.0"
const STORAGE_KEY = `autofillstock_banner_dismissed_${LATEST_VERSION}`

export default function AnnouncementBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY)
      if (!dismissed) {
        setVisible(true)
      }
    } catch {
      setVisible(true)
    }
  }, [])

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1")
    } catch {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="relative z-20 mx-auto max-w-5xl mb-2">
      <div
        className="flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm"
        style={{
          background:
            "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,182,212,0.06))",
          borderColor: "rgba(16,185,129,0.2)",
        }}
      >
        <Sparkles className="h-4 w-4 flex-shrink-0 text-emerald-400" />
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-emerald-300">
            Update v{LATEST_VERSION}:
          </span>{" "}
          <span className="text-gray-300">
            {changelog[0]?.title} — {changelog[0]?.changes[0]?.text}
          </span>
        </div>
        <Link
          href="/dashboard/changelog"
          onClick={dismiss}
          className="flex-shrink-0 rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
        >
          Lihat
        </Link>
        <button
          onClick={dismiss}
          className="flex-shrink-0 text-gray-500 hover:text-gray-300 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

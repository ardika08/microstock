import React from "react"
import { motion } from "framer-motion"
import DashboardLayout from "~/components/dashboard/DashboardLayout"
import { changelog } from "~/data/changelog"
import type { ChangelogEntry } from "~/data/changelog"

// ─── Badge helpers ────────────────────────────────────────────────────────────

function VersionBadge({ entry, isLatest }: { entry: ChangelogEntry; isLatest: boolean }) {
  const colorMap = {
    major: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    minor: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    patch: "bg-gray-500/15 text-gray-300 border-gray-500/30",
  }
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorMap[entry.type]}`}
      >
        v{entry.version}
      </span>
      {isLatest && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase tracking-wide">
          Latest
        </span>
      )}
    </div>
  )
}

function ChangeBadge({ type }: { type: "new" | "improvement" | "fix" }) {
  const map = {
    new: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    improvement: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    fix: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  }
  const label = { new: "New", improvement: "Improved", fix: "Fix" }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border shrink-0 ${map[type]}`}
    >
      {label[type]}
    </span>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChangelogPage() {
  return (
    <DashboardLayout title="Changelog">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-100">Changelog</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Semua update dan perbaikan autofillstock
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-3 top-4 bottom-4 w-px bg-white/10" aria-hidden="true" />

          <div className="space-y-6">
            {changelog.map((entry, idx) => (
              <motion.div
                key={entry.version}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.06 }}
                className="relative pl-10"
              >
                {/* Dot */}
                <div
                  className={`absolute left-0 top-4 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    idx === 0
                      ? "border-blue-500 bg-blue-500/20"
                      : "border-white/20 bg-slate-900"
                  }`}
                  aria-hidden="true"
                >
                  <div
                    className={`w-2 h-2 rounded-full ${idx === 0 ? "bg-blue-400" : "bg-gray-600"}`}
                  />
                </div>

                {/* Card */}
                <div className="rounded-xl border border-white/10 bg-slate-900/60 p-5 hover:border-white/20 transition-colors">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <VersionBadge entry={entry} isLatest={idx === 0} />
                    <span className="text-xs text-gray-500 shrink-0 pt-0.5">{entry.date}</span>
                  </div>

                  {/* Title */}
                  <h2 className="text-base font-semibold text-gray-100 mb-3">{entry.title}</h2>

                  {/* Changes list */}
                  <ul className="space-y-2">
                    {entry.changes.map((change, cIdx) => (
                      <li key={cIdx} className="flex items-start gap-2.5 text-sm text-gray-400">
                        <ChangeBadge type={change.type} />
                        <span className="leading-relaxed">{change.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

import React from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { changelog } from "~/data/changelog"
import type { ChangelogEntry } from "~/data/changelog"

// Show only 3 most recent versions (array is already sorted newest-first)
const PREVIEW_COUNT = 3

function VersionBadge({ type, version }: { type: ChangelogEntry["type"]; version: string }) {
  const colorMap = {
    major: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    minor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    patch: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${colorMap[type]}`}
    >
      v{version}
    </span>
  )
}

function ChangeDot({ type }: { type: "new" | "improvement" | "fix" }) {
  const colorMap = {
    new: "bg-emerald-400",
    improvement: "bg-blue-400",
    fix: "bg-amber-400",
  }
  return <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${colorMap[type]}`} />
}

export function ChangelogSection() {
  const recent = changelog.slice(0, PREVIEW_COUNT)

  return (
    <section className="py-20 bg-slate-950 border-t border-white/5">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Heading */}
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-3">
            What&apos;s New
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-100">Update Terbaru</h2>
          <p className="text-gray-500 mt-3 text-sm">
            Kami terus berkembang — cek fitur dan perbaikan terkini.
          </p>
        </div>

        {/* Cards */}
        <div className="space-y-4">
          {recent.map((entry, idx) => (
            <div
              key={entry.version}
              className="rounded-xl border border-white/10 bg-slate-900/50 p-5 hover:border-white/20 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Left: badge + title + date */}
                <div className="flex flex-col gap-1.5 sm:w-44 shrink-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <VersionBadge type={entry.type} version={entry.version} />
                    {idx === 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase tracking-wide">
                        Latest
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{entry.date}</p>
                  <p className="text-sm font-semibold text-gray-200 leading-snug">{entry.title}</p>
                </div>

                {/* Divider */}
                <div className="hidden sm:block w-px self-stretch bg-white/10 mx-2" aria-hidden="true" />

                {/* Right: first 3 changes */}
                <ul className="flex-1 space-y-1.5">
                  {entry.changes.slice(0, 3).map((change, cIdx) => (
                    <li key={cIdx} className="flex items-start gap-2 text-sm text-gray-400">
                      <ChangeDot type={change.type} />
                      <span className="leading-relaxed">{change.text}</span>
                    </li>
                  ))}
                  {entry.changes.length > 3 && (
                    <li className="text-xs text-gray-600 pl-3.5">
                      +{entry.changes.length - 3} lainnya
                    </li>
                  )}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <Link
            href="/dashboard/changelog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors group"
          >
            Lihat semua update
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}

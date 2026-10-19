import React from "react"
import { Calendar, Clock, Copy, ArrowUpRight, Globe2, AlertCircle } from "lucide-react"
import type { Trend } from "~/data/trends-2026"

const DEMAND_STYLE: Record<Trend["demand"], string> = {
  Puncak: "bg-red-500/15 text-red-400 border-red-500/30",
  Tinggi: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Sedang: "bg-slate-500/15 text-gray-400 border-white/10",
}

interface TrendCardProps {
  trend: Trend
  onOpen: (trend: Trend) => void
  onCopyPrompt: (trend: Trend) => void
}

export default function TrendCard({ trend, onOpen, onCopyPrompt }: TrendCardProps) {
  return (
    <div className="group relative flex flex-col rounded-xl border border-white/10 bg-slate-900/60 p-4 transition-all duration-200 hover:border-blue-500/40 hover:bg-slate-900">
      {/* Header: bulan + demand */}
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-md bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-blue-400">
          {trend.month}
        </span>
        <span
          className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${DEMAND_STYLE[trend.demand]}`}
        >
          {trend.demand}
        </span>
        {trend.note && (
          <span title={trend.note} className="ml-auto text-amber-400/70">
            <AlertCircle className="h-3.5 w-3.5" />
          </span>
        )}
      </div>

      {/* Judul */}
      <h3 className="mb-2 text-sm font-bold leading-snug text-gray-100">{trend.title}</h3>

      {/* Tanggal + window */}
      <div className="mb-1 flex items-center gap-1.5 text-[11px] text-gray-500">
        <Calendar className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{trend.eventDate}</span>
      </div>
      <div className="mb-3 flex items-center gap-1.5 text-[11px] text-gray-500">
        <Clock className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">Upload: {trend.uploadWindow}</span>
      </div>

      {/* Region */}
      <div className="mb-4 flex items-center gap-1.5 text-[10px] text-gray-600">
        <Globe2 className="h-3 w-3 shrink-0" />
        <span className="truncate">{trend.region}</span>
        <span className="ml-auto shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-gray-500">
          {trend.category}
        </span>
      </div>

      {/* Actions */}
      <div className="mt-auto flex gap-2">
        <button
          onClick={() => onOpen(trend)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
        >
          Detail
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onCopyPrompt(trend)}
          title="Copy prompt pertama"
          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-gray-400 transition-colors hover:border-blue-500/40 hover:text-blue-400"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

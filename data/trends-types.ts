// Trend & Event Calendar — tipe & konstanta (aman untuk client bundle)
// Data event TIDAK ada di sini. Lihat data/trends-2026.server.ts
//
// File ini sengaja hanya berisi tipe dan konstanta kecil supaya bisa di-import
// komponen client (TrendCard) tanpa ikut membawa 35 objek event ke browser.

export type Demand = "Puncak" | "Tinggi" | "Sedang"

export interface Trend {
  id: string
  month: string // "JAN"
  monthName: string // "Januari"
  title: string
  eventDate: string
  uploadWindow: string
  demand: Demand
  category: string
  region: string
  note?: string
  prompts: string[]
  keywords: string[]
  palette: string
  styles: string[]
  assetTypes: string[]
}

export const TREND_YEAR = 2026
export const TREND_UPDATED = "2026-10-19"

export const MONTHS = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"]

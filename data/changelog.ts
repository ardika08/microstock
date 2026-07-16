export interface ChangelogEntry {
  version: string        // e.g. "1.3.0"
  date: string           // e.g. "16 Jul 2026"
  title: string          // ringkasan singkat
  type: 'major' | 'minor' | 'patch'
  changes: {
    type: 'new' | 'improvement' | 'fix'
    text: string
  }[]
}

export const changelog: ChangelogEntry[] = [
  {
    version: "1.3.0",
    date: "16 Jul 2026",
    title: "Image Upscaling",
    type: "minor",
    changes: [
      { type: "new", text: "Fitur Image Upscaling — Standard (4×) dan Premium (2× detail tinggi)" },
      { type: "new", text: "Upscaling via Replicate AI API" },
      { type: "new", text: "Admin-only access untuk testing awal" },
    ]
  },
  {
    version: "1.2.0",
    date: "12 Jul 2026",
    title: "Batch Generate & Multi-Platform",
    type: "minor",
    changes: [
      { type: "new", text: "Batch generate hingga 10 gambar sekaligus untuk paid user" },
      { type: "new", text: "Export hasil batch ke CSV" },
      { type: "new", text: "Tombol Support Telegram di sidebar" },
      { type: "new", text: "Welcome bot otomatis di grup Telegram" },
      { type: "improvement", text: "Generate dari extension menggunakan server API key" },
      { type: "improvement", text: "Platform tracking (Adobe Stock, Shutterstock) di pie chart" },
      { type: "fix", text: "Extension activation code tidak lagi di-mark USED" },
    ]
  },
  {
    version: "1.1.0",
    date: "10 Jul 2026",
    title: "Pricing Revamp & Credit System",
    type: "minor",
    changes: [
      { type: "new", text: "Paket baru: Intro (Rp9.900/150kr), Basic (Rp25rb/450kr), Value (Rp50rb/1.200kr)" },
      { type: "new", text: "Full credit-only model — hapus paket Starter bulanan" },
      { type: "new", text: "Nudge banner untuk free user yang belum generate" },
      { type: "improvement", text: "Upload hanya JPG/PNG/WebP maks 2MB" },
      { type: "improvement", text: "Pagination per 10 di semua tabel (history, usage, admin)" },
      { type: "fix", text: "Webhook Mayar tidak lagi memerlukan HMAC signature" },
    ]
  },
  {
    version: "1.0.0",
    date: "8 Jul 2026",
    title: "Launch",
    type: "major",
    changes: [
      { type: "new", text: "Generate metadata microstock (title, description, 50 keywords) via AI" },
      { type: "new", text: "Chrome Extension untuk Adobe Stock & Shutterstock" },
      { type: "new", text: "Dashboard dengan history, usage stats, dan platform analytics" },
      { type: "new", text: "Sistem kredit dengan top up via Mayar" },
      { type: "new", text: "Google OAuth login" },
    ]
  },
]

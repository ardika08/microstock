# Plan: AdobeStock AutoFill — Monetisasi SaaS + Dashboard

**Dibuat:** 2026-07-07  
**Status:** Draft  
**Domain:** autofillstock.my.id

---

## 🎯 Goal

Mengubah Chrome extension AdobeStock AutoFill menjadi produk SaaS yang bisa dimonetisasi dengan:
- Landing page profesional
- Sistem autentikasi (Google OAuth)
- Dashboard user (kredit, history, billing, settings)
- 3 model pricing (kredit, langganan, one-time)
- Payment via Mayar
- Notifikasi WhatsApp otomatis
- Activation code otomatis di dashboard

---

## 📦 Produk & Pricing

| Paket | Harga | Kredit | API Key | Keterangan |
|---|---|---|---|---|
| **Free Trial** | Gratis | 20 kredit | Sendiri | Otomatis saat signup |
| **Kredit** | Rp 50.000 | 500 kredit | Sendiri | Top up kapanpun, 1 kredit = 1 generate |
| **Starter** | Rp 99.000/bulan | 1.000 kredit/bln | Disediakan | Harga promo, akan naik bertahap |
| **One-time** | Rp 249.000 | Unlimited | Sendiri | Bayar sekali, pakai API key sendiri |

---

## 🏗️ Arsitektur

```
[Chrome Extension]
      ↓
[autofillstock.my.id] — Next.js (existing backend + new pages)
      ├── Landing Page         /
      ├── Auth (Google OAuth)  /auth/*
      ├── Dashboard            /dashboard/*
      └── API Routes
            ├── /api/activate         (existing)
            ├── /api/auth/*           (NextAuth.js)
            ├── /api/user/*           (profile, kredit, history)
            ├── /api/payment/*        (Mayar webhook)
            ├── /api/openai-proxy     (proxy AI untuk subscriber)
            └── /api/notify           (WhatsApp via Starsender/WA gateway)
      ↓
[Database] SQLite → upgrade ke PostgreSQL (Neon/Supabase)
      ├── users
      ├── activation_codes
      ├── subscriptions
      ├── credit_transactions
      ├── generate_history
      └── payments
```

---

## 📋 Stack Tambahan

| Layer | Teknologi |
|---|---|
| Auth | NextAuth.js v5 + Google OAuth |
| Database | PostgreSQL (Neon — free tier) + Drizzle ORM |
| Payment | Mayar API + webhook |
| Email | Resend (transactional email) |
| WhatsApp | Starsender API (existing di memory) |
| UI Dashboard | shadcn/ui + Tailwind (existing) |
| Charts | Recharts |

---

## 🗂️ Fase Implementasi

### **FASE 1 — Fondasi (Database + Auth)**
> Target: User bisa login dengan Google

- [ ] **1.1** Migrasi database SQLite → PostgreSQL (Neon)
  - File: `server/db/index.ts`, `server/db/schema.ts`
  - Tambah tabel: `users`, `subscriptions`, `credit_transactions`, `generate_history`, `payments`
  - Schema lengkap di bawah

- [ ] **1.2** Setup NextAuth.js v5
  - File baru: `pages/api/auth/[...nextauth].ts`
  - Provider: Google OAuth
  - Callback: simpan user ke DB saat pertama login
  - Session strategy: JWT

- [ ] **1.3** Setup environment variables baru
  - `DATABASE_URL` — Neon PostgreSQL connection string
  - `NEXTAUTH_SECRET` — random string
  - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
  - `MAYAR_API_KEY` / `MAYAR_WEBHOOK_SECRET`
  - `RESEND_API_KEY`
  - `STARSENDER_DEVICE_ID` / `STARSENDER_API_KEY`

---

### **FASE 2 — Dashboard UI**
> Target: User login → lihat dashboard

**Struktur halaman:**
```
/dashboard                → redirect ke /dashboard/usage
/dashboard/usage          → Usage stats + grafik
/dashboard/history        → History generate
/dashboard/billing        → Paket aktif + riwayat bayar
/dashboard/settings       → Pengaturan akun
```

**Sidebar items:**
- Dashboard (icon: LayoutDashboard)
- History (icon: History)
- Usage (icon: BarChart3)
- Billing (icon: CreditCard)
- Settings (icon: Settings)
- Avatar + nama di bottom → klik → popup detail + logout

**Layout:**
```
┌─────────────────────────────────────────┐
│  [Logo]  AdobeStock AutoFill            │  ← Header/Topbar
├──────────┬──────────────────────────────┤
│          │                              │
│ Sidebar  │  Content Area               │
│          │                              │
│ Dashboard│                              │
│ History  │                              │
│ Usage    │                              │
│ Billing  │                              │
│ Settings │                              │
│          │                              │
│ [Avatar] │                              │
└──────────┴──────────────────────────────┘
```

**Dashboard/Usage — Cards:**
```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Total       │ │ Kredit      │ │ Periode     │ │ Rata-rata   │
│ Generate    │ │ Tersisa     │ │ Aktif       │ │ Harian      │
│ 1.234       │ │ 847 kredit  │ │ Pro Annual  │ │ 12/hari     │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘

[Grafik penggunaan — tab: Hari | Minggu | Bulan]
[Aktivitas terbaru — list 10 generate terakhir]
```

**Activation Code — di Usage/Dashboard:**
```
┌──────────────────────────────────────────────┐
│ Activation Code Kamu                         │
│ ┌─────────────────────────────┐ [Copy] [?]  │
│ │ ASAF-XXXXXX-XXXXXX          │             │
│ └─────────────────────────────┘             │
│ Status: ✅ Aktif | Tipe: Pro Annual         │
└──────────────────────────────────────────────┘
```

- [ ] **2.1** Layout dashboard + sidebar component
  - File baru: `pages/dashboard/index.tsx`
  - File baru: `components/dashboard/Sidebar.tsx`
  - File baru: `components/dashboard/TopBar.tsx`
  - File baru: `components/dashboard/AvatarMenu.tsx`

- [ ] **2.2** Usage page
  - File baru: `pages/dashboard/usage.tsx`
  - File baru: `components/dashboard/StatsCards.tsx`
  - File baru: `components/dashboard/UsageChart.tsx` (Recharts)
  - File baru: `components/dashboard/RecentActivity.tsx`
  - File baru: `components/dashboard/ActivationCodeCard.tsx`
  - API: `GET /api/user/stats`

- [ ] **2.3** History page
  - File baru: `pages/dashboard/history.tsx`
  - Tabel: tanggal, platform, filename, title preview, kredit dipakai
  - Pagination + filter by platform/date
  - API: `GET /api/user/history?page=1&limit=20`

- [ ] **2.4** Billing page
  - File baru: `pages/dashboard/billing.tsx`
  - Section: Paket aktif + tanggal renewal
  - Section: Pilihan upgrade/downgrade
  - Section: Top up kredit (untuk semua paket)
  - Section: Riwayat pembayaran (tabel)
  - API: `GET /api/user/billing`

- [ ] **2.5** Settings page
  - File baru: `pages/dashboard/settings.tsx`
  - Form: nama display, avatar upload
  - Section: Danger zone (hapus akun)

---

### **FASE 3 — Payment System (Mayar)**
> Target: User bisa bayar dan kredit/paket aktif otomatis

- [ ] **3.1** Integrasi Mayar API
  - File baru: `lib/mayar.ts` — wrapper Mayar API
  - Create payment link untuk setiap produk
  - File baru: `pages/api/payment/create.ts`

- [ ] **3.2** Webhook handler Mayar
  - File baru: `pages/api/payment/webhook.ts`
  - Verifikasi signature webhook
  - Handle event: `payment.success`
  - Logic berdasarkan produk:
    - Kredit 500 → tambah 500 kredit ke user
    - Langganan bulanan → set subscription + 1500 kredit
    - Langganan tahunan → set subscription + 1500 kredit/bulan
    - One-time → set lifetime flag + generate activation code khusus

- [ ] **3.3** Cron job reset kredit bulanan
  - Setiap tanggal 1, reset kredit subscriber ke 1500
  - File: cronjob atau `scripts/reset-monthly-credits.ts`

---

### **FASE 4 — Notifikasi WhatsApp**
> Target: User dapat WA setelah transaksi + reminder kredit habis

- [ ] **4.1** WhatsApp notification service
  - File baru: `lib/whatsapp.ts`
  - Pakai Starsender API (device_id=58)
  - Template pesan:

  **Setelah bayar:**
  ```
  ✅ Pembayaran berhasil!
  
  Halo {nama},
  Paket {nama_paket} sudah aktif.
  Kredit kamu: {jumlah} kredit
  
  Activation code kamu:
  {activation_code}
  
  Dashboard: https://autofillstock.my.id/dashboard
  ```

  **Kredit hampir habis (< 50 kredit):**
  ```
  ⚠️ Kredit hampir habis!
  
  Sisa kredit kamu: {jumlah} kredit
  Top up sekarang: https://autofillstock.my.id/dashboard/billing
  ```

  **Langganan hampir expired (3 hari sebelum):**
  ```
  🔔 Langganan hampir berakhir!
  
  Paket {nama_paket} akan berakhir pada {tanggal}.
  Perpanjang: https://autofillstock.my.id/dashboard/billing
  ```

- [ ] **4.2** Trigger notifikasi dari webhook payment
- [ ] **4.3** Cron job cek kredit hampir habis (daily)
- [ ] **4.4** Cron job cek subscription hampir expired (daily)

---

### **FASE 5 — OpenAI Proxy untuk Subscriber**
> Target: Subscriber tidak perlu input API key sendiri

- [ ] **5.1** API proxy route
  - File baru: `pages/api/openai-proxy.ts`
  - Validasi session user + cek kredit tersedia
  - Deduct 1 kredit per request
  - Forward ke OpenAI, return response
  - Simpan ke generate_history

- [ ] **5.2** Update Chrome extension
  - Detect apakah user pakai subscription (check `/api/user/me`)
  - Kalau subscriber → pakai proxy, bukan direct OpenAI
  - Kalau one-time/kredit habis → pakai API key sendiri
  - File: `lib/openai.ts`, `lib/storage.ts`

---

### **FASE 6 — Landing Page**
> Target: Halaman marketing profesional

**Struktur halaman:**
```
/ (landing)
├── Hero Section          — headline + CTA + screenshot extension
├── How It Works          — 3 langkah simple (install, aktivasi, generate)
├── Features              — grid fitur utama
├── Pricing               — 3 kartu paket + toggle bulanan/tahunan
├── Testimonial           — (opsional, isi manual nanti)
├── FAQ                   — accordion
└── Footer                — link, copyright
```

**Komponen:**
- [ ] `components/landing/Hero.tsx`
- [ ] `components/landing/HowItWorks.tsx`
- [ ] `components/landing/Features.tsx`
- [ ] `components/landing/Pricing.tsx` — dengan toggle bulanan/tahunan
- [ ] `components/landing/FAQ.tsx`
- [ ] `components/landing/Footer.tsx`
- [ ] `pages/index.tsx` — assembly semua section

---

## 🗄️ Database Schema (PostgreSQL)

```sql
-- Users
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  name        TEXT,
  avatar_url  TEXT,
  phone       TEXT,                    -- untuk WA notifikasi
  plan_type   TEXT DEFAULT 'free'      -- 'free','credit','monthly','annual','lifetime'
  credits     INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Activation Codes (update existing)
CREATE TABLE activation_codes (
  code        TEXT PRIMARY KEY,
  user_id     UUID REFERENCES users(id),
  status      TEXT DEFAULT 'ACTIVE',   -- ACTIVE, USED, REVOKED
  plan_type   TEXT,                    -- paket yang di-generate untuk kode ini
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ
);

-- Subscriptions
CREATE TABLE subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id),
  plan_type       TEXT NOT NULL,        -- 'monthly','annual'
  status          TEXT DEFAULT 'active',-- active, cancelled, expired
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  mayar_order_id  TEXT
);

-- Credit Transactions
CREATE TABLE credit_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  amount      INTEGER NOT NULL,        -- positif = tambah, negatif = pakai
  type        TEXT,                    -- 'topup','monthly_reset','usage','bonus'
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Generate History
CREATE TABLE generate_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  platform    TEXT,                    -- 'adobe_stock','shutterstock'
  filename    TEXT,
  title       TEXT,
  credits_used INTEGER DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id),
  mayar_order_id  TEXT UNIQUE,
  product_type    TEXT,               -- 'credit_500','monthly','annual','lifetime'
  amount          INTEGER,            -- dalam rupiah
  status          TEXT,               -- pending, success, failed
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔔 Mayar API — Produk yang Dibuat

| Produk | Harga | Keterangan |
|---|---|---|
| `credit_500` | Rp 50.000 | Top up 500 kredit |
| `plan_monthly` | TBD | Langganan bulanan |
| `plan_annual` | TBD | Langganan tahunan |
| `plan_lifetime` | Rp 249.000 | One-time lifetime |

---

## ⚠️ Risiko & Catatan

| Risiko | Mitigation |
|---|---|
| Migrasi SQLite → PostgreSQL | Jalankan migrasi data existing activation_codes |
| Kredit deduct race condition | Gunakan DB transaction untuk deduct kredit |
| Mayar webhook replay | Simpan mayar_order_id, cek idempotency |
| OpenAI proxy cost | Monitor usage, set limit per user per hari |
| Nomor WA user wajib isi | Phone optional di signup, remind di dashboard |

---

## 📌 Open Questions (perlu input Ardika)

1. **Harga langganan bulanan & tahunan** — berapa Rp?
2. **Trial / freemium?** — Ada free tier atau langsung bayar?
3. **Nomor WA** — User input nomor saat signup atau di settings?
4. **Mayar account** — Sudah punya akun Mayar? Perlu API key
5. **Google OAuth** — Perlu Google Cloud project + Client ID/Secret
6. **Neon DB** — Perlu buat akun Neon (free tier cukup untuk awal)
7. **Logo/brand asset** — Ada logo untuk landing page?
8. **Konten landing page** — Mau copywriting bahasa Indonesia atau Inggris?

---

## 🚀 Urutan Eksekusi yang Disarankan

```
Fase 1 (Database + Auth) → paling kritis, semua fase lain depend di sini
     ↓
Fase 2 (Dashboard UI) → user bisa lihat kredit & copy activation code
     ↓
Fase 3 (Payment) → monetisasi aktif
     ↓
Fase 4 (WA Notifikasi) → engagement & retention
     ↓
Fase 5 (OpenAI Proxy) → subscriber tidak perlu API key sendiri
     ↓
Fase 6 (Landing Page) → marketing & akuisisi
```

---

*Plan ini akan diupdate setelah jawaban Open Questions diterima.*

# AdobeStock AutoFill

Chrome extension untuk generate dan auto-fill metadata (title, description, keywords, category) di Adobe Stock Contributor dan Shutterstock menggunakan OpenAI GPT-4o-mini.

## Tech Stack

| Layer | Teknologi |
|---|---|
| Extension | Plasmo + React 18 + TypeScript |
| UI | shadcn/ui + Tailwind CSS |
| Backend | Next.js 15 (activation server) |
| Database | SQLite via better-sqlite3 + Drizzle ORM |
| AI | OpenAI API (gpt-4o-mini) |

## Prerequisites

- Node.js 18+
- npm
- OpenAI API key (`sk-...`)

## Setup

### 1. Clone dan install dependencies

```bash
git clone https://github.com/ardika08/microstock.git
cd microstock
npm install
```

### 2. Konfigurasi environment

```bash
cp .env.example .env
```

Edit `.env` dan isi:

```env
# URL backend activation server (production)
PLASMO_PUBLIC_ACTIVATION_API_URL=https://your-server.com/api/activate

# Path SQLite database
ACTIVATION_DB_PATH=./data/activation.sqlite

# CORS origin — chrome-extension://<extension-id>
ACTIVATION_ALLOWED_ORIGIN=chrome-extension://REPLACE_WITH_YOUR_EXTENSION_ID
```

> **Penting:** Jangan biarkan `PLASMO_PUBLIC_ACTIVATION_API_URL` bernilai `localhost` saat build production. Nilai ini di-bake ke dalam bundle extension saat build.

## Development

### Jalankan extension (hot-reload)

```bash
npm run dev
```

Buka `chrome://extensions` → Enable Developer mode → Load Unpacked → pilih folder `build/chrome-mv3-dev`.

### Jalankan activation backend

```bash
npm run backend:dev
```

Backend berjalan di `http://localhost:3000`.

## Build Production

### 1. Build extension

```bash
npm run build
```

### 2. Package untuk Chrome Web Store

```bash
npm run package
```

Output: `build/chrome-mv3-prod.zip`

### 3. Build backend

```bash
npm run backend:build
npm run backend:start
```

## Buat Activation Code

```bash
npm run activation:create
```

Script interaktif untuk seed activation code ke SQLite database.

## Extension ID

Setelah install extension di Chrome:
1. Buka `chrome://extensions`
2. Enable Developer mode
3. Copy Extension ID
4. Update `ACTIVATION_ALLOWED_ORIGIN` di `.env` server

## Scripts

| Script | Deskripsi |
|---|---|
| `npm run dev` | Extension development (hot-reload) |
| `npm run build` | Build extension production |
| `npm run package` | Package zip untuk Chrome Web Store |
| `npm run backend:dev` | Activation server development |
| `npm run backend:build` | Build activation server |
| `npm run backend:start` | Start activation server production |
| `npm run activation:create` | Buat activation code baru |
| `npm run typecheck` | TypeScript type checking |

## Platform yang Didukung

| Platform | Status |
|---|---|
| Adobe Stock Contributor | ✅ Aktif |
| Shutterstock | ✅ Aktif |
| Vecteezy | 🔜 Coming soon |
| Pond5 | 🔜 Coming soon |
| Getty Images | 🔜 Coming soon |

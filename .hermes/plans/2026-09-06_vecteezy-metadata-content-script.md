# Plan: Content Script Vecteezy — Autofillstock

**Tanggal:** 2026-09-06
**Status:** Approved (user: "ok proses")
**Referensi:** Automeda `content/vecteezy.js` (audited) + pola existing `contents/shutterstock.ts`
**Aturan:** Adobe Stock flow & popup utama TIDAK diubah (hanya tambah section Vecteezy)

---

## Ringkasan Fitur

Content script baru untuk `contributors.vecteezy.com` — generate metadata AI
(Title + Keywords + optional Description untuk Bundle) langsung dari halaman
portfolio editor Vecteezy, mengikuti pola Automeda:

- **1 tombol inline** "✦ Generate AI" di halaman (tidak ada Run Batch terpisah
  di halaman — scan semua resource unfilled otomatis)
- **API-driven enumeration** — resource unfilled diambil dari API Vecteezy
  sendiri (`/api/v1/resources`), bukan DOM scan (grid virtualized)
- **Checkbox "Auto mark AI-generated"** di popup — muncul otomatis saat tab
  aktif = Vecteezy; tersimpan di `chrome.storage` sebagai `vz_ai_generated`,
  dibaca content script sebagai `vzAiGenerated`
- Anti-duplikasi via `recentTitles` (berisi TITLE, bukan description — beda
  dari Shutterstock karena yang diisi Title + Keywords)
- Prohibited-terms sanitasi (keyword & title) sesuai aturan Vecteezy
- Save eksplisit per resource via `save-changes-icon` (tidak ada autosave)

---

## Fase 1 — Skeleton content script + helpers

**File:** `contents/vecteezy.ts` (baru)

Tugas:
- [ ] `export const config` dengan matches: `https://contributors.vecteezy.com/*`
- [ ] Settings cache (`vzEnabled`, `vzAiGenerated`, `showToast`, `debugMode`) + `chrome.storage.onChanged` listener
- [ ] Helper umum: `wait`, `waitForElement`, `msg` (dengan timeout 40s), `showToast`
- [ ] Auth helper: `getVecteezyAuthToken()` (baca cookie `eezy-cm-auth-token`), `vzFetchHeaders()` (Bearer token)
- [ ] `fillMUI(selector, value)` — native value setter + input/change + **focusout** (React onBlur)
- [ ] `dispatchKey` + `commitSingleKeyword` + `fillKeywordsOneAtATime` — tag input: satu kata → keydown `,` (fallback Enter) → polling input kosong
- [ ] `dispatchFullClick` — pointerover→mousedown→…→click (MUI buka di mousedown)
- [ ] Guard `window.__AUTOFILLSTOCK_VZ__` (anti double-inject)
- [ ] Inline button injection: anchor `[data-testid="grid-size-toggles"]`, id `afs-vz-autofill-btn`, debounce MutationObserver, hormati `vzEnabled=false`

**Verifikasi:** build sukses, tombol muncul di halaman Vecteezy, tidak crash saat klik (belum ada aksi).

---

## Fase 2 — Resource enumeration + selection + save

Tambahan di `contents/vecteezy.ts`:

- [ ] `fetchUnfilledResources()` — loop `/api/v1/resources?state[]=started&sort_field=created_at&sort_dir=desc&page=N&per_page=25` dengan `credentials: 'include'` + Bearer header; filter `!item.title`; stop saat halaman kurang dari penuh
- [ ] `getResourceFilename(resource)` — `source_file?.filename || filename || '(unknown file)'`
- [ ] `findCardForResource(resource)` — match `data-id` exact, fallback substring filename di card textContent; warn saat match > 1
- [ ] `selectResource(resource)` — scrollIntoView center → re-query card → click → verifikasi panel `[data-testid="file-input-filename"]` match filename (poll 3s) → retry 1x dengan re-query
- [ ] `clickSaveChanges(resource)` — cari `[data-testid="save-changes-icon"]` scoped per card, fallback document-wide; return false + toast warn jika tidak ketemu
- [ ] `verifyFieldValue(selector, expected)` — re-read 3x delay 300ms

**Verifikasi:** log resource ter-enumerate match dengan resource unfilled di halaman; klik card membuka panel yang benar.

---

## Fase 3 — Sanitasi prohibited terms + kategori khusus

Tambahan di `contents/vecteezy.ts`:

- [ ] `FALLBACK_PROHIBITED_TERMS` (photo, video, vector, png, psd, ai generated, dll)
- [ ] `getProhibitedTerms()` — fetch `/api/v1/prohibited_terms` (same-origin + Bearer), cache, fallback ke list statis
- [ ] `sanitizeKeyword(kw)` — `-.()` → spasi, collapse whitespace (Vecteezy menolak karakter spesial di keyword)
- [ ] `filterKeywords(keywords, terms)` — buang banned HANYA jika non-banned ≥ 5 (minimum situs), cap 50 keyword, return flag `warned`
- [ ] `filterTitle(title, terms)` — buang banned HANYA jika sisa ≥ 3 kata, return flag `warned`

**Verifikasi:** unit-test manual dengan keyword ber-dash/titik; pastikan minimum 5 keyword & 3 kata title tidak pernah dilanggar.

---

## Fase 4 — API prompt `vecteezy` di server

**File:** `pages/api/extension/generate.ts` (edit — tidak merusak Shutterstock/Adobe)

Tugas:
- [ ] `platformHint` baru: `platform?.includes('vecteezy')` → `'Vecteezy'`
- [ ] `generateOpenAIPrompt` handle `isVecteezy`:
  - JSON format: `{"title":"...","description":"...","keywords":[...]}` — **tanpa category/category2/file_type** (kategori di Vecteezy manual)
  - Title requirement: **min 3 kata** (aturan situs), 5–15 kata, hindari awalan A/An/The (reuse rule anti-"A" yang sudah ada)
  - Keywords: 25–45 (aman di atas minimum 5, di bawah cap 50), semua lolos sanitasi (tanpa `-.()`), larang kata generik prohibited (photo/vector/ai generated/dll)
- [ ] CORS: tambah origin `vecteezy.com` ke allowed origins (content script kita akses API langsung, sama seperti Shutterstock)
- [ ] `imageUrl` server-side fetch: sudah didukung (reuse path yang sama dengan Shutterstock)
- [ ] Response `data`: `{ title, description, keywords: string[] }`

**Verifikasi:** curl request manual dengan `platform: 'vecteezy'` → JSON valid, title ≥ 3 kata, tanpa "A" prefix, keywords ter-sanitasi.

---

## Fase 5 — Process resource + AI-generated checkbox + batch runner

Tambahan di `contents/vecteezy.ts`:

- [ ] `getCurrentCategoryTitle()` — baca `[data-testid="category-input"] input`
- [ ] `isBundleCategory(title)` — 'bundle'/'bundles'
- [ ] `findDescriptionField()` — cari heading teks "description" (h6/label/span) → textarea/input di container terdekat (selector tidak pasti, degradasi rapi)
- [ ] `getSelectedLicense()` / `setLicenseFreeIfUnset()` — radio `input[name=":ra:"]`, default Free hanya jika kosong
- [ ] `applyAiGeneratedFlag()` — baca `vzAiGenerated`:
  - checkbox `input[type="checkbox"][value="ai_generated"]` di `[data-testid="ai-generated-section"]`
  - Jika ON & belum checked: click → tunggu dropdown `[role="button"][aria-haspopup="listbox"]` → pilih prioritas `midjourney` → `stable_diffusion` → `dall_e` → `other` (match `data-value`, bukan teks)
  - **VERIFIKASI WAJIB:** trigger text berubah sesuai label tool; jika gagal → REVERT checkbox (jangan setengah jalan) + toast error
- [ ] `processResource(resource)` — urutan:
  1. `selectResource` → fail jika panel tidak match
  2. Skip editorial (license = editorial)
  3. Skip jika `#title-input` tidak ada (kategori tak didukung)
  4. `msg({ cmd:'generate', platform:'vecteezy', filename, imageUrl: resource.preview_url, recentTitles: recentTitles.slice(-15) })` → background → API
  5. Sanitasi: filterTitle + sanitizeKeyword + filterKeywords
  6. **Side effects dulu:** setLicenseFreeIfUnset + applyAiGeneratedFlag (bisa re-render panel)
  7. `fillMUI('#title-input', safeTitle)` → verify
  8. Keywords one-at-a-time `[data-testid="tagger-input"] input` → hitung committed vs intended
  9. Jika Bundle: isi description → verify (non-fatal)
  10. `recentTitles.push(safeTitle)` max 15
  11. `clickSaveChanges` → warn jika gagal
  12. Return status success/failed + flag warned
- [ ] `runAutoFillMode()` — guard `running`, loop resources, akuntansi success/fail/skip/warned, `GENERATE_DELAY_MS = 800` antar item (skip delay untuk reason tanpa network), quota error (`not_logged_in`, `daily_limit_reached`, `out_of_credits`) → stop batch + summary sisa item, toast rekap akhir
- [ ] Message listener `triggerRunBatch` (dari popup) + `GET_RUN_STATUS` (ping dari popup)

**Verifikasi:** batch jalan end-to-end di halaman real: select → generate → fill title/keywords → save icon → lanjut resource berikutnya.

---

## Fase 6 — Popup: section Vecteezy + checkbox AI-generated

**File:** `popup.tsx` (edit — tambah saja, tidak mengubah Adobe/Shutterstock section)

Tugas:
- [ ] `PLATFORMS` tambah `{ id: 'vecteezy', label: 'Vecteezy', url: 'https://contributors.vecteezy.com/portfolio' }`
- [ ] `detectPlatform` tambah `isVecteezy: host.includes('contributors.vecteezy.com')`
- [ ] `activePlatformLabel` → 'Vecteezy' untuk `isVecteezy`
- [ ] `isOnStockPage` → `isStock || isVecteezy` (kontrol popup aktif di Vecteezy)
- [ ] Ping `GET_RUN_STATUS` diperluas ke tab Vecteezy
- [ ] **Section khusus Vecteezy** (hanya render saat `platform.isVecteezy`):
  - Checkbox **"Auto mark AI-generated"** — toggle ON/OFF, tersimpan ke `chrome.storage.local` sebagai `vz_ai_generated`
  - Run Batch button → kirim `triggerRunBatch` ke content script
  - Status run (reuse pola `isRunning`/`GET_RUN_STATUS` yang ada)
- [ ] Style konsisten: dark #0c0b10, purple gradient, rounded, soft glow

**Verifikasi:** buka popup di tab Vecteezy → section muncul + checkbox; buka di tab Adobe/Shutterstock → TIDAK muncul (perilaku lama utuh).

---

## Fase 7 — Build, package, push, deploy notes

- [ ] `npm run build && npm run package`
- [ ] Copy ZIP ke `public/downloads/autofillstock-extension.zip`
- [ ] Commit + push (manifest content script Vecteezy otomatis dari Plasmo config)
- [ ] Verifikasi manifest hasil build: content script `vecteezy.js` → `contributors.vecteezy.com`, host_permissions include `https://contributors.vecteezy.com/*`
- [ ] Redeploy Coolify (API prompt Vecteezy + CORS origin)
- [ ] Update memori: pola Vecteezy (API-driven scan, tag input, save icon, AI-generated checkbox + revert safety)

---

## Risiko & Catatan

1. **Panel re-render** — radio/checkbox bisa menghapus isian; solusi: side effects SEBELUM fill fields (urutan di Fase 5 sudah begitu)
2. **AI-generated checkbox** — wajib dropdown tool terisi; kalau gagal → revert. Jangan pernah setengah jalan
3. **Keywords final** — tidak bisa diedit setelah submit → verifikasi panel filename sebelum menulis apa pun
4. **Grid virtualized** — jangan DOM-scan; enumerasi hanya via API
5. **Banned keyword filtering** — jaga minimum 5 keyword & 3 kata title agar tidak di bawah minimum situs
6. **Editorial & Video/Motion** — skip rapi (format/DOM tidak didukung v1)
7. **Adobe Stock & popup utama tidak tersentuh** — hanya tambahan section Vecteezy di popup

## Urutan eksekusi
Fase 1 → 2 → 3 (satu file content script) → Fase 4 (API) → Fase 5 → Fase 6 (popup) → Fase 7 (build/push).
Setiap fase selesai → laporan singkat → lanjut otomatis ke fase berikutnya kecuali ada halangan.

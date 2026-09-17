# Autofillstock Extension Popup & Batch Reliability — Revised Plan

> **For Hermes:** Implement task-by-task only after Ardika approves this revised plan.

**Goal:** Mendesain popup extension Autofillstock mengikuti struktur referensi dengan style Autofillstock, menghapus total panel on-page di Adobe Stock/Shutterstock, dan memperbaiki batch Adobe agar seluruh asset diproses satu kali tanpa metadata generik.

**Architecture:** Popup menjadi satu-satunya UI extension yang dikendalikan user. Content script tetap berjalan tanpa merender panel/sidebar/toolbar apa pun di halaman stock platform. Tombol popup mengirim command ke content script untuk single generate atau batch. Batch memakai identity asset stabil, bukan index DOM semata.

**Tech Stack:** Plasmo, React, TypeScript, Chrome storage/tabs messaging, existing Next.js API.

---

## Keputusan Final dari Ardika

### 1. Tidak ada on-page panel sama sekali

- Hapus/disable seluruh floating panel, toolbar, status footer, dan style layout-shift dari `contents/adobe-autofill.ts`.
- Tidak ada UI Autofillstock yang menempel di halaman Adobe Stock maupun Shutterstock.
- `panel_enabled` tidak lagi menjadi toggle UI. Untuk backward compatibility, setting lama boleh dibaca tetapi tidak dipakai untuk merender panel.
- Popup extension menjadi pusat kontrol satu-satunya.

### 2. Popup mengikuti struktur referensi kompetitor, tetapi brand Autofillstock tetap

Urutan UI popup:

1. Account header: nama, email, status plan.
2. Status platform aktif.
3. Kartu aksi `▶ Run Batch` + `Auto Mode`.
4. Daily usage / credit bar.
5. Open Platform grid.
6. Upgrade card.
7. Footer actions: `History`, `Settings`, `Logout`.

Warna:

- Background: dark navy Autofillstock.
- Primary: cyan/teal atau purple brand Autofillstock.
- Batch/secondary: maroon gelap sesuai referensi.
- Status sukses: green.
- Warning/usage: amber/red hanya jika benar-benar mencapai batas.

### 3. Platform yang ditampilkan

Hanya dua platform aktif:

- Adobe Stock — enabled.
- Shutterstock — enabled.

Platform lain jangan ditampilkan dulu agar popup tidak terlihat seperti mendukung platform yang belum siap.

### 4. Navigation actions

- `History` → buka `https://autofillstock.my.id/dashboard/history`.
- `Settings` → buka `https://autofillstock.my.id/dashboard/settings`.
- `Upgrade` → buka `https://autofillstock.my.id/dashboard/billing`.
- Gunakan `chrome.tabs.create` atau `chrome.tabs.update`, lalu verifikasi handler pada Chrome.

### 5. Usage bar

- Tampilkan format `kredit tersisa / total kredit`, contoh `5 / 100`.
- Sumber utama harus data aktual dari endpoint/dashboard atau data yang tersedia pada activation response.
- Jangan memakai `usage_count` sebagai kredit tersisa.
- Jangan menampilkan total fiktif seperti `5/5 today` bila backend belum menyediakan limit harian.
- Untuk `lifetime`, tampilkan `∞ Unlimited`.
- Jika data total tidak tersedia, tampilkan `—` dan jangan membuat angka palsu.

---

## Fase 1 — Baseline dan Message Contract

### Task 1: Audit command existing

**Files:** `popup.tsx`, `contents/adobe-autofill.ts`, `lib/types.ts`, `lib/storage.ts`

- Identifikasi message type existing: sync panel dan autofill metadata.
- Tentukan contract baru minimal:
  - `RUN_SINGLE_GENERATE`
  - `RUN_BATCH_GENERATE`
  - `STOP_GENERATE`
- Pertahankan message lama hanya bila diperlukan untuk migrasi, tetapi jangan membuat panel lama muncul.

### Task 2: Tetapkan sumber data plan/kredit

**Files:** `lib/types.ts`, `lib/activation.ts`, popup/API terkait bila diperlukan

- Bedakan `planType`, `credits`, `creditsUsed`, `totalCredits` secara eksplisit.
- Jangan mengarang total kredit dari `usage_count`.
- Untuk plan lifetime, gunakan unlimited state.
- Jika activation endpoint belum mengembalikan info kredit, tentukan endpoint read-only yang aman atau tampilkan fallback `—`.

**Acceptance:** popup tidak menampilkan klaim limit yang tidak didukung data.

---

## Fase 2 — Hapus UI On-Page

### Task 3: Stop rendering floating panel

**Files:** `contents/adobe-autofill.ts`

- `syncFloatingPanel()` tidak lagi memanggil `createFloatingPanel()`.
- Hapus atau jadikan no-op `createFloatingPanel`, `removeFloatingPanel`, dan observer yang hanya bertujuan menjaga panel.
- Jangan inject `PANEL_HOST_ID`, Shadow DOM panel, CSS layout shift, toolbar, atau footer status ke halaman.
- Content script hanya memasang command listener dan menjalankan operasi.

### Task 4: Hapus efek layout

**Files:** `contents/adobe-autofill.ts`

- Pastikan tidak ada `asaf-panel-active`, `--asaf-panel-width`, `--asaf-content-shift`, fixed overlay, atau host element yang tersisa.
- `panel_enabled` tidak boleh dipakai untuk menghapus/menampilkan UI karena UI on-page sudah ditiadakan.

**Acceptance:** setelah extension reload dan halaman refresh, DOM Adobe/Shutterstock tidak memiliki element Autofillstock on-page.

---

## Fase 3 — Popup Redesign

### Task 5: Redesign popup layout

**Files:** `popup.tsx`, `style.css`

- Buat layout control center compact sekitar lebar popup 400px.
- Header akun memakai data storage/session yang tersedia, bukan hardcode email member.
- Badge plan mengikuti `FREE`, `INTRO`, `BASIC`, `VALUE`, `LIFETIME`.
- Status platform aktif mengikuti tab aktif.
- Hanya render Adobe Stock dan Shutterstock pada Open Platform.

### Task 6: Implement action card

**Files:** `popup.tsx`, `contents/adobe-autofill.ts`, `lib/types.ts`

- `Run Batch` mengirim `RUN_BATCH_GENERATE` ke active tab.
- `Auto Mode` disimpan di Chrome storage dan punya behavior jelas.
- `Stop` mengirim `STOP_GENERATE` dan hanya tampil/aktif ketika batch berjalan, jika memungkinkan.
- Jika active tab bukan Adobe/Shutterstock, action disabled dengan pesan jelas.
- Jika content script belum tersambung, tampilkan instruksi refresh halaman, bukan error generik.

### Task 7: Implement navigation cards

**Files:** `popup.tsx`

- History membuka `/dashboard/history`.
- Settings membuka `/dashboard/settings`.
- Upgrade membuka `/dashboard/billing`.
- Pastikan URL tidak dibuka di iframe dan tidak memerlukan API key.

### Task 8: Implement credit bar

**Files:** `popup.tsx`, `lib/storage.ts`, endpoint bila memang diperlukan

- Format utama: `creditsRemaining / totalCredits`.
- Hitung persentase hanya bila keduanya angka valid.
- `lifetime` → `∞ Unlimited`.
- Unknown → `Kredit: —`.
- Jangan menyebut `today` kecuali ada data reset harian dari server.

**Acceptance:** contoh user dengan 5 dari 100 menampilkan `5 / 100`, bukan `5/5 today`.

---

## Fase 4 — Adobe Batch Reliability

### Task 9: Stable asset identity

**Files:** `contents/adobe-autofill.ts`

- Buat identity dari filename/asset ID/thumbnail source.
- Snapshot queue sebelum batch.
- Deduplicate queue berdasarkan identity.
- Setelah rerender, cari ulang target berdasarkan identity.

### Task 10: Target verification sebelum AI call

**Files:** `contents/adobe-autofill.ts`

- Klik target card.
- Tunggu form siap.
- Baca kembali filename/asset identity dari form.
- Jika identity tidak cocok, retry terbatas lalu tandai failed.
- Jangan mengirim thumbnail card lama atau selected card sebelumnya.

### Task 11: Image-only guard

**Files:** `contents/adobe-autofill.ts`, `lib/openai.ts`, `pages/api/generate.ts`

- Thumbnail target wajib berhasil dibaca sebelum generate.
- Hapus fallback text-only yang menghasilkan deskripsi generik.
- Error asset harus terlihat di hasil batch.
- Prompt melarang template seperti `A close-up` kecuali visual benar-benar mendukung.

### Task 12: Accurate batch accounting

**Files:** `contents/adobe-autofill.ts`

- Track `pending`, `processing`, `success`, `failed`, `stopped`.
- Jangan menghitung error sebagai success.
- Tampilkan ringkasan `N berhasil, M gagal` di popup.
- Batch 5 asset harus berakhir pada 5 status terminal.

---

## Fase 5 — Build, QA, dan Delivery

### Task 13: Build checks

```bash
cd /home/ubuntu/projects/autofillstock
npm run typecheck
npm run build
npm run package
```

Catatan: `npm run build` adalah gate utama untuk Plasmo; build Next.js juga harus dipastikan bila backend/dashboard berubah.

### Task 14: Verify no on-page UI

- Search bundle/source untuk `PANEL_HOST_ID`, `asaf-panel-active`, `createFloatingPanel`, dan fixed toolbar behavior.
- Install build unpacked pada Chrome.
- Reload Adobe Stock dan Shutterstock.
- Pastikan tidak ada panel, toolbar, status footer, atau layout shift.

### Task 15: Manual acceptance test

- [ ] Popup menampilkan hanya Adobe Stock dan Shutterstock.
- [ ] Popup tidak memiliki toggle Auto Panel/Panel on-off.
- [ ] Tidak ada UI Autofillstock di halaman Adobe Stock.
- [ ] Tidak ada UI Autofillstock di halaman Shutterstock.
- [ ] Run Batch dari popup menjalankan batch di active tab.
- [ ] Stop menghentikan batch.
- [ ] History membuka `/dashboard/history`.
- [ ] Settings membuka `/dashboard/settings`.
- [ ] Upgrade membuka `/dashboard/billing`.
- [ ] Credit bar menampilkan `remaining / total` bila data tersedia.
- [ ] Lifetime menampilkan unlimited.
- [ ] Adobe single generate tetap bekerja.
- [ ] Adobe batch 5 asset memproses 5 identity berbeda.
- [ ] Tidak ada deskripsi generik karena gambar gagal dibaca.
- [ ] Error asset tidak tersembunyi.

### Task 16: Package and deploy

- Update `public/downloads/autofillstock-extension.zip` dengan build terbaru.
- Commit source + ZIP secara terkontrol.
- Push ke GitHub.
- Redeploy Coolify jika dashboard ZIP berubah.
- Download ulang ZIP dan reinstall extension.

---

## Risiko dan Trade-off

1. Tanpa panel on-page, user tidak melihat preview metadata di halaman stock platform; kompensasinya popup menampilkan status/progress ringkas.
2. Run Batch dari popup membutuhkan content script aktif pada tab; refresh halaman diperlukan setelah install/update extension.
3. Credit total harus berasal dari data server yang valid. Jika belum tersedia, `—` lebih jujur daripada angka fiktif.
4. DOM Adobe Stock dapat berubah; stable identity + verification mengurangi risiko tetapi perlu maintenance selector.
5. Struktur interaksi mengikuti referensi, tetapi warna/branding tetap Autofillstock agar tidak menyalin identitas kompetitor.

## Definition of Done

Popup menjadi satu-satunya UI extension, tanpa panel on-page atau toggle panel. Popup hanya menampilkan Adobe Stock dan Shutterstock, navigation actions bekerja, usage bar memakai format kredit tersisa/total yang valid, dan batch Adobe memproses semua asset dengan identity verification. Build/package sukses dan ZIP terbaru tersedia melalui dashboard.
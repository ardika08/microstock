# Shutterstock Toolbar Autofill Implementation Plan

> **For Hermes:** Implement task-by-task only after Ardika approves this plan.

**Goal:** Mengubah workflow Shutterstock dari panel/sidebar menjadi toolbar ringan dengan tombol `Generate AI` dan `Run Batch`, tanpa mengubah workflow Adobe Stock.

**Architecture:** Tetap memakai satu content script `contents/adobe-autofill.ts`, tetapi UI dan alur Shutterstock dipisahkan dari Adobe Stock berdasarkan hostname/page detection. Shutterstock memakai toolbar fixed/native-style, sedangkan Adobe tetap memakai panel yang sekarang. Endpoint backend `/api/extension/generate` tetap digunakan.

**Tech Stack:** Plasmo, TypeScript, Chrome Content Script, DOM events, React/Next.js API endpoint.

---

## Kondisi Saat Ini dan Asumsi

- File Shutterstock saat ini berada di `contents/adobe-autofill.ts`, bukan file terpisah.
- Extension sudah match `https://submit.shutterstock.com/*`.
- Logic Shutterstock sudah memiliki selector title, description, keyword input, category MUI, deteksi asset card, dan autofill.
- Screenshot kompetitor menunjukkan dua aksi utama di area atas: Generate AI dan Run Batch.
- Selector Shutterstock dapat berubah sewaktu-waktu; implementasi wajib menyediakan fallback selector dan logging yang tidak membocorkan API key atau data sensitif.
- Fase pertama hanya mengubah UX dan reliability Shutterstock; jangan menghapus workflow Adobe.

## Keputusan Desain

### Direkomendasikan: toolbar, bukan sidebar

- Toolbar muncul hanya pada halaman Shutterstock yang terdeteksi valid.
- Tombol `Generate AI` memproses asset aktif/terpilih.
- Tombol `Run Batch` memproses asset Shutterstock yang terlihat dan eligible.
- Progress/error/success memakai compact toast atau status text, bukan panel besar.
- Tombol harus memiliki namespace ID/class Autofillstock agar tidak konflik dengan DOM Shutterstock.

### Trade-off

- **Pro:** tidak menutup metadata, lebih mirip pola kerja native Shutterstock, batch lebih jelas.
- **Kontra:** lebih sedikit ruang untuk preview/edit hasil AI; selector dan perubahan DOM Shutterstock tetap menjadi risiko.
- **Mitigasi:** hasil tetap diisi ke field Shutterstock dan user tetap harus meninjau lalu Save/Submit; tambahkan status ringkas dan retry.

---

## Fase 1 — Discovery dan Baseline (read-only)

### Task 1: Petakan alur event yang sudah ada

**Files:** `contents/adobe-autofill.ts`

- Identifikasi fungsi panel creation, event listener, `autofill`, `readPageBrief`, generate single asset, batch processing, dan settings toggle.
- Catat fungsi yang reusable dan fungsi yang hanya untuk Adobe.
- Pastikan tidak ada duplikasi toolbar yang dibuat oleh MutationObserver/navigation hook.

**Verifikasi:** buat daftar call graph singkat sebelum mengedit. Jangan commit perubahan code pada task discovery.

### Task 2: Ambil baseline selector Shutterstock

- Gunakan halaman Shutterstock yang benar-benar terbuka dan upload record seperti screenshot.
- Catat selector aktual untuk title, description, category, keyword input, asset card, selected asset, dan tombol/header target.
- Simpan selector sebagai fallback yang jelas di `SHUTTERSTOCK_SELECTORS`; jangan bergantung hanya pada placeholder exact.

**Verifikasi:** pada DevTools console, setiap selector wajib mengembalikan element yang visible pada halaman target.

---

## Fase 2 — Toolbar Shutterstock

### Task 3: Tambahkan model state toolbar

**Files:** `contents/adobe-autofill.ts`

- Tambahkan ID constants untuk host/style/status.
- State minimal: `isGenerating`, `isBatchRunning`, `processed`, `total`, `lastError`.
- Pastikan satu toolbar saja per halaman dan state dibersihkan ketika route/page berubah.

**Test:** helper unit-style/pure checks bila test harness tersedia; minimal jalankan TypeScript build.

### Task 4: Implement toolbar ringan

**Files:** `contents/adobe-autofill.ts`

- Buat `createShutterstockToolbar()` yang hanya aktif ketika `isShutterstockUploadPage()` true.
- Tambahkan tombol:
  - `✨ Generate AI`
  - `▶ Run Batch`
- Gunakan DOM API, scoped style, high z-index yang wajar, dan tidak menggeser konten utama.
- Tambahkan disabled/loading state untuk mencegah double click.
- Pastikan toolbar tidak masuk ke hasil query asset card/field.

**Verifikasi manual:** toolbar terlihat di halaman Shutterstock, tidak terlihat di Adobe, dan tidak muncul dua kali setelah SPA navigation/reload.

### Task 5: Pisahkan visibility panel Adobe vs toolbar Shutterstock

**Files:** `contents/adobe-autofill.ts`

- `shouldShowPanel()` hanya mengontrol Adobe Stock.
- Shutterstock tidak lagi menampilkan panel besar sebagai requirement utama.
- `panel_enabled` tetap dihormati untuk Adobe; untuk Shutterstock gunakan toolbar yang bisa dikontrol settings secara eksplisit atau dokumentasikan behavior-nya.
- Cleanup wajib menghapus toolbar dan style saat meninggalkan halaman Shutterstock.

**Verifikasi:** Adobe tetap menampilkan panel lama; Shutterstock hanya menampilkan toolbar.

---

## Fase 3 — Single Generate Shutterstock

### Task 6: Perbaiki resolusi asset aktif

**Files:** `contents/adobe-autofill.ts`

- Prioritaskan asset card yang dipilih secara eksplisit.
- Jika halaman detail terbuka, gunakan filename/detail record yang sedang aktif.
- Jangan fallback diam-diam ke asset pertama jika ada beberapa asset; tampilkan error yang menjelaskan user perlu memilih asset.
- Pastikan image/base64 atau brief yang dikirim ke endpoint benar-benar milik asset aktif.

**Verifikasi:** pada halaman multi-asset, generate tidak boleh mengisi record yang salah.

### Task 7: Hubungkan tombol Generate AI

**Files:** `contents/adobe-autofill.ts`, `lib/openai.ts`

- Klik `Generate AI` menjalankan alur generate yang sudah ada.
- Kirim `platform: "shutterstock"`, filename, brief/image, dan activation code sesuai alur existing.
- Setelah response berhasil, panggil autofill Shutterstock saja.
- Tampilkan status sukses/gagal di toolbar; jangan menampilkan API key atau payload sensitif.

**Verifikasi:** title, description, category, dan keyword chips terisi pada satu asset; error selector ditampilkan secara actionable.

---

## Fase 4 — Reliability Field Filling

### Task 8: Perkuat title/description selector dan React events

**Files:** `contents/adobe-autofill.ts`

- Gunakan selector fallback berbasis `name`, `aria-label`, `placeholder`, dan struktur field, bukan exact placeholder saja.
- Pertahankan native setter + input/change/blur events.
- Setelah set value, baca balik value dan pastikan sama atau tampilkan warning.

### Task 9: Implement keyword chips yang kompatibel

**Files:** `contents/adobe-autofill.ts`

- Jangan hanya men-set semua keyword lalu dispatch satu comma.
- Deteksi apakah Shutterstock memakai input token/chip.
- Masukkan keyword secara bertahap dengan event input + comma/Enter sesuai DOM aktual.
- Hindari duplikasi keyword yang sudah ada.
- Verifikasi jumlah chip setelah pengisian; target sesuai limit Shutterstock, bukan sekadar string input.

**Verifikasi:** 45–50 keyword muncul sebagai chip individual dan dapat dibaca ulang oleh UI Shutterstock.

### Task 10: Perkuat category MUI select

**Files:** `contents/adobe-autofill.ts`

- Buka dropdown dengan click/pointer sequence.
- Cari option berdasarkan role/text aktual, bukan hanya class MUI.
- Klik option dan baca kembali category terpilih.
- Jika gagal, jangan menganggap field berhasil; tampilkan field-level error.

**Verifikasi:** `Category 1` berubah ke nilai valid dan tetap setelah dropdown ditutup.

---

## Fase 5 — Run Batch

### Task 11: Definisikan eligibility batch

**Files:** `contents/adobe-autofill.ts`

- Ambil asset cards visible/eligible dengan selector aktual.
- Exclude submitted/rejected atau record tanpa field yang bisa diedit.
- Tambahkan confirmation ringan berisi jumlah asset sebelum batch dimulai.
- Jangan memproses asset yang sama dua kali dalam satu run.

### Task 12: Implement batch queue dan progress

**Files:** `contents/adobe-autofill.ts`

- Proses satu per satu dengan delay yang menghormati rate limit.
- Update toolbar: `0/N`, `1/N`, dan error per asset.
- Setelah mengisi satu asset, tunggu state Shutterstock stabil sebelum pindah ke asset berikutnya.
- Support cancel/stop agar user dapat menghentikan batch.
- Di akhir tampilkan jumlah sukses/gagal dan instruksi review + Save/Submit.

**Verifikasi:** batch 2–3 asset pada test account; tidak ada overlap request, salah target, atau toolbar freeze.

---

## Fase 6 — Build, QA, dan Deploy

### Task 13: Tambahkan logging debug yang aman

**Files:** `contents/adobe-autofill.ts`

- Logging hanya untuk selector hit/miss, asset filename yang tidak sensitif jika aman, field success, dan error category.
- Jangan log activation code, API key, base64 image, atau full OpenAI response.
- Jika perlu, aktifkan debug melalui setting lokal, default off.

### Task 14: Jalankan quality gates

**Commands:**

```bash
cd /home/ubuntu/projects/autofillstock
npm install
npm run typecheck
node ~/.hermes/hermes-agent/node_modules/typescript/bin/tsc --noEmit --skipLibCheck --project tsconfig.server.json
```

Expected: tidak ada syntax/type error baru.

Tambahkan pemeriksaan artifact edit sebelum push:

```bash
grep -rnE ': \\*\\*\\*|\\w\\.\\.\\.\\w' pages server contents | grep -v node_modules
for f in $(find pages server contents -name '*.ts' -o -name '*.tsx'); do
  c=$(grep -o '`' "$f" | wc -l)
  [ $((c % 2)) -ne 0 ] && echo "ODD BACKTICKS: $f"
done
```

### Task 15: QA manual di Shutterstock

Checklist acceptance:

- [ ] Toolbar hanya muncul di halaman Shutterstock yang valid.
- [ ] Tidak ada sidebar/panel besar Shutterstock.
- [ ] `Generate AI` hanya mengisi asset aktif.
- [ ] Title dan description terbaca oleh UI setelah React events.
- [ ] Keyword tampil sebagai chip individual, bukan satu string mentah.
- [ ] Category 1 terpilih dan terbaca kembali.
- [ ] `Run Batch` memproses N asset sesuai urutan dan menampilkan progress.
- [ ] Cancel batch bekerja.
- [ ] Error satu asset tidak menghentikan seluruh batch tanpa status.
- [ ] Adobe Stock workflow tidak berubah.
- [ ] Save/Submit tetap dilakukan manual oleh user.

### Task 16: Commit, push, dan deploy

- Commit per fase dengan pesan yang jelas.
- Push ke `main` hanya setelah quality gates lulus.
- Trigger/review Coolify hanya bila perubahan backend ikut dibuat; content script biasanya membutuhkan build/release extension sesuai workflow Plasmo.
- Setelah deploy, install/update extension build terbaru di Chrome dan ulangi QA manual.

---

## Risiko dan Keputusan yang Masih Terbuka

1. **DOM Shutterstock berubah:** selector fallback dan smoke test manual wajib dipelihara.
2. **Image source:** perlu dipastikan apakah asset aktif dapat diakses sebagai URL/base64 oleh content script; jangan mengirim screenshot metadata page sebagai pengganti gambar asset.
3. **Video/vector:** endpoint saat ini memakai `image_url`; batch untuk video/vector mungkin hanya melihat thumbnail/preview dan harus diberi label keterbatasan.
4. **Keyword limit:** screenshot menunjukkan 45/50, sementara prompt backend pernah meminta 45–49. Final limit harus mengikuti validasi platform aktual.
5. **Panel setting:** perlu diputuskan apakah `panel_enabled=false` juga menyembunyikan toolbar Shutterstock. Rekomendasi: ya, satu setting global untuk mengaktifkan/nonaktifkan extension UI.
6. **Auto Save/Submit:** tidak termasuk fase ini. User tetap melakukan review dan klik Save/Submit manual untuk mencegah submit metadata yang salah.

## Definition of Done

Fitur selesai jika toolbar Shutterstock berfungsi untuk single generate dan batch pada halaman target nyata, semua field terisi dan terbaca oleh Shutterstock, tidak mengganggu Adobe Stock, quality gates lulus, dan build extension terbaru sudah diuji manual.
# Shutterstock Metadata Generation — Adopsi Pola Automeda

> **For Hermes:** Implement task-by-task. Jangan ubah kode Adobe Stock di `contents/adobe-autofill.ts` — itu sudah perfect 100%.

**Goal:** Implementasi generate metadata Shutterstock yang mengikuti pola Automeda: inline button di halaman, MUI dropdown handling yang benar, keyword one-by-one fill, card selection verification, retry, anti-duplikasi, dan batch mode yang reliable.

**Architecture:** Buat content script TERPISAH `contents/shutterstock.ts` khusus untuk Shutterstock. Hapus semua logic Shutterstock dari `contents/adobe-autofill.ts` agar kode Adobe Stock tetap bersih dan tidak terkena. Popup tetap tidak diubah — inline button di halaman Shutterstock jadi pusat kontrol untuk generate, popup tetap untuk auth/status/credits.

**Tech Stack:** Plasmo content script, TypeScript, Chrome Extension MV3, MUI component interaction patterns.

---

## Konteks Saat Ini

### Masalah Shutterstock di Autofillstock saat ini:
1. **Keyword fill salah cara** — pakai `setNativeValue` + comma event (bulk), bukan one-by-one + Enter. MUI Autocomplete tidak ter-trigger.
2. **Category dropdown kurang robust** — `openShutterstockCategoryMenu` pakai `elementFromPoint` + `dispatchPointerMouseSequence`, tidak poll listbox yang baru muncul.
3. **Tidak ada category2** — Shutterstock punya 2 kategori, Autofillstock hanya isi 1.
4. **Tidak ada image type** — Shutterstock punya dropdown Photo/Illustration.
5. **Tidak ada EN/ID translation** — kalau akun user bahasa Indonesia, label dropdown berbeda.
6. **Card selection tidak diverifikasi** — tidak poll `aria-checked="true"`.
7. **Tidak ada retry** — kalau API gagal, langsung error.
8. **Tidak ada anti-duplikasi** — title bisa berulang di batch.
9. **Tidak ada inline button** — user harus buka popup untuk generate.

### Yang sudah baik (dari audit kompetitor):
- Image extraction sudah pakai fetch+blob+FileReader (commit `85f7bb2`)
- Anti-generic-phrase prompt sudah ada
- Stable asset identity untuk batch
- Content script headless untuk Adobe

---

## Task Breakdown

### Task 1: Buat file `contents/shutterstock.ts` — skeleton + constants

**Objective:** Buat content script baru khusus Shutterstock dengan constants yang dibutuhkan.

**Files:**
- Create: `contents/shutterstock.ts`

**Step 1: Buat file dengan constants**

```typescript
// ─── Autofillstock · content/shutterstock.ts ──────────────────────────
export const config = {
  matches: [
    "https://submit.shutterstock.com/*",
    "https://contributor-accounts.shutterstock.com/*",
  ],
};

// ── Constants ────────────────────────────────────────────────────────────

const VALID_CATEGORIES = [
  'Abstract', 'Animals/Wildlife', 'Arts', 'Backgrounds/Textures',
  'Beauty/Fashion', 'Buildings/Landmarks', 'Business/Finance', 'Celebrities',
  'Education', 'Food and drink', 'Healthcare/Medical', 'Holidays',
  'Industrial', 'Interiors', 'Miscellaneous', 'Nature', 'Objects',
  'Parks/Outdoor', 'People', 'Religion', 'Science', 'Signs/Symbols',
  'Sports/Recreation', 'Technology', 'Transportation', 'Vintage',
];

const CATEGORY_ID_TRANSLATIONS: Record<string, string> = {
  'Abstract': 'Abstrak',
  'Animals/Wildlife': 'Hewan/Satwa Liar',
  'Arts': 'Seni',
  'Backgrounds/Textures': 'Latar Belakang/Tekstur',
  'Beauty/Fashion': 'Kecantikan/Mode',
  'Buildings/Landmarks': 'Gedung/Bangunan Terkenal',
  'Business/Finance': 'Bisnis/Keuangan',
  'Celebrities': 'Artis',
  'Education': 'Edukasi',
  'Food and drink': 'Makanan dan minuman',
  'Healthcare/Medical': 'Kesehatan/Medis',
  'Holidays': 'Liburan',
  'Industrial': 'Industri',
  'Interiors': 'Interior',
  'Miscellaneous': 'Bermacam-macam',
  'Nature': 'Alam',
  'Objects': 'Objek',
  'Parks/Outdoor': 'Taman/Luar Ruang',
  'People': 'Orang',
  'Religion': 'Agama',
  'Science': 'Sains',
  'Signs/Symbols': 'Tanda/Simbol',
  'Sports/Recreation': 'Olahraga/Rekreasi',
  'Technology': 'Teknologi',
  'Transportation': 'Transportasi',
  'Vintage': 'Vintage',
};

const IMAGE_TYPE_ID: Record<string, string> = {
  photo: 'Foto',
  illustration: 'Ilustrasi',
};

const FREE_LIMIT = 5;
const MSG_TIMEOUT_MS = 40000;
const API_TIMEOUT_MS = 35000;
const RATE_LIMIT_RETRY_MS = 8000;
const PERMANENT_ERRORS = ['not_logged_in', 'daily_limit_reached', 'out_of_credits'];

let isGenerating = false;
let batchRunning = false;
let batchCards: HTMLElement[] = [];
let batchIndex = 0;
let batchFailCount = 0;
let batchSkipCount = 0;
let batchRecentTitles: string[] = [];
let activeThumbUrl: string | null = null;
```

**Step 2: Verifikasi build**

```bash
npm run build
```
Expected: sukses, file baru ter-detect oleh Plasmo.

**Step 3: Commit**

```bash
git add contents/shutterstock.ts
git commit -m "feat(shutterstock): add dedicated content script skeleton"
```

---

### Task 2: Helper functions — `wait`, `waitForElement`, `msg`, `debugLog`

**Objective:** Implementasi utility functions yang dipakai di seluruh script.

**Files:**
- Modify: `contents/shutterstock.ts`

```typescript
// ── Helpers ───────────────────────────────────────────────────────────────

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForElement<T>(
  getEl: () => T | null,
  { timeout = 2000, interval = 100 } = {}
): Promise<T | null> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const el = getEl();
    if (el) return el;
    await wait(interval);
  }
  return null;
}

// Message to popup/background with timeout backstop
function msg(payload: any): Promise<any> {
  return new Promise((r) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      console.warn(`[Autofillstock SS] msg() TIMED OUT after ${MSG_TIMEOUT_MS}ms for '${payload?.cmd || payload?.type}'`);
      r({ ok: false, error: 'request_timeout' });
    }, MSG_TIMEOUT_MS);
    chrome.runtime.sendMessage(payload, (res) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      r(res || {});
    });
  });
}

function debugLog(...args: any[]) {
  console.log('[Autofillstock SS]', ...args);
}

function getFilename(): string {
  return document.querySelector('h1, h2, h3, [class*="filename"]')?.textContent?.trim() || '';
}

function getFieldValue(name: string): string {
  return (document.querySelector(`[name="${name}"]`) as HTMLInputElement)?.value?.trim() || '';
}
```

**Commit:**

```bash
git add contents/shutterstock.ts
git commit -m "feat(shutterstock): add helper functions"
```

---

### Task 3: Thumbnail capture + card selection

**Objective:** Ambil thumbnail URL dari card Shutterstock yang aktif. Pola Automeda: click tracker + `aria-checked` polling.

**Files:**
- Modify: `contents/shutterstock.ts`

```typescript
// ── Thumbnail capture ─────────────────────────────────────────────────────

function onCardClick(e: Event) {
  const card = e.currentTarget as HTMLElement;
  const img = card.querySelector('img.MuiCardMedia-img')
    || card.querySelector('img[class*="MuiCardMedia"]')
    || card.querySelector('img[src*="shutterstock"]');
  if (img?.src) activeThumbUrl = img.src;
}

function attachCardListeners() {
  document.querySelectorAll('[data-testid="asset-card"]').forEach((card) => {
    card.removeEventListener('click', onCardClick);
    card.addEventListener('click', onCardClick);
  });
}

function getActiveThumbSrc(): string | null {
  // Priority 1: card marked selected by Shutterstock
  const selectedCard = document.querySelector('[data-testid="asset-card"][aria-checked="true"]');
  if (selectedCard) {
    const img = selectedCard.querySelector('img.MuiCardMedia-img')
      || selectedCard.querySelector('img[class*="MuiCardMedia"]')
      || selectedCard.querySelector('img[src*="shutterstock"]');
    if (img?.src) return img.src;
  }
  // Fallback: click tracker
  return activeThumbUrl || null;
}

async function waitForCardToBecomeActive(
  card: HTMLElement,
  { timeout = 2000, interval = 100 } = {}
): Promise<boolean> {
  if (!card) return false;
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (card.isConnected && card.getAttribute('aria-checked') === 'true') return true;
    await wait(interval);
  }
  return false;
}

// Watch for new cards (pagination/scroll)
function watchCards() {
  const grid = document.querySelector('[data-testid="asset-grid-not-submitted"]')
    || document.querySelector('[data-testid*="grid"]');
  if (!grid) { setTimeout(watchCards, 800); return; }
  new MutationObserver(() => setTimeout(attachCardListeners, 300))
    .observe(grid, { childList: true, subtree: true });
  setTimeout(attachCardListeners, 800);
}
```

**Commit:**

```bash
git add contents/shutterstock.ts
git commit -m "feat(shutterstock): add thumbnail capture + card selection"
```

---

### Task 4: Image extraction — fetch blob → FileReader → base64

**Objective:** Ambil thumbnail sebagai binary blob, konversi ke base64 dengan FileReader (pola yang sudah terbukti di Adobe Stock fix).

**Files:**
- Modify: `contents/shutterstock.ts`

```typescript
// ── Image extraction ──────────────────────────────────────────────────────

async function extractThumbnailBase64(imageUrl: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const response = await fetch(imageUrl, { signal: controller.signal });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (blob.size === 0) return null;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
```

**Commit:**

```bash
git add contents/shutterstock.ts
git commit -m "feat(shutterstock): add fetch+blob+FileReader image extraction"
```

---

### Task 5: API call + retry logic

**Objective:** Kirim request ke API Autofillstock dengan retry 3x, rate-limit aware, permanent error skip.

**Files:**
- Modify: `contents/shutterstock.ts`

```typescript
// ── API call + retry ──────────────────────────────────────────────────────

async function fetchMetadata(
  base64Image: string,
  filename: string,
  existingTitle: string,
  recentTitles: string[]
): Promise<any> {
  const settings = await chrome.storage.local.get(['activation_code', 'selected_microstock']);
  const response = await fetch('https://autofillstock.my.id/api/extension/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      activationCode: settings.activation_code,
      assetBrief: base64Image,
      filename,
      platform: 'shutterstock',
    }),
  });
  const data = await response.json();
  if (!response.ok || data.error) {
    return { ok: false, error: data.error || 'api_error' };
  }
  return { ok: true, data: data.metadata, usage: { credits: data.creditsRemaining } };
}

function isRateLimitError(result: any): boolean {
  return typeof result?.error === 'string' && /too many|rate limit/i.test(result.error);
}

async function fetchMetadataWithRetry(
  base64Image: string,
  filename: string,
  existingTitle: string,
  recentTitles: string[]
): Promise<any> {
  let result = await fetchMetadata(base64Image, filename, existingTitle, recentTitles);
  let attempts = 1;
  while (!result?.ok && !PERMANENT_ERRORS.includes(result?.error) && attempts < 3) {
    const rateLimited = isRateLimitError(result);
    debugLog(`fetchMetadataWithRetry attempt ${attempts} FAILED — waiting ${rateLimited ? RATE_LIMIT_RETRY_MS : 800}ms`);
    await wait(rateLimited ? RATE_LIMIT_RETRY_MS : 800);
    result = await fetchMetadata(base64Image, filename, existingTitle, recentTitles);
    attempts++;
  }
  return result;
}
```

**Commit:**

```bash
git add contents/shutterstock.ts
git commit -m "feat(shutterstock): add API call + retry logic"
```

---

### Task 6: MUI Dropdown selection — `selectMUIDropdown`

**Objective:** Implementasi MUI Select dropdown handler yang robust: full pointer events, listbox polling, option matching EN/ID.

**Files:**
- Modify: `contents/shutterstock.ts`

```typescript
// ── MUI Dropdown Selection ────────────────────────────────────────────────

function categoryVariants(catEn: string): string[] {
  return [catEn, CATEGORY_ID_TRANSLATIONS[catEn]].filter(Boolean);
}

async function selectMUIDropdown(fieldName: string, targetValue: string | string[]): Promise<void> {
  const targets = (Array.isArray(targetValue) ? targetValue : [targetValue])
    .filter(Boolean).map((t) => t.toLowerCase());
  if (!targets.length) return;

  const trigger =
    document.querySelector(`[aria-labelledby="mui-component-select-${fieldName}"]`) ||
    document.querySelector(`[data-testid="${fieldName}"] [role="button"]`);
  if (!trigger) return;

  // Skip jika disabled
  if (trigger.getAttribute('aria-disabled') === 'true') {
    debugLog(`selectMUIDropdown(${fieldName}) — trigger is disabled`);
    return;
  }

  // Skip jika sudah terisi
  const hiddenInput = document.querySelector(`input[name="${fieldName}"]`) as HTMLInputElement;
  if (hiddenInput?.value && targets.includes(hiddenInput.value.toLowerCase())) return;

  // Snapshot listbox yang sudah ada
  const preExistingListboxes = new Set(document.querySelectorAll('[role="listbox"]'));

  // Full pointer event chain (MUI butuh ini)
  const opts = { bubbles: true, cancelable: true, view: window };
  for (const evName of ['mousedown', 'mouseup', 'click']) {
    trigger.dispatchEvent(new MouseEvent(evName, opts));
  }

  // Poll untuk listbox baru
  const findMyListbox = () => {
    const controlsId = trigger.getAttribute('aria-controls');
    if (controlsId) {
      const byId = document.getElementById(controlsId);
      if (byId) return byId;
    }
    const freshListbox = Array.from(document.querySelectorAll('[role="listbox"]'))
      .find((el) => !preExistingListboxes.has(el));
    return freshListbox || null;
  };
  const listbox = await waitForElement(findMyListbox, { timeout: 1500, interval: 80 });
  if (!listbox) {
    debugLog(`selectMUIDropdown(${fieldName}) — no listbox appeared`);
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return;
  }

  // Poll untuk options terisi (category2 load setelah category1)
  const populatedListbox = await waitForElement(
    () => (listbox.querySelectorAll('[role="option"]').length > 0 ? listbox : null),
    { timeout: 2000, interval: 100 }
  );
  const options = populatedListbox ? populatedListbox.querySelectorAll('[role="option"]') : [];

  let clicked = false;
  for (const opt of Array.from(options)) {
    const optText = opt.textContent?.trim().toLowerCase() || '';
    const isMatch = targets.some(
      (t) => optText === t || optText.includes(t) || t.includes(optText)
    );
    if (isMatch) {
      opt.dispatchEvent(new MouseEvent('mousedown', opts));
      opt.dispatchEvent(new MouseEvent('mouseup', opts));
      opt.dispatchEvent(new MouseEvent('click', opts));
      clicked = true;
      await wait(200);
      break;
    }
  }

  if (!clicked) {
    debugLog(`selectMUIDropdown(${fieldName}) — no option matched [${targets.join(', ')}] among ${options.length} options`);
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    await wait(150);
  }
}
```

**Commit:**

```bash
git add contents/shutterstock.ts
git commit -m "feat(shutterstock): add MUI dropdown selection with EN/ID support"
```

---

### Task 7: Keyword fill — MUI Autocomplete one-by-one + Enter

**Objective:** Implementasi keyword fill yang benar untuk MUI Autocomplete: clear existing, de-dupe, type one-by-one + Enter.

**Files:**
- Modify: `contents/shutterstock.ts`

```typescript
// ── Keyword fill (MUI Autocomplete) ────────────────────────────────────────

function countAddedKeywordChips(): number {
  const block = document.querySelector('[data-testid="keywords-block-all"]');
  if (!block) return 0;
  return block.querySelectorAll('.MuiChip-root, [class*="Chip-root"]').length;
}

async function clearExistingKeywordChips(input: HTMLInputElement): Promise<void> {
  const before = countAddedKeywordChips();
  if (before === 0) return;
  for (let i = 0; i < 60; i++) {
    const remaining = countAddedKeywordChips();
    if (remaining === 0) break;
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', keyCode: 8, bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Backspace', keyCode: 8, bubbles: true }));
    await wait(30);
    if (countAddedKeywordChips() === remaining) break;
  }
}

async function fillKeywordsMUI(keywordsStr: string): Promise<void> {
  if (!keywordsStr) return;
  const input =
    document.querySelector('[data-testid="keyword-input"] input') as HTMLInputElement ||
    document.querySelector('input[placeholder*="comma or semicolon" i]') as HTMLInputElement ||
    document.querySelector('input[placeholder*="keyword" i]') as HTMLInputElement;
  if (!input) return;

  await clearExistingKeywordChips(input);

  // De-dupe (case-insensitive)
  const seen = new Set<string>();
  const tags = keywordsStr.split(',').map((t) => t.trim()).filter((t) => {
    if (!t) return false;
    const key = t.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;

  for (const tag of tags) {
    input.focus();
    nativeSetter?.call(input, tag);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await wait(15);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, bubbles: true }));
    await wait(40);
  }
}
```

**Commit:**

```bash
git add contents/shutterstock.ts
git commit -m "feat(shutterstock): add MUI keyword fill one-by-one + Enter"
```

---

### Task 8: Description fill (React/MUI textarea) + form state detection

**Objective:** Fill description dengan nativeSetter + focusout (commit autosave). Deteksi form state untuk skip jika sudah terisi.

**Files:**
- Modify: `contents/shutterstock.ts`

```typescript
// ── Description fill + form state ──────────────────────────────────────────

function fillMUI(selector: string, value: string): void {
  const el = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
  if (!el || !value) return;
  const proto = el.tagName === 'INPUT' ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
  const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  el.focus();
  nativeSetter?.call(el, value);
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.blur();
  // focusout = bubbling blur, triggers React onBlur → Shutterstock autosave commit
  el.dispatchEvent(new Event('focusout', { bubbles: true }));
}

function getFormFieldState() {
  const description = getFieldValue('description');
  const category1 = getFieldValue('category1');
  const category2 = getFieldValue('category2');
  const imageType = getFieldValue('imageType');
  const keywordCount = countAddedKeywordChips();
  return {
    description,
    category1,
    category2,
    imageType,
    keywordCount,
    allEmpty: !description && !category1 && !keywordCount,
  };
}
```

**Commit:**

```bash
git add contents/shutterstock.ts
git commit -m "feat(shutterstock): add MUI description fill + form state detection"
```

---

### Task 9: Apply metadata to form — skip if already filled

**Objective:** Apply semua field (description, category1, category2, imageType, keywords) dengan skip-if-filled logic.

**Files:**
- Modify: `contents/shutterstock.ts`

```typescript
// ── Apply metadata ──────────────────────────────────────────────────────────

function matchCategory(aiCategory: string): string | null {
  if (!aiCategory) return null;
  return VALID_CATEGORIES.find(
    (c) =>
      c.toLowerCase() === aiCategory.toLowerCase() ||
      aiCategory.toLowerCase().includes(c.toLowerCase()) ||
      c.toLowerCase().includes(aiCategory.toLowerCase())
  ) || null;
}

async function applyMetadataToForm(data: any): Promise<void> {
  const { description, keywords, category, category2, file_type } = data;
  const state = getFormFieldState();

  // 1. Description — skip if already filled
  if (description && !state.description) {
    fillMUI('textarea[name="description"]', description);
    await wait(200);
  }

  // 2. Category 1
  if (category && !state.category1) {
    const matched = matchCategory(category);
    if (matched) {
      await selectMUIDropdown('category1', categoryVariants(matched));
      // Tunggu category2 enable
      await waitForElement(() => {
        const cat2Trigger = document.querySelector(
          '[aria-labelledby="mui-component-select-category2"]'
        );
        return cat2Trigger?.getAttribute('aria-disabled') !== 'true' ? cat2Trigger : null;
      }, { timeout: 2000, interval: 100 });
    } else {
      debugLog(`No category match for AI output "${category}"`);
    }
  }

  // 3. Category 2 — pastikan beda dari category1
  if (category2 && !state.category2) {
    const matched2 = matchCategory(category2);
    if (matched2) {
      const cat1Value = (document.querySelector('input[name="category1"]') as HTMLInputElement)?.value || '';
      if (matched2.toLowerCase() !== cat1Value.toLowerCase()) {
        await selectMUIDropdown('category2', categoryVariants(matched2));
        await wait(200);
      }
    }
  }

  // 4. Image type — Photo atau Illustration
  if (file_type && !state.imageType) {
    const imgType = file_type.toLowerCase().includes('illust') ? 'illustration' : 'photo';
    await selectMUIDropdown('imageType', [imgType, IMAGE_TYPE_ID[imgType]]);
    await wait(200);
  }

  // 5. Keywords — skip if already has chips
  if (keywords && !state.keywordCount) {
    const kwStr = Array.isArray(keywords) ? keywords.join(', ') : keywords;
    await fillKeywordsMUI(kwStr);
    await wait(200);
  }
}
```

**Commit:**

```bash
git add contents/shutterstock.ts
git commit -m "feat(shutterstock): add applyMetadataToForm with skip-if-filled"
```

---

### Task 10: Inline button injection — Generate AI + Run Batch

**Objective:** Inject 2 button langsung di halaman Shutterstock (di atas form metadata). Bukan dari popup.

**Files:**
- Modify: `contents/shutterstock.ts`

```typescript
// ── Inline button injection ────────────────────────────────────────────────

function tryInject(): void {
  if (document.getElementById('asaf-ss-btn')) return;

  const anchor =
    document.querySelector('textarea[name="description"]') ||
    document.querySelector('input[placeholder*="keyword" i]') ||
    document.querySelector('input[placeholder*="comma or semicolon" i]');
  if (!anchor) return;

  const formContainer =
    anchor.closest('form') ||
    anchor.closest('[class*="SubmissionForm"]') ||
    anchor.closest('[class*="submission"]') ||
    anchor.parentElement?.parentElement?.parentElement;
  if (!formContainer) return;

  const wrap = document.createElement('div');
  wrap.id = 'asaf-ss-btn-wrap';
  wrap.style.cssText = `
    margin: 8px 0 12px 0;
    display: flex;
    gap: 8px;
    align-items: center;
    font-family: Inter, system-ui, sans-serif;
  `;

  // Generate AI button
  const genBtn = document.createElement('button');
  genBtn.id = 'asaf-ss-btn';
  genBtn.type = 'button';
  genBtn.style.cssText = `
    background: linear-gradient(135deg, #10b981, #06b6d4);
    color: #022c22;
    border: none;
    border-radius: 8px;
    padding: 8px 14px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s;
  `;
  genBtn.textContent = '✦ Generate AI';
  genBtn.addEventListener('click', () => handleGenerate());
  wrap.appendChild(genBtn);

  // Run Batch button
  const batchBtn = document.createElement('button');
  batchBtn.id = 'asaf-ss-batch-btn';
  batchBtn.type = 'button';
  batchBtn.style.cssText = `
    background: linear-gradient(135deg, #7f1d1d, #991b1b);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 8px 14px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s;
  `;
  batchBtn.textContent = '▶ Run Batch';
  batchBtn.addEventListener('click', () => {
    if (batchRunning) stopBatch();
    else startBatch();
  });
  wrap.appendChild(batchBtn);

  // Status text
  const status = document.createElement('span');
  status.id = 'asaf-ss-status';
  status.style.cssText = 'font-size: 11px; color: #94a3b8; margin-left: 4px;';
  wrap.appendChild(status);

  formContainer.insertBefore(wrap, formContainer.firstChild);
  attachCardListeners();
}
```

**Commit:**

```bash
git add contents/shutterstock.ts
git commit -m "feat(shutterstock): add inline Generate AI + Run Batch buttons"
```

---

### Task 11: Toast notification

**Objective:** Toast kecil untuk feedback user (success, error, info).

**Files:**
- Modify: `contents/shutterstock.ts`

```typescript
// ── Toast ──────────────────────────────────────────────────────────────────

function showToast(text: string, type: 'success' | 'error' | 'info' = 'success'): void {
  document.getElementById('asaf-toast')?.remove();
  const t = document.createElement('div');
  t.id = 'asaf-toast';
  const colors: Record<string, string> = {
    success: '#10b981',
    error: '#ef4444',
    info: '#3b82f6',
  };
  t.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; z-index: 2147483647;
    background: rgba(13, 17, 23, 0.95); color: ${colors[type] || '#fff'};
    border: 1px solid ${colors[type] || '#fff'}33; border-radius: 10px;
    padding: 10px 16px; font-size: 12px; font-weight: 600;
    font-family: Inter, system-ui, sans-serif;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3); max-width: 320px;
    opacity: 0; transition: opacity 0.3s;
  `;
  t.textContent = text; // never innerHTML
  document.body.appendChild(t);
  requestAnimationFrame(() => (t.style.opacity = '1'));
  setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 300);
  }, 4000);
}
```

**Commit:**

```bash
git add contents/shutterstock.ts
git commit -m "feat(shutterstock): add toast notification"
```

---

### Task 12: Single generate handler

**Objective:** Handler untuk tombol Generate AI (satuan). Extract thumbnail → API → apply metadata.

**Files:**
- Modify: `contents/shutterstock.ts`

```typescript
// ── Single generate ────────────────────────────────────────────────────────

async function handleGenerate(): Promise<void> {
  if (isGenerating) return;
  isGenerating = true;
  setBtnState('loading');

  try {
    const thumbUrl = getActiveThumbSrc();
    if (!thumbUrl) {
      showToast('Thumbnail tidak ditemukan. Klik aset dulu.', 'error');
      return;
    }

    const base64 = await extractThumbnailBase64(thumbUrl);
    if (!base64) {
      showToast('Gagal mengambil gambar. Coba lagi.', 'error');
      return;
    }

    const filename = getFilename();
    const existingTitle = getFieldValue('description');
    const result = await fetchMetadataWithRetry(base64, filename, existingTitle, []);

    if (!result.ok) {
      const errMap: Record<string, string> = {
        not_logged_in: 'Kode aktivasi tidak valid.',
        out_of_credits: 'Kredit habis. Top up di dashboard.',
      };
      showToast(errMap[result.error] || 'Error. Coba lagi.', 'error');
      return;
    }

    await applyMetadataToForm(result.data);
    showToast('✦ Metadata berhasil diisi!', 'success');
  } catch (err) {
    showToast('Error: ' + (err instanceof Error ? err.message : 'Unknown'), 'error');
  } finally {
    isGenerating = false;
    setBtnState('idle');
  }
}

function setBtnState(state: 'idle' | 'loading'): void {
  const btn = document.getElementById('asaf-ss-btn') as HTMLButtonElement;
  if (!btn) return;
  btn.disabled = state === 'loading';
  btn.style.opacity = state === 'loading' ? '0.5' : '1';
  btn.textContent = state === 'loading' ? 'Generating…' : '✦ Generate AI';
}
```

**Commit:**

```bash
git add contents/shutterstock.ts
git commit -m "feat(shutterstock): add single generate handler"
```

---

### Task 13: Batch mode — start, stop, runBatchStep

**Objective:** Batch processing: snapshot cards, loop, skip if filled, anti-duplikasi, error accounting.

**Files:**
- Modify: `contents/shutterstock.ts`

```typescript
// ── Batch mode ─────────────────────────────────────────────────────────────

function resolveCard(index: number): HTMLElement | null {
  const cached = batchCards[index];
  if (cached?.isConnected) return cached;
  const fresh = Array.from(document.querySelectorAll('[data-testid="asset-card"]'));
  if (fresh[index]) {
    batchCards[index] = fresh[index];
    return fresh[index];
  }
  return cached || null;
}

async function startBatch(): Promise<void> {
  if (batchRunning) return;
  batchCards = Array.from(document.querySelectorAll('[data-testid="asset-card"]'));
  if (batchCards.length === 0) {
    showToast('Tidak ada aset ditemukan.', 'error');
    return;
  }
  batchIndex = 0;
  batchFailCount = 0;
  batchSkipCount = 0;
  batchRecentTitles = [];
  batchRunning = true;
  const btn = document.getElementById('asaf-ss-batch-btn');
  if (btn) btn.textContent = '⏹ Stop';
  showToast(`Batch dimulai — ${batchCards.length} aset (isi yang kosong saja)`, 'info');
  await runBatchStep();
}

function stopBatch(): void {
  batchRunning = false;
  const btn = document.getElementById('asaf-ss-batch-btn');
  if (btn) btn.textContent = '▶ Run Batch';
  showToast('Batch dihentikan.', 'info');
}

async function runBatchStep(): Promise<void> {
  if (!batchRunning) return;

  if (batchIndex >= batchCards.length) {
    batchRunning = false;
    const btn = document.getElementById('asaf-ss-batch-btn');
    if (btn) btn.textContent = '▶ Run Batch';

    if (batchSkipCount > 0 && batchSkipCount === batchCards.length) {
      showToast(`⚠️ 0 aset diisi — semua ${batchSkipCount} sudah berisi.`, 'error');
      return;
    }
    const summary = batchFailCount > 0
      ? `${batchCards.length - batchFailCount - batchSkipCount} diisi, ${batchFailCount} gagal, ${batchSkipCount} sudah berisi`
      : batchSkipCount > 0
        ? `${batchCards.length - batchSkipCount} diisi, ${batchSkipCount} sudah berisi`
        : `${batchCards.length} aset`;
    showToast(`✦ Batch selesai! ${summary}`, batchFailCount > 0 ? 'error' : 'success');
    return;
  }

  try {
    const index = batchIndex;
    const card = resolveCard(index);
    if (!card) {
      batchFailCount++;
      batchIndex++;
      if (batchRunning) await runBatchStep();
      return;
    }

    showToast(`Aset ${index + 1}/${batchCards.length}…`, 'info');

    // Click card → wait for selection
    card.click();
    const activated = await waitForCardToBecomeActive(card, { timeout: 2000, interval: 100 });
    if (!activated) {
      debugLog(`Card ${index + 1} tidak aktif setelah click — skip`);
      batchFailCount++;
      batchIndex++;
      if (batchRunning) await runBatchStep();
      return;
    }
    await wait(300); // form settle

    // Skip if already filled
    const state = getFormFieldState();
    if (!state.allEmpty) {
      debugLog(`Aset ${index + 1} skip — sudah berisi`);
      batchSkipCount++;
      batchIndex++;
      if (batchRunning) await wait(200);
      if (batchRunning) await runBatchStep();
      return;
    }

    // Extract thumbnail
    const thumbUrl = getActiveThumbSrc();
    if (!thumbUrl) {
      batchFailCount++;
      batchIndex++;
      if (batchRunning) await runBatchStep();
      return;
    }
    const base64 = await extractThumbnailBase64(thumbUrl);
    if (!base64) {
      batchFailCount++;
      batchIndex++;
      if (batchRunning) await runBatchStep();
      return;
    }

    // Generate metadata
    const filename = getFilename();
    const existingTitle = getFieldValue('description');
    const result = await fetchMetadataWithRetry(base64, filename, existingTitle, batchRecentTitles);

    if (!result.ok) {
      batchFailCount++;
    } else {
      await applyMetadataToForm(result.data);
      // Anti-duplikasi: simpan description untuk request berikutnya
      if (result.data?.description) {
        batchRecentTitles.push(result.data.description.slice(0, 150));
        if (batchRecentTitles.length > 15) batchRecentTitles.shift();
      }
    }
  } catch (err) {
    debugLog(`Batch error on index ${batchIndex}:`, err);
    batchFailCount++;
  }

  batchIndex++;
  if (batchRunning) await wait(600);
  if (batchRunning) await runBatchStep();
}
```

**Commit:**

```bash
git add contents/shutterstock.ts
git commit -m "feat(shutterstock): add batch mode with skip-filled + anti-duplication"
```

---

### Task 14: Bootstrap — MutationObserver + message listener

**Objective:** Inject button saat form muncul, listen untuk popup messages, watch card grid.

**Files:**
- Modify: `contents/shutterstock.ts`

```typescript
// ── Bootstrap ──────────────────────────────────────────────────────────────

// Re-inject buttons when DOM changes (SPA navigation)
const domObserver = new MutationObserver(() => tryInject());
domObserver.observe(document.body, { childList: true, subtree: true });

// Initial inject
setTimeout(() => {
  tryInject();
  watchCards();
}, 1000);

// Listen for messages from popup (popup can still trigger generate/batch)
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'RUN_SINGLE_GENERATE') {
    handleGenerate().then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }));
    return true;
  }
  if (message?.type === 'RUN_BATCH_GENERATE') {
    if (!batchRunning) startBatch().then(() => sendResponse({ ok: true }));
    sendResponse({ ok: true });
    return true;
  }
  if (message?.type === 'STOP_GENERATE') {
    stopBatch();
    sendResponse({ ok: true });
    return true;
  }
  if (message?.type === 'GET_RUN_STATUS') {
    sendResponse({ ok: true, running: batchRunning || isGenerating });
    return true;
  }
});
```

**Commit:**

```bash
git add contents/shutterstock.ts
git commit -m "feat(shutterstock): add bootstrap + message listener"
```

---

### Task 15: Update API prompt — tambah category2 + file_type untuk Shutterstock

**Objective:** API endpoint return `category2` dan `file_type` untuk Shutterstock. Tambah ke prompt.

**Files:**
- Modify: `pages/api/extension/generate.ts` (hanya bagian prompt, bukan logic Adobe)

**Step 1:** Update `generateOpenAIPrompt` untuk Shutterstock-specific prompt:

```typescript
// Di dalam generateOpenAIPrompt, tambah block untuk Shutterstock:
if (platformHint === 'Shutterstock') {
  userInstruction += `
- category2: Pilih kategori sekunder yang LEBIH LUAS dari category. Harus berbeda dari category.
- file_type: "photo" atau "illustration" berdasarkan analisis visual
`;
}
```

Dan update JSON format expected:

```typescript
// Shutterstock:
`Return EXACTLY valid JSON only: {"title":"...","description":"...","keywords":[...],"category":"...","category2":"...","file_type":"..."}`

// Adobe Stock (tidak berubah):
`Return EXACTLY valid JSON only: {"title":"...","description":"...","keywords":[...],"category":"..."}`
```

**Step 2:** Update validasi response — `category2` dan `file_type` optional (bisa kosong):

```typescript
// Untuk Shutterstock, category2 dan file_type tidak wajib
if (platform?.includes('shutterstock')) {
  if (!metadata.category2) metadata.category2 = '';
  if (!metadata.file_type) metadata.file_type = '';
}
```

**Commit:**

```bash
git add pages/api/extension/generate.ts
git commit -m "feat(shutterstock): add category2 + file_type to API prompt"
```

---

### Task 16: Hapus logic Shutterstock dari `contents/adobe-autofill.ts`

**Objective:** Bersihkan kode Adobe Stock dari semua logic Shutterstock agar tidak ada konflik. Adobe Stock path tetap utuh.

**Files:**
- Modify: `contents/adobe-autofill.ts`

**Yang dihapus:**
1. `SHUTTERSTOCK_SELECTORS` constant (line 58-65) — dipindah ke `contents/shutterstock.ts`
2. `SHUTTERSTOCK_CATEGORIES` constant (line 67-87) — dipindah
3. `normalizeShutterstockCategory()` (line 465-515) — dipindah
4. `openShutterstockCategoryMenu()` (line 542-567) — tidak dipakai lagi
5. `fillShutterstockCategory()` (line 570-637) — diganti `selectMUIDropdown` di file baru
6. `fillKeywordTokens()` untuk Shutterstock path (line 642-672) — diganti `fillKeywordsMUI` di file baru
7. `isShutterstockUploadPage()` (line 136-145) — dipindah ke file baru
8. Shutterstock branch di `autofill()` (line 694-731) — tidak dipakai lagi
9. Shutterstock path di `detectPlatform()` (line 149-150) — tetap, untuk popup detection
10. Host permissions Shutterstock tetap di manifest (Plasmo config)

**Yang TIDAK diubah:**
- Semua Adobe Stock code path
- `detectPlatform()` — tetap untuk popup
- `getAssetIdentity()` — tetap untuk Adobe batch
- `processBatch()` — tetap untuk Adobe batch
- `ensureController()` — tetap untuk Adobe
- Message listener — tetap untuk Adobe

**Catatan:** Hapus dengan hati-hati. Hanya hapus fungsi yang HANYA dipakai untuk Shutterstock. Jangan hapus fungsi yang dipakai bersama Adobe+Shutterstock (seperti `isVisible`, `setNativeValue`, `dispatchPointerMouseSequence`).

**Commit:**

```bash
git add contents/adobe-autofill.ts
git commit -m "refactor: remove Shutterstock logic from adobe-autofill.ts — moved to shutterstock.ts"
```

---

### Task 17: Update Plasmo manifest — pastikan content script ter-register

**Objective:** Pastikan `contents/shutterstock.ts` terdaftar sebagai content script dengan match patterns yang benar.

**Files:**
- Modify: `package.json` (jika perlu manifest config)

**Verification:**

```bash
npm run build
# Cek build/chrome-mv3-dev/manifest.json
cat build/chrome-mv3-dev/manifest.json | jq '.content_scripts'
```

Expected: 2 content scripts — `adobe-autofill.ts` (Adobe domains) dan `shutterstock.ts` (Shutterstock domains).

**Penting:** Hapus `https://submit.shutterstock.com/*` dan `https://contributor-accounts.shutterstock.com/*` dari match patterns `adobe-autofill.ts` untuk menghindari dual injection.

**Commit:**

```bash
git add contents/adobe-autofill.ts contents/shutterstock.ts
git commit -m "fix: separate content script match patterns for Adobe vs Shutterstock"
```

---

### Task 18: Build, package, test, push

**Objective:** Build extension, update ZIP, push semua.

```bash
npm run build && npm run package
cp build/chrome-mv3-prod.zip public/downloads/autofillstock-extension.zip
git add -A
git commit -m "feat: Shutterstock metadata generation following Automeda pattern — inline buttons, MUI handling, batch mode"
git push origin main
```

**Verification checklist:**
- [ ] Build sukses tanpa error
- [ ] `manifest.json` punya 2 content scripts
- [ ] ZIP ter-update di `public/downloads/`
- [ ] Tidak ada TypeScript error baru
- [ ] Adobe Stock code path tidak berubah (diff review)

---

## Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Selector MUI berubah saat Shutterstock update UI | Button tidak inject / field tidak terisi | MutationObserver re-inject, polling `waitForElement` |
| `aria-checked` tidak konsisten antar browser | Card selection tidak terdeteksi | Fallback ke click tracker `activeThumbUrl` |
| API rate limit dari OpenAI | Batch gagal di tengah | Retry 3x + 8s wait untuk rate limit |
| Dual injection (2 content scripts di page sama) | Konflik event listener | Pisah match patterns — Adobe domains vs Shutterstock domains |
| `fillKeywordsMUI` lambat untuk 45+ keywords | Batch jadi lama | 55ms per keyword × 49 = ~2.7s per aset (acceptable) |
| Category2 tidak enable setelah category1 | Field kosong | Poll `aria-disabled` dengan timeout 2s |
| Account bahasa Indonesia | Label dropdown beda | `CATEGORY_ID_TRANSLATIONS` + `IMAGE_TYPE_ID` mapping |

## Yang TIDAK Diubah

- ✅ Popup UI/UX tetap seperti desain yang sudah disetujui
- ✅ Adobe Stock generate path tidak diubah (100% perfect)
- ✅ Popup tetap bisa kirim message ke content script Shutterstock
- ✅ Style Autofillstock (dark gradient, emerald accent) di inline button

## Urutan Eksekusi

Tasks 1-14 bersifat **sequential** (satu file, saling bergantung). Task 15 bisa paralel. Task 16-17 setelah semua selesai. Task 18 terakhir.

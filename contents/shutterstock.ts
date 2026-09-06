// ─── Autofillstock · content/shutterstock.ts ──────────────────────────
// Shutterstock metadata generation — adopsi pola Automeda:
// - Inline button di halaman (Generate AI + Run Batch)
// - MUI dropdown handling (full pointer events + listbox polling)
// - Keyword fill one-by-one + Enter (MUI Autocomplete)
// - Card selection verification (aria-checked polling)
// - Retry + anti-duplikasi + skip-if-filled
// - Adobe Stock code TIDAK tersentuh

export const config = {
  matches: [
    "https://submit.shutterstock.com/*",
    "https://contributor-accounts.shutterstock.com/*",
  ],
}

// ── Constants ────────────────────────────────────────────────────────────

const VALID_CATEGORIES = [
  'Abstract', 'Animals/Wildlife', 'Arts', 'Backgrounds/Textures',
  'Beauty/Fashion', 'Buildings/Landmarks', 'Business/Finance', 'Celebrities',
  'Education', 'Food and drink', 'Healthcare/Medical', 'Holidays',
  'Industrial', 'Interiors', 'Miscellaneous', 'Nature', 'Objects',
  'Parks/Outdoor', 'People', 'Religion', 'Science', 'Signs/Symbols',
  'Sports/Recreation', 'Technology', 'Transportation', 'Vintage',
]

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
}

const IMAGE_TYPE_ID: Record<string, string> = {
  photo: 'Foto',
  illustration: 'Ilustrasi',
}

const MSG_TIMEOUT_MS = 40000
const API_TIMEOUT_MS = 35000
const RATE_LIMIT_RETRY_MS = 8000
const PERMANENT_ERRORS = ['not_logged_in', 'daily_limit_reached', 'out_of_credits', 'Kredit habis. Silakan top up kredit.', 'Kode aktivasi tidak valid atau sudah tidak aktif.']

let isGenerating = false
let batchRunning = false
let batchCards: HTMLElement[] = []
let batchIndex = 0
let batchFailCount = 0
let batchSkipCount = 0
let batchRecentTitles: string[] = []
let activeThumbUrl: string | null = null

// ── Helpers ───────────────────────────────────────────────────────────────

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function waitForElement<T>(
  getEl: () => T | null,
  { timeout = 2000, interval = 100 } = {}
): Promise<T | null> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const el = getEl()
    if (el) return el
    await wait(interval)
  }
  return null
}

function msg(payload: any): Promise<any> {
  return new Promise((r) => {
    let done = false
    const timer = setTimeout(() => {
      if (done) return
      done = true
      console.warn(`[Autofillstock SS] msg() TIMED OUT after ${MSG_TIMEOUT_MS}ms for '${payload?.cmd || payload?.type}'`)
      r({ ok: false, error: 'request_timeout' })
    }, MSG_TIMEOUT_MS)
    chrome.runtime.sendMessage(payload, (res) => {
      if (done) return
      done = true
      clearTimeout(timer)
      r(res || {})
    })
  })
}

function debugLog(...args: any[]) {
  console.log('[Autofillstock SS]', ...args)
}

function getFilename(): string {
  return document.querySelector('h1, h2, h3, [class*="filename"]')?.textContent?.trim() || ''
}

function getFieldValue(name: string): string {
  return (document.querySelector(`[name="${name}"]`) as HTMLInputElement)?.value?.trim() || ''
}

// ── Thumbnail capture ─────────────────────────────────────────────────────

function onCardClick(e: Event) {
  const card = e.currentTarget as HTMLElement
  const img = card.querySelector<HTMLImageElement>('img.MuiCardMedia-img')
    || card.querySelector<HTMLImageElement>('img[class*="MuiCardMedia"]')
    || card.querySelector<HTMLImageElement>('img[src*="shutterstock"]')
  if (img?.src) activeThumbUrl = img.src
}

function attachCardListeners() {
  document.querySelectorAll('[data-testid="asset-card"]').forEach((card) => {
    card.removeEventListener('click', onCardClick)
    card.addEventListener('click', onCardClick)
  })
}

function getActiveThumbSrc(): string | null {
  // Priority 1: card marked selected by Shutterstock
  const selectedCard = document.querySelector('[data-testid="asset-card"][aria-checked="true"]')
  if (selectedCard) {
    const img = selectedCard.querySelector<HTMLImageElement>('img.MuiCardMedia-img')
      || selectedCard.querySelector<HTMLImageElement>('img[class*="MuiCardMedia"]')
      || selectedCard.querySelector<HTMLImageElement>('img[src*="shutterstock"]')
    if (img?.src) return img.src
  }
  // Fallback: click tracker
  return activeThumbUrl || null
}

async function waitForCardToBecomeActive(
  card: HTMLElement,
  { timeout = 2000, interval = 100 } = {}
): Promise<boolean> {
  if (!card) return false
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (card.isConnected && card.getAttribute('aria-checked') === 'true') return true
    await wait(interval)
  }
  return false
}

function watchCards() {
  const grid = document.querySelector('[data-testid="asset-grid-not-submitted"]')
    || document.querySelector('[data-testid*="grid"]')
  if (!grid) { setTimeout(watchCards, 800); return }
  new MutationObserver(() => setTimeout(attachCardListeners, 300))
    .observe(grid, { childList: true, subtree: true })
  setTimeout(attachCardListeners, 800)
}

// ── Image extraction (fetch blob → FileReader → base64) ───────────────────

async function extractThumbnailBase64(imageUrl: string): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  try {
    const response = await fetch(imageUrl, { signal: controller.signal })
    if (!response.ok) return null
    const blob = await response.blob()
    if (blob.size === 0) return null
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// ── API call + retry ──────────────────────────────────────────────────────

async function fetchMetadata(
  base64Image: string,
  filename: string,
  existingTitle: string
): Promise<any> {
  const settings = await chrome.storage.local.get(['activation_code'])
  if (!settings.activation_code) {
    return { ok: false, error: 'not_logged_in' }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  try {
    const response = await fetch('https://autofillstock.my.id/api/extension/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activationCode: settings.activation_code,
        assetBrief: base64Image,
        filename,
        platform: 'shutterstock',
      }),
      signal: controller.signal,
    })
    const data = await response.json()
    if (!response.ok || data.error) {
      return { ok: false, error: data.error || 'api_error' }
    }
    return { ok: true, data: data.metadata, credits: data.creditsRemaining }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { ok: false, error: 'request_timeout' }
    }
    return { ok: false, error: err.message || 'network_error' }
  } finally {
    clearTimeout(timer)
  }
}

function isRateLimitError(result: any): boolean {
  return typeof result?.error === 'string' && /too many|rate limit/i.test(result.error)
}

async function fetchMetadataWithRetry(
  base64Image: string,
  filename: string,
  existingTitle: string
): Promise<any> {
  let result = await fetchMetadata(base64Image, filename, existingTitle)
  let attempts = 1
  while (!result?.ok && !PERMANENT_ERRORS.includes(result?.error) && attempts < 3) {
    const rateLimited = isRateLimitError(result)
    debugLog(`fetchMetadataWithRetry attempt ${attempts} FAILED — waiting ${rateLimited ? RATE_LIMIT_RETRY_MS : 800}ms`)
    await wait(rateLimited ? RATE_LIMIT_RETRY_MS : 800)
    result = await fetchMetadata(base64Image, filename, existingTitle)
    attempts++
  }
  return result
}

// ── MUI Dropdown Selection ────────────────────────────────────────────────

function categoryVariants(catEn: string): string[] {
  return [catEn, CATEGORY_ID_TRANSLATIONS[catEn]].filter(Boolean)
}

async function selectMUIDropdown(fieldName: string, targetValue: string | string[]): Promise<void> {
  const targets = (Array.isArray(targetValue) ? targetValue : [targetValue])
    .filter(Boolean).map((t) => t.toLowerCase())
  if (!targets.length) return

  const trigger =
    document.querySelector(`[aria-labelledby="mui-component-select-${fieldName}"]`) ||
    document.querySelector(`[data-testid="${fieldName}"] [role="button"]`)
  if (!trigger) return

  // Skip jika disabled
  if (trigger.getAttribute('aria-disabled') === 'true') {
    debugLog(`selectMUIDropdown(${fieldName}) — trigger is disabled`)
    return
  }

  // Skip jika sudah terisi
  const hiddenInput = document.querySelector(`input[name="${fieldName}"]`) as HTMLInputElement
  if (hiddenInput?.value && targets.includes(hiddenInput.value.toLowerCase())) return

  // Snapshot listbox yang sudah ada
  const preExistingListboxes = new Set(Array.from(document.querySelectorAll('[role="listbox"]')))

  // Full pointer event chain (MUI butuh ini)
  const opts = { bubbles: true, cancelable: true, view: window }
  for (const evName of ['mousedown', 'mouseup', 'click']) {
    trigger.dispatchEvent(new MouseEvent(evName, opts))
  }

  // Poll untuk listbox baru
  const findMyListbox = () => {
    const controlsId = trigger.getAttribute('aria-controls')
    if (controlsId) {
      const byId = document.getElementById(controlsId)
      if (byId) return byId
    }
    const freshListbox = Array.from(document.querySelectorAll('[role="listbox"]'))
      .find((el) => !preExistingListboxes.has(el))
    return freshListbox || null
  }
  const listbox = await waitForElement(findMyListbox, { timeout: 1500, interval: 80 })
  if (!listbox) {
    debugLog(`selectMUIDropdown(${fieldName}) — no listbox appeared`)
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    return
  }

  // Poll untuk options ter isi (category2 load setelah category1)
  const populatedListbox = await waitForElement(
    () => (listbox.querySelectorAll('[role="option"]').length > 0 ? listbox : null),
    { timeout: 2000, interval: 100 }
  )
  const options = populatedListbox ? populatedListbox.querySelectorAll('[role="option"]') : []

  let clicked = false
  for (const opt of Array.from(options)) {
    const optText = opt.textContent?.trim().toLowerCase() || ''
    const isMatch = targets.some(
      (t) => optText === t || optText.includes(t) || t.includes(optText)
    )
    if (isMatch) {
      opt.dispatchEvent(new MouseEvent('mousedown', opts))
      opt.dispatchEvent(new MouseEvent('mouseup', opts))
      opt.dispatchEvent(new MouseEvent('click', opts))
      clicked = true
      await wait(200)
      break
    }
  }

  if (!clicked) {
    debugLog(`selectMUIDropdown(${fieldName}) — no option matched [${targets.join(', ')}] among ${options.length} options`)
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }))
    await wait(150)
  }
}

// ── Keyword fill (MUI Autocomplete) ────────────────────────────────────────

function countAddedKeywordChips(): number {
  const block = document.querySelector('[data-testid="keywords-block-all"]')
  if (!block) return 0
  return block.querySelectorAll('.MuiChip-root, [class*="Chip-root"]').length
}

async function clearExistingKeywordChips(input: HTMLInputElement): Promise<void> {
  const before = countAddedKeywordChips()
  if (before === 0) return
  for (let i = 0; i < 60; i++) {
    const remaining = countAddedKeywordChips()
    if (remaining === 0) break
    input.focus()
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', keyCode: 8, bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Backspace', keyCode: 8, bubbles: true }))
    await wait(30)
    if (countAddedKeywordChips() === remaining) break
  }
}

async function fillKeywordsMUI(keywordsStr: string): Promise<void> {
  if (!keywordsStr) return
  const input =
    (document.querySelector('[data-testid="keyword-input"] input') as HTMLInputElement) ||
    (document.querySelector('input[placeholder*="comma or semicolon" i]') as HTMLInputElement) ||
    (document.querySelector('input[placeholder*="keyword" i]') as HTMLInputElement)
  if (!input) return

  await clearExistingKeywordChips(input)

  // De-dupe (case-insensitive)
  const seen = new Set<string>()
  const tags = keywordsStr.split(',').map((t) => t.trim()).filter((t) => {
    if (!t) return false
    const key = t.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set

  for (const tag of tags) {
    input.focus()
    nativeSetter?.call(input, tag)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
    await wait(15)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, bubbles: true }))
    await wait(40)
  }
}

// ── Description fill + form state ──────────────────────────────────────────

function fillMUI(selector: string, value: string): void {
  const el = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement
  if (!el || !value) return
  const proto = el.tagName === 'INPUT' ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype
  const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  el.focus()
  nativeSetter?.call(el, value)
  el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
  el.blur()
  // focusout = bubbling blur, triggers React onBlur → Shutterstock autosave commit
  el.dispatchEvent(new Event('focusout', { bubbles: true }))
}

function getFormFieldState() {
  const description = getFieldValue('description')
  const category1 = getFieldValue('category1')
  const category2 = getFieldValue('category2')
  const imageType = getFieldValue('imageType')
  const keywordCount = countAddedKeywordChips()
  return {
    description,
    category1,
    category2,
    imageType,
    keywordCount,
    allEmpty: !description && !category1 && !keywordCount,
  }
}

// ── Apply metadata ──────────────────────────────────────────────────────────

function matchCategory(aiCategory: string): string | null {
  if (!aiCategory) return null
  return VALID_CATEGORIES.find(
    (c) =>
      c.toLowerCase() === aiCategory.toLowerCase() ||
      aiCategory.toLowerCase().includes(c.toLowerCase()) ||
      c.toLowerCase().includes(aiCategory.toLowerCase())
  ) || null
}

async function applyMetadataToForm(data: any): Promise<void> {
  const { description, keywords, category, category2, file_type } = data
  const state = getFormFieldState()

  // 1. Description — skip if already filled
  if (description && !state.description) {
    fillMUI('textarea[name="description"]', description)
    await wait(200)
  }

  // 2. Category 1
  if (category && !state.category1) {
    const matched = matchCategory(category)
    if (matched) {
      await selectMUIDropdown('category1', categoryVariants(matched))
      // Tunggu category2 enable (React state update)
      await waitForElement(() => {
        const cat2Trigger = document.querySelector(
          '[aria-labelledby="mui-component-select-category2"]'
        )
        return cat2Trigger?.getAttribute('aria-disabled') !== 'true' ? cat2Trigger : null
      }, { timeout: 2000, interval: 100 })
    } else {
      debugLog(`No category match for AI output "${category}"`)
    }
  }

  // 3. Category 2 — pastikan beda dari category1
  if (category2 && !state.category2) {
    const matched2 = matchCategory(category2)
    if (matched2) {
      const cat1Value = (document.querySelector('input[name="category1"]') as HTMLInputElement)?.value || ''
      if (matched2.toLowerCase() !== cat1Value.toLowerCase()) {
        await selectMUIDropdown('category2', categoryVariants(matched2))
        await wait(200)
      }
    }
  }

  // 4. Image type — Photo atau Illustration
  if (file_type && !state.imageType) {
    const imgType = file_type.toLowerCase().includes('illust') ? 'illustration' : 'photo'
    await selectMUIDropdown('imageType', [imgType, IMAGE_TYPE_ID[imgType]])
    await wait(200)
  }

  // 5. Keywords — skip if already has chips
  if (keywords && !state.keywordCount) {
    const kwStr = Array.isArray(keywords) ? keywords.join(', ') : keywords
    await fillKeywordsMUI(kwStr)
    await wait(200)
  }
}

// ── Toast ──────────────────────────────────────────────────────────────────

function showToast(text: string, type: 'success' | 'error' | 'info' = 'success'): void {
  document.getElementById('asaf-toast')?.remove()
  const t = document.createElement('div')
  t.id = 'asaf-toast'
  const colors: Record<string, string> = {
    success: '#10b981',
    error: '#ef4444',
    info: '#3b82f6',
  }
  t.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; z-index: 2147483647;
    background: rgba(13, 17, 23, 0.95); color: ${colors[type] || '#fff'};
    border: 1px solid ${colors[type] || '#fff'}33; border-radius: 10px;
    padding: 10px 16px; font-size: 12px; font-weight: 600;
    font-family: Inter, system-ui, sans-serif;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3); max-width: 320px;
    opacity: 0; transition: opacity 0.3s;
  `
  t.textContent = text
  document.body.appendChild(t)
  requestAnimationFrame(() => (t.style.opacity = '1'))
  setTimeout(() => {
    t.style.opacity = '0'
    setTimeout(() => t.remove(), 300)
  }, 4000)
}

// ── Single generate ────────────────────────────────────────────────────────

function setBtnState(state: 'idle' | 'loading'): void {
  const btn = document.getElementById('asaf-ss-btn') as HTMLButtonElement
  if (!btn) return
  btn.disabled = state === 'loading'
  btn.style.opacity = state === 'loading' ? '0.5' : '1'
  btn.textContent = state === 'loading' ? 'Generating…' : '✦ Generate AI'
}

async function handleGenerate(): Promise<void> {
  if (isGenerating) return
  isGenerating = true
  setBtnState('loading')

  try {
    const thumbUrl = getActiveThumbSrc()
    if (!thumbUrl) {
      showToast('Thumbnail tidak ditemukan. Klik aset dulu.', 'error')
      return
    }

    const base64 = await extractThumbnailBase64(thumbUrl)
    if (!base64) {
      showToast('Gagal mengambil gambar. Coba lagi.', 'error')
      return
    }

    const filename = getFilename()
    const existingTitle = getFieldValue('description')
    const result = await fetchMetadataWithRetry(base64, filename, existingTitle)

    if (!result.ok) {
      const errMap: Record<string, string> = {
        not_logged_in: 'Kode aktivasi tidak valid.',
        'Kode aktivasi tidak valid atau sudah tidak aktif.': 'Kode aktivasi tidak valid.',
        'Kredit habis. Silakan top up kredit.': 'Kredit habis. Top up di dashboard.',
      }
      showToast(errMap[result.error] || 'Error: ' + result.error, 'error')
      return
    }

    await applyMetadataToForm(result.data)
    showToast('✦ Metadata berhasil diisi!', 'success')
  } catch (err) {
    showToast('Error: ' + (err instanceof Error ? err.message : 'Unknown'), 'error')
  } finally {
    isGenerating = false
    setBtnState('idle')
  }
}

// ── Batch mode ─────────────────────────────────────────────────────────────

function resolveCard(index: number): HTMLElement | null {
  const cached = batchCards[index]
  if (cached?.isConnected) return cached
  const fresh = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="asset-card"]'))
  if (fresh[index]) {
    batchCards[index] = fresh[index]
    return fresh[index]
  }
  return cached || null
}

async function startBatch(): Promise<void> {
  if (batchRunning) return
  batchCards = Array.from(document.querySelectorAll('[data-testid="asset-card"]'))
  if (batchCards.length === 0) {
    showToast('Tidak ada aset ditemukan.', 'error')
    return
  }
  batchIndex = 0
  batchFailCount = 0
  batchSkipCount = 0
  batchRecentTitles = []
  batchRunning = true
  const btn = document.getElementById('asaf-ss-batch-btn')
  if (btn) btn.textContent = '⏹ Stop'
  showToast(`Batch dimulai — ${batchCards.length} aset (isi yang kosong saja)`, 'info')
  await runBatchStep()
}

function stopBatch(): void {
  batchRunning = false
  const btn = document.getElementById('asaf-ss-batch-btn')
  if (btn) btn.textContent = '▶ Run Batch'
  showToast('Batch dihentikan.', 'info')
}

async function runBatchStep(): Promise<void> {
  if (!batchRunning) return

  if (batchIndex >= batchCards.length) {
    batchRunning = false
    const btn = document.getElementById('asaf-ss-batch-btn')
    if (btn) btn.textContent = '▶ Run Batch'

    if (batchSkipCount > 0 && batchSkipCount === batchCards.length) {
      showToast(`⚠️ 0 aset diisi — semua ${batchSkipCount} sudah berisi.`, 'error')
      return
    }
    const summary = batchFailCount > 0
      ? `${batchCards.length - batchFailCount - batchSkipCount} diisi, ${batchFailCount} gagal, ${batchSkipCount} sudah berisi`
      : batchSkipCount > 0
        ? `${batchCards.length - batchSkipCount} diisi, ${batchSkipCount} sudah berisi`
        : `${batchCards.length} aset`
    showToast(`✦ Batch selesai! ${summary}`, batchFailCount > 0 ? 'error' : 'success')
    return
  }

  try {
    const index = batchIndex
    const card = resolveCard(index)
    if (!card) {
      batchFailCount++
      batchIndex++
      if (batchRunning) await runBatchStep()
      return
    }

    showToast(`Aset ${index + 1}/${batchCards.length}…`, 'info')

    // Click card → wait for selection
    card.click()
    const activated = await waitForCardToBecomeActive(card, { timeout: 2000, interval: 100 })
    if (!activated) {
      debugLog(`Card ${index + 1} tidak aktif setelah click — skip`)
      batchFailCount++
      batchIndex++
      if (batchRunning) await runBatchStep()
      return
    }
    await wait(300) // form settle

    // Skip if already filled
    const state = getFormFieldState()
    if (!state.allEmpty) {
      debugLog(`Aset ${index + 1} skip — sudah berisi`)
      batchSkipCount++
      batchIndex++
      if (batchRunning) await wait(200)
      if (batchRunning) await runBatchStep()
      return
    }

    // Extract thumbnail
    const thumbUrl = getActiveThumbSrc()
    if (!thumbUrl) {
      batchFailCount++
      batchIndex++
      if (batchRunning) await runBatchStep()
      return
    }
    const base64 = await extractThumbnailBase64(thumbUrl)
    if (!base64) {
      batchFailCount++
      batchIndex++
      if (batchRunning) await runBatchStep()
      return
    }

    // Generate metadata
    const filename = getFilename()
    const existingTitle = getFieldValue('description')
    const result = await fetchMetadataWithRetry(base64, filename, existingTitle)

    if (!result.ok) {
      batchFailCount++
    } else {
      await applyMetadataToForm(result.data)
      // Anti-duplikasi: simpan description untuk request berikutnya
      if (result.data?.description) {
        batchRecentTitles.push(result.data.description.slice(0, 150))
        if (batchRecentTitles.length > 15) batchRecentTitles.shift()
      }
    }
  } catch (err) {
    debugLog(`Batch error on index ${batchIndex}:`, err)
    batchFailCount++
  }

  batchIndex++
  if (batchRunning) await wait(600)
  if (batchRunning) await runBatchStep()
}

// ── Inline button injection ────────────────────────────────────────────────

function tryInject(): void {
  if (document.getElementById('asaf-ss-btn')) return

  const anchor =
    document.querySelector('textarea[name="description"]') ||
    document.querySelector('input[placeholder*="keyword" i]') ||
    document.querySelector('input[placeholder*="comma or semicolon" i]')
  if (!anchor) return

  const formContainer =
    anchor.closest('form') ||
    anchor.closest('[class*="SubmissionForm"]') ||
    anchor.closest('[class*="submission"]') ||
    anchor.parentElement?.parentElement?.parentElement
  if (!formContainer) return

  const wrap = document.createElement('div')
  wrap.id = 'asaf-ss-btn-wrap'
  wrap.style.cssText = `
    margin: 8px 0 12px 0;
    display: flex;
    gap: 8px;
    align-items: center;
    font-family: Inter, system-ui, sans-serif;
  `

  // Generate AI button
  const genBtn = document.createElement('button')
  genBtn.id = 'asaf-ss-btn'
  genBtn.type = 'button'
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
  `
  genBtn.textContent = '✦ Generate AI'
  genBtn.addEventListener('click', () => handleGenerate())
  wrap.appendChild(genBtn)

  // Run Batch button
  const batchBtn = document.createElement('button')
  batchBtn.id = 'asaf-ss-batch-btn'
  batchBtn.type = 'button'
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
  `
  batchBtn.textContent = '▶ Run Batch'
  batchBtn.addEventListener('click', () => {
    if (batchRunning) stopBatch()
    else startBatch()
  })
  wrap.appendChild(batchBtn)

  // Status text
  const status = document.createElement('span')
  status.id = 'asaf-ss-status'
  status.style.cssText = 'font-size: 11px; color: #94a3b8; margin-left: 4px;'
  wrap.appendChild(status)

  formContainer.insertBefore(wrap, formContainer.firstChild)
  attachCardListeners()
}

// ── Bootstrap ──────────────────────────────────────────────────────────────

const domObserver = new MutationObserver(() => tryInject())
domObserver.observe(document.body, { childList: true, subtree: true })

setTimeout(() => {
  tryInject()
  watchCards()
}, 1000)

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'RUN_SINGLE_GENERATE') {
    handleGenerate()
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }))
    return true
  }
  if (message?.type === 'RUN_BATCH_GENERATE') {
    if (!batchRunning) {
      startBatch()
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }))
    } else {
      sendResponse({ ok: true })
    }
    return true
  }
  if (message?.type === 'STOP_GENERATE') {
    stopBatch()
    sendResponse({ ok: true })
    return true
  }
  if (message?.type === 'GET_RUN_STATUS') {
    sendResponse({ ok: true, running: batchRunning || isGenerating })
    return true
  }
})

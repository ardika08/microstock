// ─── Autofillstock · content/vecteezy.ts ──────────────────────────────
// Vecteezy metadata generation — adopsi pola Automeda:
// - 1 tombol inline "Run Batch" — auto-scan SEMUA resource unfilled via API Vecteezy
//   (grid virtualized → DOM-scan tidak reliable, enumerasi via /api/v1/resources)
// - Tag input keywords (satu kata per komando: koma → Enter fallback)
// - Prohibited terms sanitasi (keyword & title) sesuai aturan Vecteezy
// - Checkbox AI-Generated + dropdown tool WAJIB (revert jika gagal — jangan setengah jalan)
// - Save eksplisit per resource via save-changes-icon (tidak ada autosave)
// - Verifikasi panel filename sebelum menulis (keywords final setelah submit!)
// - Adobe Stock & Shutterstock code TIDAK tersentuh

export const config = {
  matches: ["https://contributors.vecteezy.com/*"],
}

// ── Constants ────────────────────────────────────────────────────────────

const MSG_TIMEOUT_MS = 40000
const API_TIMEOUT_MS = 35000
const RATE_LIMIT_RETRY_MS = 8000
const GENERATE_DELAY_MS = 800
const PERMANENT_ERRORS = [
  'not_logged_in',
  'daily_limit_reached',
  'out_of_credits',
  'Kredit habis. Silakan top up kredit.',
  'Kode aktivasi tidak valid atau sudah tidak aktif.',
]
const QUOTA_ERROR_MESSAGES: Record<string, string> = {
  not_logged_in: 'Kode aktivasi tidak valid.',
  daily_limit_reached: 'Limit harian tercapai. Upgrade ⚡',
  out_of_credits: 'Kredit habis. Top up di dashboard.',
  'Kredit habis. Silakan top up kredit.': 'Kredit habis. Top up di dashboard.',
  'Kode aktivasi tidak valid atau sudah tidak aktif.': 'Kode aktivasi tidak valid.',
}

// Kata yang DILARANG sebagai keyword/title oleh Vecteezy (fallback statis —
// list resmi di-fetch dari /api/v1/prohibited_terms)
const FALLBACK_PROHIBITED_TERMS = [
  'photo', 'photos', 'video', 'videos', 'vector', 'vectors', 'png', 'psd',
  'ai generated', 'ai-generated', 'generated ai', 'generated-ai',
  'generative ai', 'generative-ai', 'ai generative', 'ai-generative',
]

// Prioritas AI tool — "other" terakhir (catch-all, bukan preferensi)
const AI_TOOL_PRIORITY = ['midjourney', 'stable_diffusion', 'dall_e', 'other']

// ── State ────────────────────────────────────────────────────────────────

interface VzSettings { vz_enabled: boolean; vz_ai_generated: boolean }
let settings: VzSettings = { vz_enabled: true, vz_ai_generated: false }
let running = false
let recentTitles: string[] = [] // TITLE (bukan description) — anti-duplikasi batch
let prohibitedTermsCache: string[] | null = null

function refreshSettingsCache(): Promise<VzSettings> {
  return new Promise((r) =>
    chrome.storage.local.get(['vz_enabled', 'vz_ai_generated'], (s) => {
      settings = {
        vz_enabled: s.vz_enabled !== false,
        vz_ai_generated: !!s.vz_ai_generated,
      }
      r(settings)
    })
  )
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return
  if ('vz_enabled' in changes || 'vz_ai_generated' in changes) refreshSettingsCache()
})

function debugLog(...args: any[]) {
  console.log('[Autofillstock VZ]', ...args)
}

// ── Helpers umum ─────────────────────────────────────────────────────────

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

// ── Toast (style konsisten dengan shutterstock.ts) ───────────────────────

function showToast(text: string, type: 'success' | 'error' | 'info' = 'success'): void {
  document.getElementById('asaf-vz-toast')?.remove()
  const t = document.createElement('div')
  t.id = 'asaf-vz-toast'
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

// ── Auth Vecteezy ────────────────────────────────────────────────────────
// API Vecteezy butuh explicit `Authorization: Bearer <token>` — cukup cookie
// session → 401. Token ada di cookie non-HttpOnly `eezy-cm-auth-token`.

function getVecteezyAuthToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)eezy-cm-auth-token=([^;]*)/)
  if (!match) return null
  try { return decodeURIComponent(match[1]) } catch { return match[1] }
}

function vzFetchHeaders(): Record<string, string> {
  const token = getVecteezyAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ── MUI fill (native setter + focusout) ──────────────────────────────────
// React onBlur listen di event 'focusout' (bubbling), bukan 'blur'
// (non-bubbling) — tanpa focusout, field tampil terisi tapi state React
// (dan panel) tidak melihat perubahan.

function fillMUI(selector: string, value: string): boolean {
  const el = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement | null
  if (!el || value == null) return false
  const proto = el.tagName === 'TEXTAREA' ? (HTMLTextAreaElement.prototype as any) : (HTMLInputElement.prototype as any)
  const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  el.focus()
  nativeSetter?.call(el, value)
  ;(el as any).value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
  el.blur()
  el.dispatchEvent(new Event('focusout', { bubbles: true }))
  return true
}

// ── Tag input keywords (satu kata per komando) ───────────────────────────
// Tag input commit SATU kata saat keydown koma (atau Enter). Satu fillMUI()
// dengan string panjang tidak pernah commit tag — chip tidak terbentuk.

function dispatchKey(el: HTMLElement, key: string, keyCode: number): void {
  ;['keydown', 'keypress', 'keyup'].forEach((type) => {
    el.dispatchEvent(new KeyboardEvent(type, { key, keyCode, which: keyCode, bubbles: true, cancelable: true }))
  })
}

async function commitSingleKeyword(selector: string, word: string): Promise<boolean> {
  const input = document.querySelector(selector) as HTMLInputElement | null
  if (!input || !word) return false
  const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set

  const tryCommit = async (key: string, keyCode: number): Promise<boolean> => {
    input.focus()
    nativeSetter?.call(input, word)
    ;(input as any).value = word
    input.dispatchEvent(new Event('input', { bubbles: true }))
    dispatchKey(input, key, keyCode)
    // Commit sukses = input dikosongkan oleh library tag-nya sendiri
    const cleared = await waitForElement(() => {
      const live = document.querySelector(selector) as HTMLInputElement | null
      return live && live.value.trim() === '' ? live : null
    }, { timeout: 800, interval: 80 })
    return !!cleared
  }

  if (await tryCommit(',', 188)) return true
  // Koma mungkin sukses tepat setelah polling window tutup — cek ulang DOM
  // sebelum fallback, agar Enter tidak commit kata yang sama dua kali.
  const live = document.querySelector(selector) as HTMLInputElement | null
  if (live && live.value.trim() === '') return true
  return !!(await tryCommit('Enter', 13))
}

async function fillKeywordsOneAtATime(selector: string, keywords: string[]): Promise<number> {
  let committed = 0
  for (const word of keywords) {
    const ok = await commitSingleKeyword(selector, word)
    if (ok) committed++
    else debugLog(`fillKeywordsOneAtATime: gagal commit keyword "${word}"`)
    await wait(60)
  }
  return committed
}

// ── Full pointer click (MUI buka di mousedown, .click() sering diabaikan) ─

function dispatchFullClick(el: HTMLElement): void {
  const opts = { bubbles: true, cancelable: true, view: window } as any
  const evNames = ['pointerover', 'pointerenter', 'mouseover', 'mouseenter', 'pointermove', 'mousemove',
    'pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']
  evNames.forEach((evName) => {
    el.dispatchEvent(
      evName.startsWith('pointer')
        ? new PointerEvent(evName, opts)
        : new MouseEvent(evName, opts)
    )
  })
}

// ── Verify field setelah fill (tidak ada autosave — re-read satu-satunya signal) ─

async function verifyFieldValue(
  selector: string,
  expected: string,
  { attempts = 3, delay = 300 } = {}
): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    const el = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement | null
    if (el && typeof el.value === 'string' && el.value.trim() === String(expected).trim()) return true
    await wait(delay)
  }
  return false
}

// ── Resource enumeration via API Vecteezy (grid virtualized!) ────────────

interface VzResource { id?: string; title?: string; preview_url?: string; [k: string]: any }

async function fetchUnfilledResources(): Promise<VzResource[]> {
  const results: VzResource[] = []
  const perPage = 25
  let page = 1
  while (true) {
    const url = `/api/v1/resources?state[]=started&sort_field=created_at&sort_dir=desc&sort_direction=desc&page=${page}&per_page=${perPage}`
    let res: Response
    try {
      res = await fetch(url, { credentials: 'include', headers: vzFetchHeaders() })
    } catch (err) {
      debugLog(`fetchUnfilledResources: network error halaman ${page}`, err)
      break
    }
    if (!res.ok) { debugLog(`fetchUnfilledResources: status ${res.status} halaman ${page}`); break }
    let data: any
    try {
      data = await res.json()
    } catch (err) {
      debugLog(`fetchUnfilledResources: gagal parse JSON halaman ${page}`, err)
      break
    }
    const items: VzResource[] = Array.isArray(data) ? data : (data.resources || data.data || [])
    if (!items.length) break
    for (const item of items) {
      if (!item.title) results.push(item)
    }
    if (items.length < perPage) break
    page += 1
  }
  debugLog(`fetchUnfilledResources: ${results.length} resource unfilled`)
  return results
}

function getResourceFilename(resource: VzResource): string {
  return resource?.source_file?.filename || resource?.filename || '(unknown file)'
}

// ── Card matching + selection + verifikasi panel ──────────────────────────
// Keywords Vecteezy TIDAK bisa diedit setelah submit — salah isi resource =
// fatal. Maka: setelah klik card, panel WAJIB menampilkan filename yang
// diharapkan sebelum apa pun ditulis.

function findCardForResource(resource: VzResource): HTMLElement | null {
  const cards = Array.from(document.querySelectorAll('[data-testid="resource-card"]')) as HTMLElement[]
  const filename = getResourceFilename(resource)
  const matches = cards.filter(
    (c) =>
      (resource.id && c.getAttribute('data-id') === resource.id) ||
      (filename !== '(unknown file)' && (c.textContent || '').includes(filename))
  )
  if (matches.length > 1) {
    debugLog(`findCardForResource: ${matches.length} card match filename "${filename}" — pakai match pertama`)
  }
  return matches[0] || null
}

function panelFilenameMatches(filename: string): HTMLElement | null {
  if (filename === '(unknown file)') return null
  const nameEl = document.querySelector('[data-testid="file-input-filename"]')
  return nameEl && (nameEl.textContent || '').includes(filename) ? (nameEl as HTMLElement) : null
}

async function selectResource(resource: VzResource): Promise<boolean> {
  let card = findCardForResource(resource)
  if (!card) return false
  card.scrollIntoView({ block: 'center' })
  await wait(200)
  card = findCardForResource(resource) // grid bisa re-render setelah scroll
  if (!card) return false
  card.click()

  const filename = getResourceFilename(resource)
  const panelMatched = await waitForElement(() => panelFilenameMatches(filename), { timeout: 3000, interval: 150 })

  if (!panelMatched) {
    debugLog(`selectResource: panel tidak match "${filename}" — retry 1x`)
    card = findCardForResource(resource) // referensi lama bisa stale setelah re-render
    if (!card) return false
    card.click()
    const retryMatch = await waitForElement(() => panelFilenameMatches(filename), { timeout: 2000, interval: 150 })
    return !!retryMatch
  }
  return true
}

// ── Save eksplisit per resource (HAR: tidak ada autosave-on-blur) ────────

async function clickSaveChanges(resource: VzResource): Promise<boolean> {
  // Scoped per card dulu — grid bisa unmount card yang sudah "filled",
  // jadi fallback ke document-wide (hanya 1 editor panel aktif satu waktu).
  const card = findCardForResource(resource)
  let saveIcon = card
    ? (card.querySelector('[data-testid="save-changes-icon"]') as HTMLElement | null)
    : null
  if (!saveIcon) {
    saveIcon = document.querySelector('[data-testid="save-changes-icon"]') as HTMLElement | null
    if (saveIcon) debugLog(`clickSaveChanges: card lookup miss, ketemu document-wide untuk ${getResourceFilename(resource)}`)
  }
  if (!saveIcon) {
    debugLog(`clickSaveChanges: save-changes-icon tidak ketemu untuk ${getResourceFilename(resource)}`)
    return false
  }
  saveIcon.click()
  await wait(400)
  return true
}

// ── Sanitasi prohibited terms ────────────────────────────────────────────

async function getProhibitedTerms(): Promise<string[]> {
  if (prohibitedTermsCache) return prohibitedTermsCache
  try {
    const res = await fetch('/api/v1/prohibited_terms', { credentials: 'include', headers: vzFetchHeaders() })
    if (!res.ok) throw new Error(`status ${res.status}`)
    const data = await res.json()
    prohibitedTermsCache = Array.isArray(data) && data.length
      ? data.map((t: any) => String(t).toLowerCase())
      : FALLBACK_PROHIBITED_TERMS
  } catch (err) {
    debugLog('prohibited_terms fetch gagal, pakai fallback list', err)
    prohibitedTermsCache = FALLBACK_PROHIBITED_TERMS
  }
  return prohibitedTermsCache
}

// Keyword Vecteezy menolak dash/titik/kurung ("no special character") —
// replace dengan spasi ("snow-like" → "snow like"), bukan delete.
function sanitizeKeyword(keyword: string): string {
  return keyword.replace(/[-.()]/g, ' ').replace(/\s+/g, ' ').trim()
}

// Buang banned keyword HANYA jika non-banned count sudah ≥ 5 (minimum situs).
// Tally berjalan sambil iterasi bisa salah buang banned awal.
function filterKeywords(keywords: string[], terms: string[]): { keywords: string[]; warned: boolean } {
  const isBanned = (kw: string) => terms.includes(kw.trim().toLowerCase())
  const nonBannedCount = keywords.filter((kw) => !isBanned(kw)).length
  const kept: string[] = []
  let warned = false
  for (const kw of keywords) {
    if (isBanned(kw)) {
      if (nonBannedCount >= 5) continue
      warned = true
    }
    kept.push(kw)
  }
  return { keywords: kept.slice(0, 50), warned }
}

// Title butuh ≥ 3 kata — stripping banned word di-skip jika membuat title
// di bawah minimum.
function filterTitle(title: string, terms: string[]): { title: string; warned: boolean } {
  const words = title.split(/\s+/).filter(Boolean)
  const isBanned = (w: string) => terms.includes(w.toLowerCase().replace(/[^a-z0-9]/gi, ''))
  const withoutBanned = words.filter((w) => !isBanned(w))
  if (withoutBanned.length < 3) {
    return { title, warned: words.some(isBanned) }
  }
  return { title: withoutBanned.join(' '), warned: false }
}

// ── Form state helpers ───────────────────────────────────────────────────

function getCurrentCategoryTitle(): string {
  const input = document.querySelector('[data-testid="category-input"] input') as HTMLInputElement | null
  return input ? input.value.trim() : ''
}

function getSelectedLicense(): string | null {
  const checked = document.querySelector('input[name=":ra:"]:checked') as HTMLInputElement | null
  return checked ? checked.value : null
}

// Default Free HANYA jika kosong — jangan override pilihan manual (Pro tetap Pro)
function setLicenseFreeIfUnset(): void {
  if (getSelectedLicense()) return
  const freeRadio = document.querySelector('input[name=":ra:"][value="free"]') as HTMLInputElement | null
  freeRadio?.click()
}

// Description field hanya ada di kategori Bundle (Photo tidak punya) —
// dicari via heading text karena selector pasti tidak pernah terkonfirmasi.
function findDescriptionField(): HTMLTextAreaElement | HTMLInputElement | null {
  const labels = Array.from(document.querySelectorAll('h6, label, span'))
  const heading = labels.find((el) => (el.textContent || '').trim().toLowerCase().startsWith('description'))
  if (!heading) return null
  const container = heading.closest('div')
  return container
    ? (container.querySelector('textarea, input[type="text"]') as HTMLTextAreaElement | HTMLInputElement | null)
    : null
}

function isBundleCategory(categoryTitle: string): boolean {
  const t = categoryTitle.trim().toLowerCase()
  return t === 'bundle' || t === 'bundles'
}

// ── AI-Generated checkbox + dropdown tool ────────────────────────────────
// Centang checkbox → muncul dropdown WAJIB "which AI tool". Dropdown kosong =
// submit button mati permanen = form rusak. Gagal pilih → REVERT checkbox.

async function selectAiToolOption(dropdown: HTMLElement, section: HTMLElement): Promise<boolean> {
  dispatchFullClick(dropdown)
  // Match on data-value (bukan teks — "DALL•E" pakai bullet char, bukan hyphen).
  // Filter data-value kosong agar Google Places suggestion (role=option tanpa
  // data-value scheme Vecteezy) tidak ikut. Polling memberi ruang animasi menu.
  const findRealOptions = () => {
    const found = Array.from(document.querySelectorAll('[role="option"], option')).filter(
      (o) => o.getAttribute('aria-disabled') !== 'true' && o.getAttribute('data-value')
    ) as HTMLElement[]
    return found.length ? found : null
  }
  const options = await waitForElement(findRealOptions, { timeout: 2000, interval: 150 })
  if (!options) {
    const allOptionLike = document.querySelectorAll('[role="option"], option').length
    debugLog(`selectAiToolOption: tidak ada option dengan data-value (total ${allOptionLike} elemen option-like)`)
    return false
  }
  let chosen: HTMLElement | null = null
  for (const value of AI_TOOL_PRIORITY) {
    const match = options.find((o) => o.getAttribute('data-value') === value)
    if (match) { chosen = match; break }
  }
  if (!chosen) {
    debugLog(`selectAiToolOption: tidak ada match prioritas, fallback ke option pertama: "${options[0].textContent?.trim()}"`)
    chosen = options[0]
  }
  const chosenLabel = chosen.textContent!.trim()
  dispatchFullClick(chosen)

  // Jangan percaya "sudah diklik" — verifikasi trigger text benar-benar berubah
  const confirmed = await waitForElement(() => {
    const live = section.querySelector('[role="button"][aria-haspopup="listbox"]')
    return live && live.textContent!.trim() === chosenLabel ? live : null
  }, { timeout: 1500, interval: 100 })
  if (!confirmed) {
    debugLog(`selectAiToolOption: klik "${chosenLabel}" tapi trigger text tidak berubah`)
    return false
  }
  return true
}

async function applyAiGeneratedFlag(): Promise<void> {
  const section = document.querySelector('[data-testid="ai-generated-section"]')
  if (!section) return
  const checkbox = section.querySelector('input[type="checkbox"][value="ai_generated"]') as HTMLInputElement | null
  if (!checkbox) return
  if (!settings.vz_ai_generated) return // toggle OFF — biarkan state apa adanya
  if (checkbox.checked) return // sudah diset

  checkbox.click()
  const dropdown = await waitForElement(
    () => section.querySelector('[role="button"][aria-haspopup="listbox"]') as HTMLElement | null,
    { timeout: 3000, interval: 100 }
  )
  if (!dropdown) {
    debugLog('applyAiGeneratedFlag: revert checkbox — dropdown tool tidak ketemu')
    checkbox.click() // revert
    await wait(100)
    showToast('Vecteezy: AI-Generated dilewati (dropdown tool tidak ditemukan)', 'error')
    return
  }
  const applied = await selectAiToolOption(dropdown, section as HTMLElement)
  if (!applied) {
    debugLog('applyAiGeneratedFlag: revert checkbox — tidak ada opsi tool yang bisa dipilih')
    checkbox.click() // revert
    await wait(100)
    showToast('Vecteezy: AI-Generated dilewati (tidak ada opsi tool yang cocok)', 'error')
  }
}

// ── API call (langsung ke server kita, sama seperti shutterstock.ts) ─────

async function fetchMetadata(
  imageUrl: string,
  filename: string,
  recentTitles: string[] = []
): Promise<any> {
  const st = await chrome.storage.local.get(['activation_code'])
  if (!st.activation_code) {
    return { ok: false, error: 'not_logged_in' }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  try {
    const response = await fetch('https://autofillstock.my.id/api/extension/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activationCode: st.activation_code,
        filename,
        platform: 'vecteezy',
        imageUrl,
        recentTitles,
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
  imageUrl: string,
  filename: string,
  recentTitles: string[] = []
): Promise<any> {
  let result = await fetchMetadata(imageUrl, filename, recentTitles)
  let attempts = 1
  while (!result?.ok && !PERMANENT_ERRORS.includes(result?.error) && attempts < 3) {
    const rateLimited = isRateLimitError(result)
    debugLog(`fetchMetadataWithRetry attempt ${attempts} FAILED — waiting ${rateLimited ? RATE_LIMIT_RETRY_MS : 800}ms`)
    await wait(rateLimited ? RATE_LIMIT_RETRY_MS : 800)
    result = await fetchMetadata(imageUrl, filename, recentTitles)
    attempts++
  }
  return result
}

// ── Process 1 resource ────────────────────────────────────────────────────

interface ProcessResult { status: 'success' | 'failed' | 'skipped'; reason?: string; filename: string; warned?: boolean; saved?: boolean; message?: string }

// Reason yang return SEBELUM msg generate — tidak ada network call, jadi
// inter-request delay tidak perlu.
const NO_NETWORK_REASONS = ['select_or_verify_failed', 'editorial_not_supported', 'unsupported_category']

async function processResource(resource: VzResource): Promise<ProcessResult> {
  const filename = getResourceFilename(resource)

  const selected = await selectResource(resource)
  if (!selected) return { status: 'failed', reason: 'select_or_verify_failed', filename }

  if (getSelectedLicense() === 'editorial') {
    // Format title Editorial ("City, State, Country, Year - description")
    // tidak dibangun di v1 — dan Editorial dilarang AI per aturan Vecteezy.
    return { status: 'skipped', reason: 'editorial_not_supported', filename }
  }

  if (!document.querySelector('#title-input')) {
    // DOM kategori Video/Motion Graphic tidak pernah terkonfirmasi —
    // bail out rapi, jangan asumsikan markup Photo berlaku.
    return { status: 'skipped', reason: 'unsupported_category', filename }
  }

  const genRes = await fetchMetadataWithRetry(
    resource.preview_url || '',
    filename,
    recentTitles.slice(-15)
  )

  if (!genRes?.ok) {
    return { status: 'failed', reason: genRes?.error || 'generate_failed', filename }
  }
  if (!genRes.data || typeof genRes.data.title !== 'string') {
    return { status: 'failed', reason: 'malformed_generate_response', filename }
  }

  // ── Sanitasi ──
  const terms = await getProhibitedTerms()
  const { title: safeTitle, warned: titleWarned } = filterTitle(genRes.data.title, terms)
  const keywordList = (Array.isArray(genRes.data.keywords) ? genRes.data.keywords : String(genRes.data.keywords || '').split(','))
    .map((k: string) => sanitizeKeyword(k.trim()))
    .filter(Boolean)
  const { keywords: safeKeywords, warned: keywordsWarned } = filterKeywords(keywordList, terms)
  const warned = titleWarned || keywordsWarned

  // ── Side effects DULU — radio/checkbox bisa memicu panel re-render yang
  // menghapus isian; fill fields harus jadi mutasi TERAKHIR sebelum return.
  setLicenseFreeIfUnset()
  await applyAiGeneratedFlag()

  fillMUI('#title-input', safeTitle)
  const titleOk = await verifyFieldValue('#title-input', safeTitle)

  const keywordsCommitted = await fillKeywordsOneAtATime('[data-testid="tagger-input"] input', safeKeywords)
  const keywordsOk = keywordsCommitted === safeKeywords.length
  if (!keywordsOk) {
    debugLog(`processResource: hanya ${keywordsCommitted}/${safeKeywords.length} keyword committed untuk ${filename}`)
  }

  // Description hanya untuk kategori Bundle — gagal di sini non-fatal
  const category = getCurrentCategoryTitle()
  if (isBundleCategory(category)) {
    const descField = findDescriptionField()
    if (descField && genRes.data.description) {
      const descSelector = descField.id ? `#${CSS.escape(descField.id)}` : null
      if (descSelector) {
        fillMUI(descSelector, genRes.data.description)
        const descOk = await verifyFieldValue(descSelector, genRes.data.description)
        if (!descOk) debugLog(`processResource: description verify gagal untuk ${filename}, tidak gagalkan resource`)
      } else {
        showToast(`Vecteezy: Description field tanpa id, dilewati untuk ${filename}`, 'error')
      }
    } else {
      showToast(`Vecteezy: Description field tidak ditemukan untuk ${filename} (Bundle)`, 'error')
    }
  }

  // Anti-duplikasi batch — track TITLE (yang benar-benar diisi ke form)
  recentTitles.push(safeTitle)
  if (recentTitles.length > 15) recentTitles.shift()

  const saveClicked = await clickSaveChanges(resource)
  if (!saveClicked) {
    showToast(`Vecteezy: tombol save tidak ditemukan untuk ${filename}, perubahan mungkin belum tersimpan`, 'error')
  }

  if (!titleOk || !keywordsOk) {
    return { status: 'failed', reason: 'verify_after_fill_failed', filename, warned }
  }
  return { status: 'success', filename, warned, saved: saveClicked }
}

// ── Batch runner: scan unfilled → proses semua ───────────────────────────

async function runAutoFillMode(): Promise<void> {
  if (running) return
  running = true
  try {
    const resources = await fetchUnfilledResources()
    if (!resources.length) {
      showToast('Vecteezy: tidak ada resource yang perlu diisi', 'info')
      return
    }
    showToast(`Vecteezy: memproses ${resources.length} resource...`, 'info')

    let successCount = 0, failCount = 0, skipCount = 0, warnedCount = 0
    let quotaStoppedReason: string | null = null
    const totalResources = resources.length

    for (const resource of resources) {
      if (!running) break

      const result = await processResource(resource)
      debugLog('runAutoFillMode item result:', result)

      if (result.warned) warnedCount++

      if (result.status === 'success') {
        successCount++
      } else if (result.status === 'skipped') {
        skipCount++
      } else if (QUOTA_ERROR_MESSAGES[result.reason || '']) {
        quotaStoppedReason = result.reason!
        break // quota ditolak → stop batch, jangan terus retry
      } else {
        failCount++
      }

      if (!NO_NETWORK_REASONS.includes(result.reason || '')) {
        await wait(GENERATE_DELAY_MS)
      }
    }

    const warnedSuffix = warnedCount > 0 ? `, ${warnedCount} perlu dicek manual` : ''
    let summary = `Vecteezy: ${successCount} berhasil, ${failCount} gagal, ${skipCount} dilewati${warnedSuffix}`
    if (quotaStoppedReason) {
      const remaining = totalResources - (successCount + failCount + skipCount)
      summary = `${QUOTA_ERROR_MESSAGES[quotaStoppedReason]} (${successCount} berhasil, ${failCount} gagal, ${skipCount} dilewati, ${remaining} belum diproses)`
    }
    showToast(summary, quotaStoppedReason ? 'error' : successCount > 0 ? 'success' : 'info')
  } catch (err) {
    console.error('[Autofillstock VZ] runAutoFillMode unexpected error:', err)
    showToast('Vecteezy: unexpected error, batch stop — cek console', 'error')
  } finally {
    running = false
  }
}

// ── Inline button injection ───────────────────────────────────────────────

let injectDebounceTimer: ReturnType<typeof setTimeout> | null = null
function scheduleInject(): void {
  if (injectDebounceTimer) return
  injectDebounceTimer = setTimeout(() => {
    injectDebounceTimer = null
    tryInject()
  }, 250)
}

function tryInject(): void {
  if (!settings.vz_enabled) return
  if (document.getElementById('asaf-vz-btn')) return

  const anchor = document.querySelector('[data-testid="grid-size-toggles"]') as HTMLElement | null
  if (!anchor?.parentElement) return

  const btn = document.createElement('button')
  btn.id = 'asaf-vz-btn'
  btn.type = 'button'
  btn.style.cssText = `
    background: linear-gradient(135deg, #10b981, #06b6d4);
    color: #022c22;
    border: none;
    border-radius: 8px;
    padding: 8px 14px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s;
    margin-right: 8px;
    font-family: Inter, system-ui, sans-serif;
  `
  btn.textContent = '▶ Run Batch'
  btn.addEventListener('click', () => {
    if (!running) runAutoFillMode()
  })
  anchor.parentElement.insertBefore(btn, anchor)
}

// ── Bootstrap ─────────────────────────────────────────────────────────────

const domObserver = new MutationObserver(scheduleInject)
domObserver.observe(document.body, { childList: true, subtree: true })
window.addEventListener('pagehide', () => domObserver.disconnect())
refreshSettingsCache().then(tryInject)

// Single generate — pilih resource pertama yang unfilled, proses HANYA itu.
async function runSingleGenerate(): Promise<void> {
  if (running) return
  running = true
  try {
    const resources = await fetchUnfilledResources()
    if (!resources.length) {
      showToast('Vecteezy: tidak ada resource yang perlu diisi', 'info')
      return
    }
    const result = await processResource(resources[0])
    if (result.status === 'success') {
      showToast(`Vecteezy: ${result.filename} berhasil diisi${result.warned ? ' (perlu cek manual)' : ''}`, 'success')
    } else if (result.status === 'skipped') {
      showToast('Vecteezy: item dilewati (tidak didukung)', 'info')
    } else {
      const msg = (result as any).message || QUOTA_ERROR_MESSAGES[result.reason || ''] || 'gagal diisi — cek console'
      showToast(`Vecteezy: ${result.filename} — ${msg}`, 'error')
    }
  } catch (err) {
    console.error('[Autofillstock VZ] runSingleGenerate error:', err)
    showToast('Vecteezy: unexpected error — cek console', 'error')
  } finally {
    running = false
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Pesan dari popup (konsisten dengan Adobe/Shutterstock)
  if (message?.type === 'RUN_SINGLE_GENERATE') {
    if (!running) runSingleGenerate()
    sendResponse({ ok: true })
    return true
  }
  if (message?.type === 'RUN_BATCH_GENERATE') {
    if (!running) runAutoFillMode()
    sendResponse({ ok: true })
    return true
  }
  if (message?.type === 'STOP_GENERATE') {
    running = false
    sendResponse({ ok: true })
    return true
  }
  if (message?.type === 'GET_RUN_STATUS') {
    sendResponse({ ok: true, running })
    return true
  }
})

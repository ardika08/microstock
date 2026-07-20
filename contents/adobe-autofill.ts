import type { PlasmoCSConfig } from "plasmo"
import iconUrl from "data-base64:~assets/icon.png"

import { generateMetadata, generateMetadataViaServer } from "~/lib/openai"
import { getSettings, updateSettings } from "~/lib/storage"
import type { AppSettings, AutofillMessage, MetadataResult } from "~/lib/types"

export const config: PlasmoCSConfig = {
  matches: [
    "https://contributor.stock.adobe.com/*",
    "https://stock.adobe.com/*",
    "https://submit.shutterstock.com/*",
    "https://contributor-accounts.shutterstock.com/*"
  ],
  run_at: "document_idle"
}

type FillTarget = HTMLInputElement | HTMLTextAreaElement | HTMLElement

const FIELD_SELECTORS = {
  title: [
    'input[name="title"]',
    'textarea[name="title"]',
    'textarea[placeholder*="title" i]',
    'input[placeholder*="title" i]',
    'textarea[aria-label*="title" i]',
    'input[aria-label*="title" i]',
    '[data-testid*="title" i] input',
    '[data-testid*="title" i] textarea',
    'textarea[maxlength="200"]'
  ],
  description: [
    'textarea[name="description"]',
    'input[name="description"]',
    '[data-testid*="description" i] textarea',
    '[data-testid*="description" i] input',
    'textarea[placeholder*="description" i]'
  ],
  keywords: [
    'textarea[name="keywords"]',
    'input[name="keywords"]',
    'textarea[placeholder*="keyword" i]',
    'input[placeholder*="keyword" i]',
    'textarea[aria-label*="keyword" i]',
    'input[aria-label*="keyword" i]',
    '[data-testid*="keyword" i] textarea',
    '[data-testid*="keyword" i] input',
    '[class*="keyword" i] textarea',
    '[class*="keyword" i] input'
  ],
  category: [
    'select[name="category"]',
    '[data-testid*="category" i] select',
    'select[aria-label*="category" i]'
  ]
}

const SHUTTERSTOCK_SELECTORS = {
  description: 'textarea[name="description"]',
  keywordInput: 'input[placeholder="Add keyword, separated by a comma or semicolon"]',
  assetMedia: 'img[data-testid^="card-media-"]',
  category1: '#mui-component-select-category1, [aria-labelledby="mui-component-select-category1"]',
  backdrop: ".MuiBackdrop-root.MuiModal-backdrop"
}

const SHUTTERSTOCK_CATEGORIES = [
  "Animals/Wildlife",
  "Arts",
  "Backgrounds/Textures",
  "Buildings/Landmarks",
  "Business/Finance",
  "Education",
  "Food and drink",
  "Healthcare/Medical",
  "Holidays",
  "Industrial",
  "Nature",
  "Objects",
  "People",
  "Religion",
  "Science",
  "Signs/Symbols",
  "Sports/Recreation",
  "Technology",
  "Transportation"
]

const emptyMetadata: MetadataResult = {
  title: "",
  description: "",
  keywords: [],
  category: ""
}

const PANEL_HOST_ID = "adobestock-autofill-trigger"
const PANEL_STYLE_ID = "adobestock-autofill-layout-style"
const PANEL_WIDTH = 345
const CONTENT_SHIFT_WIDTH = 345
const BATCH_DELAY_MS = 5000

function queryFirst(selectors: string[]) {
  for (const selector of selectors) {
    const element = document.querySelector(selector)
    if (element) {
      return element as FillTarget
    }
  }

  return null
}

function isVisible(element: Element) {
  const rect = element.getBoundingClientRect()
  const style = window.getComputedStyle(element)

  return (
    rect.width > 20 &&
    rect.height > 20 &&
    style.display !== "none" &&
    style.visibility !== "hidden"
  )
}

function isUploadSubmitPage() {
  const text = document.body.innerText || ""

  return (
    /Submit\s+\d+\s+files?/i.test(text) &&
    /Include in submission/i.test(text) &&
    /File type/i.test(text) &&
    /KEYWORDS/i.test(text)
  )
}

function isShutterstockUploadPage() {
  const text = document.body.innerText || ""

  return (
    location.hostname.includes("submit.shutterstock.com") &&
    /shutterstock\s*contributor/i.test(text) &&
    /Not submitted/i.test(text) &&
    Boolean(document.querySelector(SHUTTERSTOCK_SELECTORS.description)) &&
    Boolean(document.querySelector(SHUTTERSTOCK_SELECTORS.keywordInput))
  )
}

function getCurrentPlatform(settings?: Pick<AppSettings, "selected_microstock">) {
  if (settings?.selected_microstock === "shutterstock" || isShutterstockUploadPage()) {
    return "shutterstock" as const
  }

  return "adobe_stock" as const
}

function removeFloatingPanel() {
  document.getElementById(PANEL_HOST_ID)?.remove()
  document.getElementById(PANEL_STYLE_ID)?.remove()
  document.documentElement.style.removeProperty("--asaf-panel-width")
  document.documentElement.style.removeProperty("--asaf-content-shift")
  document.documentElement.classList.remove("asaf-panel-active")
}

type SupportedRuntimePlatform = "adobe_stock" | "shutterstock"

function getCompletionCopy(platform: SupportedRuntimePlatform, processed: number) {
  if (platform === "shutterstock") {
    return {
      title: "GENERATE SELESAI",
      message: `Sebanyak ${processed} aset Shutterstock telah diproses. Cek metadata, lalu klik Save atau Submit jika sudah siap.`
    }
  }

  return {
    title: "GENERATE SELESAI",
    message: `Sebanyak ${processed} aset telah diproses. Jangan lupa tekan tombol SAVE WORK di kiri bawah.`
  }
}

async function notifyBatchComplete(processed: number, platform: SupportedRuntimePlatform) {
  if (typeof chrome === "undefined" || !chrome.runtime) {
    return
  }

  try {
    await chrome.runtime.sendMessage({
      type: "ADOBESTOCK_NOTIFY_COMPLETE",
      payload: { processed, platform }
    })
  } catch {
    // Notification is a convenience; keep batch success independent from it.
  }
}

function showCompletionModal(processed: number, platform: SupportedRuntimePlatform) {
  const existing = document.getElementById("adobestock-autofill-complete-modal")
  if (existing) {
    existing.remove()
  }
  const copy = getCompletionCopy(platform, processed)

  const modal = document.createElement("div")
  modal.id = "adobestock-autofill-complete-modal"
  modal.style.position = "fixed"
  modal.style.inset = "0"
  modal.style.zIndex = "2147483647"
  modal.style.display = "grid"
  modal.style.placeItems = "center"
  modal.style.background = "rgba(0, 0, 0, 0.6)"
  modal.style.backdropFilter = "blur(8px)"
  modal.style.fontFamily =
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

  modal.innerHTML = `
    <div style="
      width: min(420px, calc(100vw - 32px));
      border-radius: 20px;
      background: rgba(13, 17, 23, 0.65);
      backdrop-filter: blur(40px) saturate(1.2);
      -webkit-backdrop-filter: blur(40px) saturate(1.2);
      color: #e2e8f0;
      border: 1px solid rgba(255,255,255,0.12);
      padding: 36px 28px 28px;
      text-align: center;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.04) inset;
      font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    ">
      <div style="
        width: 56px; height: 56px; margin: 0 auto 18px;
        border-radius: 16px;
        background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.15));
        border: 1px solid rgba(16,185,129,0.25);
        display: grid; place-items: center;
        font-size: 28px; color: #34d399;
      ">✓</div>
      <div style="font-size: 16px; font-weight: 700; margin-bottom: 12px; color: #f8fafc;">
        ${copy.title}
      </div>
      <div style="font-size: 14px; line-height: 1.6; color: #94a3b8;">
        ${copy.message || ""}
      </div>
      <div style="margin-top: 18px; font-size: 11px; color: #475569;">autofillstock.my.id</div>
    </div>
  `

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.remove()
    }
  })

  document.documentElement.appendChild(modal)
}

function panelWidthCss() {
  return `${PANEL_WIDTH}px`
}

function contentShiftCss() {
  return `${CONTENT_SHIFT_WIDTH}px`
}

function shouldShowPanel(settings: AppSettings) {
  if (!settings.panel_enabled) {
    return false
  }

  if (settings.selected_microstock === "adobe_stock") {
    return isUploadSubmitPage()
  }

  if (settings.selected_microstock === "shutterstock") {
    return isShutterstockUploadPage()
  }

  return false
}

function queryKeywordField() {
  if (isShutterstockUploadPage()) {
    const shutterstockKeywordInput = document.querySelector<HTMLInputElement>(
      SHUTTERSTOCK_SELECTORS.keywordInput
    )

    if (shutterstockKeywordInput && isVisible(shutterstockKeywordInput)) {
      return shutterstockKeywordInput
    }
  }

  const matched = queryFirst(FIELD_SELECTORS.keywords)
  if (matched && isVisible(matched)) {
    return matched
  }

  const titleField = queryFirst(FIELD_SELECTORS.title)
  const titleBottom = titleField?.getBoundingClientRect().bottom || 0
  const candidates = Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      "textarea, input[type='text'], [contenteditable='true']"
    )
  ).filter((element) => {
    const rect = element.getBoundingClientRect()
    const placeholder =
      element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
        ? element.placeholder
        : ""

    return (
      isVisible(element) &&
      rect.bottom > titleBottom &&
      !placeholder.toLowerCase().includes("title") &&
      !placeholder.toLowerCase().includes("search")
    )
  })

  return candidates.sort(
    (first, second) => first.getBoundingClientRect().top - second.getBoundingClientRect().top
  )[0] as FillTarget | undefined
}

function getInputValue(element: FillTarget | null | undefined) {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.value
  }

  return element?.textContent || ""
}

function dispatchFormEvents(element: Element) {
  element.dispatchEvent(
    typeof InputEvent !== "undefined"
      ? new InputEvent("input", {
          bubbles: true,
          data: null,
          inputType: "insertText"
        })
      : new Event("input", { bubbles: true })
  )
  element.dispatchEvent(new Event("change", { bubbles: true }))
  element.dispatchEvent(new Event("blur", { bubbles: true }))
}

function setNativeValue(element: FillTarget, value: string) {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    element.focus()
    const prototype =
      element instanceof HTMLInputElement
        ? HTMLInputElement.prototype
        : HTMLTextAreaElement.prototype
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value")

    descriptor?.set?.call(element, value)
    element.value = value
    dispatchFormEvents(element)
    return true
  }

  if (element instanceof HTMLSelectElement) {
    const option = Array.from(element.options).find((item) =>
      item.text.toLowerCase().trim() === value.toLowerCase().trim()
    )

    if (!option) {
      return false
    }

    element.value = option.value
    dispatchFormEvents(element)
    return true
  }

  if (element.isContentEditable) {
    element.textContent = value
    dispatchFormEvents(element)
    return true
  }

  return false
}

function clampAdobeTitle(value: string) {
  const cleaned = value.replace(/\s+/g, " ").trim()

  if (cleaned.length <= 190) {
    return cleaned
  }

  const sliced = cleaned.slice(0, 190)
  const lastSpace = sliced.lastIndexOf(" ")
  return sliced.slice(0, lastSpace > 80 ? lastSpace : 190).trim()
}

function getShutterstockCardFromMedia(media: HTMLElement) {
  let current: HTMLElement | null = media
  let best: HTMLElement = media

  for (let depth = 0; current && depth < 7; depth += 1) {
    const rect = current.getBoundingClientRect()
    const hasFileStatus = /Needs attention|Submitted|Rejected|Pending/i.test(
      current.textContent || ""
    )

    if (
      isVisible(current) &&
      rect.width >= 180 &&
      rect.width <= 420 &&
      rect.height >= 150 &&
      rect.height <= 360 &&
      hasFileStatus
    ) {
      best = current
    }

    if (!current.parentElement || current.parentElement === document.body) {
      break
    }

    current = current.parentElement
  }

  return best
}

function getShutterstockAssetCards() {
  const mediaElements = Array.from(
    document.querySelectorAll<HTMLElement>(SHUTTERSTOCK_SELECTORS.assetMedia)
  ).filter((media) => isVisible(media) && !media.closest(`#${PANEL_HOST_ID}`))
  const cards = mediaElements.map(getShutterstockCardFromMedia)
  const uniqueCards = Array.from(new Set(cards))

  return uniqueCards.sort((first, second) => {
    const firstRect = first.getBoundingClientRect()
    const secondRect = second.getBoundingClientRect()

    return firstRect.top - secondRect.top || firstRect.left - secondRect.left
  })
}

function getShutterstockActiveFileName() {
  const detailFileName = getShutterstockDetailFileName()
  if (detailFileName) {
    return detailFileName
  }

  const selectedCard = getExplicitSelectedAssetCard(getShutterstockAssetCards())
  const media =
    selectedCard?.querySelector<HTMLImageElement>(SHUTTERSTOCK_SELECTORS.assetMedia) ||
    document.querySelector<HTMLImageElement>(SHUTTERSTOCK_SELECTORS.assetMedia)

  return (
    media?.dataset.testid?.replace(/^card-media-/, "").trim() ||
    media?.getAttribute("data-testid")?.replace(/^card-media-/, "").trim() ||
    ""
  )
}

function getShutterstockDetailFileName() {
  const detailTitle = Array.from(document.querySelectorAll<HTMLElement>("h1, h2, h3, strong, p"))
    .map((element) => (element.textContent || "").trim())
    .find((text) => /\.(mov|mp4|jpg|jpeg|png|eps|ai)$/i.test(text))

  return detailTitle || ""
}

function normalizeShutterstockCategory(metadata: MetadataResult) {
  const activeFileName = getShutterstockActiveFileName()
  const primaryContext = [activeFileName, metadata.title].join(" ").toLowerCase()
  const haystack = [
    activeFileName,
    metadata.category,
    metadata.title,
    metadata.description,
    metadata.keywords.join(" ")
  ]
    .join(" ")
    .toLowerCase()

  const includesAny = (patterns: RegExp[]) => patterns.some((pattern) => pattern.test(haystack))
  const primaryIncludesAny = (patterns: RegExp[]) =>
    patterns.some((pattern) => pattern.test(primaryContext))

  if (primaryIncludesAny([/background|texture|gradient|abstract|pattern|wallpaper|backdrop|surface/])) return "Backgrounds/Textures"
  if (primaryIncludesAny([/technology|digital|computer|software|network|data|ai|robot|cyber/])) return "Technology"
  if (primaryIncludesAny([/art|design|illustration|graphic|creative|paint|drawing/])) return "Arts"

  const exactMatch = SHUTTERSTOCK_CATEGORIES.find(
    (category) => category.toLowerCase() === metadata.category.toLowerCase().trim()
  )

  if (exactMatch) {
    return exactMatch
  }

  if (includesAny([/background|texture|gradient|abstract|pattern|wallpaper|backdrop|surface/])) return "Backgrounds/Textures"
  if (includesAny([/animal|wildlife|pet|bird|fish|dog|cat|insect/])) return "Animals/Wildlife"
  if (includesAny([/building|landmark|architecture|city|urban|house|interior|exterior/])) return "Buildings/Landmarks"
  if (includesAny([/business|finance|money|office|corporate|market|investment|economy/])) return "Business/Finance"
  if (includesAny([/education|school|student|learning|classroom|teacher|book/])) return "Education"
  if (includesAny([/food|drink|beverage|meal|restaurant|fruit|coffee/])) return "Food and drink"
  if (includesAny([/health|medical|doctor|medicine|hospital|wellness|clinic/])) return "Healthcare/Medical"
  if (includesAny([/holiday|christmas|halloween|easter|valentine|celebration|festival/])) return "Holidays"
  if (includesAny([/industrial|factory|machine|manufacturing|construction|engineering/])) return "Industrial"
  if (includesAny([/nature|landscape|forest|flower|plant|mountain|ocean|sky|water/])) return "Nature"
  if (includesAny([/object|product|item|tool|device|equipment|isolated/])) return "Objects"
  if (includesAny([/people|person|woman|man|child|family|portrait|human/])) return "People"
  if (includesAny([/religion|church|mosque|temple|spiritual|faith/])) return "Religion"
  if (includesAny([/science|laboratory|research|chemistry|biology|physics|space/])) return "Science"
  if (includesAny([/sign|symbol|icon|label|arrow|warning|infographic/])) return "Signs/Symbols"
  if (includesAny([/sport|fitness|exercise|game|recreation|athlete|ball/])) return "Sports/Recreation"
  if (includesAny([/technology|digital|computer|software|network|data|ai|robot|cyber/])) return "Technology"
  if (includesAny([/transport|car|vehicle|truck|train|plane|ship|traffic/])) return "Transportation"
  if (includesAny([/art|design|illustration|graphic|creative|paint|drawing/])) return "Arts"

  return "Arts"
}

function dispatchPointerMouseSequence(target: HTMLElement, clientX: number, clientY: number) {
  for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
    const eventInit = {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      view: window
    }

    if (type.startsWith("pointer") && typeof PointerEvent !== "undefined") {
      target.dispatchEvent(
        new PointerEvent(type, {
          ...eventInit,
          pointerId: 1,
          pointerType: "mouse",
          isPrimary: true
        })
      )
    } else {
      target.dispatchEvent(new MouseEvent(type, eventInit))
    }
  }
}

async function openShutterstockCategoryMenu(categorySelect: HTMLElement) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const rect = categorySelect.getBoundingClientRect()
    const clientX = rect.right - 14
    const clientY = rect.top + rect.height / 2
    const target = document.elementFromPoint(clientX, clientY)
    const clickTarget =
      target instanceof HTMLElement && !target.closest(`#${PANEL_HOST_ID}`)
        ? target
        : categorySelect

    categorySelect.focus()
    dispatchPointerMouseSequence(clickTarget, clientX, clientY)
    dispatchPointerMouseSequence(categorySelect, clientX, clientY)
    await wait(250)

    if (
      document.querySelector(
        '[role="listbox"], .MuiMenu-paper, .MuiPopover-paper, ul.MuiList-root'
      )
    ) {
      return true
    }
  }

  return false
}

async function fillShutterstockCategory(metadata: MetadataResult) {
  const targetCategory = normalizeShutterstockCategory(metadata)
  const categorySelect = document.querySelector<HTMLElement>(
    SHUTTERSTOCK_SELECTORS.category1
  )

  if (!categorySelect) {
    return false
  }

  const currentCategory = categorySelect.textContent?.replace(/\u200B/g, "").trim() || ""
  if (currentCategory.toLowerCase() === targetCategory.toLowerCase()) {
    return true
  }

  const opened = await openShutterstockCategoryMenu(categorySelect)
  if (!opened) {
    return false
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const options = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[role="option"], .MuiMenuItem-root, li.MuiMenuItem-root, [data-value]'
      )
    ).filter((option) => {
      const text = option.textContent?.replace(/\u200B/g, "").trim() || ""

      return isVisible(option) && text === targetCategory
    })
    const option = options[0]

    if (option) {
      const rect = option.getBoundingClientRect()
      const target = document.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2
      )
      const clickTarget =
        target instanceof HTMLElement && !target.closest(`#${PANEL_HOST_ID}`)
          ? target
          : option

      dispatchPointerMouseSequence(clickTarget, rect.left + rect.width / 2, rect.top + rect.height / 2)
      dispatchPointerMouseSequence(option, rect.left + rect.width / 2, rect.top + rect.height / 2)
      option.click()
      await wait(500)
      const currentAfter =
        categorySelect.textContent?.replace(/\u200B/g, "").trim().toLowerCase() || ""

      if (currentAfter === targetCategory.toLowerCase()) {
        return true
      }

      return Boolean(
        Array.from(document.querySelectorAll<HTMLElement>("body *")).find(
          (element) =>
            element.textContent?.replace(/\u200B/g, "").trim() === targetCategory &&
            /select|category|value/i.test(`${element.className || ""} ${element.id || ""}`)
        )
      )
    }

    await wait(200)
  }

  return false
}

async function fillKeywordTokens(metadata: MetadataResult) {
  const value = metadata.keywords.join(", ")

  if (isShutterstockUploadPage()) {
    const keywordsField = document.querySelector<HTMLInputElement>(
      SHUTTERSTOCK_SELECTORS.keywordInput
    )

    if (!keywordsField) {
      return false
    }

    setNativeValue(keywordsField, value)
    keywordsField.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: ",",
        code: "Comma"
      })
    )
    keywordsField.dispatchEvent(
      new KeyboardEvent("keyup", {
        bubbles: true,
        cancelable: true,
        key: ",",
        code: "Comma"
      })
    )
    dispatchFormEvents(keywordsField)
    await wait(500)

    return true
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const keywordsField = queryKeywordField()
    if (!keywordsField) {
      await wait(300)
      continue
    }

    setNativeValue(keywordsField, value)
    await wait(250)

    const currentValue = getInputValue(keywordsField)
    if (currentValue.includes(metadata.keywords[0] || "") || currentValue.length > 20) {
      return true
    }
  }

  return false
}

async function autofill(metadata: MetadataResult) {
  if (isShutterstockUploadPage()) {
    const shutterstockMetadata = {
      ...metadata,
      category: normalizeShutterstockCategory(metadata)
    }
    const results = {
      description: false,
      keywords: false,
      category: false
    }
    const descriptionField = document.querySelector<HTMLTextAreaElement>(
      SHUTTERSTOCK_SELECTORS.description
    )

    if (descriptionField) {
      results.description = setNativeValue(descriptionField, shutterstockMetadata.description)
    }

    results.category = await fillShutterstockCategory(shutterstockMetadata)
    results.keywords = await fillKeywordTokens(shutterstockMetadata)
    await wait(250)

    if (!results.description && !results.keywords && !results.category) {
      throw new Error("Tidak menemukan field Shutterstock yang bisa diisi.")
    }

    return results
  }

  const results = {
    title: false,
    description: false,
    keywords: false,
    category: false
  }

  const titleField = queryFirst(FIELD_SELECTORS.title)
  if (titleField) {
    results.title = setNativeValue(
      titleField,
      clampAdobeTitle(metadata.description || metadata.title)
    )
  }

  const descriptionField = queryFirst(FIELD_SELECTORS.description)
  if (descriptionField) {
    results.description = setNativeValue(descriptionField, metadata.description)
  }

  results.keywords = await fillKeywordTokens(metadata)

  const categoryField = queryFirst(FIELD_SELECTORS.category)
  if (categoryField && metadata.category) {
    results.category = setNativeValue(categoryField, metadata.category)
  }

  await new Promise((resolve) => window.setTimeout(resolve, 250))

  const filledCount = Object.values(results).filter(Boolean).length
  if (filledCount === 0) {
    throw new Error("Tidak menemukan field Adobe Stock yang bisa diisi.")
  }

  return results
}

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  attributes: Record<string, string> = {},
  text?: string
) {
  const element = document.createElement(tagName)

  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value)
  }

  if (text) {
    element.textContent = text
  }

  return element
}

function readPageBrief() {
  if (isShutterstockUploadPage()) {
    const descriptionField = document.querySelector<HTMLTextAreaElement>(
      SHUTTERSTOCK_SELECTORS.description
    )
    const categoryField = document.querySelector<HTMLElement>(
      SHUTTERSTOCK_SELECTORS.category1
    )
    const fileName = getShutterstockActiveFileName()
    const keywordSuggestions = Array.from(document.querySelectorAll("button"))
      .filter((button) => button.textContent?.includes("+"))
      .map((button) => button.textContent?.replace("+", "").trim() || "")
      .filter((text) => text.length > 1 && text.length < 32)
      .slice(0, 30)
      .join(", ")
    const description = descriptionField?.value || ""
    const category = categoryField?.textContent?.replace(/\u200B/g, "").trim() || ""

    return [
      fileName ? `Original file name: ${fileName}` : "",
      keywordSuggestions ? `Keyword suggestions: ${keywordSuggestions}` : "",
      `Available Shutterstock categories: ${SHUTTERSTOCK_CATEGORIES.join(", ")}`,
      category ? `Current Shutterstock category: ${category}` : "",
      description ? `Existing description: ${description}` : ""
    ]
      .filter(Boolean)
      .join("\n")
      .trim()
  }

  const titleField = queryFirst(FIELD_SELECTORS.title)
  const descriptionField = queryFirst(FIELD_SELECTORS.description)
  const categoryField = queryFirst(FIELD_SELECTORS.category)

  const title =
    titleField instanceof HTMLInputElement || titleField instanceof HTMLTextAreaElement
      ? titleField.value
      : titleField?.textContent || ""
  const description =
    descriptionField instanceof HTMLInputElement ||
    descriptionField instanceof HTMLTextAreaElement
      ? descriptionField.value
      : descriptionField?.textContent || ""
  const category =
    categoryField instanceof HTMLSelectElement
      ? categoryField.selectedOptions[0]?.text || categoryField.value
      : ""
  const pageText = document.body.innerText || ""
  const originalName = pageText.match(/Original name\(s\):\s*([^\n]+)/i)?.[1]?.trim() || ""
  const keywordSuggestions = Array.from(document.querySelectorAll("button"))
    .filter((button) => button.textContent?.includes("+"))
    .map((button) => button.textContent?.replace("+", "").trim() || "")
    .filter((text) => text.length > 1 && text.length < 32)
    .slice(0, 24)
    .join(", ")

  return [
    originalName ? `Original file name: ${originalName}` : "",
    keywordSuggestions ? `Keyword suggestions: ${keywordSuggestions}` : "",
    category ? `Current Adobe category: ${category}` : "",
    title ? `Existing text: ${title}` : "",
    description ? `Existing description: ${description}` : ""
  ]
    .filter(Boolean)
    .join("\n")
    .trim()
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

async function waitWithCountdown(root: ShadowRoot, milliseconds: number) {
  const totalSeconds = Math.ceil(milliseconds / 1000)

  for (let remaining = totalSeconds; remaining > 0; remaining -= 1) {
    setFooterStatus(
      root,
      `Menunggu ${remaining} detik sebelum file berikutnya...`,
      "muted"
    )
    await wait(1000)
  }
}

function getAssetCards() {
  if (isShutterstockUploadPage()) {
    return getShutterstockAssetCards()
  }

  const gridRightLimit = Math.max(
    320,
    Math.min(window.innerWidth * 0.68, window.innerWidth - CONTENT_SHIFT_WIDTH - 420)
  )
  const isInAssetGrid = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect()

    return (
      isVisible(element) &&
      !element.closest(`#${PANEL_HOST_ID}`) &&
      rect.width >= 70 &&
      rect.width <= 320 &&
      rect.height >= 70 &&
      rect.height <= 320 &&
      rect.top > 80 &&
      rect.left >= 0 &&
      rect.left < gridRightLimit
    )
  }
  const isLikelyThumbnailSurface = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    const style = window.getComputedStyle(element)
    const backgroundColor = style.backgroundColor
    const backgroundImage = style.backgroundImage
    const className = String(element.className || "")
    const ariaLabel = element.getAttribute("aria-label") || ""
    const text = (element.textContent || "").trim()

    const hasMediaTag = ["IMG", "VIDEO", "CANVAS"].includes(element.tagName)
    const hasBackgroundImage = backgroundImage !== "none"
    const hasColorSurface =
      /rgb\((?:2[0-5]\d|1\d\d),\s*(?:[4-9]\d|1\d\d|2[0-5]\d),\s*(?:1[0-9]\d|2[0-5]\d)\)/.test(
        backgroundColor
      ) || /pink|thumbnail|asset|file|upload/i.test(`${className} ${ariaLabel}`)
    const isTileSized =
      rect.width >= 80 &&
      rect.width <= 260 &&
      rect.height >= 80 &&
      rect.height <= 260 &&
      rect.top > 80 &&
      rect.left >= 0 &&
      rect.left < gridRightLimit

    return (
      isTileSized &&
      text.length < 120 &&
      (hasMediaTag || hasBackgroundImage || hasColorSurface)
    )
  }

  const promoteToCard = (element: HTMLElement) => {
    let current: HTMLElement | null = element
    let best = element

    for (let depth = 0; current && depth < 5; depth += 1) {
      const rect = current.getBoundingClientRect()
      const parent = current.parentElement
      const text = (current.textContent || "").trim()
      const hasFormUi = Boolean(
        current.querySelector("input, textarea, select, button") ||
          /File type|Category|KEYWORDS|Recognizable people/i.test(text)
      )

      if (
        !hasFormUi &&
        rect.width >= 90 &&
        rect.width <= 300 &&
        rect.height >= 90 &&
        rect.height <= 300 &&
        rect.left < gridRightLimit
      ) {
        best = current
      }

      if (!parent || parent === document.body || parent.closest(`#${PANEL_HOST_ID}`)) {
        break
      }

      current = parent
    }

    return best
  }

  const mediaElements = Array.from(
    document.querySelectorAll<HTMLElement>(
      "img, video, canvas, div, li, article, [role='button'], [tabindex]"
    )
  ).filter((element) => {
    if (!isVisible(element) || element.closest(`#${PANEL_HOST_ID}`)) {
      return false
    }

    return isLikelyThumbnailSurface(element)
  })

  const isUsableAssetCard = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    const text = (element.textContent || "").trim()

    return (
      isInAssetGrid(element) &&
      rect.width >= 80 &&
      rect.height >= 80 &&
      !element.querySelector("input, textarea, select") &&
      !/File type|Category|KEYWORDS|Recognizable people|Submit/i.test(text)
    )
  }

  const candidates = mediaElements
    .map((element) => {
      const closestCard = element.closest<HTMLElement>(
        "[role='button'], button, [tabindex], li, article"
      )

      if (closestCard && isUsableAssetCard(closestCard)) {
        return closestCard
      }

      return promoteToCard(element)
    })
    .filter(isUsableAssetCard)

  const uniqueCards = Array.from(new Set(candidates)).filter(
    (candidate) =>
      !Array.from(new Set(candidates)).some((other) => {
        if (other === candidate || !other.contains(candidate)) {
          return false
        }

        const otherRect = other.getBoundingClientRect()
        const candidateRect = candidate.getBoundingClientRect()

        return otherRect.width <= candidateRect.width + 40
      })
  )

  const centerDedupedCards: HTMLElement[] = []

  for (const card of uniqueCards) {
    const rect = card.getBoundingClientRect()
    const centerX = Math.round(rect.left + rect.width / 2)
    const centerY = Math.round(rect.top + rect.height / 2)
    const duplicate = centerDedupedCards.some((existing) => {
      const existingRect = existing.getBoundingClientRect()
      const existingCenterX = Math.round(existingRect.left + existingRect.width / 2)
      const existingCenterY = Math.round(existingRect.top + existingRect.height / 2)

      return (
        Math.abs(existingCenterX - centerX) < 12 &&
        Math.abs(existingCenterY - centerY) < 12
      )
    })

    if (!duplicate) {
      centerDedupedCards.push(card)
    }
  }

  return centerDedupedCards.sort((first, second) => {
    const firstRect = first.getBoundingClientRect()
    const secondRect = second.getBoundingClientRect()
    return firstRect.top - secondRect.top || firstRect.left - secondRect.left
  })
}

function getSelectedAssetCard(cards = getAssetCards()) {
  return getExplicitSelectedAssetCard(cards) || cards[0]
}

function getExplicitSelectedAssetCard(cards = getAssetCards()) {
  return cards.find((card) => isSelectedAssetCard(card))
}

function getSelectedAssetIndex(cards = getAssetCards()) {
  const selectedCard = getSelectedAssetCard(cards)
  const selectedIndex = selectedCard ? cards.indexOf(selectedCard) : -1

  return selectedIndex >= 0 ? selectedIndex : 0
}

function extractAssetThumbnail(card = getSelectedAssetCard()) {
  if (!card) {
    return ""
  }

  const shutterstockMedia = card.querySelector<HTMLImageElement>(
    SHUTTERSTOCK_SELECTORS.assetMedia
  )

  if (shutterstockMedia?.currentSrc) {
    return shutterstockMedia.currentSrc
  }

  if (shutterstockMedia?.src) {
    return shutterstockMedia.src
  }

  const media = card.querySelector<HTMLImageElement | HTMLVideoElement>("img, video")
  if (media instanceof HTMLImageElement && media.currentSrc) {
    return media.currentSrc
  }

  if (media instanceof HTMLImageElement && media.src) {
    return media.src
  }

  if (media instanceof HTMLVideoElement && media.poster) {
    return media.poster
  }

  const withBackground = [card, ...Array.from(card.querySelectorAll<HTMLElement>("*"))].find(
    (element) => window.getComputedStyle(element).backgroundImage !== "none"
  )
  const backgroundImage = withBackground
    ? window.getComputedStyle(withBackground).backgroundImage
    : ""
  const match = backgroundImage.match(/url\(["']?(.*?)["']?\)/)

  return match?.[1] || ""
}

async function clickNextAssetCard() {
  const cards = getAssetCards()
  const current = getSelectedAssetCard(cards)
  const currentIndex = current ? cards.indexOf(current) : -1
  const nextCard = currentIndex >= 0 ? cards[currentIndex + 1] : undefined

  if (!nextCard) {
    return false
  }

  nextCard.scrollIntoView({ block: "center", inline: "center" })
  nextCard.click()
  await wait(900)
  return true
}

function isSelectedAssetCard(card: HTMLElement) {
  const text = `${card.className || ""} ${card.getAttribute("aria-selected") || ""}`
  const selectedStyleTargets = [
    card,
    ...Array.from(card.querySelectorAll<HTMLElement>("*")).slice(0, 12)
  ]
  const hasBlueSelectionStyle = selectedStyleTargets.some((element) => {
    const style = window.getComputedStyle(element)
    const colorText = `${style.borderColor} ${style.outlineColor} ${style.boxShadow}`
    const borderWidth = Number.parseFloat(style.borderTopWidth || "0")
    const outlineWidth = Number.parseFloat(style.outlineWidth || "0")
    const hasSelectionColor =
      /(?:0,\s*120,\s*255|37,\s*99,\s*235|20,\s*115,\s*230|38,\s*128,\s*235|0,\s*102,\s*255)/.test(
        colorText
      )

    return (
      hasSelectionColor &&
      (borderWidth >= 1 || outlineWidth >= 1 || style.boxShadow !== "none")
    )
  })

  return (
    card.getAttribute("aria-selected") === "true" ||
    /selected|active|current/i.test(text) ||
    hasBlueSelectionStyle
  )
}

function dispatchMouseSequence(target: HTMLElement, clientX: number, clientY: number) {
  for (const type of ["pointerdown", "mousedown", "mouseup", "click"]) {
    target.dispatchEvent(
      new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY,
        view: window
      })
    )
  }
}

async function clickAssetCard(card: HTMLElement) {
  card.scrollIntoView({ block: "center", inline: "center" })
  await wait(150)

  const clickableSurface =
    Array.from(card.querySelectorAll<HTMLElement>("img, video, canvas, div"))
      .filter((element) => {
        const rect = element.getBoundingClientRect()
        const style = window.getComputedStyle(element)
        const hasSurface =
          ["IMG", "VIDEO", "CANVAS"].includes(element.tagName) ||
          style.backgroundImage !== "none" ||
          style.backgroundColor !== "rgba(0, 0, 0, 0)"

        return (
          hasSurface &&
          rect.width >= 70 &&
          rect.height >= 70 &&
          rect.width <= 300 &&
          rect.height <= 260
        )
      })
      .sort((first, second) => {
        const firstRect = first.getBoundingClientRect()
        const secondRect = second.getBoundingClientRect()
        return secondRect.width * secondRect.height - firstRect.width * firstRect.height
      })[0] || card
  const rect = clickableSurface.getBoundingClientRect()
  const clientX = rect.left + rect.width / 2
  const clientY = rect.top + rect.height / 2
  const elementAtPoint = document.elementFromPoint(clientX, clientY)
  const target =
    elementAtPoint instanceof HTMLElement && !elementAtPoint.closest(`#${PANEL_HOST_ID}`)
      ? elementAtPoint
      : card

  dispatchMouseSequence(target, clientX, clientY)
  dispatchMouseSequence(card, clientX, clientY)
  await wait(700)
}

async function clickAssetCardAndWait(card: HTMLElement) {
  const targetFileName = isShutterstockUploadPage()
    ? card
        .querySelector<HTMLElement>(SHUTTERSTOCK_SELECTORS.assetMedia)
        ?.getAttribute("data-testid")
        ?.replace(/^card-media-/, "")
        .trim() || ""
    : ""

  await clickAssetCard(card)

  for (let attempt = 0; attempt < 16; attempt += 1) {
    if (targetFileName) {
      const detailFileName = getShutterstockDetailFileName()
      if (detailFileName && detailFileName === targetFileName) {
        return true
      }
    }

    const freshCards = getAssetCards()
    const selectedCard = getExplicitSelectedAssetCard(freshCards)
    const selectedRect = selectedCard?.getBoundingClientRect()
    const targetRect = card.getBoundingClientRect()
    const matchingCard = freshCards.find((freshCard) => {
      const rect = freshCard.getBoundingClientRect()

      return (
        Math.abs(rect.left - targetRect.left) < 8 &&
        Math.abs(rect.top - targetRect.top) < 8
      )
    })

    if (
      selectedRect &&
      Math.abs(selectedRect.left - targetRect.left) < 8 &&
      Math.abs(selectedRect.top - targetRect.top) < 8
    ) {
      return true
    }

    if (matchingCard && isSelectedAssetCard(matchingCard)) {
      return true
    }

    await wait(250)
  }

  return false
}

async function waitForAssetFormReady() {
  if (isShutterstockUploadPage()) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await wait(250)

      const descriptionField = document.querySelector<HTMLTextAreaElement>(
        SHUTTERSTOCK_SELECTORS.description
      )
      const keywordField = document.querySelector<HTMLInputElement>(
        SHUTTERSTOCK_SELECTORS.keywordInput
      )

      if (
        descriptionField &&
        keywordField &&
        isVisible(descriptionField) &&
        isVisible(keywordField)
      ) {
        await wait(500)
        return
      }
    }

    await wait(900)
    return
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    await wait(250)

    const titleField = queryFirst(FIELD_SELECTORS.title)
    const keywordField = queryKeywordField()

    if (titleField && keywordField && isVisible(titleField) && isVisible(keywordField)) {
      await wait(500)
      return
    }
  }

  await wait(900)
}

function getExpectedAssetCount() {
  const text = document.body.innerText || ""
  const shutterstockMatch =
    text.match(/Not submitted\s*\((\d+)\)/i) ||
    text.match(/(?:Images|Videos)\s*\((\d+)\)/i)
  const fileTypeMatch = text.match(/File types:\s*All\s*\((\d+)\)/i)
  const submitMatch = text.match(/Submit\s+(\d+)\s+files?/i)

  return Number(shutterstockMatch?.[1] || fileTypeMatch?.[1] || submitMatch?.[1] || 0)
}

function setFooterStatus(
  root: ShadowRoot,
  message: string,
  type: "success" | "error" | "muted" | "processing" = "muted"
) {
  const footer = root.querySelector<HTMLDivElement>("[data-asaf-footer]")
  if (!footer) {
    return
  }

  footer.textContent = message
  footer.dataset.type = type
}

function setLoadingPreview(root: ShadowRoot, assetIndex: number, totalAssets: number) {
  const categoryPreview = root.querySelector<HTMLParagraphElement>(
    "[data-asaf-category-preview]"
  )
  const titlePreview = root.querySelector<HTMLParagraphElement>("[data-asaf-title-preview]")
  const keywordPreview = root.querySelector<HTMLParagraphElement>(
    "[data-asaf-keyword-preview]"
  )
  const thumbnail = root.querySelector<HTMLImageElement>("[data-asaf-thumbnail]")
  const thumbnailPlaceholder = root.querySelector<HTMLDivElement>(
    "[data-asaf-thumbnail-placeholder]"
  )

  const thumbnailUrl = extractAssetThumbnail()
  if (thumbnailUrl && thumbnail) {
    thumbnail.src = thumbnailUrl
    thumbnail.hidden = false
    if (thumbnailPlaceholder) {
      thumbnailPlaceholder.hidden = true
    }
  } else if (thumbnailPlaceholder) {
    thumbnailPlaceholder.hidden = false
    if (thumbnail) {
      thumbnail.hidden = true
    }
  }

  if (categoryPreview) {
    const spinner = document.createElement("span")
    spinner.className = "asaf-spinner"
    categoryPreview.textContent = ""
    categoryPreview.appendChild(spinner)
    categoryPreview.appendChild(document.createTextNode(" Memproses kategori..."))
    categoryPreview.dataset.loading = "true"
  }

  if (titlePreview) {
    const spinner = document.createElement("span")
    spinner.className = "asaf-spinner"
    titlePreview.textContent = ""
    titlePreview.appendChild(spinner)
    titlePreview.appendChild(document.createTextNode(" Memproses judul..."))
    titlePreview.dataset.loading = "true"
  }

  if (keywordPreview) {
    const spinner = document.createElement("span")
    spinner.className = "asaf-spinner"
    keywordPreview.textContent = ""
    keywordPreview.appendChild(spinner)
    keywordPreview.appendChild(document.createTextNode(" Memproses keyword..."))
    keywordPreview.dataset.loading = "true"
  }

  setFooterStatus(root, `Memproses aset ke ${assetIndex}/${totalAssets}`, "processing")
}

function setBusy(root: ShadowRoot, busy: boolean, label = "Generate") {
  const generateButton = root.querySelector<HTMLButtonElement>("[data-asaf-generate]")

  if (generateButton) {
    generateButton.disabled = busy
    generateButton.textContent = busy ? "Generating..." : label
  }
}

function writeMetadataToPanel(root: ShadowRoot, metadata: MetadataResult) {
  const titlePreview = root.querySelector<HTMLParagraphElement>("[data-asaf-title-preview]")
  const categoryPreview = root.querySelector<HTMLParagraphElement>(
    "[data-asaf-category-preview]"
  )
  const keywordPreview = root.querySelector<HTMLParagraphElement>(
    "[data-asaf-keyword-preview]"
  )

  if (categoryPreview) {
    categoryPreview.textContent = metadata.category || "-"
    categoryPreview.dataset.loading = "false"
  }

  if (titlePreview) {
    titlePreview.textContent = metadata.description || "-"
    titlePreview.dataset.loading = "false"
  }

  if (keywordPreview) {
    keywordPreview.textContent = metadata.keywords.join(", ") || "-"
    keywordPreview.dataset.loading = "false"
  }
}

function createFloatingPanel(settings: AppSettings) {
  if (!shouldShowPanel(settings) || document.getElementById(PANEL_HOST_ID)) {
    return
  }

  const platform = getCurrentPlatform(settings)
  const platformLabel =
    platform === "shutterstock" ? "Shutterstock" : "Adobe Stock"

  // Body shift — push Adobe page content to the left
  document.documentElement.style.setProperty("--asaf-panel-width", panelWidthCss())
  document.documentElement.style.setProperty("--asaf-content-shift", contentShiftCss())
  document.documentElement.classList.add("asaf-panel-active")

  if (!document.getElementById(PANEL_STYLE_ID)) {
    const layoutStyle = document.createElement("style")
    layoutStyle.id = PANEL_STYLE_ID
    layoutStyle.textContent = `
      html.asaf-panel-active body {
        width: calc(100vw - var(--asaf-content-shift, ${contentShiftCss()})) !important;
        max-width: calc(100vw - var(--asaf-content-shift, ${contentShiftCss()})) !important;
        margin-right: var(--asaf-content-shift, ${contentShiftCss()}) !important;
        overflow-x: hidden !important;
      }
    `
    document.head.appendChild(layoutStyle)
  }

  // Side panel — fixed right, no body shift, glass style
  const host = createElement("div", { id: PANEL_HOST_ID })
  host.style.position = "fixed"
  host.style.right = "0"
  host.style.top = "0"
  host.style.width = "380px"
  host.style.height = "100vh"
  host.style.zIndex = "2147483647"
  host.style.pointerEvents = "auto"
  const root = host.attachShadow({ mode: "open" })

  root.innerHTML = `
    <style>
      :host {
        color-scheme: dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      * { box-sizing: border-box; }

      .asaf-panel {
        position: relative;
        z-index: 2;
        width: 100%;
        height: 100vh;
        overflow: auto;
        border-left: 1px solid rgba(255,255,255,0.08);
        background: #020617;
        color: #e2e8f0;
        box-shadow: -18px 0 48px rgba(2, 6, 23, 0.55);
        pointer-events: auto;
      }

      .asaf-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 16px 20px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
        background: linear-gradient(135deg, rgba(26,26,62,0.8) 0%, rgba(15,40,71,0.6) 50%, rgba(10,22,40,0.8) 100%);
        border-radius: 20px 20px 0 0;
      }

      .asaf-brand {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }

      .asaf-brand img {
        width: 38px;
        height: 38px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.12);
        box-shadow: 0 4px 16px rgba(102,126,234,0.15);
      }

      .asaf-title {
        margin: 0;
        font-size: 15px;
        font-weight: 800;
        color: #f8fafc;
        letter-spacing: -0.02em;
      }

      .asaf-subtitle {
        margin: 2px 0 0;
        color: #94a3b8;
        font-size: 11px;
      }

      .asaf-close-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.04);
        color: #94a3b8;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .asaf-close-btn:hover {
        background: rgba(255,255,255,0.1);
        color: #f8fafc;
      }

      .asaf-status-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border-radius: 999px;
        background: rgba(16,185,129,0.1);
        color: #6ee7b7;
        border: 1px solid rgba(16,185,129,0.2);
        padding: 5px 10px;
        font-size: 10px;
        font-weight: 700;
        white-space: nowrap;
        letter-spacing: 0.03em;
      }

      .asaf-status-dot {
        width: 6px;
        height: 6px;
        border-radius: 999px;
        background: #34d399;
        box-shadow: 0 0 6px rgba(52,211,153,0.4);
      }

      .asaf-section {
        padding: 16px 20px;
      }

      .asaf-stack {
        display: grid;
        gap: 12px;
      }

      .asaf-mode {
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 14px;
        background: rgba(255,255,255,0.03);
        padding: 14px;
      }

      .asaf-mode-title {
        margin: 0 0 10px;
        color: #94a3b8;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }

      .asaf-radio-row {
        display: grid;
        gap: 8px;
        color: #cbd5e1;
        font-size: 12px;
        font-weight: 500;
      }

      .asaf-radio-row label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
      }

      .asaf-radio-row input {
        accent-color: #10b981;
      }

      .asaf-card {
        border-radius: 14px;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.06);
        padding: 14px;
      }

      .asaf-card-title {
        margin: 0 0 8px;
        color: #64748b;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }

      .asaf-card-body {
        margin: 0;
        color: #e2e8f0;
        font-size: 13px;
        line-height: 1.5;
        max-height: 118px;
        overflow: hidden;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .asaf-card-body[data-loading="false"] {
        overflow: auto;
      }

      .asaf-image-box {
        display: grid;
        place-items: center;
        min-height: 140px;
        color: #e2e8f0;
      }

      .asaf-thumbnail {
        display: block;
        width: 100%;
        max-width: 220px;
        height: 124px;
        object-fit: cover;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.08);
      }

      .asaf-thumbnail-placeholder {
        display: grid;
        place-items: center;
        width: 100%;
        max-width: 220px;
        height: 124px;
        border: 1px dashed rgba(148,163,184,0.25);
        border-radius: 12px;
        color: #475569;
        font-size: 12px;
        background: rgba(255,255,255,0.02);
      }

      .asaf-spinner {
        display: inline-block;
        width: 14px;
        height: 14px;
        margin-right: 8px;
        vertical-align: -2px;
        border: 2px solid rgba(148,163,184,0.2);
        border-top-color: #34d399;
        border-radius: 999px;
        animation: asaf-spin 0.8s linear infinite;
      }

      @keyframes asaf-spin {
        to { transform: rotate(360deg); }
      }

      .asaf-button {
        width: 100%;
        border: 0;
        border-radius: 12px;
        background: linear-gradient(135deg, #10b981, #06b6d4);
        color: #022c22;
        cursor: pointer;
        font-size: 13px;
        font-weight: 700;
        padding: 12px 14px;
        pointer-events: auto;
        position: relative;
        z-index: 3;
        user-select: none;
        -webkit-user-select: none;
        touch-action: manipulation;
        box-shadow: 0 4px 20px rgba(16,185,129,0.2);
        transition: all 0.2s;
      }

      .asaf-button:hover { 
        box-shadow: 0 6px 28px rgba(16,185,129,0.35);
        transform: translateY(-1px);
      }

      .asaf-button:disabled {
        cursor: not-allowed;
        opacity: 0.55;
        transform: none;
      }

      .asaf-button-secondary {
        border: 1px solid rgba(248,113,113,0.25);
        background: rgba(127,29,29,0.2);
        color: #fecaca;
        box-shadow: none;
      }

      .asaf-button-secondary:hover {
        background: rgba(153,27,27,0.35);
        box-shadow: none;
        transform: none;
      }

      .asaf-actions {
        display: grid;
        grid-template-columns: 1.4fr 0.8fr;
        gap: 10px;
        position: relative;
        z-index: 2;
      }

      .asaf-footer {
        margin-top: 4px;
        border-radius: 12px;
        background: rgba(16,185,129,0.08);
        border: 1px solid rgba(16,185,129,0.15);
        color: #6ee7b7;
        padding: 12px;
        text-align: center;
        font-size: 12px;
        font-weight: 600;
      }

      .asaf-footer[data-type="error"] {
        background: rgba(239,68,68,0.08);
        border-color: rgba(239,68,68,0.2);
        color: #fca5a5;
      }

      .asaf-footer[data-type="muted"] {
        background: rgba(59,130,246,0.08);
        border-color: rgba(59,130,246,0.15);
        color: #93c5fd;
      }

      .asaf-footer[data-type="processing"] {
        background: rgba(245,158,11,0.08);
        border-color: rgba(245,158,11,0.15);
        color: #fcd34d;
      }

      .asaf-brand-foot {
        margin-top: 10px;
        text-align: center;
        color: #475569;
        font-size: 11px;
      }

      [hidden] { display: none !important; }
    </style>

    <section class="asaf-panel" data-asaf-panel>
      <header class="asaf-header">
        <div class="asaf-brand">
          <img alt="Autofillstock" src="${iconUrl}" />
          <div>
            <p class="asaf-title">AUTOFILLSTOCK</p>
            <p class="asaf-subtitle">${platformLabel} · Auto metadata</p>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="asaf-status-pill"><span class="asaf-status-dot"></span>ACTIVE</span>
        </div>
      </header>

      <div class="asaf-section">
        <div class="asaf-stack">
          <div class="asaf-mode">
            <p class="asaf-mode-title">Mode pengisian</p>
            <div class="asaf-radio-row">
              <label><input name="asaf-fill-mode" value="all" type="radio" checked /> Isi mulai dari awal</label>
              <label><input name="asaf-fill-mode" value="empty" type="radio" /> Isi yang kosong saja</label>
            </div>
          </div>

          <div class="asaf-card asaf-image-box">
            <img class="asaf-thumbnail" data-asaf-thumbnail alt="Thumbnail aset aktif" hidden />
            <div class="asaf-thumbnail-placeholder" data-asaf-thumbnail-placeholder>
              Thumbnail aset aktif
            </div>
          </div>

          <div class="asaf-card">
            <p class="asaf-card-title">Category</p>
            <p class="asaf-card-body" data-asaf-category-preview data-loading="false">-</p>
          </div>

          <div class="asaf-card">
            <p class="asaf-card-title">Title</p>
            <p class="asaf-card-body" data-asaf-title-preview data-loading="false">-</p>
          </div>

          <div class="asaf-card">
            <p class="asaf-card-title">Keywords</p>
            <p class="asaf-card-body" data-asaf-keyword-preview data-loading="false">-</p>
          </div>

          <div class="asaf-actions">
            <button class="asaf-button" data-asaf-generate type="button">⚡ Generate</button>
            <button class="asaf-button asaf-button-secondary" data-asaf-stop type="button">Stop</button>
          </div>

          <div class="asaf-footer" data-asaf-footer data-type="success">Siap generate metadata</div>
          <div class="asaf-brand-foot">autofillstock.my.id</div>
        </div>
      </div>
    </section>
  `

  document.documentElement.appendChild(host)

  // Close button & backdrop click — only when not running
  const closeBtn = root.querySelector<HTMLButtonElement>("[data-asaf-close]")
  const backdrop = root.querySelector<HTMLDivElement>("[data-asaf-backdrop]")

  function minimizePanel() {
    if (isRunning) return // don't close during generate
    host.style.display = "none"
  }

  if (closeBtn) closeBtn.addEventListener("click", minimizePanel)
  if (backdrop) backdrop.addEventListener("click", minimizePanel)

  // Re-show on message sync
  const origSync = chrome.runtime?.onMessage
  if (origSync) {
    origSync.addListener((msg: any) => {
      if (msg?.type === "ADOBESTOCK_PANEL_SYNC") {
        host.style.display = "grid"
      }
    })
  }

  const panel = root.querySelector<HTMLElement>("[data-asaf-panel]")
  const generateButton = root.querySelector<HTMLButtonElement>("[data-asaf-generate]")
  const stopButton = root.querySelector<HTMLButtonElement>("[data-asaf-stop]")
  const footer = root.querySelector<HTMLDivElement>("[data-asaf-footer]")
  let stopRequested = false
  let isRunning = false

  const initialThumbnail = extractAssetThumbnail()
  const thumbnail = root.querySelector<HTMLImageElement>("[data-asaf-thumbnail]")
  const thumbnailPlaceholder = root.querySelector<HTMLDivElement>(
    "[data-asaf-thumbnail-placeholder]"
  )

  if (initialThumbnail && thumbnail) {
    thumbnail.src = initialThumbnail
    thumbnail.hidden = false
    if (thumbnailPlaceholder) {
      thumbnailPlaceholder.hidden = true
    }
  }

  async function logGenerateToServer(
    result: { title?: string; description?: string },
    filename: string,
    platform: string
  ) {
    try {
      const stored = await chrome.storage.local.get(["activation_code"])
      const activationCode = stored.activation_code
      if (!activationCode) return

      await fetch("https://autofillstock.my.id/api/extension/log-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activationCode,
          platform,
          filename,
          title: result.title || result.description || "",
        })
      })
    } catch (err) {
      // Silent fail — don't break the extension
      console.log("[autofillstock] Failed to log generate:", err)
    }
  }

  async function processCurrentAsset(settings: Awaited<ReturnType<typeof getSettings>>) {
    const brief = readPageBrief()
    const filename = isShutterstockUploadPage()
      ? getShutterstockActiveFileName() || document.title || "unknown"
      : document.title || "unknown"
    const platform = getCurrentPlatform(settings)

    // ✅ Ambil activation code dari storage
    const stored = await chrome.storage.local.get(["activation_code"])
    const activationCode = stored.activation_code || ""

    // ✅ Generate via server (free/topup/basic/value) atau langsung ke OpenAI (lifetime)
    let metadata
    if (settings.openai_api_key) {
      // Lifetime plan — pakai API key sendiri langsung ke OpenAI
      metadata = await generateMetadata(settings.openai_api_key, brief)
    } else {
      // Free/topup/basic/value — pakai server API
      metadata = await generateMetadataViaServer(activationCode, brief, filename, platform)
    }

    const usageCount = (settings.usage_count || 0) + 1

    if (isShutterstockUploadPage()) {
      metadata = {
        ...metadata,
        category: normalizeShutterstockCategory(metadata)
      }
    }

    writeMetadataToPanel(root, metadata)
    const titlePreview = root.querySelector<HTMLParagraphElement>("[data-asaf-title-preview]")
    const keywordPreview = root.querySelector<HTMLParagraphElement>(
      "[data-asaf-keyword-preview]"
    )

    if (titlePreview) {
      titlePreview.textContent = metadata.description || "-"
    }

    if (keywordPreview) {
      keywordPreview.textContent = metadata.keywords.join(", ") || "-"
    }

    await updateSettings({
      usage_count: usageCount,
      last_generated: new Date().toISOString()
    })
    settings.usage_count = usageCount
    await autofill(metadata)

    // Lifetime/direct OpenAI path only — server generate already logs history + credits
    if (settings.openai_api_key) {
      logGenerateToServer(metadata, filename, platform)
    }

    return metadata
  }

  async function processBatch(settings: Awaited<ReturnType<typeof getSettings>>) {
    let processed = 0
    let completedAll = false
    let batchError = ""
    const platform = getCurrentPlatform(settings)
    const initialCards = getAssetCards()
    const expectedAssets = getExpectedAssetCount()
    const totalAssets = expectedAssets || Math.max(initialCards.length, 1)
    stopRequested = false
    setFooterStatus(
      root,
      `Terdeteksi ${totalAssets}/${totalAssets} file`,
      "muted"
    )
    await wait(500)

    if (initialCards.length === 0) {
      setLoadingPreview(root, 1, 1)
      await processCurrentAsset(settings)
      processed = 1
      setFooterStatus(root, "1 file selesai", "success")
      await notifyBatchComplete(processed, platform)
      return
    }

    const firstCard = getAssetCards()[0]
    if (firstCard && !isShutterstockUploadPage()) {
      setFooterStatus(root, "Mulai dari file pertama...", "muted")
      const movedToFirst = await clickAssetCardAndWait(firstCard)
      if (!movedToFirst) {
        setFooterStatus(root, "Gagal memilih file pertama", "error")
        return
      }
      await waitForAssetFormReady()
      await wait(500)
    } else if (isShutterstockUploadPage()) {
      setFooterStatus(root, "Memakai file aktif Shutterstock...", "muted")
      await waitForAssetFormReady()
      await wait(500)
    }

    for (let index = 0; index < totalAssets && !stopRequested && index < 50; index += 1) {
      await waitForAssetFormReady()

      setLoadingPreview(root, processed + 1, totalAssets)

      try {
        await processCurrentAsset(settings)
      } catch (assetError) {
        const message =
          assetError instanceof Error ? assetError.message : "Generate metadata gagal."
        // Don't throw — skip this file and continue batch
        setFooterStatus(root, `File ${processed + 1} gagal: ${message}. Lanjut...`, "error")
        await wait(1500)
        // Still count as processed to move to next file
        processed += 1
        continue
      }
      processed += 1

      if (processed >= totalAssets) {
        completedAll = true
        break
      }

      if (!stopRequested) {
        await waitWithCountdown(root, BATCH_DELAY_MS)
      }

      if (stopRequested) {
        break
      }

      // Side panel doesn't block the thumbnail grid, just pause pointer events
      host.style.pointerEvents = "none"
      await wait(300)

      const cards = getAssetCards()
      const nextCard = isShutterstockUploadPage()
        ? cards[processed]
        : (() => {
            const selectedCard = getExplicitSelectedAssetCard(cards)
            const selectedIndex = selectedCard ? cards.indexOf(selectedCard) : processed - 1
            return cards[selectedIndex + 1] || cards[processed]
          })()

      if (!nextCard) {
        batchError = `File berikutnya tidak ditemukan setelah ${processed}/${totalAssets}`
        setFooterStatus(root, batchError, "error")
        break
      }

      const moved = await clickAssetCardAndWait(nextCard)
      host.style.pointerEvents = "auto"
      if (!moved) {
        batchError = `Gagal pindah ke file ${processed + 1}/${totalAssets}`
        setFooterStatus(root, batchError, "error")
        break
      }
    }

    if (completedAll) {
      setFooterStatus(root, `${processed} file selesai`, "success")
    } else if (!stopRequested && batchError) {
      setFooterStatus(root, batchError, "error")
    } else if (stopRequested) {
      setFooterStatus(root, `${processed}/${totalAssets} file diproses`, "muted")
    } else {
      setFooterStatus(root, `${processed}/${totalAssets} file diproses`, "error")
    }

    if (footer) {
      if (completedAll) {
        footer.textContent = "Ready"
        footer.dataset.type = "success"
      } else if (stopRequested) {
        footer.textContent = "Stopped"
        footer.dataset.type = "muted"
      }
    }

    if (!stopRequested && completedAll) {
      showCompletionModal(processed, platform)
      await notifyBatchComplete(processed, platform)
    }
  }

  async function handleStart() {
    if (isRunning) {
      return
    }

    isRunning = true
    setFooterStatus(root, "Memulai generate...", "muted")
    setBusy(root, true)

    try {
      const settings = await getSettings()

      if (!settings.activation_status) {
        throw new Error("Extension belum aktif. Buka popup extension untuk aktivasi.")
      }

      // ✅ Tidak perlu cek API key — generate via server Autofillstock
      await processBatch(settings)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Generate metadata gagal."
      setFooterStatus(root, message, "error")
      console.error("[autofillstock] generate error:", error)
    } finally {
      isRunning = false
      setBusy(root, false)
    }
  }

  if (generateButton) {
    generateButton.disabled = false
    generateButton.onclick = handleStart

    for (const eventName of ["pointerdown", "mousedown", "touchstart", "click"]) {
      generateButton.addEventListener(
        eventName,
        (event) => {
          event.preventDefault()
          event.stopPropagation()
          handleStart()
        },
        { capture: true }
      )
    }
  }

  root.addEventListener(
    "pointerdown",
    (event) => {
      const isStartButton = event.composedPath().some((item) => {
        return item instanceof HTMLElement && item.hasAttribute("data-asaf-generate")
      })

      if (!isStartButton) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      handleStart()
    },
    true
  )

  stopButton?.addEventListener("click", () => {
    stopRequested = true
    if (footer) {
      footer.textContent = "Stopping..."
      footer.dataset.type = "muted"
    }
    setFooterStatus(root, "Stopping...", "muted")
  })

  if (!settings.panel_enabled) {
    removeFloatingPanel()
  }
}

async function syncFloatingPanel() {
  const settings = await getSettings()

  if (shouldShowPanel(settings)) {
    createFloatingPanel(settings)
  } else {
    removeFloatingPanel()
  }
}

syncFloatingPanel()

let syncTimer: number | undefined
const observer = new MutationObserver(() => {
  window.clearTimeout(syncTimer)
  syncTimer = window.setTimeout(syncFloatingPanel, 400)
})

observer.observe(document.documentElement, {
  childList: true,
  subtree: true
})

chrome.storage?.onChanged?.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return
  }

  if (changes.panel_enabled || changes.selected_microstock) {
    syncFloatingPanel()
  }
})

chrome.runtime.onMessage.addListener(
  (message: AutofillMessage, _sender, sendResponse) => {
    if (message?.type === "ADOBESTOCK_PANEL_SYNC") {
      syncFloatingPanel()
        .then(() => sendResponse({ ok: true }))
        .catch((error) =>
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : "Sync panel gagal."
          })
        )

      return true
    }

    if (message?.type !== "ADOBESTOCK_AUTOFILL_METADATA") {
      return false
    }

    autofill(message.payload)
      .then((results) => sendResponse({ ok: true, results }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Auto-fill gagal."
        })
      )

    return true
  }
)

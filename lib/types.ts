export type MetadataResult = {
  title: string
  description: string
  keywords: string[]
  category: string
}

export type MicrostockPlatform =
  | "adobe_stock"
  | "shutterstock"
  | "vecteezy"
  | "pond5"
  | "getty_images"

export type AppSettings = {
  activation_status: boolean
  activation_code?: string
  openai_api_key?: string
  panel_enabled: boolean
  selected_microstock: MicrostockPlatform
  usage_count: number
  last_generated?: string
}

export type AutofillMessage =
  | {
      type: "ADOBESTOCK_AUTOFILL_METADATA"
      payload: MetadataResult
    }
  | {
      type: "ADOBESTOCK_PANEL_SYNC"
    }

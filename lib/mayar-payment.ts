export type AutofillstockProductType = 'intro' | 'basic' | 'value' | 'lifetime'

export interface AutofillstockProduct {
  name: string
  price: number
  description: string
  creditsToAdd: number
  planType: 'topup' | 'lifetime'
}

export const AUTOFILLSTOCK_PRODUCTS: Record<AutofillstockProductType, AutofillstockProduct> = {
  intro: {
    name: 'Autofillstock - Intro Pack 150 Kredit',
    price: 9900,
    description: 'Intro pack 150 kredit untuk generate metadata microstock. Kredit tidak expire, pakai kapanpun.',
    creditsToAdd: 150,
    planType: 'topup',
  },
  basic: {
    name: 'Autofillstock - Basic Pack 450 Kredit',
    price: 25000,
    description: 'Basic pack 450 kredit untuk generate metadata microstock. Kredit tidak expire, pakai kapanpun.',
    creditsToAdd: 450,
    planType: 'topup',
  },
  value: {
    name: 'Autofillstock - Value Pack 1200 Kredit',
    price: 50000,
    description: 'Value pack 1.200 kredit untuk generate metadata microstock. Hemat Rp42/kredit. Kredit tidak expire.',
    creditsToAdd: 1200,
    planType: 'topup',
  },
  lifetime: {
    name: 'Autofillstock - One-time Lifetime',
    price: 249000,
    description: 'Bayar sekali generate unlimited selamanya. Pakai API key OpenAI sendiri. Harga promo terbatas.',
    creditsToAdd: 0,
    planType: 'lifetime',
  },
}

export interface ResolvedAutofillstockProduct {
  productType: AutofillstockProductType
  creditsToAdd: number
  planType: 'topup' | 'lifetime'
  amount: number
}

function normalizeProductName(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').toLowerCase() : ''
}

export function resolveAutofillstockProduct(
  productName: unknown,
  rawAmount: unknown,
): ResolvedAutofillstockProduct | null {
  const normalizedName = normalizeProductName(productName)
  const amount = typeof rawAmount === 'number' ? rawAmount : Number(rawAmount)

  if (!normalizedName || !Number.isSafeInteger(amount) || amount <= 0) return null

  for (const [productType, product] of Object.entries(AUTOFILLSTOCK_PRODUCTS) as Array<
    [AutofillstockProductType, AutofillstockProduct]
  >) {
    if (normalizedName === normalizeProductName(product.name) && amount === product.price) {
      return {
        productType,
        creditsToAdd: product.creditsToAdd,
        planType: product.planType,
        amount: product.price,
      }
    }
  }

  return null
}

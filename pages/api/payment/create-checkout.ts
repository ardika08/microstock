import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import type { NextApiRequest, NextApiResponse } from 'next'

// Autofillstock Mayar products — created 2026-07-07
// topup:    ba1ed3c5 → https://grafista.myr.id/pl/x5ccueante/   Rp 50.000
// starter:  1c00b12d → https://grafista.myr.id/pl/5xeynu09am/   Rp 99.000/bln
// lifetime: cc3f4f43 → https://grafista.myr.id/pl/wwmv0zc76q/   Rp 249.000
const PRODUCT_LINKS: Record<string, { url: string; name: string; price: number }> = {
  topup_500: {
    url: 'https://grafista.myr.id/pl/x5ccueante/',
    name: 'Autofillstock - Top Up 500 Kredit',
    price: 50000,
  },
  starter_monthly: {
    url: 'https://grafista.myr.id/pl/5xeynu09am/',
    name: 'Autofillstock - Starter Bulanan',
    price: 99000,
  },
  lifetime: {
    url: 'https://grafista.myr.id/pl/wwmv0zc76q/',
    name: 'Autofillstock - One-time Lifetime',
    price: 249000,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' })

  const { productType } = req.body
  if (!productType || !PRODUCT_LINKS[productType]) {
    return res.status(400).json({ error: 'Produk tidak valid' })
  }

  const product = PRODUCT_LINKS[productType]

  return res.status(200).json({
    checkoutUrl: product.url,
    productName: product.name,
    price: product.price,
  })
}

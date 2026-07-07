import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import type { NextApiRequest, NextApiResponse } from 'next'

// Real Mayar payment links (grafista.myr.id subdomain)
// Top Up 50 Kredit: existing product ff92f2d2 — Rp 25.000 → 500 credits
// Autofillstock Starter: 66ed609e — Rp 99.000/bulan → unlimited
// Autofillstock One-time: 40516d6c — Rp 249.000 → lifetime
const PRODUCT_LINKS: Record<string, { url: string; name: string; price: number }> = {
  topup_500: {
    url: 'https://grafista.myr.id/pl/top-up-50-kredit',
    name: 'Top Up 500 Kredit',
    price: 25000,
  },
  starter_monthly: {
    url: 'https://grafista.myr.id/pl/h9fo5uxzz9/',
    name: 'Autofillstock Starter (Bulanan)',
    price: 99000,
  },
  lifetime: {
    url: 'https://grafista.myr.id/pl/7uxwf9mqd9/',
    name: 'Autofillstock One-time (Lifetime)',
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

  // Mayar handles the full checkout page — we just return the URL to redirect the user
  return res.status(200).json({
    checkoutUrl: product.url,
    productName: product.name,
    price: product.price,
  })
}

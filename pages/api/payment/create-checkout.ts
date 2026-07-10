import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import type { NextApiRequest, NextApiResponse } from 'next'

const MAYAR_API_KEY = process.env.MAYAR_API_KEY!
const MAYAR_API_URL = 'https://api.mayar.id'

// Product definitions — full credit-only model (no subscription)
const PRODUCTS: Record<string, { name: string; price: number; description: string }> = {
  intro: {
    name: 'Autofillstock - Intro Pack 150 Kredit',
    price: 9900,
    description: 'Intro pack 150 kredit untuk generate metadata microstock. Kredit tidak expire, pakai kapanpun.',
  },
  basic: {
    name: 'Autofillstock - Basic Pack 450 Kredit',
    price: 25000,
    description: 'Basic pack 450 kredit untuk generate metadata microstock. Kredit tidak expire, pakai kapanpun.',
  },
  value: {
    name: 'Autofillstock - Value Pack 1200 Kredit',
    price: 50000,
    description: 'Value pack 1.200 kredit untuk generate metadata microstock. Hemat Rp42/kredit. Kredit tidak expire.',
  },
  lifetime: {
    name: 'Autofillstock - One-time Lifetime',
    price: 249000,
    description: 'Bayar sekali generate unlimited selamanya. Pakai API key OpenAI sendiri. Harga promo terbatas.',
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' })

  const { productType } = req.body
  if (!productType || !PRODUCTS[productType]) {
    return res.status(400).json({ error: 'Produk tidak valid' })
  }

  const product = PRODUCTS[productType]
  const user = session.user as any

  try {
    const invoiceRes = await fetch(`${MAYAR_API_URL}/hl/v1/invoice/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MAYAR_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: user.name || user.email.split('@')[0],
        email: user.email,
        mobile: '08000000000',
        description: product.name,
        items: [
          {
            quantity: 1,
            rate: product.price,
            description: product.description,
          },
        ],
      }),
    })

    const invoiceData = await invoiceRes.json()

    if (!invoiceRes.ok || invoiceData.statusCode !== 200) {
      console.error('[checkout] Mayar invoice error:', invoiceData)
      return res.status(500).json({ error: 'Gagal membuat invoice pembayaran.' })
    }

    const checkoutUrl = invoiceData.data?.link
    if (!checkoutUrl) {
      return res.status(500).json({ error: 'Invoice URL tidak ditemukan.' })
    }

    return res.status(200).json({
      checkoutUrl,
      productName: product.name,
      price: product.price,
    })

  } catch (err) {
    console.error('[checkout] Error:', err)
    return res.status(500).json({ error: 'Terjadi kesalahan saat membuat invoice.' })
  }
}

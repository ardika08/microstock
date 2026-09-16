import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import type { NextApiRequest, NextApiResponse } from 'next'
import { AUTOFILLSTOCK_PRODUCTS, type AutofillstockProductType } from '~/lib/mayar-payment'

const MAYAR_API_KEY = process.env.MAYAR_API_KEY || process.env.APIKEY_MAYAR!
const MAYAR_API_URL = 'https://api.mayar.id'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' })

  const { productType } = req.body
  if (!productType || !AUTOFILLSTOCK_PRODUCTS[productType as AutofillstockProductType]) {
    return res.status(400).json({ error: 'Produk tidak valid' })
  }

  const product = AUTOFILLSTOCK_PRODUCTS[productType as AutofillstockProductType]
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

import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { resolveAutofillstockProduct } from '../lib/mayar-payment'

test('accepts exact Autofillstock product name and amount', () => {
  assert.deepEqual(
    resolveAutofillstockProduct('Autofillstock - Basic Pack 450 Kredit', 25000),
    { productType: 'basic', creditsToAdd: 450, planType: 'topup', amount: 25000 },
  )
})

test('rejects another website product containing generic basic keyword', () => {
  assert.equal(resolveAutofillstockProduct('Basic Paket Website Lain', 25000), null)
})

test('rejects another website product containing generic credit keyword', () => {
  assert.equal(resolveAutofillstockProduct('Top Up Kredit Produk Lain', 50000), null)
})

test('rejects exact Autofillstock name with wrong amount', () => {
  assert.equal(resolveAutofillstockProduct('Autofillstock - Value Pack 1200 Kredit', 25000), null)
})

test('normalizes case and surrounding whitespace only', () => {
  assert.deepEqual(
    resolveAutofillstockProduct('  AUTOFILLSTOCK - INTRO PACK 150 KREDIT  ', 9900),
    { productType: 'intro', creditsToAdd: 50, planType: 'topup', amount: 9900 },
  )
})

test('rejects missing or malformed payment data', () => {
  assert.equal(resolveAutofillstockProduct('', 25000), null)
  assert.equal(resolveAutofillstockProduct('Autofillstock - Basic Pack 450 Kredit', undefined), null)
})

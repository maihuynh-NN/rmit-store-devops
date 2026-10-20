import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { orderApi } from '@/api'
import { useCartStore } from '@/stores/cart'

vi.mock('@/api', () => ({
  orderApi: { create: vi.fn() }
}))

const hoodie = { id: 1, name: 'Hoodie', slug: 'hoodie', price: '20.00', quantity: 200 }
const lanyard = { id: 2, name: 'Lanyard', slug: 'lanyard', price: '5.50', quantity: 10 }
const CARD = { number: '4242424242424242', exp_month: 12, exp_year: 2099, cvc: '123' }

describe('cart store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it.each([
    [25, 1],
    [26, 5],
    [100, 5],
    [101, 25],
    [499, 25],
    [500, 50]
  ])('rations stock: inventory %i allows %i per order', (inventory, max) => {
    expect(useCartStore().maxPurchaseQuantity(inventory)).toBe(max)
  })

  it('adds a product and merges repeated adds into one line', () => {
    const cart = useCartStore()
    cart.add(hoodie, 2)
    cart.add(hoodie, 3)
    expect(cart.items).toHaveLength(1)
    expect(cart.count).toBe(5)
  })

  it('caps quantity at the rationing limit', () => {
    const cart = useCartStore()
    cart.add(lanyard, 9)
    expect(cart.find(2).quantity).toBe(1)
  })

  it('never lets setQuantity go below 1', () => {
    const cart = useCartStore()
    cart.add(hoodie, 2)
    cart.setQuantity(1, 0)
    expect(cart.find(1).quantity).toBe(1)
  })

  it('estimates the subtotal from price x quantity', () => {
    const cart = useCartStore()
    cart.add(hoodie, 2)
    cart.add(lanyard, 1)
    expect(cart.subtotal).toBeCloseTo(45.5)
  })

  it('persists the bag to localStorage', () => {
    useCartStore().add(hoodie, 1)
    const saved = JSON.parse(localStorage.getItem('rmit_cart_items'))
    expect(saved[0].id).toBe(1)
  })

  it('checkout sends only ids and quantities, then empties the bag', async () => {
    orderApi.create.mockResolvedValue({ data: { id: 99 } })
    const cart = useCartStore()
    cart.add(hoodie, 2)

    await cart.checkout(CARD)

    expect(orderApi.create).toHaveBeenCalledWith([{ product: 1, quantity: 2 }], CARD)
    expect(cart.isEmpty).toBe(true)
    expect(localStorage.getItem('rmit_cart_items')).not.toContain('4242')
  })

  it('keeps the bag when the order is rejected', async () => {
    orderApi.create.mockRejectedValue(new Error('402'))
    const cart = useCartStore()
    cart.add(hoodie, 2)

    await expect(cart.checkout(CARD)).rejects.toThrow('402')
    expect(cart.count).toBe(2)
  })
})
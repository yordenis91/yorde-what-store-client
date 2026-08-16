import { beforeEach, describe, expect, it } from 'vitest'
import { useCartStore } from './cart.store'

const shirt = { productId: 'p1', name: 'Shirt', unitPrice: 25, quantity: 1 }
const cap = { productId: 'p2', name: 'Cap', unitPrice: 15.5, quantity: 1 }

const cart = () => useCartStore.getState()

beforeEach(() => {
  useCartStore.setState({ tenantSlug: null, items: [], couponCode: null })
})

describe('addItem', () => {
  it('adds a line', () => {
    cart().addItem(shirt)

    expect(cart().items).toHaveLength(1)
    expect(cart().items[0]).toMatchObject({ productId: 'p1', quantity: 1 })
  })

  it('sums quantities when the same product is added again', () => {
    cart().addItem({ ...shirt, quantity: 2 })
    cart().addItem({ ...shirt, quantity: 3 })

    expect(cart().items).toHaveLength(1)
    expect(cart().items[0].quantity).toBe(5)
  })

  it('keeps different products on separate lines', () => {
    cart().addItem(shirt)
    cart().addItem(cap)

    expect(cart().items).toHaveLength(2)
  })

  /** Two sizes of one shirt are different things to pick, pack and price. */
  it('keeps variants of the same product on separate lines', () => {
    cart().addItem({ ...shirt, variantId: 'v1', variantName: 'M' })
    cart().addItem({ ...shirt, variantId: 'v2', variantName: 'L' })

    expect(cart().items).toHaveLength(2)
  })

  it('merges a variant line only with the same variant', () => {
    cart().addItem({ ...shirt, variantId: 'v1', quantity: 1 })
    cart().addItem({ ...shirt, variantId: 'v1', quantity: 2 })
    cart().addItem({ ...shirt, variantId: 'v2', quantity: 1 })

    expect(cart().items).toHaveLength(2)
    expect(cart().items.find((i) => i.variantId === 'v1')?.quantity).toBe(3)
  })

  it('does not merge a variant line into the plain product line', () => {
    cart().addItem(shirt)
    cart().addItem({ ...shirt, variantId: 'v1' })

    expect(cart().items).toHaveLength(2)
  })
})

describe('updateQuantity', () => {
  it('sets an exact quantity', () => {
    cart().addItem(shirt)
    cart().updateQuantity('p1', undefined, 7)

    expect(cart().items[0].quantity).toBe(7)
  })

  it('removes the line when the quantity reaches zero', () => {
    cart().addItem(shirt)
    cart().updateQuantity('p1', undefined, 0)

    expect(cart().items).toHaveLength(0)
  })

  it('removes the line rather than storing a negative quantity', () => {
    cart().addItem(shirt)
    cart().updateQuantity('p1', undefined, -3)

    expect(cart().items).toHaveLength(0)
  })

  it('only touches the matching variant', () => {
    cart().addItem({ ...shirt, variantId: 'v1' })
    cart().addItem({ ...shirt, variantId: 'v2' })
    cart().updateQuantity('p1', 'v1', 5)

    expect(cart().items.find((i) => i.variantId === 'v1')?.quantity).toBe(5)
    expect(cart().items.find((i) => i.variantId === 'v2')?.quantity).toBe(1)
  })
})

describe('removeItem', () => {
  it('removes just the named line', () => {
    cart().addItem(shirt)
    cart().addItem(cap)
    cart().removeItem('p1')

    expect(cart().items).toHaveLength(1)
    expect(cart().items[0].productId).toBe('p2')
  })

  it('removes a specific variant and leaves the other', () => {
    cart().addItem({ ...shirt, variantId: 'v1' })
    cart().addItem({ ...shirt, variantId: 'v2' })
    cart().removeItem('p1', 'v1')

    expect(cart().items).toHaveLength(1)
    expect(cart().items[0].variantId).toBe('v2')
  })
})

describe('setTenantSlug', () => {
  /**
   * The cart persists to localStorage, and storefronts share an origin in
   * `/store/:slug` mode. Without this, a customer browsing a second store would
   * find the first store's products in their basket — priced and ordered
   * against a tenant that never sold them.
   */
  it('empties the cart when the shopper moves to a different store', () => {
    cart().setTenantSlug('store-a')
    cart().addItem(shirt)
    cart().setCoupon('SUMMER10')

    cart().setTenantSlug('store-b')

    expect(cart().items).toHaveLength(0)
    expect(cart().couponCode).toBeNull()
    expect(cart().tenantSlug).toBe('store-b')
  })

  it('leaves the cart alone when the same store is set again', () => {
    cart().setTenantSlug('store-a')
    cart().addItem(shirt)

    cart().setTenantSlug('store-a')

    expect(cart().items).toHaveLength(1)
  })
})

describe('clear', () => {
  it('empties items and coupon but keeps the store', () => {
    cart().setTenantSlug('store-a')
    cart().addItem(shirt)
    cart().setCoupon('SUMMER10')

    cart().clear()

    expect(cart().items).toHaveLength(0)
    expect(cart().couponCode).toBeNull()
    expect(cart().tenantSlug).toBe('store-a')
  })
})

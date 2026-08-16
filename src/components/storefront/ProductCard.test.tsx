import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { useCartStore } from '@/store/cart.store'
import { buildProduct } from '../../../tests/factories'
import { ProductCard } from './ProductCard'
import type { Product } from '@/types/api'

function renderCard(product: Product, tracksInventory: boolean) {
  return render(
    <MemoryRouter>
      <ProductCard product={product} to="/product/p1" symbol="$" position="pre" tracksInventory={tracksInventory} />
    </MemoryRouter>,
  )
}

const cart = () => useCartStore.getState()

beforeEach(() => {
  useCartStore.setState({ tenantSlug: null, items: [], couponCode: null })
})

describe('a store that does not track inventory', () => {
  /**
   * Regression. `quantity` defaults to 0, so reading it as stock unconditionally
   * marked every product in such a store as sold out and made the shop
   * unusable. Nothing about quantity may reach the UI unless the store opted in.
   */
  it('sells a product whose quantity is the untouched default of zero', async () => {
    renderCard(buildProduct({ quantity: 0 }), false)

    expect(screen.queryByText('Sold out')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /add to cart/i }))

    expect(cart().items).toHaveLength(1)
  })

  it('does not cap the quantity stepper', async () => {
    renderCard(buildProduct({ quantity: 0 }), false)
    const increase = screen.getByRole('button', { name: /increase quantity/i })

    await userEvent.click(increase)
    await userEvent.click(increase)

    expect(increase).toBeEnabled()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('does not record a stock ceiling on the cart line', async () => {
    renderCard(buildProduct({ quantity: 0 }), false)

    await userEvent.click(screen.getByRole('button', { name: /add to cart/i }))

    expect(cart().items[0].maxQuantity).toBeUndefined()
  })
})

describe('a store that tracks inventory', () => {
  it('marks a product with no stock as sold out and offers no way to buy it', () => {
    renderCard(buildProduct({ quantity: 0 }), true)

    expect(screen.getByText('Sold out')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add to cart/i })).not.toBeInTheDocument()
  })

  it('caps the stepper at the available stock', async () => {
    renderCard(buildProduct({ quantity: 2 }), true)
    const increase = screen.getByRole('button', { name: /increase quantity/i })

    await userEvent.click(increase)

    expect(screen.getByText('2')).toBeInTheDocument()
    expect(increase).toBeDisabled()
  })

  it('records the stock ceiling on the cart line so the cart can cap it too', async () => {
    renderCard(buildProduct({ quantity: 4 }), true)

    await userEvent.click(screen.getByRole('button', { name: /add to cart/i }))

    expect(cart().items[0].maxQuantity).toBe(4)
  })
})

describe('adding to the cart', () => {
  it('adds the chosen quantity, not just one', async () => {
    renderCard(buildProduct({ quantity: 10 }), true)

    await userEvent.click(screen.getByRole('button', { name: /increase quantity/i }))
    await userEvent.click(screen.getByRole('button', { name: /increase quantity/i }))
    await userEvent.click(screen.getByRole('button', { name: /add to cart/i }))

    expect(cart().items[0].quantity).toBe(3)
  })

  it('tells the shopper the product is already in the cart, and how many', async () => {
    renderCard(buildProduct({ quantity: 10 }), true)

    await userEvent.click(screen.getByRole('button', { name: /add to cart/i }))

    expect(screen.getByRole('button', { name: /in cart \(1\)/i })).toBeInTheDocument()
  })

  it('resets its own stepper after adding, so the next add starts from one', async () => {
    renderCard(buildProduct({ quantity: 10 }), true)

    await userEvent.click(screen.getByRole('button', { name: /increase quantity/i }))
    await userEvent.click(screen.getByRole('button', { name: /add to cart/i }))

    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('adds again on a second click rather than replacing the line', async () => {
    renderCard(buildProduct({ quantity: 10 }), true)

    await userEvent.click(screen.getByRole('button', { name: /add to cart/i }))
    await userEvent.click(screen.getByRole('button', { name: /in cart/i }))

    expect(cart().items[0].quantity).toBe(2)
  })

  it('does not count another store line as this product being in the cart', async () => {
    cart().addItem({ productId: 'other', name: 'Other', unitPrice: 5, quantity: 1 })
    renderCard(buildProduct({ quantity: 10 }), true)

    expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument()
  })
})

describe('products with variants', () => {
  const withVariants = buildProduct({
    hasVariants: true,
    quantity: 0,
    variants: [{ id: 'v1', name: 'M', sku: 'M', price: '25.00', cost: null, quantity: 3, locationId: null }],
  })

  /** The card cannot pick a size for the shopper, so it sends them to the page. */
  it('sends the shopper to the product page instead of adding blind', () => {
    renderCard(withVariants, true)

    expect(screen.getByRole('link', { name: /choose options/i })).toHaveAttribute('href', '/product/p1')
    expect(screen.queryByRole('button', { name: /add to cart/i })).not.toBeInTheDocument()
  })

  it('does not call a variant product sold out on the parent quantity', () => {
    renderCard(withVariants, true)

    expect(screen.queryByText('Sold out')).not.toBeInTheDocument()
  })
})

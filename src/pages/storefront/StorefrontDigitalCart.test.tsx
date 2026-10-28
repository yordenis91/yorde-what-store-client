import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCartStore } from '@/store/cart.store'
import { buildProduct, buildTenant } from '../../../tests/factories'
import { StorefrontCartPage } from './StorefrontCartPage'
import { StorefrontProductPage } from './StorefrontProductPage'
import type { PublicTenant } from '@/types/api'

const getPublishedProduct = vi.fn()
vi.mock('@/services/products.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/products.service')>()),
  getPublishedProduct: (...a: unknown[]) => getPublishedProduct(...a),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

let currentTenant: PublicTenant = buildTenant()
vi.mock('@/hooks/useStorefront', () => ({
  useStorefront: () => ({ tenant: currentTenant, slug: 'vortex', path: (sub = '') => `/store/vortex${sub}` }),
  useStorefrontTenant: () => currentTenant,
}))

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/store/:slug/product/:id" element={<StorefrontProductPage />} />
          <Route path="/store/:slug/cart" element={<StorefrontCartPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  currentTenant = buildTenant({ catalogType: 'DIGITAL' })
  useCartStore.setState({ tenantSlug: 'vortex', items: [], couponCode: null })
  getPublishedProduct.mockResolvedValue(buildProduct({ id: 'p1', name: 'Los Códigos de Lola', price: '9.99' }))
})

describe('digital product: one copy per order', () => {
  it('adds a single copy and does not add a second when pressed again', async () => {
    renderAt('/store/vortex/product/p1')
    const add = (await screen.findAllByRole('button', { name: /add to cart/i }))[0]

    await userEvent.click(add)
    await userEvent.click(add)

    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().items[0].quantity).toBe(1)
  })

  it('caps the cart line at one, even if a larger quantity was stored earlier', async () => {
    useCartStore.setState({
      tenantSlug: 'vortex',
      items: [{ productId: 'p1', name: 'Los Códigos de Lola', unitPrice: 9.99, quantity: 1 }],
      couponCode: null,
    })
    renderAt('/store/vortex/cart')
    await screen.findByText('Los Códigos de Lola')

    const increase = screen.queryByRole('button', { name: /increase/i })
    if (increase) await userEvent.click(increase)
    expect(useCartStore.getState().items[0].quantity).toBe(1)
  })
})

describe('physical product keeps its quantity', () => {
  it('lets the shopper add several', async () => {
    currentTenant = buildTenant()
    renderAt('/store/vortex/product/p1')
    const increase = await screen.findByRole('button', { name: /increase/i })
    await userEvent.click(increase)
    await userEvent.click((await screen.findAllByRole('button', { name: /add to cart/i }))[0])

    expect(useCartStore.getState().items[0].quantity).toBe(2)
  })
})

describe('digital store has no quantity controls', () => {
  it('shows no stepper on the product page, and the button turns into "In cart" once added', async () => {
    renderAt('/store/vortex/product/p1')
    await screen.findAllByRole('button', { name: /add to cart/i })
    expect(screen.queryByRole('button', { name: /increase/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /decrease/i })).not.toBeInTheDocument()

    await userEvent.click((await screen.findAllByRole('button', { name: /add to cart/i }))[0])

    const inCartButtons = await screen.findAllByRole('button', { name: /in cart \(1\)/i })
    inCartButtons.forEach((b) => expect(b).toBeDisabled())
  })

  it('shows no stepper in the cart, just that it is a digital copy', async () => {
    useCartStore.setState({
      tenantSlug: 'vortex',
      items: [{ productId: 'p1', name: 'Los Códigos de Lola', unitPrice: 9.99, quantity: 1 }],
      couponCode: null,
    })
    renderAt('/store/vortex/cart')
    await screen.findByText('Los Códigos de Lola')

    expect(screen.queryByRole('button', { name: /increase/i })).not.toBeInTheDocument()
    expect(screen.getByText('Digital copy')).toBeInTheDocument()
  })
})

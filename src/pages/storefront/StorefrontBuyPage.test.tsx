import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCartStore } from '@/store/cart.store'
import { buildProduct, buildTenant } from '../../../tests/factories'
import { StorefrontBuyPage } from './StorefrontBuyPage'
import type { PublicTenant } from '@/types/api'

const getPublishedProduct = vi.fn()
vi.mock('@/services/products.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/products.service')>()),
  getPublishedProduct: (...a: unknown[]) => getPublishedProduct(...a),
}))

let currentTenant: PublicTenant = buildTenant()
vi.mock('@/hooks/useStorefront', () => ({
  useStorefront: () => ({ tenant: currentTenant, slug: 'vortex', path: (sub = '') => `/store/vortex${sub}` }),
  useStorefrontTenant: () => currentTenant,
}))

function renderBuy() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/store/vortex/buy/p1']}>
        <Routes>
          <Route path="/store/:slug/buy/:id" element={<StorefrontBuyPage />} />
          <Route path="/store/:slug/checkout" element={<div>checkout page</div>} />
          <Route path="/store/:slug/product/:id" element={<div>product page</div>} />
          <Route path="/store/:slug" element={<div>store home</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  currentTenant = buildTenant({ catalogType: 'DIGITAL' })
  useCartStore.setState({ tenantSlug: null, items: [], couponCode: null })
  getPublishedProduct.mockResolvedValue(buildProduct({ id: 'p1', name: 'Los Códigos de Lola', price: '9.99' }))
})

describe('direct buy link', () => {
  it('puts the product alone in the cart and lands on checkout', async () => {
    useCartStore.setState({
      tenantSlug: 'other-store',
      items: [{ productId: 'old', name: 'Old', unitPrice: 5, quantity: 3 }],
      couponCode: 'OLD',
    })
    renderBuy()

    expect(await screen.findByText('checkout page')).toBeInTheDocument()
    const { items, couponCode, tenantSlug } = useCartStore.getState()
    expect(tenantSlug).toBe('vortex')
    expect(couponCode).toBeNull()
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ productId: 'p1', quantity: 1, unitPrice: 9.99 })
  })

  it('does not stack a second copy when the link is opened twice', async () => {
    renderBuy()
    await screen.findByText('checkout page')
    renderBuy()
    await screen.findAllByText('checkout page')
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().items[0].quantity).toBe(1)
  })

  it('sends a physical store to the product page, where options are chosen', async () => {
    currentTenant = buildTenant()
    renderBuy()
    expect(await screen.findByText('product page')).toBeInTheDocument()
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('says so when the product is not published', async () => {
    getPublishedProduct.mockRejectedValue(new Error('404'))
    renderBuy()
    expect(await screen.findByText(/not available/i)).toBeInTheDocument()
    expect(useCartStore.getState().items).toHaveLength(0)
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { buildTenant } from '../../../tests/factories'
import { StorefrontOrderPage } from './StorefrontOrderPage'
import type { PublicOrder } from '@/types/api'

const getPublicOrder = vi.fn()
vi.mock('@/services/orders.service', () => ({ getPublicOrder: (...a: unknown[]) => getPublicOrder(...a) }))
vi.mock('@/hooks/useStorefront', () => ({
  useStorefront: () => ({ tenant: buildTenant(), slug: 'vortex', path: (s = '') => `/store/vortex${s}` }),
}))

const order: PublicOrder = {
  id: 'order-1',
  orderNumber: 'ORD-1',
  status: 'PENDING',
  paymentStatus: 'PENDING',
  fulfillmentMethod: 'ZELLE',
  currency: 'USD',
  createdAt: '2026-10-01T10:00:00.000Z',
  customerName: 'Ana Pérez',
  customerEmail: 'ana@test.com',
  customerPhone: '+15551234567',
  shippingAddress: { line1: 'Av. Siempre Viva 742', city: 'Springfield' },
  shipping: { name: 'Delivery', cost: '5.00' },
  subtotal: '50.00',
  taxTotal: '0.00',
  discountTotal: '0.00',
  shippingTotal: '5.00',
  grandTotal: '55.00',
  items: [{ id: 'i1', productName: 'Soap', variantName: null, quantity: 2, unitPrice: '25.00', taxAmount: '0', lineTotal: '50.00' }],
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/store/vortex/order/order-1']}>
        <Routes>
          <Route path="/store/:slug/order/:id" element={<StorefrontOrderPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => getPublicOrder.mockReset())

describe('order invoice page', () => {
  it('shows the customer, delivery address, items and totals', async () => {
    getPublicOrder.mockResolvedValue(order)
    renderPage()

    expect(await screen.findByText('Order Invoice')).toBeInTheDocument()
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument()
    expect(screen.getByText('Av. Siempre Viva 742')).toBeInTheDocument()
    expect(screen.getByText('Soap')).toBeInTheDocument()
    expect(screen.getByText('$55.00')).toBeInTheDocument()
    expect(getPublicOrder).toHaveBeenCalledWith('vortex', 'order-1')
  })

  it('shows pick-up instead of an address when nothing is delivered', async () => {
    getPublicOrder.mockResolvedValue({ ...order, shippingAddress: null, shipping: null, shippingTotal: '0.00' })
    renderPage()

    expect(await screen.findByText('Pick up in store')).toBeInTheDocument()
  })

  it('explains a link that returns no order', async () => {
    // A real 404 is covered against the running API; a rejected mock is reported by
    // this Vitest as an unhandled error even though React Query handles it.
    getPublicOrder.mockResolvedValue(undefined)
    renderPage()

    expect(await screen.findByText('Order not found')).toBeInTheDocument()
  })
})

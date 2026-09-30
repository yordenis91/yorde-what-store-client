import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { buildTenant } from '../../../tests/factories'
import { StorefrontOrderConfirmedPage } from './StorefrontOrderConfirmedPage'
import type { Order, PublicTenant } from '@/types/api'

const uploadPaymentProofImage = vi.fn()

vi.mock('@/services/orders.service', () => ({
  uploadPaymentProofImage: (...args: unknown[]) => uploadPaymentProofImage(...args),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

let currentTenant: PublicTenant = buildTenant()

/** PublicLayout normally supplies this through the router outlet. */
vi.mock('@/hooks/useStorefront', () => ({
  useStorefront: () => ({
    tenant: currentTenant,
    slug: 'vortex',
    path: (sub = '') => `/store/vortex${sub}`,
  }),
  useStorefrontTenant: () => currentTenant,
}))

function buildOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    orderNumber: 'ORD-1',
    customerName: 'Ana',
    customerEmail: null,
    customerPhone: null,
    status: 'PENDING',
    paymentStatus: 'PENDING',
    fulfillmentMethod: 'ZELLE',
    currency: 'USD',
    subtotal: '25',
    taxTotal: '0',
    discountTotal: '0',
    shippingTotal: '0',
    grandTotal: '25',
    fulfillmentMessage: null,
    shipping: null,
    shippingAddress: null,
    paymentProofUrl: null,
    paymentReference: null,
    items: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderPage(order: Order | undefined) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/store/vortex/order-confirmed/order-1', state: order ? { order } : null }]}>
      <Routes>
        <Route path="/store/:slug/order-confirmed/:id" element={<StorefrontOrderConfirmedPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  currentTenant = buildTenant()
  uploadPaymentProofImage.mockReset()
})

describe('Zelle proof upload', () => {
  it('is not shown for orders placed through another fulfillment method', () => {
    renderPage(buildOrder({ fulfillmentMethod: 'WHATSAPP' }))

    expect(screen.queryByText(/payment confirmation/i)).not.toBeInTheDocument()
  })

  it('offers to upload a screenshot for a pending Zelle order', () => {
    renderPage(buildOrder())

    expect(screen.getByText(/payment confirmation/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /upload screenshot/i })).toBeInTheDocument()
  })

  it('uploads the screenshot and shows the order as pending review', async () => {
    const order = buildOrder()
    uploadPaymentProofImage.mockResolvedValue({
      ...order,
      paymentProofUrl: '/uploads/tenant-1/proof.webp',
      paymentReference: 'CONF-123',
    })
    renderPage(order)

    const file = new File(['fake-image'], 'proof.jpg', { type: 'image/jpeg' })
    await userEvent.type(screen.getByLabelText(/confirmation number/i), 'CONF-123')
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, file)

    await waitFor(() =>
      expect(uploadPaymentProofImage).toHaveBeenCalledWith('vortex', 'order-1', file, 'CONF-123'),
    )
    expect(await screen.findByText(/still waiting on your payment confirmation/i)).toBeInTheDocument()
  })

  it('tells the customer their order is already paid instead of asking for a proof', () => {
    renderPage(buildOrder({ paymentStatus: 'PAID', status: 'CONFIRMED' }))

    expect(screen.getByText(/already been confirmed as paid/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /upload screenshot/i })).not.toBeInTheDocument()
  })
})

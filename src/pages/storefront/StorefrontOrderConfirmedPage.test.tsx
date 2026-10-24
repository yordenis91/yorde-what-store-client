import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { buildTenant } from '../../../tests/factories'
import { StorefrontOrderConfirmedPage } from './StorefrontOrderConfirmedPage'
import type { Order, PublicTenant } from '@/types/api'

const uploadPaymentProofImage = vi.fn()
const getPublicOrder = vi.fn()
const capturePayPalOrder = vi.fn()

vi.mock('@/services/orders.service', () => ({
  uploadPaymentProofImage: (...args: unknown[]) => uploadPaymentProofImage(...args),
  getPublicOrder: (...args: unknown[]) => getPublicOrder(...args),
}))
vi.mock('@/services/payments.service', () => ({
  capturePayPalOrder: (...args: unknown[]) => capturePayPalOrder(...args),
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

function renderPage(order: Order | undefined, search = '') {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/store/vortex/order-confirmed/order-1', search, state: order ? { order } : null }]}>
      <Routes>
        <Route path="/store/:slug/order-confirmed/:id" element={<StorefrontOrderConfirmedPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  currentTenant = buildTenant()
  uploadPaymentProofImage.mockReset()
  getPublicOrder.mockReset()
  capturePayPalOrder.mockReset()
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

describe('order invoice link', () => {
  it('thanks the customer and links to the order details page', () => {
    renderPage(buildOrder({ fulfillmentMethod: 'WHATSAPP' }))

    expect(screen.getByText(/thank you for your order/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view order details/i })).toHaveAttribute('href', '/store/vortex/order/order-1')
  })

  it('shows the full link and copies it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderPage(buildOrder({ fulfillmentMethod: 'WHATSAPP' }))

    const link = `${window.location.origin}/store/vortex/order/order-1`
    expect(screen.getByLabelText(/order invoice link/i)).toHaveValue(link)

    await userEvent.click(screen.getByRole('button', { name: 'Copy' }))

    expect(writeText).toHaveBeenCalledWith(link)
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })
})

const publicOrder = (overrides: Record<string, unknown> = {}) => ({
  id: 'order-1',
  orderNumber: 'ORD-9',
  status: 'CONFIRMED',
  paymentStatus: 'PAID',
  fulfillmentMethod: 'PAYPAL',
  currency: 'USD',
  createdAt: '2026-01-01T00:00:00.000Z',
  customerName: 'Bea',
  customerEmail: 'bea@example.com',
  customerPhone: null,
  shippingAddress: null,
  shipping: null,
  subtotal: '9.99',
  taxTotal: '0',
  discountTotal: '0',
  shippingTotal: '0',
  grandTotal: '9.99',
  items: [{ id: 'i1', productName: 'Los Códigos de Lola', variantName: null, quantity: 1, unitPrice: '9.99', taxAmount: '0', lineTotal: '9.99' }],
  ...overrides,
})

describe('returning from PayPal', () => {
  it('asks the server to capture, and says nothing is confirmed until it answers', async () => {
    let resolveCapture: (v: unknown) => void = () => undefined
    capturePayPalOrder.mockReturnValue(new Promise((resolve) => (resolveCapture = resolve)))
    getPublicOrder.mockResolvedValue(publicOrder())
    renderPage(undefined, '?token=PP-1&PayerID=X')

    expect(await screen.findByText(/confirming your payment with paypal/i)).toBeInTheDocument()
    expect(screen.queryByText(/payment confirmed/i)).not.toBeInTheDocument()
    expect(capturePayPalOrder).toHaveBeenCalledWith('vortex', 'order-1')

    resolveCapture({ paymentStatus: 'PAID', status: 'CONFIRMED' })
    expect(await screen.findByText(/payment confirmed/i)).toBeInTheDocument()
    expect(screen.getByText('ORD-9', { exact: false })).toBeInTheDocument()
    expect(screen.getByText(/Los Códigos de Lola/)).toBeInTheDocument()
  })

  it('captures once per visit, however often the page re-renders', async () => {
    capturePayPalOrder.mockResolvedValue({ paymentStatus: 'PAID', status: 'CONFIRMED' })
    getPublicOrder.mockResolvedValue(publicOrder())
    const { rerender } = renderPage(undefined, '?token=PP-1')
    await screen.findByText(/payment confirmed/i)
    rerender(
      <MemoryRouter initialEntries={['/store/vortex/order-confirmed/order-1?token=PP-1']}>
        <Routes>
          <Route path="/store/:slug/order-confirmed/:id" element={<StorefrontOrderConfirmedPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(capturePayPalOrder).toHaveBeenCalledTimes(1)
  })

  it('tells a digital buyer where the downloads are going', async () => {
    currentTenant = buildTenant({ catalogType: 'DIGITAL' })
    capturePayPalOrder.mockResolvedValue({ paymentStatus: 'PAID', status: 'CONFIRMED' })
    getPublicOrder.mockResolvedValue(publicOrder())
    renderPage(undefined, '?token=PP-1')

    expect(await screen.findByText(/downloads to bea@example.com/i)).toBeInTheDocument()
  })

  it('does not claim a payment that PayPal has not completed, and lets the buyer check again', async () => {
    capturePayPalOrder.mockResolvedValueOnce({ paymentStatus: 'PENDING', status: 'PENDING' })
    getPublicOrder.mockResolvedValue(publicOrder({ paymentStatus: 'PENDING', status: 'PENDING' }))
    renderPage(undefined, '?token=PP-1')

    expect(await screen.findByText(/have not received paypal/i)).toBeInTheDocument()
    expect(screen.queryByText(/payment confirmed/i)).not.toBeInTheDocument()

    capturePayPalOrder.mockResolvedValueOnce({ paymentStatus: 'PAID', status: 'CONFIRMED' })
    getPublicOrder.mockResolvedValue(publicOrder())
    await userEvent.click(screen.getByRole('button', { name: /check again/i }))
    expect(await screen.findByText(/payment confirmed/i)).toBeInTheDocument()
    expect(capturePayPalOrder).toHaveBeenCalledTimes(2)
  })

  it('shows a failed payment as failed, with a way back to checkout', async () => {
    capturePayPalOrder.mockResolvedValue({ paymentStatus: 'FAILED', status: 'PENDING' })
    getPublicOrder.mockResolvedValue(publicOrder({ paymentStatus: 'FAILED', status: 'PENDING' }))
    renderPage(undefined, '?token=PP-1')

    expect(await screen.findByText(/payment was not completed/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /try again/i })).toHaveAttribute('href', '/store/vortex/checkout')
  })

  it('does not confirm anything when the server cannot be reached', async () => {
    capturePayPalOrder.mockRejectedValue(new Error('network'))
    renderPage(undefined, '?token=PP-1')

    expect(await screen.findByText(/could not confirm your payment/i)).toBeInTheDocument()
    expect(screen.queryByText(/payment confirmed/i)).not.toBeInTheDocument()
  })

  it('leaves every other return alone: no PayPal token, no capture', async () => {
    renderPage(buildOrder({ fulfillmentMethod: 'STRIPE' }))
    expect(await screen.findByText(/order confirmed/i)).toBeInTheDocument()
    expect(capturePayPalOrder).not.toHaveBeenCalled()
    expect(getPublicOrder).not.toHaveBeenCalled()
  })
})

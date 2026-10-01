import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { OrderEditPage } from './OrderEditPage'
import type { Order } from '@/types/api'

const getOrder = vi.fn()
const updateOrderDetails = vi.fn()
const updateOrderStatus = vi.fn()

vi.mock('@/services/orders.service', () => ({
  getOrder: (...a: unknown[]) => getOrder(...a),
  updateOrderDetails: (...a: unknown[]) => updateOrderDetails(...a),
  updateOrderStatus: (...a: unknown[]) => updateOrderStatus(...a),
}))
vi.mock('@/services/products.service', () => ({
  listProducts: vi.fn().mockResolvedValue({ items: [], meta: {} }),
}))
vi.mock('@/services/shipping.service', () => ({
  listShippings: vi.fn().mockResolvedValue([{ id: 's1', name: 'Courier', cost: '7.50' }]),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

function buildOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'o1',
    orderNumber: 'ORD-1',
    customerName: 'Ana',
    customerEmail: null,
    customerPhone: '+1555',
    status: 'PENDING',
    paymentStatus: 'PENDING',
    fulfillmentMethod: 'ZELLE',
    currency: 'USD',
    subtotal: '50',
    taxTotal: '0',
    discountTotal: '0',
    shippingTotal: '0',
    grandTotal: '50',
    fulfillmentMessage: null,
    shipping: null,
    shippingAddress: null,
    paymentProofUrl: null,
    paymentReference: null,
    items: [
      { id: 'i1', productId: 'p1', variantId: null, productName: 'Soap', variantName: null, sku: null, unitPrice: '25', quantity: 2, taxAmount: '0', lineTotal: '50' },
    ],
    createdAt: '2026-10-01T10:00:00.000Z',
    ...overrides,
  } as Order
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/admin/orders/o1/edit']}>
        <Routes>
          <Route path="/admin/orders/:id/edit" element={<OrderEditPage />} />
          <Route path="/admin/orders/:id" element={<p>Order detail</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const goTo = (name: RegExp) => userEvent.click(screen.getByRole('button', { name }))

beforeEach(() => {
  getOrder.mockReset().mockResolvedValue(buildOrder())
  updateOrderDetails.mockReset().mockResolvedValue({})
  updateOrderStatus.mockReset().mockResolvedValue({})
})

describe('order edit page', () => {
  it('sends only the contact details when nothing else changed', async () => {
    renderPage()
    const name = await screen.findByLabelText('Full name')
    await userEvent.clear(name)
    await userEvent.type(name, 'Ana Belén')

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(updateOrderDetails).toHaveBeenCalled())
    const payload = updateOrderDetails.mock.calls[0][1]
    expect(payload).toMatchObject({ customerName: 'Ana Belén', customerPhone: '+1555' })
    // Untouched groups are left out so the server doesn't re-price or re-validate them.
    expect(payload).not.toHaveProperty('items')
    expect(payload).not.toHaveProperty('shippingId')
    expect(payload).not.toHaveProperty('paymentStatus')
    expect(updateOrderStatus).not.toHaveBeenCalled()
  })

  it('sends the full item list with quantities but never a price', async () => {
    renderPage()
    await screen.findByLabelText('Full name')
    await goTo(/order items/i)
    const qty = screen.getByLabelText('Quantity Soap')
    await userEvent.clear(qty)
    await userEvent.type(qty, '5')

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(updateOrderDetails).toHaveBeenCalled())
    expect(updateOrderDetails.mock.calls[0][1].items).toEqual([{ productId: 'p1', variantId: undefined, quantity: 5 }])
  })

  it('will not let the last item be removed', async () => {
    renderPage()
    await screen.findByLabelText('Full name')
    await goTo(/order items/i)

    expect(screen.getByRole('button', { name: /remove soap/i })).toBeDisabled()
  })

  it('locks items, shipping and payment status on an order already paid by card', async () => {
    getOrder.mockResolvedValue(buildOrder({ fulfillmentMethod: 'STRIPE', paymentStatus: 'PAID', status: 'CONFIRMED' }))
    renderPage()
    await screen.findByLabelText('Full name')

    await goTo(/order items/i)
    expect(screen.getByText(/paid by card/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Quantity Soap')).toBeDisabled()

    await goTo(/shipping details/i)
    expect(screen.getByLabelText('Shipping method')).toBeDisabled()

    await goTo(/payment & status/i)
    expect(screen.getByLabelText('Payment status')).toBeDisabled()
  })

  it('asks before cancelling, does nothing if dismissed, and saves details before changing the status', async () => {
    renderPage()
    await screen.findByLabelText('Full name')
    await goTo(/payment & status/i)
    await userEvent.selectOptions(screen.getByLabelText('Order status'), 'CANCELLED')

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    const dialog = await screen.findByRole('dialog')
    expect(updateOrderDetails).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(updateOrderStatus).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirm' }))

    await waitFor(() => expect(updateOrderStatus).toHaveBeenCalledWith('o1', 'CANCELLED'))
    expect(updateOrderDetails.mock.invocationCallOrder[0]).toBeLessThan(updateOrderStatus.mock.invocationCallOrder[0])
  })

  it('shows no form for an order that is already closed', async () => {
    getOrder.mockResolvedValue(buildOrder({ status: 'REFUNDED' }))
    renderPage()

    expect(await screen.findByText(/can no longer be edited/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
  })
})

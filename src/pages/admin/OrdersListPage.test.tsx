import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { OrdersListPage } from './OrdersListPage'
import type { Order } from '@/types/api'

const listOrders = vi.fn()
const updateOrderStatus = vi.fn()
const hideOrder = vi.fn()

vi.mock('@/services/orders.service', () => ({
  listOrders: (...a: unknown[]) => listOrders(...a),
  updateOrderStatus: (...a: unknown[]) => updateOrderStatus(...a),
  hideOrder: (...a: unknown[]) => hideOrder(...a),
  exportOrdersCsv: vi.fn(),
  updateOrderDetails: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

function order(overrides: Partial<Order>): Order {
  return {
    id: 'o1',
    orderNumber: 'ORD-1',
    customerName: 'Ana',
    customerEmail: null,
    customerPhone: null,
    status: 'PENDING',
    paymentStatus: 'PENDING',
    fulfillmentMethod: 'WHATSAPP',
    currency: 'USD',
    subtotal: '10',
    taxTotal: '0',
    discountTotal: '0',
    shippingTotal: '0',
    grandTotal: '10',
    fulfillmentMessage: null,
    shipping: null,
    shippingAddress: null,
    paymentProofUrl: null,
    paymentReference: null,
    items: [],
    createdAt: '2026-10-01T10:00:00.000Z',
    ...overrides,
  } as Order
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <OrdersListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const statusSelect = (n: string) => screen.getByRole('combobox', { name: new RegExp(`order ${n}$`, 'i') })

beforeEach(() => {
  listOrders.mockReset()
  updateOrderStatus.mockReset().mockResolvedValue({})
  hideOrder.mockReset().mockResolvedValue(undefined)
  listOrders.mockResolvedValue({
    items: [
      order({ id: 'o1', orderNumber: 'ORD-1', status: 'PENDING' }),
      order({ id: 'o2', orderNumber: 'ORD-2', status: 'CANCELLED' }),
      order({ id: 'o3', orderNumber: 'ORD-3', status: 'COMPLETED' }),
    ],
    meta: { page: 1, limit: 50, total: 3, totalPages: 1 },
  })
})

describe('orders list', () => {
  it('asks the server to sort when a column header is clicked, and flips on a second click', async () => {
    renderPage()
    await screen.findByText('ORD-1')

    await userEvent.click(screen.getByRole('button', { name: /^total/i }))
    await waitFor(() => expect(listOrders).toHaveBeenLastCalledWith(expect.objectContaining({ sortBy: 'grandTotal', sortDir: 'desc' })))

    await userEvent.click(screen.getByRole('button', { name: /^total/i }))
    await waitFor(() => expect(listOrders).toHaveBeenLastCalledWith(expect.objectContaining({ sortBy: 'grandTotal', sortDir: 'asc' })))
  })

  it('changes a harmless status straight from the row', async () => {
    renderPage()
    await screen.findByText('ORD-1')

    await userEvent.selectOptions(statusSelect('ORD-1'), 'PROCESSING')

    await waitFor(() => expect(updateOrderStatus).toHaveBeenCalledWith('o1', 'PROCESSING'))
  })

  it.each(['CANCELLED', 'REFUNDED'])('asks before moving an order to %s, and does nothing if dismissed', async (target) => {
    renderPage()
    await screen.findByText('ORD-1')

    await userEvent.selectOptions(statusSelect('ORD-1'), target)
    const dialog = await screen.findByRole('dialog')
    expect(updateOrderStatus).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(updateOrderStatus).not.toHaveBeenCalled()

    await userEvent.selectOptions(statusSelect('ORD-1'), target)
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(updateOrderStatus).toHaveBeenCalledWith('o1', target))
  })

  it('locks a cancelled order: no status change and no edit, but it can be deleted', async () => {
    renderPage()
    await screen.findByText('ORD-2')

    expect(statusSelect('ORD-2')).toBeDisabled()
    expect(screen.getByRole('button', { name: /edit order ORD-2/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /delete order ORD-2/i })).toBeEnabled()
  })

  it('will not offer to delete an order that is still open', async () => {
    renderPage()
    await screen.findByText('ORD-1')

    expect(screen.getByRole('button', { name: /delete order ORD-1/i })).toBeDisabled()
  })

  it('deletes only after confirmation', async () => {
    renderPage()
    await screen.findByText('ORD-3')

    await userEvent.click(screen.getByRole('button', { name: /delete order ORD-3/i }))
    expect(hideOrder).not.toHaveBeenCalled()

    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(hideOrder).toHaveBeenCalledWith('o3'))
  })
})

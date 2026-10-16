import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { OrdersListPage } from './OrdersListPage'
import { useAuthStore } from '@/store/auth.store'
import type { Order, Tenant } from '@/types/api'

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

describe('permissions: a collaborator (STAFF) versus the owner', () => {
  const asRole = (myRole: 'OWNER' | 'STAFF') =>
    useAuthStore.setState({ activeTenant: { id: 't1', myRole } as Tenant, impersonation: null })

  beforeEach(() => {
    listOrders.mockResolvedValue({
      items: [
        order({ id: 'p1', orderNumber: 'ORD-PAID', status: 'CONFIRMED', paymentStatus: 'PAID', fulfillmentMethod: 'STRIPE' }),
        order({ id: 'u1', orderNumber: 'ORD-OPEN', status: 'PENDING', paymentStatus: 'PENDING', fulfillmentMethod: 'STRIPE' }),
      ],
      meta: { page: 1, limit: 50, total: 2, totalPages: 1 },
    })
  })

  const option = (select: HTMLElement, name: string) => within(select).getByRole('option', { name }) as HTMLOptionElement

  it('hides the CSV export from a collaborator, since it carries every customer\'s personal data', async () => {
    asRole('STAFF')
    renderPage()
    await screen.findByText('ORD-PAID')

    expect(screen.queryByRole('button', { name: 'Export CSV' })).not.toBeInTheDocument()
  })

  it('shows the owner the export', async () => {
    asRole('OWNER')
    renderPage()
    await screen.findByText('ORD-PAID')

    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeInTheDocument()
  })

  it('stops a collaborator from picking a status that returns money', async () => {
    asRole('STAFF')
    renderPage()
    await screen.findByText('ORD-PAID')

    const paid = statusSelect('ORD-PAID')
    expect(option(paid, 'REFUNDED').disabled).toBe(true)
    expect(option(paid, 'CANCELLED').disabled).toBe(true) // cancelling a paid card order refunds it
    expect(option(paid, 'PROCESSING').disabled).toBe(false)

    const open = statusSelect('ORD-OPEN')
    expect(option(open, 'CANCELLED').disabled).toBe(false) // no money moved
    expect(option(open, 'REFUNDED').disabled).toBe(true)
  })

  it('leaves every status open to the owner', async () => {
    asRole('OWNER')
    renderPage()
    await screen.findByText('ORD-PAID')

    const paid = statusSelect('ORD-PAID')
    expect(option(paid, 'REFUNDED').disabled).toBe(false)
    expect(option(paid, 'CANCELLED').disabled).toBe(false)
  })

  it('tells the owner that cancelling a paid card order refunds it', async () => {
    asRole('OWNER')
    renderPage()
    await screen.findByText('ORD-PAID')

    await userEvent.selectOptions(statusSelect('ORD-PAID'), 'CANCELLED')

    expect(await screen.findByText(/card payment refunded through the gateway/i)).toBeInTheDocument()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { BuyersPage } from './BuyersPage'
import { useAuthStore } from '@/store/auth.store'
import type { Buyer } from '@/services/digital.service'
import type { Tenant } from '@/types/api'

const listBuyers = vi.fn()
const exportBuyersCsv = vi.fn()
const resendDelivery = vi.fn()
const updateOrderStatus = vi.fn()

vi.mock('@/services/digital.service', () => ({
  listBuyers: (...a: unknown[]) => listBuyers(...a),
  exportBuyersCsv: (...a: unknown[]) => exportBuyersCsv(...a),
  resendDelivery: (...a: unknown[]) => resendDelivery(...a),
}))
vi.mock('@/services/orders.service', () => ({
  updateOrderStatus: (...a: unknown[]) => updateOrderStatus(...a),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const buyer = (overrides: Partial<Buyer> = {}): Buyer => ({
  orderId: 'o1',
  orderNumber: 'ORD-1',
  customerName: 'Bea Compradora',
  customerEmail: 'bea@example.com',
  products: ['Los Códigos de Lola'],
  amount: '9.99',
  currency: 'USD',
  createdAt: '2026-10-30T15:00:00.000Z',
  paymentStatus: 'PAID',
  orderStatus: 'CONFIRMED',
  provider: 'PAYPAL',
  deliveryStatus: 'SENT',
  emailAttempts: 1,
  lastError: null,
  sentAt: '2026-10-30T15:00:05.000Z',
  downloads: 2,
  ...overrides,
})

const page = (items: Buyer[], extra: Partial<{ total: number; totalPages: number }> = {}) => ({
  items,
  meta: { page: 1, limit: 50, total: extra.total ?? items.length, totalPages: extra.totalPages ?? 1 },
})

function renderPage(role: 'OWNER' | 'STAFF' = 'OWNER') {
  useAuthStore.setState({
    activeTenant: { id: 't1', myRole: role, currencySymbol: '$', currencySymbolPosition: 'pre' } as Tenant,
    impersonation: null,
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <BuyersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  listBuyers.mockResolvedValue(page([buyer()]))
  resendDelivery.mockResolvedValue({ queued: true })
  updateOrderStatus.mockResolvedValue({})
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

describe('buyers list', () => {
  it('shows who paid, what, how much, with what, and whether the files arrived', async () => {
    renderPage()

    const row = (await screen.findByText('Bea Compradora')).closest('tr')!
    expect(within(row).getByText('bea@example.com')).toBeInTheDocument()
    expect(within(row).getByText('Los Códigos de Lola')).toBeInTheDocument()
    expect(within(row).getByText('$9.99')).toBeInTheDocument()
    // The status filter also lists "Paid", so look inside the row.
    expect(within(row).getByText('Paid')).toBeInTheDocument()
    expect(within(row).getByText('PayPal')).toBeInTheDocument()
    expect(within(row).getByText('Delivered by email')).toBeInTheDocument()
    expect(within(row).getByText('2 downloads')).toBeInTheDocument()
  })

  it('shows a paid order whose email failed as pending, with the reason', async () => {
    listBuyers.mockResolvedValue(page([buyer({ deliveryStatus: 'PENDING', lastError: 'SMTP down', emailAttempts: 3 })]))
    renderPage()

    expect(await screen.findByText('Paid, delivery pending')).toBeInTheDocument()
    expect(screen.getByText('SMTP down')).toBeInTheDocument()
  })

  it('resends the delivery email', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Resend email' }))

    await waitFor(() => expect(resendDelivery).toHaveBeenCalledWith('o1'))
  })

  it('does not offer to resend links that were disabled, nor for an unpaid order', async () => {
    listBuyers.mockResolvedValue(
      page([
        buyer({ orderId: 'o2', paymentStatus: 'DISPUTED', deliveryStatus: 'REVOKED' }),
        buyer({ orderId: 'o3', paymentStatus: 'PENDING', deliveryStatus: null }),
      ]),
    )
    renderPage()
    await screen.findAllByText('Bea Compradora')

    expect(screen.queryByRole('button', { name: 'Resend email' })).not.toBeInTheDocument()
    expect(screen.getByText('Links disabled')).toBeInTheDocument()
  })

  it('refunds after the owner confirms, and not if they decline', async () => {
    renderPage()
    const refund = await screen.findByRole('button', { name: 'Refund' })

    vi.spyOn(window, 'confirm').mockReturnValueOnce(false)
    await userEvent.click(refund)
    expect(updateOrderStatus).not.toHaveBeenCalled()

    await userEvent.click(refund)
    await waitFor(() => expect(updateOrderStatus).toHaveBeenCalledWith('o1', 'REFUNDED'))
  })

  it('lets a collaborator see and resend, but not refund or export (OWNER-only on the API)', async () => {
    renderPage('STAFF')
    await screen.findByText('Bea Compradora')

    expect(screen.getByRole('button', { name: 'Resend email' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Refund' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Export CSV' })).not.toBeInTheDocument()
  })

  it('exports with the filters currently applied', async () => {
    renderPage()
    await screen.findByText('Bea Compradora')
    await userEvent.type(screen.getByPlaceholderText(/search/i), 'bea')
    await userEvent.click(screen.getByRole('button', { name: 'Export CSV' }))

    await waitFor(() => expect(exportBuyersCsv).toHaveBeenCalled())
    expect(exportBuyersCsv.mock.calls[0][0]).toMatchObject({ search: 'bea' })
  })

  it('sends filters to the server and returns to the first page', async () => {
    listBuyers.mockResolvedValue(page([buyer()], { total: 120, totalPages: 3 }))
    renderPage()
    await screen.findByText('Bea Compradora')
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(listBuyers).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })))

    await userEvent.selectOptions(screen.getByLabelText('Payment'), 'PAID')
    await waitFor(() => expect(listBuyers).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, paymentStatus: 'PAID' })))
  })

  it('says so when there are no buyers yet', async () => {
    listBuyers.mockResolvedValue(page([]))
    renderPage()
    expect(await screen.findByText('No buyers yet.')).toBeInTheDocument()
  })

  it('reports a failed load instead of looking empty', async () => {
    listBuyers.mockRejectedValue(new Error('boom'))
    renderPage()
    expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
})

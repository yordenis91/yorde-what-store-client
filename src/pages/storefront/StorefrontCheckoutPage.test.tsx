import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCartStore } from '@/store/cart.store'
import { useCustomerStore } from '@/store/customer.store'
import { buildTenant } from '../../../tests/factories'
import { StorefrontCheckoutPage } from './StorefrontCheckoutPage'
import type { OrderQuote } from '@/services/orders.service'
import type { PublicTenant } from '@/types/api'

const createOrder = vi.fn()
const quoteOrder = vi.fn()
const listPublicShippings = vi.fn()
const createStripeCheckout = vi.fn()
const registerCustomer = vi.fn()

vi.mock('@/services/orders.service', () => ({
  createOrder: (...args: unknown[]) => createOrder(...args),
  quoteOrder: (...args: unknown[]) => quoteOrder(...args),
}))
vi.mock('@/services/shipping.service', () => ({
  listPublicShippings: (...args: unknown[]) => listPublicShippings(...args),
}))
vi.mock('@/services/payments.service', () => ({
  createStripeCheckout: (...args: unknown[]) => createStripeCheckout(...args),
}))
vi.mock('@/services/customers.service', () => ({
  registerCustomer: (...args: unknown[]) => registerCustomer(...args),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const SHIPPING_ID = '11111111-1111-4111-8111-111111111111'

function buildQuote(overrides: Partial<OrderQuote> = {}): OrderQuote {
  return {
    currency: 'USD',
    subtotal: 50,
    taxTotal: 10.5,
    discountTotal: 0,
    shippingTotal: 0,
    grandTotal: 60.5,
    coupon: null,
    couponError: null,
    shipping: null,
    stockIssues: [],
    items: [],
    ...overrides,
  }
}

function renderCheckout() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/store/vortex/checkout']}>
        <Routes>
          <Route path="/store/:slug/checkout" element={<StorefrontCheckoutPage />} />
          <Route path="/store/:slug/order-confirmed/:id" element={<p>Order confirmed</p>} />
          <Route path="/store/:slug/cart" element={<p>Cart</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** PublicLayout normally supplies this through the router outlet. */
vi.mock('@/hooks/useStorefront', () => ({
  useStorefront: () => ({
    tenant: currentTenant,
    slug: 'vortex',
    path: (sub = '') => `/store/vortex${sub}`,
  }),
  useStorefrontTenant: () => currentTenant,
}))

let currentTenant: PublicTenant = buildTenant()

async function fillContactAndContinue() {
  await userEvent.type(screen.getByLabelText(/full name/i), 'Ana Pérez')
  await userEvent.type(screen.getByLabelText(/phone/i), '+15551234567')
  await userEvent.click(screen.getAllByRole('button', { name: /continue/i })[0])
  await screen.findByRole('heading', { name: 'Delivery' })
}

beforeEach(() => {
  currentTenant = buildTenant()
  useCartStore.setState({
    tenantSlug: 'vortex',
    items: [{ productId: 'p1', name: 'Soap', unitPrice: 25, quantity: 2 }],
    couponCode: null,
  })
  useCustomerStore.setState({ tenantSlug: null, customer: null, accessToken: null, isBootstrapping: false })
  quoteOrder.mockResolvedValue(buildQuote())
  listPublicShippings.mockResolvedValue([])
  createOrder.mockResolvedValue({
    order: { id: 'order-1', orderNumber: 'ORD-1' },
    fulfillment: { type: 'TELEGRAM', queued: true },
  })
  registerCustomer.mockResolvedValue({
    customer: { id: 'cust-1', name: 'Ana Pérez', email: 'ana@test.com', phone: null, createdAt: '2026-01-01' },
    accessToken: 'customer-token',
  })
})

describe('totals', () => {
  it('shows the figures the server quoted, including tax', async () => {
    renderCheckout()

    // Once in the order summary card, once in the mobile sticky total bar.
    expect(await screen.findAllByText('$60.50')).toHaveLength(2)
    expect(screen.getByText('$10.50')).toBeInTheDocument()
    // Once on the basket line, once on the subtotal row.
    expect(screen.getAllByText('$50.00')).toHaveLength(2)
  })

  it('asks the server to price the basket rather than computing it locally', async () => {
    renderCheckout()

    await waitFor(() =>
      expect(quoteOrder).toHaveBeenCalledWith('vortex', {
        items: [{ productId: 'p1', variantId: undefined, quantity: 2 }],
        couponCode: undefined,
        shippingId: undefined,
      }),
    )
  })

  it('shows a discount line only when the server applied one', async () => {
    quoteOrder.mockResolvedValue(buildQuote({ discountTotal: 6.05, coupon: { code: 'SUMMER10', discountType: 'PERCENTAGE' } }))
    renderCheckout()

    expect(await screen.findByText('−$6.05')).toBeInTheDocument()
    expect(screen.getByText(/coupon summer10 applied/i)).toBeInTheDocument()
  })
})

describe('step gating', () => {
  it('will not advance past contact without a name and phone', async () => {
    renderCheckout()
    await screen.findByRole('heading', { name: /contact/i })

    await userEvent.click(screen.getAllByRole('button', { name: /continue/i })[0])

    expect(screen.getByRole('heading', { name: /contact/i })).toBeInTheDocument()
  })

  it('rejects a malformed email', async () => {
    renderCheckout()
    await screen.findByRole('heading', { name: /contact/i })

    await userEvent.type(screen.getByLabelText(/full name/i), 'Ana')
    await userEvent.type(screen.getByLabelText(/phone/i), '+15551234567')
    await userEvent.type(screen.getByLabelText(/email/i), 'not-an-email')
    await userEvent.click(screen.getAllByRole('button', { name: /continue/i })[0])

    expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument()
  })

  it('advances to delivery once contact details are valid', async () => {
    renderCheckout()
    await screen.findByRole('heading', { name: /contact/i })

    await fillContactAndContinue()

    expect(screen.getByRole('heading', { name: 'Delivery' })).toBeInTheDocument()
  })

  it('asks for no address when the order is collected in store', async () => {
    renderCheckout()
    await screen.findByRole('heading', { name: /contact/i })
    await fillContactAndContinue()

    expect(screen.queryByLabelText(/street and number/i)).not.toBeInTheDocument()

    await userEvent.click(screen.getAllByRole('button', { name: /continue/i })[0])

    expect(await screen.findByRole('heading', { name: /payment/i })).toBeInTheDocument()
  })

  it('requires an address once a delivery option is chosen', async () => {
    listPublicShippings.mockResolvedValue([{ id: SHIPPING_ID, name: 'Delivery', cost: '5.00', location: null }])
    renderCheckout()
    await screen.findByRole('heading', { name: /contact/i })
    await fillContactAndContinue()

    await userEvent.click(await screen.findByRole('button', { name: /^Delivery/ }))
    expect(await screen.findByLabelText(/street and number/i)).toBeInTheDocument()

    await userEvent.click(screen.getAllByRole('button', { name: /continue/i })[0])

    expect(screen.getByRole('heading', { name: 'Delivery' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /payment/i })).not.toBeInTheDocument()
  })
})

describe('placing the order', () => {
  /**
   * Regression, and the reason no button in this form is type="submit". A single
   * button that flipped from "button" to "submit" on reaching the last step
   * placed the order on that very click: React applies the state update
   * synchronously for click events, so the browser ran the default submit
   * against a button that had already become a submit — skipping payment
   * entirely.
   */
  it('does not place the order on the click that reaches the payment step', async () => {
    renderCheckout()
    await screen.findByRole('heading', { name: /contact/i })
    await fillContactAndContinue()

    await userEvent.click(screen.getAllByRole('button', { name: /continue/i })[0])
    await screen.findByRole('heading', { name: /payment/i })

    expect(createOrder).not.toHaveBeenCalled()
  })

  it('places the order only when the shopper confirms', async () => {
    renderCheckout()
    await screen.findByRole('heading', { name: /contact/i })
    await fillContactAndContinue()
    await userEvent.click(screen.getAllByRole('button', { name: /continue/i })[0])
    await screen.findByRole('heading', { name: /payment/i })

    await userEvent.click(screen.getAllByRole('button', { name: /place order/i })[0])

    await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1))
  })

  it('sends no address for a pickup order', async () => {
    renderCheckout()
    await screen.findByRole('heading', { name: /contact/i })
    await fillContactAndContinue()
    await userEvent.click(screen.getAllByRole('button', { name: /continue/i })[0])
    await screen.findByRole('heading', { name: /payment/i })
    await userEvent.click(screen.getAllByRole('button', { name: /place order/i })[0])

    await waitFor(() => expect(createOrder).toHaveBeenCalled())
    expect(createOrder.mock.calls[0][1]).toMatchObject({
      customerName: 'Ana Pérez',
      customerPhone: '+15551234567',
      shippingAddress: undefined,
      shippingId: undefined,
    })
  })

  /**
   * The order model always accepted shippingAddress; the storefront never sent
   * one, so delivery orders reached the store with nowhere to deliver to.
   */
  it('sends the delivery address when the order is shipped', async () => {
    listPublicShippings.mockResolvedValue([{ id: SHIPPING_ID, name: 'Delivery', cost: '5.00', location: null }])
    renderCheckout()
    await screen.findByRole('heading', { name: /contact/i })
    await fillContactAndContinue()

    await userEvent.click(await screen.findByRole('button', { name: /^Delivery/ }))
    await userEvent.type(await screen.findByLabelText(/street and number/i), 'Av. Siempre Viva 742')
    await userEvent.type(screen.getByLabelText(/city/i), 'Springfield')
    await userEvent.click(screen.getAllByRole('button', { name: /continue/i })[0])
    await screen.findByRole('heading', { name: /payment/i })
    await userEvent.click(screen.getAllByRole('button', { name: /place order/i })[0])

    await waitFor(() => expect(createOrder).toHaveBeenCalled())
    expect(createOrder.mock.calls[0][1]).toMatchObject({
      shippingId: SHIPPING_ID,
      shippingAddress: expect.objectContaining({ line1: 'Av. Siempre Viva 742', city: 'Springfield' }),
    })
  })
})

describe('stock shortfalls', () => {
  it('warns about what the store can no longer fulfil', async () => {
    quoteOrder.mockResolvedValue(
      buildQuote({ stockIssues: [{ productId: 'p1', variantId: null, name: 'Soap', requested: 5, available: 3 }] }),
    )
    renderCheckout()

    expect(await screen.findByText(/stock changed while you were shopping/i)).toBeInTheDocument()
    expect(screen.getByText(/soap: only 3 left/i)).toBeInTheDocument()
  })

  it('blocks the order while a shortfall stands', async () => {
    quoteOrder.mockResolvedValue(
      buildQuote({ stockIssues: [{ productId: 'p1', variantId: null, name: 'Soap', requested: 5, available: 3 }] }),
    )
    renderCheckout()
    await screen.findByRole('heading', { name: /contact/i })
    await fillContactAndContinue()
    await userEvent.click(screen.getAllByRole('button', { name: /continue/i })[0])
    await screen.findByRole('heading', { name: /payment/i })

    expect(screen.getAllByRole('button', { name: /place order/i })[0]).toBeDisabled()
  })
})

describe('account creation at checkout', () => {
  it('is not offered to a shopper who is already signed in', async () => {
    useCustomerStore.setState({
      tenantSlug: 'vortex',
      customer: { id: 'cust-1', name: 'Ana', email: 'ana@test.com', phone: null, createdAt: '2026-01-01' },
      accessToken: 'existing-token',
      isBootstrapping: false,
    })
    renderCheckout()
    await screen.findByRole('heading', { name: /contact/i })

    expect(screen.queryByText(/create an account with these details/i)).not.toBeInTheDocument()
  })

  it('requires a password once the checkbox is ticked', async () => {
    renderCheckout()
    await screen.findByRole('heading', { name: /contact/i })

    await userEvent.type(screen.getByLabelText(/full name/i), 'Ana Pérez')
    await userEvent.type(screen.getByLabelText(/phone/i), '+15551234567')
    await userEvent.type(screen.getByLabelText(/email/i), 'ana@test.com')
    await userEvent.click(screen.getByLabelText(/create an account with these details/i))
    await userEvent.click(screen.getAllByRole('button', { name: /continue/i })[0])

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument()
    expect(registerCustomer).not.toHaveBeenCalled()
  })

  it('registers the account before placing the order, and still places it as a guest if registration fails', async () => {
    registerCustomer.mockRejectedValueOnce(new Error('Email already registered'))
    renderCheckout()
    await screen.findByRole('heading', { name: /contact/i })

    await userEvent.type(screen.getByLabelText(/full name/i), 'Ana Pérez')
    await userEvent.type(screen.getByLabelText(/phone/i), '+15551234567')
    await userEvent.type(screen.getByLabelText(/email/i), 'ana@test.com')
    await userEvent.click(screen.getByLabelText(/create an account with these details/i))
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password123')
    await userEvent.click(screen.getAllByRole('button', { name: /continue/i })[0])
    await screen.findByRole('heading', { name: 'Delivery' })
    await userEvent.click(screen.getAllByRole('button', { name: /continue/i })[0])
    await screen.findByRole('heading', { name: /payment/i })

    await userEvent.click(screen.getAllByRole('button', { name: /place order/i })[0])

    await waitFor(() => expect(registerCustomer).toHaveBeenCalledWith({
      email: 'ana@test.com',
      password: 'password123',
      name: 'Ana Pérez',
      phone: '+15551234567',
    }))
    // Registration rejected above — the order still goes through as a guest.
    await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1))
  })
})

describe('payment methods', () => {
  it('offers only the methods the store has enabled', async () => {
    currentTenant = buildTenant({ whatsappEnabled: true, telegramEnabled: false })
    renderCheckout()
    await screen.findByRole('heading', { name: /contact/i })
    await fillContactAndContinue()
    await userEvent.click(screen.getAllByRole('button', { name: /continue/i })[0])
    await screen.findByRole('heading', { name: /payment/i })

    expect(screen.getByRole('button', { name: /order via whatsapp/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /order via telegram/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pay with card/i })).toBeInTheDocument()
  })
})

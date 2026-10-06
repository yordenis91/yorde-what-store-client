import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { PlansPage } from './PlansPage'
import type { Subscription } from '@/services/plans.service'
import type { Plan } from '@/types/api'

const listActivePlans = vi.fn()
const getCurrentSubscription = vi.fn()
const getBillingStatus = vi.fn()
const requestPlanUpgrade = vi.fn()
const startCardCheckout = vi.fn()
const subscribeToPlan = vi.fn()

vi.mock('@/services/plans.service', () => ({
  listActivePlans: () => listActivePlans(),
  getCurrentSubscription: () => getCurrentSubscription(),
  getBillingStatus: () => getBillingStatus(),
  requestPlanUpgrade: (...a: unknown[]) => requestPlanUpgrade(...a),
  startCardCheckout: (...a: unknown[]) => startCardCheckout(...a),
  openBillingPortal: vi.fn(),
  subscribeToPlan: (...a: unknown[]) => subscribeToPlan(...a),
}))
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }))

function plan(overrides: Partial<Plan>): Plan {
  return {
    id: 'plan-free',
    name: 'Free',
    price: '0',
    duration: 'LIFETIME',
    maxStores: 1,
    maxProducts: 20,
    features: [],
    fulfillmentMethods: ['WHATSAPP'],
    isActive: true,
    ...overrides,
  }
}

const FREE = plan({})
const PRO = plan({ id: 'plan-pro', name: 'Pro', price: '19', duration: 'MONTHLY' })

function subscription(overrides: Partial<Subscription>): Subscription {
  return {
    id: 'sub-1',
    planId: FREE.id,
    requestedPlanId: null,
    requestedPaymentReference: null,
    status: 'ACTIVE',
    expiresAt: null,
    graceEndsAt: null,
    lapsed: false,
    billingProvider: 'MANUAL',
    stripeSubscriptionId: null,
    stripeCustomerId: null,
    cancelAtPeriodEnd: false,
    plan: FREE,
    ...overrides,
  }
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PlansPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  listActivePlans.mockResolvedValue([FREE, PRO])
  getCurrentSubscription.mockResolvedValue(subscription({}))
  getBillingStatus.mockResolvedValue({ cardBillingEnabled: true })
  requestPlanUpgrade.mockResolvedValue({})
  subscribeToPlan.mockResolvedValue({})
})

describe('PlansPage', () => {
  it('offers card payment and a manual alternative for a paid plan', async () => {
    renderPage()

    expect(await screen.findByRole('button', { name: /pay by card/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pay by zelle or transfer/i })).toBeInTheDocument()
  })

  it('only offers the manual request when card billing is not configured', async () => {
    getBillingStatus.mockResolvedValue({ cardBillingEnabled: false })
    renderPage()

    expect(await screen.findByRole('button', { name: /request upgrade/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /pay by card/i })).not.toBeInTheDocument()
  })

  it('sends a manual request with its payment reference', async () => {
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: /pay by zelle or transfer/i }))
    await userEvent.type(screen.getByLabelText(/payment reference/i), 'ZELLE-123')
    await userEvent.click(screen.getByRole('button', { name: /send request/i }))

    await waitFor(() =>
      expect(requestPlanUpgrade.mock.calls[0][0]).toEqual({ planId: 'plan-pro', paymentReference: 'ZELLE-123' }),
    )
  })

  it('warns during the grace period after a paid plan expires', async () => {
    getCurrentSubscription.mockResolvedValue(
      subscription({
        planId: PRO.id,
        plan: PRO,
        expiresAt: '2020-01-01T00:00:00Z',
        graceEndsAt: '2020-01-08T00:00:00Z',
      }),
    )
    renderPage()

    expect(await screen.findByText(/expired on .* everything keeps working until/i)).toBeInTheDocument()
  })

  it('says when a lapsed store is already on Free limits, and lets it buy the plan again', async () => {
    getCurrentSubscription.mockResolvedValue(
      subscription({ planId: PRO.id, plan: PRO, expiresAt: '2020-01-01T00:00:00Z', lapsed: true }),
    )
    renderPage()

    expect(await screen.findByText(/now has free plan limits/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pay by card/i })).toBeInTheDocument()
  })

  it('shows an auto-renewing card plan with a link to manage billing, and no manual options', async () => {
    getCurrentSubscription.mockResolvedValue(
      subscription({
        planId: PRO.id,
        plan: PRO,
        expiresAt: '2099-01-01T00:00:00Z',
        billingProvider: 'STRIPE',
        stripeSubscriptionId: 'sub_1',
        stripeCustomerId: 'cus_1',
      }),
    )
    renderPage()

    expect(await screen.findByText(/renews automatically/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /manage card and invoices/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /zelle or transfer/i })).not.toBeInTheDocument()
  })

  it("builds each card from the plan's real limits and channels, dropping stale copy but keeping the rest", async () => {
    listActivePlans.mockResolvedValue([
      FREE,
      plan({
        id: 'plan-pro',
        name: 'Pro',
        price: '19',
        maxStores: 3,
        maxProducts: -1,
        features: ['3 stores', 'Stripe payments', 'Telegram checkout', 'Priority support'],
        fulfillmentMethods: ['WHATSAPP', 'STRIPE', 'ZELLE'],
      }),
    ])
    renderPage()

    expect(await screen.findByText(/Checkout channels: WhatsApp, Stripe, Zelle/)).toBeInTheDocument()
    expect(screen.getByText(/unlimited products/i)).toBeInTheDocument()
    expect(screen.getAllByText(/3 stores/i)).toHaveLength(1)
    expect(screen.queryByText(/stripe payments/i)).not.toBeInTheDocument()
    expect(screen.getByText(/priority support/i)).toBeInTheDocument()
  })

  describe('switching from a paid plan to Free', () => {
    beforeEach(() => {
      getCurrentSubscription.mockResolvedValue(
        subscription({ planId: PRO.id, plan: PRO, expiresAt: '2030-01-01T00:00:00Z' }),
      )
    })

    it('asks first, mentioning the paid-until date, and does nothing if declined', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
      renderPage()

      await userEvent.click(await screen.findByRole('button', { name: /^subscribe$/i }))

      expect(confirmSpy).toHaveBeenCalledWith(expect.stringMatching(/ends your Pro plan now.*paid until/i))
      expect(subscribeToPlan).not.toHaveBeenCalled()
      confirmSpy.mockRestore()
    })

    it('switches once confirmed', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
      renderPage()

      await userEvent.click(await screen.findByRole('button', { name: /^subscribe$/i }))

      await waitFor(() => expect(subscribeToPlan.mock.calls[0][0]).toBe('plan-free'))
      confirmSpy.mockRestore()
    })

    it('does not ask a store whose paid plan already lapsed', async () => {
      getCurrentSubscription.mockResolvedValue(
        subscription({ planId: PRO.id, plan: PRO, expiresAt: '2020-01-01T00:00:00Z', lapsed: true }),
      )
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
      renderPage()

      await userEvent.click(await screen.findByRole('button', { name: /^subscribe$/i }))

      expect(confirmSpy).not.toHaveBeenCalled()
      await waitFor(() => expect(subscribeToPlan).toHaveBeenCalled())
      confirmSpy.mockRestore()
    })
  })
})

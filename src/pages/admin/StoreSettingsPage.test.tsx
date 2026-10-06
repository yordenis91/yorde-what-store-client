import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { StoreSettingsPage } from './StoreSettingsPage'
import { useAuthStore } from '@/store/auth.store'
import type { Tenant } from '@/types/api'

const getCurrentTenant = vi.fn()
const updateCurrentTenant = vi.fn()
const listPaymentSettings = vi.fn()
const upsertPaymentSetting = vi.fn()
const getPublicStorefront = vi.fn()

vi.mock('@/services/tenants.service', () => ({
  getCurrentTenant: () => getCurrentTenant(),
  updateCurrentTenant: (...a: unknown[]) => updateCurrentTenant(...a),
  listPaymentSettings: () => listPaymentSettings(),
  upsertPaymentSetting: (...a: unknown[]) => upsertPaymentSetting(...a),
  getPublicStorefront: (...a: unknown[]) => getPublicStorefront(...a),
}))
vi.mock('@/services/plans.service', () => ({
  getCurrentEntitlements: () =>
    Promise.resolve({ fulfillmentMethods: ['WHATSAPP', 'TELEGRAM', 'STRIPE', 'MERCADOPAGO', 'ZELLE'] }),
}))
vi.mock('@/services/uploads.service', () => ({ uploadImage: vi.fn() }))
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }))

const TENANT = {
  id: 'tenant-1',
  slug: 'my-shop',
  name: 'My Shop',
  tagline: 'Fresh',
  currencySymbol: '$',
  theme: 'default',
  logoUrl: null,
  bannerUrl: null,
  invoiceLogoUrl: null,
  socialLinks: {},
  tracksInventory: false,
  whatsappEnabled: true,
  whatsappNumber: '+15551234567',
  telegramEnabled: false,
  telegramBotToken: null,
  telegramChatId: null,
  orderMessageTemplate: 'Hello',
  termsOfSaleContent: null,
  shippingPolicyContent: null,
  returnPolicyContent: null,
  privacyPolicyContent: null,
  smtpEnabled: false,
  smtpHost: null,
  smtpPort: null,
  smtpUser: null,
  smtpFrom: null,
  smtpPasswordSet: false,
} as unknown as Tenant

function renderPage(initialPath = '/admin/settings') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <StoreSettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const section = (name: RegExp | string) => screen.getByRole('button', { name })

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({
    activeTenant: { id: TENANT.id, myRole: 'OWNER' } as Tenant,
    tenants: [{ id: TENANT.id, myRole: 'OWNER' } as Tenant],
    impersonation: null,
  })
  getCurrentTenant.mockResolvedValue(TENANT)
  updateCurrentTenant.mockImplementation((payload: object) => Promise.resolve({ ...TENANT, ...payload }))
  listPaymentSettings.mockResolvedValue([])
  upsertPaymentSetting.mockResolvedValue({})
  getPublicStorefront.mockResolvedValue({ zellePaymentInfo: null })
})

describe('StoreSettingsPage index', () => {
  it('lists the seven sections in order and opens General first', async () => {
    renderPage()

    const nav = await screen.findByRole('navigation')
    expect(
      within(nav)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['General', 'Appearance', 'Social links', 'Sales channels', 'Payments', 'Policies', 'Email'])
    expect(within(nav).getByRole('button', { name: 'General' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByLabelText('Name')).toHaveValue('My Shop')
  })

  it('opens the section named in the URL, and ignores an unknown one', async () => {
    renderPage('/admin/settings?section=policies')
    expect(await screen.findByLabelText('Terms of sale')).toBeInTheDocument()
  })

  it('falls back to General for an unknown section', async () => {
    renderPage('/admin/settings?section=nope')
    expect(await screen.findByLabelText('Name')).toBeInTheDocument()
  })

  it('asks before leaving a section with unsaved edits', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderPage()
    await userEvent.type(await screen.findByLabelText('Name'), ' 2')

    await userEvent.click(section('Appearance'))
    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Name')).toBeInTheDocument()

    confirmSpy.mockReturnValue(true)
    await userEvent.click(section('Appearance'))
    expect(await screen.findByText('Header banner')).toBeInTheDocument()
    confirmSpy.mockRestore()
  })

  it('does not ask when nothing was edited', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    renderPage()
    await screen.findByLabelText('Name')

    await userEvent.click(section('Policies'))

    expect(confirmSpy).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })
})

describe('each section saves only its own fields', () => {
  // The API rejects unknown fields, and a whole-tenant save would overwrite what
  // someone else changed elsewhere while this screen was open.
  const CASES: [string, string[]][] = [
    ['General', ['currencySymbol', 'invoiceLogoUrl', 'name', 'tagline', 'tracksInventory']],
    ['Appearance', ['bannerUrl', 'logoUrl', 'theme']],
    ['Social links', ['socialLinks']],
    [
      'Sales channels',
      [
        'orderMessageTemplate',
        'telegramBotToken',
        'telegramChatId',
        'telegramEnabled',
        'whatsappEnabled',
        'whatsappNumber',
      ],
    ],
    ['Policies', ['privacyPolicyContent', 'returnPolicyContent', 'shippingPolicyContent', 'termsOfSaleContent']],
    ['Email', ['smtpEnabled', 'smtpFrom', 'smtpHost', 'smtpPort', 'smtpUser']],
  ]

  it.each(CASES)('%s', async (name, keys) => {
    renderPage()
    await screen.findByLabelText('Name')
    if (name !== 'General') await userEvent.click(section(name))

    await userEvent.click(await screen.findByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(updateCurrentTenant).toHaveBeenCalledTimes(1))
    expect(Object.keys(updateCurrentTenant.mock.calls[0][0]).sort()).toEqual(keys)
  })

  it('keeps the owner an owner after saving (the PATCH response carries no role)', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(updateCurrentTenant).toHaveBeenCalled())
    await waitFor(() => expect(useAuthStore.getState().activeTenant?.name).toBe('My Shop'))
    expect(useAuthStore.getState().activeTenant?.myRole).toBe('OWNER')
    expect(useAuthStore.getState().tenants[0].myRole).toBe('OWNER')
  })
})

describe('a collaborator', () => {
  beforeEach(() => {
    useAuthStore.setState({ activeTenant: { id: TENANT.id, myRole: 'STAFF' } as Tenant })
  })

  it('sees the values read-only with the reason, and cannot save', async () => {
    renderPage()

    expect(await screen.findByText(/only the store owner can change these settings/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toBeDisabled()
    expect(screen.getByLabelText('Name')).toHaveValue('My Shop')
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
  })

  it('never fires the owner-only payment queries', async () => {
    renderPage('/admin/settings?section=payments')

    expect(await screen.findByText(/managed by the store owner/i)).toBeInTheDocument()
    expect(listPaymentSettings).not.toHaveBeenCalled()
    expect(getPublicStorefront).not.toHaveBeenCalled()
    expect(upsertPaymentSetting).not.toHaveBeenCalled()
  })
})

describe('payments', () => {
  it('will not save a card gateway without its full credentials (it would wipe the working ones)', async () => {
    renderPage('/admin/settings?section=payments')
    const stripe = (await screen.findByText('Stripe')).closest('div.rounded-xl') as HTMLElement

    await userEvent.type(within(stripe).getByLabelText('Publishable key'), 'pk_test_1')
    await userEvent.click(within(stripe).getByRole('button', { name: 'Save changes' }))

    expect(await within(stripe).findByText('Required')).toBeInTheDocument()
    expect(upsertPaymentSetting).not.toHaveBeenCalled()

    await userEvent.type(within(stripe).getByLabelText('Secret key'), 'sk_test_1')
    await userEvent.click(within(stripe).getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(upsertPaymentSetting).toHaveBeenCalledWith({
        provider: 'STRIPE',
        credentials: { publishableKey: 'pk_test_1', secretKey: 'sk_test_1' },
        isEnabled: false,
      }),
    )
  })

  it('switches an already saved method off without asking for its credentials again', async () => {
    listPaymentSettings.mockResolvedValue([{ id: 'p1', provider: 'MERCADOPAGO', isEnabled: true }])
    renderPage('/admin/settings?section=payments')
    const card = (await screen.findByText('MercadoPago')).closest('div.rounded-xl') as HTMLElement

    expect(within(card).getByText('MercadoPago enabled')).toBeInTheDocument()
    await userEvent.click(within(card).getByLabelText('Enable MercadoPago checkout'))
    await userEvent.click(within(card).getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(upsertPaymentSetting).toHaveBeenCalledTimes(1))
    expect(upsertPaymentSetting.mock.calls[0][0]).toEqual({
      provider: 'MERCADOPAGO',
      credentials: undefined,
      isEnabled: false,
    })
  })

  it('still needs the full set to replace saved credentials, never half of it', async () => {
    listPaymentSettings.mockResolvedValue([{ id: 'p1', provider: 'STRIPE', isEnabled: true }])
    renderPage('/admin/settings?section=payments')
    const stripe = (await screen.findByText('Stripe')).closest('div.rounded-xl') as HTMLElement

    await userEvent.type(within(stripe).getByLabelText('Publishable key'), 'pk_test_new')
    await userEvent.click(within(stripe).getByRole('button', { name: 'Save changes' }))

    expect(await within(stripe).findByText('Required')).toBeInTheDocument()
    expect(upsertPaymentSetting).not.toHaveBeenCalled()

    await userEvent.type(within(stripe).getByLabelText('Secret key'), 'sk_test_new')
    await userEvent.click(within(stripe).getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(upsertPaymentSetting).toHaveBeenCalledWith({
        provider: 'STRIPE',
        credentials: { publishableKey: 'pk_test_new', secretKey: 'sk_test_new' },
        isEnabled: true,
      }),
    )
  })

  it('fills Zelle from what the storefront publishes, since the API never returns stored credentials', async () => {
    listPaymentSettings.mockResolvedValue([{ id: 'p2', provider: 'ZELLE', isEnabled: true }])
    getPublicStorefront.mockResolvedValue({
      zellePaymentInfo: { recipientName: 'Ana', recipientEmail: 'ana@zelle.com', instructions: 'Add the order number' },
    })
    renderPage('/admin/settings?section=payments')

    await waitFor(() => expect(screen.getByLabelText('Recipient name')).toHaveValue('Ana'))
    expect(getPublicStorefront).toHaveBeenCalledWith('my-shop')
    expect(screen.getByLabelText('Zelle email or phone')).toHaveValue('ana@zelle.com')

    await userEvent.click(screen.getAllByRole('button', { name: 'Save changes' }).at(-1)!)

    await waitFor(() =>
      expect(upsertPaymentSetting).toHaveBeenCalledWith({
        provider: 'ZELLE',
        credentials: {
          recipientName: 'Ana',
          recipientEmail: 'ana@zelle.com',
          recipientPhone: '',
          instructions: 'Add the order number',
        },
        isEnabled: true,
      }),
    )
  })
})

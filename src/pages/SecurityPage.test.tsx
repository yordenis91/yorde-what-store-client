import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SecurityPage } from './SecurityPage'
import { useAuthStore } from '@/store/auth.store'
import type { User } from '@/types/api'

const setupTwoFactor = vi.fn()
const enableTwoFactor = vi.fn()
const disableTwoFactor = vi.fn()
vi.mock('@/services/auth.service', () => ({
  setupTwoFactor: () => setupTwoFactor(),
  enableTwoFactor: (...a: unknown[]) => enableTwoFactor(...a),
  disableTwoFactor: (...a: unknown[]) => disableTwoFactor(...a),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const USER = { id: 'u1', email: 'a@b.c', name: 'Ana', twoFactorEnabled: false } as User

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <SecurityPage />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ user: USER, accessToken: 'tok' })
  setupTwoFactor.mockResolvedValue({ secret: 'JBSWY3DPEHPK3PXP', otpauthUrl: 'otpauth://x', qrDataUrl: 'data:image/png;base64,AAA' })
  enableTwoFactor.mockResolvedValue({ twoFactorEnabled: true })
  disableTwoFactor.mockResolvedValue({ twoFactorEnabled: false })
})

describe('two-factor authentication settings', () => {
  it('walks through enrolment: QR code, then a code to confirm, then it is on', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Turn on' }))
    expect(await screen.findByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('6-digit code'), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Confirm and turn on' }))

    await waitFor(() => expect(enableTwoFactor).toHaveBeenCalledWith('123456'))
    await waitFor(() => expect(useAuthStore.getState().user?.twoFactorEnabled).toBe(true))
    expect(await screen.findByText(/is on for your account/i)).toBeInTheDocument()
  })

  it('refuses a code that is not six digits without calling the API', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Turn on' }))
    await screen.findByText('JBSWY3DPEHPK3PXP')

    await userEvent.type(screen.getByLabelText('6-digit code'), '12ab')
    await userEvent.click(screen.getByRole('button', { name: 'Confirm and turn on' }))

    expect(await screen.findByText('Enter the 6-digit code.')).toBeInTheDocument()
    expect(enableTwoFactor).not.toHaveBeenCalled()
  })

  it('turning it off needs a current code, which is sent to the API', async () => {
    useAuthStore.setState({ user: { ...USER, twoFactorEnabled: true } })
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Turn off' }))
    expect(await screen.findByText('Enter the 6-digit code.')).toBeInTheDocument()
    expect(disableTwoFactor).not.toHaveBeenCalled()

    await userEvent.type(screen.getByLabelText('6-digit code'), '654321')
    await userEvent.click(screen.getByRole('button', { name: 'Turn off' }))

    await waitFor(() => expect(disableTwoFactor).toHaveBeenCalledWith('654321'))
    await waitFor(() => expect(useAuthStore.getState().user?.twoFactorEnabled).toBe(false))
  })
})

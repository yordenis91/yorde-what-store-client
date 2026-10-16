import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StaffPage } from './StaffPage'

const listMembers = vi.fn()
const inviteStaff = vi.fn()
vi.mock('@/services/users.service', () => ({
  listMembers: () => listMembers(),
  inviteStaff: (...a: unknown[]) => inviteStaff(...a),
  removeMember: vi.fn(),
  resetMemberPassword: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <StaffPage />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  listMembers.mockResolvedValue([])
  inviteStaff.mockReset().mockResolvedValue({})
})

describe('inviting a team member', () => {
  it('asks for a name and an email only: the invitee chooses their own password from the emailed link', async () => {
    renderPage()
    await screen.findByText(/choose their own password/i)

    expect(screen.queryByPlaceholderText('Password')).not.toBeInTheDocument()
    await userEvent.type(screen.getByPlaceholderText('Your name'), 'Sam Staff')
    await userEvent.type(screen.getByPlaceholderText('Email'), 'sam@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(inviteStaff).toHaveBeenCalledTimes(1))
    expect(inviteStaff.mock.calls[0][0]).toEqual({ name: 'Sam Staff', email: 'sam@example.com' })
  })
})

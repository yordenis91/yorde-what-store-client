import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { CouponsPage } from './CouponsPage'
import { useAuthStore } from '@/store/auth.store'
import type { Tenant } from '@/types/api'

const listCoupons = vi.fn()
vi.mock('@/services/coupons.service', () => ({
  listCoupons: (...a: unknown[]) => listCoupons(...a),
  createCoupon: vi.fn(),
  updateCoupon: vi.fn(),
  deleteCoupon: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const COUPON = {
  id: 'c1',
  code: 'SAVE10',
  name: 'Save 10',
  discountType: 'FLAT',
  discountValue: '10',
  usageCount: 0,
  usageLimit: null,
  expiresAt: null,
  isActive: true,
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <CouponsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  listCoupons.mockResolvedValue({ items: [COUPON], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } })
})

describe('coupons: who may change them', () => {
  it('gives a collaborator a read-only list (the API answers 403 to every write)', async () => {
    useAuthStore.setState({ activeTenant: { id: 't1', myRole: 'STAFF' } as Tenant, impersonation: null })
    renderPage()

    expect(await screen.findByText('SAVE10')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'New coupon' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Edit SAVE10/ })).not.toBeInTheDocument()
  })

  it('lets the owner create, edit and delete', async () => {
    useAuthStore.setState({ activeTenant: { id: 't1', myRole: 'OWNER' } as Tenant, impersonation: null })
    renderPage()

    expect(await screen.findByText('SAVE10')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New coupon' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Edit SAVE10/ })).toBeInTheDocument()
  })
})

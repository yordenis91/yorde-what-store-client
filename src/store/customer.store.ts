import { create } from 'zustand'
import type { Customer } from '@/types/api'

/**
 * Deliberately NOT persisted (unlike cart.store.ts): a bearer token has no
 * business sitting in localStorage where any injected script can read it.
 * Session survives reload via the httpOnly `customer_refresh_token` cookie —
 * see useBootstrapCustomerAuth. `setTenantSlug` still clears in-memory state
 * on a tenant switch, the same guard cart.store.ts uses, because in
 * `/store/:slug` fallback mode multiple tenants share one browser tab and
 * this store must never leak tenant A's customer into tenant B's page.
 */
interface CustomerAuthState {
  tenantSlug: string | null
  customer: Customer | null
  accessToken: string | null
  isBootstrapping: boolean
  setTenantSlug: (slug: string) => void
  setSession: (payload: { customer: Customer; accessToken: string }) => void
  setAccessToken: (accessToken: string | null) => void
  setBootstrapping: (value: boolean) => void
  clear: () => void
}

export const useCustomerStore = create<CustomerAuthState>((set, get) => ({
  tenantSlug: null,
  customer: null,
  accessToken: null,
  isBootstrapping: true,
  setTenantSlug: (slug) => {
    if (get().tenantSlug !== slug) {
      set({ tenantSlug: slug, customer: null, accessToken: null })
    }
  },
  setSession: ({ customer, accessToken }) => set({ customer, accessToken }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setBootstrapping: (isBootstrapping) => set({ isBootstrapping }),
  clear: () => set({ customer: null, accessToken: null }),
}))

import { create } from 'zustand'
import type { Tenant, User } from '@/types/api'

interface ImpersonationState {
  tenantName: string
  expiresAt: string
  /** Restored by endImpersonation — the SUPER_ADMIN's own session, stashed for the duration. */
  adminBackup: { user: User; accessToken: string; activeTenant: Tenant | null; tenants: Tenant[] }
}

interface AuthState {
  user: User | null
  accessToken: string | null
  activeTenant: Tenant | null
  tenants: Tenant[]
  isBootstrapping: boolean
  impersonation: ImpersonationState | null
  setSession: (payload: { user: User; accessToken: string }) => void
  setAccessToken: (accessToken: string | null) => void
  setTenants: (tenants: Tenant[]) => void
  setActiveTenant: (tenant: Tenant | null) => void
  setBootstrapping: (value: boolean) => void
  clear: () => void
  /**
   * Stashes the current (SUPER_ADMIN) session and swaps in the impersonation
   * token. `activeTenant` is set to a minimal stub — just enough for
   * apiClient's X-Tenant-ID header — since the caller doesn't have the full
   * Tenant yet; it should immediately follow up with getCurrentTenant() and
   * setActiveTenant() once the swap takes effect.
   */
  beginImpersonation: (payload: { accessToken: string; tenantId: string; tenantName: string; expiresAt: string }) => void
  /** Restores the stashed admin session. A no-op if not currently impersonating. */
  endImpersonation: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  activeTenant: null,
  tenants: [],
  isBootstrapping: true,
  impersonation: null,
  setSession: ({ user, accessToken }) => set({ user, accessToken }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setTenants: (tenants) => set({ tenants }),
  setActiveTenant: (activeTenant) => set({ activeTenant }),
  setBootstrapping: (isBootstrapping) => set({ isBootstrapping }),
  clear: () => set({ user: null, accessToken: null, activeTenant: null, tenants: [], impersonation: null }),
  beginImpersonation: ({ accessToken, tenantId, tenantName, expiresAt }) => {
    const state = get()
    if (!state.user) return
    set({
      impersonation: {
        tenantName,
        expiresAt,
        adminBackup: {
          user: state.user,
          accessToken: state.accessToken!,
          activeTenant: state.activeTenant,
          tenants: state.tenants,
        },
      },
      accessToken,
      activeTenant: { id: tenantId } as Tenant,
      tenants: [],
    })
  },
  endImpersonation: () => {
    const { impersonation } = get()
    if (!impersonation) return
    const { adminBackup } = impersonation
    set({
      impersonation: null,
      user: adminBackup.user,
      accessToken: adminBackup.accessToken,
      activeTenant: adminBackup.activeTenant,
      tenants: adminBackup.tenants,
    })
  },
}))

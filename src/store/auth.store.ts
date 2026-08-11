import { create } from 'zustand'
import type { Tenant, User } from '@/types/api'

interface AuthState {
  user: User | null
  accessToken: string | null
  activeTenant: Tenant | null
  tenants: Tenant[]
  isBootstrapping: boolean
  setSession: (payload: { user: User; accessToken: string }) => void
  setAccessToken: (accessToken: string | null) => void
  setTenants: (tenants: Tenant[]) => void
  setActiveTenant: (tenant: Tenant | null) => void
  setBootstrapping: (value: boolean) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  activeTenant: null,
  tenants: [],
  isBootstrapping: true,
  setSession: ({ user, accessToken }) => set({ user, accessToken }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setTenants: (tenants) => set({ tenants }),
  setActiveTenant: (activeTenant) => set({ activeTenant }),
  setBootstrapping: (isBootstrapping) => set({ isBootstrapping }),
  clear: () => set({ user: null, accessToken: null, activeTenant: null, tenants: [] }),
}))

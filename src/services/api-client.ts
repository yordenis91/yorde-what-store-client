import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/auth.store'

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
})

let storefrontTenantSlug: string | null = null
export function setStorefrontTenant(slug: string | null) {
  storefrontTenantSlug = slug
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken, activeTenant } = useAuthStore.getState()
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`)
  }
  const tenantId = activeTenant?.id ?? storefrontTenantSlug
  if (tenantId) {
    config.headers.set('X-Tenant-ID', tenantId)
  }
  return config
})

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  try {
    const { data } = await axios.post<{ success: true; data: { accessToken: string } }>(
      `${API_URL}/auth/refresh`,
      {},
      { withCredentials: true },
    )
    return data.data.accessToken
  } catch {
    return null
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    const status = error.response?.status

    if (status === 401 && original && !original._retry && !original.url?.includes('/auth/')) {
      original._retry = true
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null
      })
      const newToken = await refreshPromise
      if (newToken) {
        useAuthStore.getState().setAccessToken(newToken)
        original.headers.set('Authorization', `Bearer ${newToken}`)
        return apiClient(original)
      }
      useAuthStore.getState().clear()
    }

    return Promise.reject(error)
  },
)

export function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined
    if (Array.isArray(data?.message)) return data.message.join(', ')
    if (typeof data?.message === 'string') return data.message
  }
  return fallback
}

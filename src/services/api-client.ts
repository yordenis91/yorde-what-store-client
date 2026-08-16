import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { runtimeValue } from '@/config/runtime'
import { useAuthStore } from '@/store/auth.store'

/**
 * API base URL, preferring runtime config over build-time env so a single
 * container image can be deployed to any environment: the value written by
 * docker-entrypoint.sh wins, then `VITE_API_URL` from `npm run dev`, then the
 * local backend default.
 */
export const API_URL = runtimeValue('apiUrl') ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'

/**
 * Origin serving the backend's static `/uploads`. Empty when the API is exposed
 * under the same origin as the SPA (`VITE_API_URL=/api/v1`), which leaves
 * upload paths as same-origin absolute paths.
 */
export const API_ORIGIN = API_URL.replace(/\/api\/v1\/?$/, '')

export function resolveMediaUrl(url: string): string {
  return url.startsWith('http') ? url : `${API_ORIGIN}${url}`
}

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

import { useEffect } from 'react'
import axios from 'axios'
import { API_URL } from '@/services/api-client'
import { getProfile } from '@/services/auth.service'
import { getMyTenants } from '@/services/tenants.service'
import { useAuthStore } from '@/store/auth.store'

/** Silently restores a session on page load using the httpOnly refresh cookie. */
export function useBootstrapAuth() {
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const setSession = useAuthStore((s) => s.setSession)
  const setTenants = useAuthStore((s) => s.setTenants)
  const setActiveTenant = useAuthStore((s) => s.setActiveTenant)
  const setBootstrapping = useAuthStore((s) => s.setBootstrapping)
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        const { data } = await axios.post<{ data: { accessToken: string } }>(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        )
        if (cancelled) return
        setAccessToken(data.data.accessToken)

        const user = await getProfile()
        if (cancelled) return
        setSession({ user, accessToken: data.data.accessToken })

        const tenants = await getMyTenants()
        if (cancelled) return
        setTenants(tenants)
        if (tenants.length > 0) setActiveTenant(tenants[0])
      } catch {
        // No valid session — user starts logged out.
      } finally {
        if (!cancelled) setBootstrapping(false)
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return isBootstrapping
}

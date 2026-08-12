import { useEffect, useRef } from 'react'
import axios from 'axios'
import { API_URL } from '@/services/api-client'
import { getProfile } from '@/services/auth.service'
import { getMyTenants } from '@/services/tenants.service'
import { useAuthStore } from '@/store/auth.store'

/**
 * Silently restores a session on page load using the httpOnly refresh cookie.
 * Runs its network calls exactly once even under StrictMode's dev-only
 * double-invoke: `started` gates re-entry on the second effect run, so there
 * is no matching cleanup/cancellation to race against the first run's promise
 * chain (a `cancelled` flag here would be flipped by the synthetic cleanup
 * before the real bootstrap finishes, permanently stalling isBootstrapping).
 */
export function useBootstrapAuth() {
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const setSession = useAuthStore((s) => s.setSession)
  const setTenants = useAuthStore((s) => s.setTenants)
  const setActiveTenant = useAuthStore((s) => s.setActiveTenant)
  const setBootstrapping = useAuthStore((s) => s.setBootstrapping)
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    async function bootstrap() {
      try {
        const { data } = await axios.post<{ data: { accessToken: string } }>(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        )
        setAccessToken(data.data.accessToken)

        const user = await getProfile()
        setSession({ user, accessToken: data.data.accessToken })

        const tenants = await getMyTenants()
        setTenants(tenants)
        if (tenants.length > 0) setActiveTenant(tenants[0])
      } catch {
        // No valid session — user starts logged out.
      } finally {
        setBootstrapping(false)
      }
    }

    void bootstrap()
  }, [setAccessToken, setSession, setTenants, setActiveTenant, setBootstrapping])

  return isBootstrapping
}

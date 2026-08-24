import { useEffect, useRef } from 'react'
import axios from 'axios'
import { API_URL } from '@/services/api-client'
import { getMyProfile } from '@/services/customers.service'
import { useCustomerStore } from '@/store/customer.store'

/**
 * Silently restores a customer session on load using the httpOnly
 * `customer_refresh_token` cookie — same idea as useBootstrapAuth, but keyed
 * to `slug` instead of running once globally: in `/store/:slug` fallback
 * mode a shopper can navigate between different tenants' storefronts within
 * one SPA session, and each needs its own bootstrap attempt. Never blocks
 * rendering — a slow or failed check must not hold up guest browsing.
 */
export function useBootstrapCustomerAuth(slug: string) {
  const setSession = useCustomerStore((s) => s.setSession)
  const setAccessToken = useCustomerStore((s) => s.setAccessToken)
  const setBootstrapping = useCustomerStore((s) => s.setBootstrapping)
  const setTenantSlug = useCustomerStore((s) => s.setTenantSlug)
  const startedForSlug = useRef<string | null>(null)

  useEffect(() => {
    if (!slug || startedForSlug.current === slug) return
    startedForSlug.current = slug
    setTenantSlug(slug)
    setBootstrapping(true)

    async function bootstrap() {
      try {
        const { data } = await axios.post<{ data: { accessToken: string } }>(
          `${API_URL}/storefront/customers/auth/refresh`,
          {},
          { withCredentials: true, headers: { 'X-Tenant-ID': slug } },
        )
        setAccessToken(data.data.accessToken)
        const customer = await getMyProfile()
        setSession({ customer, accessToken: data.data.accessToken })
      } catch {
        // No valid customer session for this store — shopper stays a guest.
      } finally {
        setBootstrapping(false)
      }
    }

    void bootstrap()
  }, [slug, setAccessToken, setSession, setBootstrapping, setTenantSlug])
}

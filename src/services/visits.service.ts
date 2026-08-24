import { apiClient } from './api-client'

/**
 * Fire-and-forget pageview log. `navigator.sendBeacon` was the more obvious
 * choice, but it cannot set custom headers — and the backend resolves the
 * tenant here from `X-Tenant-ID` (apiClient's interceptor already attaches it
 * for any `storefront/*` call), not from the API host's own subdomain. A
 * plain POST is fine anyway: this only ever fires on in-SPA route changes,
 * never on tab-close, so there's no unload race to protect against.
 */
export function logVisit(path: string, referrer?: string) {
  void apiClient.post('/storefront/visits', { path, referrer: referrer || undefined }).catch(() => {
    // Analytics must never surface an error to the shopper or block navigation.
  })
}

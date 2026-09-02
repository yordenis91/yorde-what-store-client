import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { logVisit } from '@/services/visits.service'
import { getAnalyticsSessionId } from '@/utils/analytics-session'

/**
 * Logs one pageview per distinct storefront route the shopper lands on.
 * `lastLogged` guards StrictMode's dev-only double-invoke the same way
 * useBootstrapAuth's `started` ref does, but compares the *path* rather than
 * gating once forever — this hook fires again on every real navigation.
 */
export function useVisitTracking() {
  const location = useLocation()
  const lastLogged = useRef<string | null>(null)
  const referrer = useRef(typeof document !== 'undefined' ? document.referrer : '')

  useEffect(() => {
    if (lastLogged.current === location.pathname) return
    lastLogged.current = location.pathname
    logVisit(location.pathname, referrer.current, getAnalyticsSessionId())
  }, [location.pathname])
}

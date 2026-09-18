import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth.store'

/**
 * No refresh token is issued for an impersonation session (see
 * PlatformTenantsService.impersonate) — deliberately, so it can't renew
 * itself. If left to actually expire, apiClient's 401 interceptor would
 * silently call /auth/refresh, which still holds the SUPER_ADMIN's own
 * refresh cookie, and quietly swap the identity back mid-request. Exiting
 * proactively a few seconds early avoids that entirely.
 */
const EXIT_MARGIN_MS = 5_000

/**
 * A full page navigation (not react-router's navigate()) on both entry and
 * exit is deliberate: React Query's cache keys elsewhere in this app
 * (['products'], ['current-tenant'], ...) aren't scoped by tenant identity,
 * since normally only one tenant is ever active per page load. Swapping
 * identity via SPA navigation risks serving one tenant's cached data under
 * another's — a fresh page load guarantees a clean QueryClient instead.
 */
function exitImpersonation() {
  useAuthStore.getState().endImpersonation()
  window.location.assign('/platform')
}

export function ImpersonationBanner() {
  const { t } = useTranslation()
  const impersonation = useAuthStore((s) => s.impersonation)

  useEffect(() => {
    if (!impersonation) return
    const msRemaining = new Date(impersonation.expiresAt).getTime() - Date.now() - EXIT_MARGIN_MS
    const timer = setTimeout(exitImpersonation, Math.max(msRemaining, 0))
    return () => clearTimeout(timer)
  }, [impersonation])

  if (!impersonation) return null

  return (
    <div className="flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-white">
      <span>{t('impersonation.banner', { tenantName: impersonation.tenantName })}</span>
      <button
        type="button"
        onClick={exitImpersonation}
        className="shrink-0 rounded bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30"
      >
        {t('impersonation.exit')}
      </button>
    </div>
  )
}

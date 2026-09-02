import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useConnectivityStore } from '@/store/connectivity.store'

/**
 * A slim, non-blocking strip — never a modal, never resets a form, never
 * redirects. Mounted once per app shell (storefront and admin both use it):
 * whatever the customer or staff member was doing keeps working underneath
 * it exactly as before.
 */
export function ConnectivityBanner() {
  const { t } = useTranslation()
  const isOnline = useConnectivityStore((s) => s.isOnline)
  const isDegraded = useConnectivityStore((s) => s.isDegraded)
  const show = !isOnline || isDegraded
  const wasShowing = useRef(false)

  useEffect(() => {
    if (wasShowing.current && !show) toast.success(t('connectivity.restored'))
    wasShowing.current = show
  }, [show, t])

  if (!show) return null

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-50 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white shadow-sm"
    >
      {!isOnline ? t('connectivity.offline') : t('connectivity.degraded')}
    </div>
  )
}

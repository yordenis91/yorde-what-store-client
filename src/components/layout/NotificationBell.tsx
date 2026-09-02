import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth.store'
import { useOrderNotificationsStore } from '@/store/order-notifications.store'
import { formatMoney } from '@/utils/format'
import { isNotificationSoundMuted, setNotificationSoundMuted, unlockNotificationSound } from '@/utils/notification-sound'

export function NotificationBell() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const activeTenant = useAuthStore((s) => s.activeTenant)
  const unseenCount = useOrderNotificationsStore((s) => s.unseenCount)
  const recent = useOrderNotificationsStore((s) => s.recent)
  const symbol = activeTenant?.currencySymbol ?? '$'
  const position = (activeTenant?.currencySymbolPosition as 'pre' | 'post') ?? 'pre'
  const [open, setOpen] = useState(false)
  const [muted, setMuted] = useState(isNotificationSoundMuted)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  function toggleOpen() {
    unlockNotificationSound()
    setOpen((o) => !o)
  }

  function toggleMuted() {
    const next = !muted
    setMuted(next)
    setNotificationSoundMuted(next)
  }

  function goToOrder(orderId: string) {
    setOpen(false)
    useOrderNotificationsStore.getState().clear()
    navigate(`/admin/orders/${orderId}`)
  }

  function viewAll() {
    setOpen(false)
    useOrderNotificationsStore.getState().clear()
    navigate('/admin/orders')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={t('notifications.bell')}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" />
        </svg>
        {unseenCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unseenCount > 99 ? '99+' : unseenCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <span className="text-sm font-medium text-gray-900">{t('notifications.title')}</span>
            <button
              type="button"
              onClick={toggleMuted}
              className="text-xs font-medium text-gray-400 hover:text-brand-700"
              aria-label={muted ? t('notifications.unmute') : t('notifications.mute')}
            >
              {muted ? t('notifications.unmute') : t('notifications.mute')}
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {recent.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-gray-400">{t('notifications.empty')}</p>
            )}
            {recent.map((order) => (
              <button
                key={order.id}
                onClick={() => goToOrder(order.id)}
                className="flex w-full items-center justify-between gap-3 border-b border-gray-50 px-4 py-2.5 text-left text-sm last:border-b-0 hover:bg-gray-50"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-gray-900">{order.orderNumber}</span>
                  <span className="block truncate text-xs text-gray-500">{order.customerName}</span>
                </span>
                <span className="shrink-0 font-medium text-gray-700">{formatMoney(order.grandTotal, symbol, position)}</span>
              </button>
            ))}
          </div>

          {recent.length > 0 && (
            <button
              onClick={viewAll}
              className="block w-full border-t border-gray-100 px-4 py-2.5 text-center text-sm font-medium text-brand-700 hover:bg-gray-50"
            >
              {t('notifications.viewAll')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

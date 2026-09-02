import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { API_URL } from '@/services/api-client'
import { useAuthStore } from '@/store/auth.store'
import { useOrderNotificationsStore } from '@/store/order-notifications.store'

// Comfortably under the access token's 15-minute expiry — EventSource can't
// be handed a fresh header on reconnect, so the connection is recreated with
// a current token before the old one would start failing with 401s.
const RECONNECT_INTERVAL_MS = 10 * 60 * 1000
const RETRY_AFTER_ERROR_MS = 5000

interface OrderEventPayload {
  id: string
  orderNumber: string
  customerName: string
  grandTotal: number
  currency: string
  status: string
}

/**
 * Live "new order" feed for the admin dashboard, mounted once in AdminLayout
 * so it keeps running across every /admin/* page, not just the orders list.
 * Purely a nudge: it invalidates the orders query and raises a toast/badge,
 * it never fabricates order data of its own for anything shown as fact.
 */
export function useOrderEvents() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const tenantId = useAuthStore((s) => s.activeTenant?.id)

  useEffect(() => {
    if (!tenantId) return

    let source: EventSource | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let closed = false

    function connect() {
      const token = useAuthStore.getState().accessToken
      if (!token || closed) return

      source?.close()
      const url = `${API_URL}/orders/events?access_token=${encodeURIComponent(token)}&tenantId=${encodeURIComponent(tenantId!)}`
      source = new EventSource(url)

      source.addEventListener('order.created', (e) => {
        const order = JSON.parse((e as MessageEvent).data) as OrderEventPayload
        useOrderNotificationsStore.getState().increment()
        void queryClient.invalidateQueries({ queryKey: ['orders'] })
        toast.info(t('orders.newOrderToast', { orderNumber: order.orderNumber }))
      })

      source.addEventListener('order.status_updated', () => {
        void queryClient.invalidateQueries({ queryKey: ['orders'] })
      })

      // A reconnect (including the browser's own automatic one) can miss
      // whatever happened during the gap — refetch once to close it.
      source.onopen = () => {
        void queryClient.invalidateQueries({ queryKey: ['orders'] })
      }

      source.onerror = () => {
        source?.close()
        if (closed) return
        retryTimer = setTimeout(connect, RETRY_AFTER_ERROR_MS)
      }
    }

    connect()
    const reconnectInterval = setInterval(connect, RECONNECT_INTERVAL_MS)

    return () => {
      closed = true
      source?.close()
      clearInterval(reconnectInterval)
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [tenantId, queryClient, t])
}

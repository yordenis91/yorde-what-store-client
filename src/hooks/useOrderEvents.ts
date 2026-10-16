import { useEffect, useRef } from 'react'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { API_URL } from '@/services/api-client'
import { getMyTenants } from '@/services/tenants.service'
import { useAuthStore } from '@/store/auth.store'
import { useOrderNotificationsStore } from '@/store/order-notifications.store'
import { playNewOrderChime } from '@/utils/notification-sound'

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
  const previousTenantId = useRef<string | undefined>(undefined)

  useEffect(() => {
    // A count/notification list carried over from a different tenant (owners
    // with several stores, or a different staff member logging in on the
    // same browser) would show as "new" for a store that never had it.
    if (previousTenantId.current !== tenantId) {
      useOrderNotificationsStore.getState().clear()
      previousTenantId.current = tenantId
    }
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
        useOrderNotificationsStore.getState().addOrder({
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          grandTotal: order.grandTotal,
          currency: order.currency,
          receivedAt: Date.now(),
        })
        playNewOrderChime()
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

      // EventSource hides the HTTP status, so a stream the API refused (the member was removed, the account
      // or store was deactivated) looks the same as a network blip. Reconnecting blindly would retry a
      // refused stream every few seconds for as long as the tab stays open; making an ordinary
      // authenticated call first tells the two apart. A 401 there goes through the client's
      // refresh-or-sign-out handling (which is why this is not /auth/me: that path is exempt from it),
      // ends the session and unmounts this hook, so the retry never happens.
      source.onerror = () => {
        source?.close()
        if (closed) return
        scheduleReconnect()
      }
    }

    function scheduleReconnect() {
      retryTimer = setTimeout(() => {
        if (closed) return
        getMyTenants()
          .then(() => connect())
          .catch((error: unknown) => {
            // No response at all = the network (or the API) is down, not a refusal: keep trying. A real answer
            // (a 401 the client could not refresh) has already ended the session; reconnecting would only
            // be refused again.
            if (!axios.isAxiosError(error) || !error.response) scheduleReconnect()
          })
      }, RETRY_AFTER_ERROR_MS)
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

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { useOrderNotificationsStore } from '@/store/order-notifications.store'
import type { Tenant } from '@/types/api'
import { useOrderEvents } from './useOrderEvents'

const playNewOrderChime = vi.fn()
vi.mock('@/utils/notification-sound', () => ({ playNewOrderChime: () => playNewOrderChime() }))

const toastInfo = vi.fn()
vi.mock('sonner', () => ({ toast: { info: (...args: unknown[]) => toastInfo(...args) } }))

class FakeEventSource {
  static instances: FakeEventSource[] = []
  url: string
  listeners = new Map<string, ((e: MessageEvent) => void)[]>()
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  closed = false

  constructor(url: string) {
    this.url = url
    FakeEventSource.instances.push(this)
  }

  addEventListener(type: string, cb: (e: MessageEvent) => void) {
    const list = this.listeners.get(type) ?? []
    list.push(cb)
    this.listeners.set(type, list)
  }

  dispatch(type: string, data: unknown) {
    for (const cb of this.listeners.get(type) ?? []) {
      cb({ data: JSON.stringify(data) } as MessageEvent)
    }
  }

  close() {
    this.closed = true
  }
}

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

beforeEach(() => {
  FakeEventSource.instances = []
  // @ts-expect-error test double, not a real EventSource
  window.EventSource = FakeEventSource
  useOrderNotificationsStore.setState({ unseenCount: 0, recent: [] })
  useAuthStore.setState({ accessToken: 'token-1', activeTenant: { id: 'tenant-1' } as unknown as Tenant })
})

describe('useOrderEvents', () => {
  it('records the order, plays the chime and toasts on order.created', () => {
    renderHook(() => useOrderEvents(), { wrapper })
    const source = FakeEventSource.instances[0]

    source.dispatch('order.created', {
      id: 'o1',
      orderNumber: 'ORD-1',
      customerName: 'Alice',
      grandTotal: 20,
      currency: 'USD',
      status: 'PENDING',
    })

    const state = useOrderNotificationsStore.getState()
    expect(state.unseenCount).toBe(1)
    expect(state.recent[0]).toMatchObject({ id: 'o1', orderNumber: 'ORD-1', customerName: 'Alice' })
    expect(playNewOrderChime).toHaveBeenCalledTimes(1)
    expect(toastInfo).toHaveBeenCalledTimes(1)
  })

  it('resets unseen notifications when the active tenant changes', () => {
    const { rerender } = renderHook(() => useOrderEvents(), { wrapper })
    FakeEventSource.instances[0].dispatch('order.created', {
      id: 'o1',
      orderNumber: 'ORD-1',
      customerName: 'Alice',
      grandTotal: 20,
      currency: 'USD',
      status: 'PENDING',
    })
    expect(useOrderNotificationsStore.getState().unseenCount).toBe(1)

    useAuthStore.setState({ activeTenant: { id: 'tenant-2' } as unknown as Tenant })
    rerender()

    expect(useOrderNotificationsStore.getState().unseenCount).toBe(0)
    expect(useOrderNotificationsStore.getState().recent).toEqual([])
  })
})

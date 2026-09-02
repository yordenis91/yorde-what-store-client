import { beforeEach, describe, expect, it } from 'vitest'
import { useOrderNotificationsStore } from './order-notifications.store'

function order(id: string) {
  return { id, orderNumber: `ORD-${id}`, customerName: 'Test', grandTotal: 10, currency: 'USD', receivedAt: Date.now() }
}

beforeEach(() => {
  useOrderNotificationsStore.setState({ unseenCount: 0, recent: [] })
})

describe('order-notifications store', () => {
  it('increments the count and prepends to recent on each new order', () => {
    useOrderNotificationsStore.getState().addOrder(order('1'))
    useOrderNotificationsStore.getState().addOrder(order('2'))

    const state = useOrderNotificationsStore.getState()
    expect(state.unseenCount).toBe(2)
    expect(state.recent.map((o) => o.id)).toEqual(['2', '1'])
  })

  it('caps the recent list at 5, dropping the oldest', () => {
    for (const id of ['1', '2', '3', '4', '5', '6']) {
      useOrderNotificationsStore.getState().addOrder(order(id))
    }

    const state = useOrderNotificationsStore.getState()
    expect(state.unseenCount).toBe(6)
    expect(state.recent).toHaveLength(5)
    expect(state.recent.map((o) => o.id)).toEqual(['6', '5', '4', '3', '2'])
  })

  it('clear() resets both the count and the recent list', () => {
    useOrderNotificationsStore.getState().addOrder(order('1'))
    useOrderNotificationsStore.getState().clear()

    const state = useOrderNotificationsStore.getState()
    expect(state.unseenCount).toBe(0)
    expect(state.recent).toEqual([])
  })
})

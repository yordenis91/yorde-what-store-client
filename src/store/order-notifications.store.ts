import { create } from 'zustand'

export interface OrderNotification {
  id: string
  orderNumber: string
  customerName: string
  grandTotal: number
  currency: string
  receivedAt: number
}

const MAX_RECENT = 5

interface OrderNotificationsState {
  /** Orders announced by the live SSE stream since the staff last opened the Orders page. */
  unseenCount: number
  /** Most recent unseen orders, newest first — powers the notification bell's dropdown. */
  recent: OrderNotification[]
  addOrder: (order: OrderNotification) => void
  clear: () => void
}

export const useOrderNotificationsStore = create<OrderNotificationsState>((set) => ({
  unseenCount: 0,
  recent: [],
  addOrder: (order) =>
    set((s) => ({ unseenCount: s.unseenCount + 1, recent: [order, ...s.recent].slice(0, MAX_RECENT) })),
  clear: () => set({ unseenCount: 0, recent: [] }),
}))

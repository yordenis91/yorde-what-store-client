import { create } from 'zustand'

interface OrderNotificationsState {
  /** Orders announced by the live SSE stream since the staff last opened the Orders page. */
  unseenCount: number
  increment: () => void
  clear: () => void
}

export const useOrderNotificationsStore = create<OrderNotificationsState>((set) => ({
  unseenCount: 0,
  increment: () => set((s) => ({ unseenCount: s.unseenCount + 1 })),
  clear: () => set({ unseenCount: 0 }),
}))

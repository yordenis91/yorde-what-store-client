import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  productId: string
  variantId?: string
  name: string
  variantName?: string
  unitPrice: number
  quantity: number
  imageUrl?: string
  maxQuantity?: number
}

interface CartState {
  tenantSlug: string | null
  items: CartItem[]
  couponCode: string | null
  setTenantSlug: (slug: string) => void
  addItem: (item: CartItem) => void
  updateQuantity: (productId: string, variantId: string | undefined, quantity: number) => void
  removeItem: (productId: string, variantId?: string) => void
  setCoupon: (code: string | null) => void
  clear: () => void
}

function sameLine(a: CartItem, productId: string, variantId?: string) {
  return a.productId === productId && a.variantId === variantId
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      tenantSlug: null,
      items: [],
      couponCode: null,
      setTenantSlug: (slug) => {
        if (get().tenantSlug !== slug) {
          set({ tenantSlug: slug, items: [], couponCode: null })
        }
      },
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => sameLine(i, item.productId, item.variantId))
          if (existing) {
            return {
              items: state.items.map((i) =>
                sameLine(i, item.productId, item.variantId) ? { ...i, quantity: i.quantity + item.quantity } : i,
              ),
            }
          }
          return { items: [...state.items, item] }
        }),
      updateQuantity: (productId, variantId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => !sameLine(i, productId, variantId))
              : state.items.map((i) => (sameLine(i, productId, variantId) ? { ...i, quantity } : i)),
        })),
      removeItem: (productId, variantId) =>
        set((state) => ({ items: state.items.filter((i) => !sameLine(i, productId, variantId)) })),
      setCoupon: (couponCode) => set({ couponCode }),
      clear: () => set({ items: [], couponCode: null }),
    }),
    { name: 'yws-cart' },
  ),
)

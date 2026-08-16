export interface User {
  id: string
  email: string
  name: string
  phone: string | null
  globalRole: 'SUPER_ADMIN' | 'USER'
  twoFactorEnabled: boolean
  isActive: boolean
}

export type TenantMemberRole = 'OWNER' | 'STAFF'

export interface Tenant {
  id: string
  ownerId: string
  name: string
  slug: string
  subdomain: string | null
  tagline: string | null
  about: string | null
  currency: string
  currencySymbol: string
  currencySymbolPosition: string
  locale: string
  logoUrl: string | null
  bannerUrl: string | null
  theme: string
  tracksInventory: boolean
  whatsappEnabled: boolean
  whatsappNumber: string | null
  telegramEnabled: boolean
  telegramBotToken: string | null
  telegramChatId: string | null
  orderMessageTemplate: string
  itemLineTemplate: string
  socialLinks: Record<string, string>
  isActive: boolean
  myRole?: TenantMemberRole
}

export interface PublicTenant {
  id: string
  name: string
  slug: string
  tagline: string | null
  about: string | null
  logoUrl: string | null
  bannerUrl: string | null
  theme: string
  tracksInventory: boolean
  currency: string
  currencySymbol: string
  currencySymbolPosition: string
  locale: string
  socialLinks: Record<string, string>
  whatsappEnabled: boolean
  telegramEnabled: boolean
}

export interface ProductCategory {
  id: string
  name: string
}

export interface ProductTax {
  id: string
  name: string
  rate: string
}

export interface ProductVariant {
  id: string
  name: string
  sku: string | null
  price: string
  cost: string | null
  quantity: number
  locationId: string | null
}

export interface ProductImage {
  id: string
  url: string
  isCover: boolean
  sortOrder: number
}

export interface Product {
  id: string
  tenantId: string
  name: string
  sku: string | null
  description: string | null
  price: string
  cost: string | null
  quantity: number
  hasVariants: boolean
  isActive: boolean
  isPublished: boolean
  attributes: Record<string, unknown>
  categories: { category: ProductCategory }[]
  taxes: { tax: ProductTax }[]
  variants: ProductVariant[]
  images: ProductImage[]
  createdAt: string
}

export type FulfillmentMethod = 'WHATSAPP' | 'TELEGRAM' | 'STRIPE'
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED'
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'

export interface OrderItem {
  id: string
  productId: string | null
  productName: string
  variantId: string | null
  variantName: string | null
  sku: string | null
  unitPrice: string
  quantity: number
  taxAmount: string
  lineTotal: string
}

export interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string | null
  customerPhone: string | null
  status: OrderStatus
  paymentStatus: PaymentStatus
  fulfillmentMethod: FulfillmentMethod
  currency: string
  subtotal: string
  taxTotal: string
  discountTotal: string
  shippingTotal: string
  grandTotal: string
  fulfillmentMessage: string | null
  items: OrderItem[]
  createdAt: string
}

export interface PaginatedResult<T> {
  items: T[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

export interface ApiEnvelope<T> {
  success: true
  data: T
}

export interface Plan {
  id: string
  name: string
  price: string
  duration: 'MONTHLY' | 'YEARLY' | 'LIFETIME'
  maxStores: number
  maxProducts: number
  features: string[]
  isActive: boolean
}

export interface TenantMember {
  id: string
  tenantId: string
  userId: string
  role: TenantMemberRole
  permissions: string[]
  isActive: boolean
  user: { id: string; email: string; name: string; isActive: boolean }
}

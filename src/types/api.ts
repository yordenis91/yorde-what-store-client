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

export type TenantStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'TRIAL_EXPIRED'

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
  invoiceLogoUrl: string | null
  theme: string
  tracksInventory: boolean
  whatsappEnabled: boolean
  whatsappNumber: string | null
  telegramEnabled: boolean
  telegramBotToken: string | null
  telegramChatId: string | null
  smtpEnabled: boolean
  smtpHost: string | null
  smtpPort: number | null
  smtpUser: string | null
  smtpFrom: string | null
  /** Whether a password is currently stored — the password itself is never returned by the API. */
  smtpPasswordSet: boolean
  /** Write-only: send a new password to change it, or omit to leave it unchanged. Never present in a GET response. */
  smtpPassword?: string
  orderMessageTemplate: string
  itemLineTemplate: string
  termsOfSaleContent: string | null
  shippingPolicyContent: string | null
  returnPolicyContent: string | null
  privacyPolicyContent: string | null
  socialLinks: Record<string, string>
  isActive: boolean
  /** Platform-admin lifecycle — see PlatformTenantsService. `isActive` above stays in sync with it. */
  status: TenantStatus
  commissionRate: string | null
  limitsOverride: Record<string, number> | null
  deletedAt: string | null
  createdAt: string
  myRole?: TenantMemberRole
}

/** One row of GET /platform/tenants — a lighter projection than the full Tenant. */
export interface PlatformTenantListItem {
  id: string
  name: string
  slug: string
  status: TenantStatus
  isActive: boolean
  commissionRate: string | null
  createdAt: string
  owner: { id: string; email: string; name: string }
  subscriptions: { plan: { id: string; name: string } }[]
  _count: { products: number; orders: number }
}

export interface PlatformTenantStats {
  productCount: number
  orderCount: number
  memberCount: number
  gmv: number
}

export interface PlatformTenantDetail extends Tenant {
  owner: { id: string; email: string; name: string }
  subscriptions: { plan: { id: string; name: string; price: string; duration: string } }[]
  stats: PlatformTenantStats
}

export interface TenantStatusHistoryEntry {
  id: string
  fromStatus: TenantStatus
  toStatus: TenantStatus
  reason: string
  createdAt: string
  changedBy: { id: string; name: string; email: string }
}

/** One row of GET /platform/products — cross-tenant moderation view, not the full catalog record. */
export interface PlatformProductListItem {
  id: string
  tenantId: string
  name: string
  sku: string | null
  price: string
  quantity: number
  isActive: boolean
  isPublished: boolean
  createdAt: string
  tenant: { id: string; name: string; slug: string }
}

export interface TenantNote {
  id: string
  body: string
  createdAt: string
  author: { id: string; name: string; email: string }
}

export interface PlatformTenantMember {
  id: string
  role: TenantMemberRole
  isActive: boolean
  createdAt: string
  user: { id: string; name: string; email: string; isActive: boolean }
}

export interface AuditLogEntry {
  id: string
  actorId: string | null
  actorEmail: string | null
  actorRole: string | null
  action: string
  entityType: string
  entityId: string | null
  tenantId: string | null
  metadata: Record<string, unknown>
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
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
  termsOfSaleContent: string | null
  shippingPolicyContent: string | null
  returnPolicyContent: string | null
  privacyPolicyContent: string | null
}

export interface ProductCategory {
  id: string
  name: string
  templateId?: string | null
}

export interface CategoryTemplate {
  id: string
  name: string
  slug: string
  parentId: string | null
  sortOrder: number
  isActive: boolean
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

export type FulfillmentMethod = 'WHATSAPP' | 'TELEGRAM' | 'STRIPE' | 'MERCADOPAGO'
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
  /** Only populated on GET /orders/:id. True once the async invoice-generation job has written a PDF — absent right after payment, and never set for WhatsApp/Telegram fulfillment. */
  invoiceAvailable?: boolean
}

export interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  createdAt: string
}

export interface CustomerOrderSummary {
  id: string
  orderNumber: string
  status: OrderStatus
  fulfillmentMethod: FulfillmentMethod
  grandTotal: string
  currency: string
  createdAt: string
  items: { id: string; productName: string; variantName: string | null; quantity: number; lineTotal: string }[]
}

export type CustomerSegment = 'new' | 'recurring' | 'vip'

export interface CustomerListItem extends Customer {
  totalOrders: number
  totalSpent: number
  lastOrderAt: string | null
  segment: CustomerSegment
}

export interface CustomerDetail extends CustomerListItem {
  orders: CustomerOrderSummary[]
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

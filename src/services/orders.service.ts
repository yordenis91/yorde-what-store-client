import { apiClient } from './api-client'
import type { ApiEnvelope, FulfillmentMethod, Order, PaginatedResult, PublicOrder } from '@/types/api'

export interface CreateOrderPayload {
  customerName: string
  customerEmail?: string
  customerPhone?: string
  items: { productId: string; variantId?: string; quantity: number }[]
  couponCode?: string
  shippingId?: string
  fulfillmentMethod: FulfillmentMethod
  shippingAddress?: Record<string, unknown>
  sessionId?: string
}

export type CreateOrderResult =
  | { order: Order; fulfillment: { type: 'WHATSAPP'; redirectUrl: string } }
  | { order: Order; fulfillment: { type: 'TELEGRAM'; queued: true } }
  | { order: Order; fulfillment: { type: 'STRIPE' } }
  | { order: Order; fulfillment: { type: 'MERCADOPAGO' } }
  | { order: Order; fulfillment: { type: 'ZELLE' } }

export async function createOrder(slug: string, payload: CreateOrderPayload) {
  const { data } = await apiClient.post<ApiEnvelope<CreateOrderResult>>('/storefront/orders', payload, {
    headers: { 'X-Tenant-ID': slug },
  })
  return data.data
}

/** Attaches a Zelle proof already hosted somewhere (rarely used directly — see uploadPaymentProofImage below, which is what the checkout/confirmation UI calls). */
export async function submitPaymentProof(slug: string, orderId: string, payload: { proofUrl: string; reference?: string }) {
  const { data } = await apiClient.post<ApiEnvelope<Order>>(`/storefront/orders/${orderId}/payment-proof`, payload, {
    headers: { 'X-Tenant-ID': slug },
  })
  return data.data
}

/** Uploads the customer's Zelle payment screenshot and attaches it to the order in one request — what the checkout/order-confirmation UI actually calls. Never blocks order creation: this always runs after the order already exists. */
export async function uploadPaymentProofImage(slug: string, orderId: string, file: File, reference?: string) {
  const form = new FormData()
  form.append('file', file)
  if (reference) form.append('reference', reference)
  const { data } = await apiClient.post<ApiEnvelope<Order>>(`/storefront/orders/${orderId}/payment-proof-image`, form, {
    headers: { 'X-Tenant-ID': slug, 'Content-Type': 'multipart/form-data' },
  })
  return data.data
}

/** Admin review of a submitted Zelle proof: marks the order PAID/CONFIRMED and queues its invoice, exactly like a successful Stripe/MercadoPago webhook would. */
export async function confirmZellePayment(orderId: string) {
  const { data } = await apiClient.post<ApiEnvelope<Order>>(`/orders/${orderId}/confirm-zelle-payment`)
  return data.data
}

/** Clears the submitted proof (not the order) so the customer can resubmit — the order stays PENDING either way. */
export async function rejectZellePayment(orderId: string) {
  const { data } = await apiClient.post<ApiEnvelope<Order>>(`/orders/${orderId}/reject-zelle-payment`)
  return data.data
}

export interface QuoteOrderPayload {
  items: { productId: string; variantId?: string; quantity: number }[]
  couponCode?: string
  shippingId?: string
}

export interface OrderQuote {
  currency: string
  subtotal: number
  taxTotal: number
  discountTotal: number
  shippingTotal: number
  grandTotal: number
  coupon: { code: string; discountType: 'PERCENTAGE' | 'FLAT' } | null
  /** Set when a code was sent but couldn't be applied; totals exclude it. */
  couponError: string | null
  shipping: { id: string; name: string; cost: number } | null
  /** Lines the store can no longer fulfil. Empty when the store doesn't track stock. */
  stockIssues: { productId: string; variantId: string | null; name: string; requested: number; available: number }[]
  items: {
    productId: string
    variantId: string | null
    name: string
    variantName: string | null
    unitPrice: number
    quantity: number
    taxAmount: number
    lineTotal: number
  }[]
}

/**
 * Server-side pricing for the checkout. Totals must never be computed in the
 * browser: taxes are per-product and coupons apply to the taxed total, so any
 * local approximation drifts from what the order is actually charged.
 */
export async function quoteOrder(slug: string, payload: QuoteOrderPayload) {
  const { data } = await apiClient.post<ApiEnvelope<OrderQuote>>('/storefront/orders/quote', payload, {
    headers: { 'X-Tenant-ID': slug },
  })
  return data.data
}

export interface OrderListParams {
  page?: number
  limit?: number
  search?: string
  status?: Order['status']
  dateFrom?: string
  dateTo?: string
  sortBy?: OrderSortField
  sortDir?: 'asc' | 'desc'
}

export type OrderSortField = 'createdAt' | 'orderNumber' | 'customerName' | 'grandTotal'

export async function listOrders(params: OrderListParams) {
  const { data } = await apiClient.get<ApiEnvelope<PaginatedResult<Order>>>('/orders', { params })
  return data.data
}

/** Same filters as the list, ignoring its pagination — exports every matching order, not one page. */
export async function exportOrdersCsv(params: Pick<OrderListParams, 'search' | 'status' | 'dateFrom' | 'dateTo'>) {
  const { data } = await apiClient.get<Blob>('/orders/export', { params, responseType: 'blob' })
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export async function getOrder(id: string) {
  const { data } = await apiClient.get<ApiEnvelope<Order>>(`/orders/${id}`)
  return data.data
}

export async function updateOrderStatus(id: string, status: Order['status']) {
  const { data } = await apiClient.patch<ApiEnvelope<Order>>(`/orders/${id}/status`, { status })
  return data.data
}

/**
 * Not a plain `<a href>` — the invoice endpoint requires the admin's bearer
 * token (it's not a public static asset like product images), so the file
 * has to come through apiClient as a blob and get "clicked" via a throwaway
 * anchor instead of the browser fetching the URL on its own.
 */
export async function downloadInvoice(id: string, orderNumber: string) {
  const { data } = await apiClient.get<Blob>(`/orders/${id}/invoice`, { responseType: 'blob' })
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = `invoice-${orderNumber}.pdf`
  link.click()
  URL.revokeObjectURL(url)
}

/** The customer's own invoice-style order page; the order id in the link is the credential. */
export async function getPublicOrder(slug: string, id: string) {
  const { data } = await apiClient.get<ApiEnvelope<PublicOrder>>(`/storefront/orders/${id}/public`, {
    headers: { 'X-Tenant-ID': slug },
  })
  return data.data
}

export interface OrderDetailsInput {
  customerName?: string
  customerEmail?: string | null
  customerPhone?: string | null
  shippingAddress?: { line1?: string; line2?: string; city?: string; state?: string; postalCode?: string; notes?: string }
  /** The full desired list of lines; prices are never sent, the server decides them. */
  items?: { productId: string; variantId?: string; quantity: number }[]
  /** A shipping option, or null for pick-up. */
  shippingId?: string | null
  paymentStatus?: 'PENDING' | 'PAID'
}

/** Corrects an open order: customer, items, shipping and (for manual methods) payment status. Totals are recomputed by the server. */
export async function updateOrderDetails(id: string, payload: OrderDetailsInput) {
  const { data } = await apiClient.patch<ApiEnvelope<Order>>(`/orders/${id}`, payload)
  return data.data
}

/** Soft delete: the order disappears from the list but stays in the database. */
export async function hideOrder(id: string) {
  await apiClient.delete(`/orders/${id}`)
}

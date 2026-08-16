import { apiClient } from './api-client'
import type { ApiEnvelope, FulfillmentMethod, Order, PaginatedResult } from '@/types/api'

export interface CreateOrderPayload {
  customerName: string
  customerEmail?: string
  customerPhone?: string
  items: { productId: string; variantId?: string; quantity: number }[]
  couponCode?: string
  shippingId?: string
  fulfillmentMethod: FulfillmentMethod
  shippingAddress?: Record<string, unknown>
}

export type CreateOrderResult =
  | { order: Order; fulfillment: { type: 'WHATSAPP'; redirectUrl: string } }
  | { order: Order; fulfillment: { type: 'TELEGRAM'; queued: true } }
  | { order: Order; fulfillment: { type: 'STRIPE' } }

export async function createOrder(slug: string, payload: CreateOrderPayload) {
  const { data } = await apiClient.post<ApiEnvelope<CreateOrderResult>>('/storefront/orders', payload, {
    headers: { 'X-Tenant-ID': slug },
  })
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
  coupon: { code: string; discountType: 'PERCENTAGE' | 'FIXED' } | null
  /** Set when a code was sent but couldn't be applied; totals exclude it. */
  couponError: string | null
  shipping: { id: string; name: string; cost: number } | null
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
}

export async function listOrders(params: OrderListParams) {
  const { data } = await apiClient.get<ApiEnvelope<PaginatedResult<Order>>>('/orders', { params })
  return data.data
}

export async function getOrder(id: string) {
  const { data } = await apiClient.get<ApiEnvelope<Order>>(`/orders/${id}`)
  return data.data
}

export async function updateOrderStatus(id: string, status: Order['status']) {
  const { data } = await apiClient.patch<ApiEnvelope<Order>>(`/orders/${id}/status`, { status })
  return data.data
}

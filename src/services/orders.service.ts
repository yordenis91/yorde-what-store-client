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

export async function listOrders(params: { page?: number; limit?: number; search?: string }) {
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

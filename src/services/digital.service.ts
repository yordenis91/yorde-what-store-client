import { apiClient } from './api-client'
import type { ApiEnvelope, FulfillmentMethod, PaginatedResult, PaymentStatus } from '@/types/api'

export interface DigitalAsset {
  id: string
  label: string
  fileName: string
  contentType: string
  sizeBytes: number
  sortOrder: number
  createdAt: string
}

export async function listDigitalAssets(productId: string) {
  const { data } = await apiClient.get<ApiEnvelope<DigitalAsset[]>>(`/digital/products/${productId}/assets`)
  return data.data
}

/** The file goes to private storage; the API never returns a URL for it. */
export async function uploadDigitalAsset(productId: string, file: File, label: string) {
  const form = new FormData()
  form.append('file', file)
  form.append('label', label)
  const { data } = await apiClient.post<ApiEnvelope<DigitalAsset>>(`/digital/products/${productId}/assets`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.data
}

export async function deleteDigitalAsset(productId: string, assetId: string) {
  await apiClient.delete(`/digital/products/${productId}/assets/${assetId}`)
}

export interface PriceScheduleEntry {
  id: string
  price: string
  effectiveFrom: string
  /** Set once the price was copied into the product; such an entry can no longer be deleted. */
  appliedAt: string | null
}

export async function listPriceSchedule(productId: string) {
  const { data } = await apiClient.get<ApiEnvelope<PriceScheduleEntry[]>>(`/digital/products/${productId}/price-schedule`)
  return data.data
}

export async function addPriceSchedule(productId: string, payload: { price: number; effectiveFrom: string }) {
  const { data } = await apiClient.post<ApiEnvelope<PriceScheduleEntry>>(
    `/digital/products/${productId}/price-schedule`,
    payload,
  )
  return data.data
}

export async function deletePriceSchedule(productId: string, id: string) {
  await apiClient.delete(`/digital/products/${productId}/price-schedule/${id}`)
}

export type DeliveryStatus = 'PENDING' | 'SENT' | 'REVOKED'

export interface Buyer {
  orderId: string
  orderNumber: string
  customerName: string
  customerEmail: string | null
  products: string[]
  amount: string
  currency: string
  createdAt: string
  paymentStatus: PaymentStatus
  orderStatus: string
  provider: FulfillmentMethod
  /** null until the order is paid. PENDING while paid but not yet emailed. */
  deliveryStatus: DeliveryStatus | null
  emailAttempts: number
  lastError: string | null
  sentAt: string | null
  downloads: number
}

export interface BuyersFilters {
  page?: number
  limit?: number
  search?: string
  paymentStatus?: PaymentStatus
  provider?: FulfillmentMethod
  dateFrom?: string
  dateTo?: string
}

export async function listBuyers(filters: BuyersFilters) {
  const { data } = await apiClient.get<ApiEnvelope<PaginatedResult<Buyer>>>('/digital/buyers', { params: filters })
  return data.data
}

/** Same filters as the list, ignoring its pagination: every matching buyer, not one page. Downloads with the session's own credentials (a plain link would not carry them). */
export async function exportBuyersCsv(filters: Omit<BuyersFilters, 'page' | 'limit'>) {
  const { data } = await apiClient.get<Blob>('/digital/buyers/export', { params: filters, responseType: 'blob' })
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = `buyers-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export async function resendDelivery(orderId: string) {
  const { data } = await apiClient.post<ApiEnvelope<{ queued: boolean }>>(`/digital/buyers/${orderId}/resend`)
  return data.data
}

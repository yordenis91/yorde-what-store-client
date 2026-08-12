import { apiClient } from './api-client'
import type { ApiEnvelope, PaginatedResult } from '@/types/api'

export type DiscountType = 'PERCENTAGE' | 'FLAT'

export interface Coupon {
  id: string
  code: string
  name: string
  discountType: DiscountType
  discountValue: string
  usageLimit: number | null
  usageCount: number
  expiresAt: string | null
  isActive: boolean
  createdAt: string
}

export interface CouponInput {
  code: string
  name: string
  discountType: DiscountType
  discountValue: number
  usageLimit?: number
  expiresAt?: string
  isActive?: boolean
}

export async function listCoupons(params: { page?: number; limit?: number; search?: string }) {
  const { data } = await apiClient.get<ApiEnvelope<PaginatedResult<Coupon>>>('/coupons', { params })
  return data.data
}

export async function createCoupon(payload: CouponInput) {
  const { data } = await apiClient.post<ApiEnvelope<Coupon>>('/coupons', payload)
  return data.data
}

export async function updateCoupon(id: string, payload: Partial<CouponInput>) {
  const { data } = await apiClient.patch<ApiEnvelope<Coupon>>(`/coupons/${id}`, payload)
  return data.data
}

export async function deleteCoupon(id: string) {
  await apiClient.delete(`/coupons/${id}`)
}

export interface CouponValidation {
  code: string
  discountType: DiscountType
  discountValue: number
  discountAmount: number
  total: number
}

export async function validateCoupon(slug: string, code: string, subtotal: number) {
  const { data } = await apiClient.get<ApiEnvelope<CouponValidation>>(
    `/storefront/coupons/${encodeURIComponent(code)}/validate`,
    { params: { subtotal }, headers: { 'X-Tenant-ID': slug } },
  )
  return data.data
}

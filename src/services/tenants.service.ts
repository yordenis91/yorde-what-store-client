import { apiClient } from './api-client'
import type { ApiEnvelope, PublicTenant, Tenant } from '@/types/api'

export async function getMyTenants() {
  const { data } = await apiClient.get<ApiEnvelope<Tenant[]>>('/tenants/me')
  return data.data
}

export async function getCurrentTenant() {
  const { data } = await apiClient.get<ApiEnvelope<Tenant>>('/tenants/current')
  return data.data
}

export async function updateCurrentTenant(payload: Partial<Tenant>) {
  const { data } = await apiClient.patch<ApiEnvelope<Tenant>>('/tenants/current', payload)
  return data.data
}

export async function getPublicStorefront(slug: string) {
  const { data } = await apiClient.get<ApiEnvelope<PublicTenant>>(`/tenants/storefront/${slug}`)
  return data.data
}

export interface PaymentSetting {
  id: string
  provider: 'STRIPE' | 'MERCADOPAGO'
  isEnabled: boolean
}

export async function listPaymentSettings() {
  const { data } = await apiClient.get<ApiEnvelope<PaymentSetting[]>>('/tenants/current/payment-settings')
  return data.data
}

export async function upsertPaymentSetting(payload: {
  provider: 'STRIPE' | 'MERCADOPAGO'
  credentials: Record<string, string>
  isEnabled: boolean
}) {
  const { data } = await apiClient.put<ApiEnvelope<PaymentSetting>>('/tenants/current/payment-settings', payload)
  return data.data
}

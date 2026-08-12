import { apiClient } from './api-client'
import type { ApiEnvelope, PaginatedResult, Plan } from '@/types/api'

export interface PlatformSummary {
  totalTenants: number
  activeTenants: number
  totalUsers: number
  totalOrders: number
  totalRevenue: number
  recentTenants: {
    id: string
    name: string
    slug: string
    isActive: boolean
    createdAt: string
    owner: { email: string }
  }[]
}

export async function getPlatformSummary() {
  const { data } = await apiClient.get<ApiEnvelope<PlatformSummary>>('/platform/summary')
  return data.data
}

export interface PlatformTenant {
  id: string
  name: string
  slug: string
  isActive: boolean
  createdAt: string
  owner: { email: string; name: string }
  subscriptions: { plan: Plan }[]
  _count: { products: number; orders: number }
}

export async function listPlatformTenants(params: { page?: number; limit?: number; search?: string }) {
  const { data } = await apiClient.get<ApiEnvelope<PaginatedResult<PlatformTenant>>>('/platform/tenants', { params })
  return data.data
}

export async function updateTenantStatus(id: string, isActive: boolean) {
  const { data } = await apiClient.patch<ApiEnvelope<PlatformTenant>>(`/platform/tenants/${id}/status`, { isActive })
  return data.data
}

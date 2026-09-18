import { apiClient } from './api-client'
import type {
  ApiEnvelope,
  AuditLogEntry,
  PaginatedResult,
  PlatformProductListItem,
  PlatformTenantDetail,
  PlatformTenantListItem,
  PlatformTenantMember,
  TenantNote,
  TenantStatus,
  TenantStatusHistoryEntry,
} from '@/types/api'
import type { DashboardRange } from './dashboard.service'

export interface PlatformSummary {
  totalTenants: number
  activeTenants: number
  totalUsers: number
  range: DashboardRange
  totalOrders: number
  totalRevenue: number
  periodOrders: number
  periodRevenue: number
  gmvOverTime: { date: string; orders: number; gmv: number }[]
  topTenantsByRevenue: { tenantId: string; name: string; slug: string; revenue: number }[]
  commissionsTotal: number
  defaultCommissionRate: number
  mrr: number
  activeSubscriptions: number
  planBreakdown: { planId: string; name: string; activeSubscriptions: number; mrr: number }[]
  recentTenants: {
    id: string
    name: string
    slug: string
    isActive: boolean
    createdAt: string
    owner: { email: string }
  }[]
}

export async function getPlatformSummary(range: DashboardRange = '7d') {
  const { data } = await apiClient.get<ApiEnvelope<PlatformSummary>>('/platform/summary', { params: { range } })
  return data.data
}

export interface ListPlatformTenantsParams {
  page?: number
  limit?: number
  search?: string
  status?: TenantStatus
  planId?: string
}

export async function listPlatformTenants(params: ListPlatformTenantsParams) {
  const { data } = await apiClient.get<ApiEnvelope<PaginatedResult<PlatformTenantListItem>>>('/platform/tenants', {
    params,
  })
  return data.data
}

export async function getPlatformTenant(id: string) {
  const { data } = await apiClient.get<ApiEnvelope<PlatformTenantDetail>>(`/platform/tenants/${id}`)
  return data.data
}

export interface CreatePlatformTenantPayload {
  name: string
  slug: string
  ownerEmail: string
  ownerName: string
  temporaryPassword: string
  planId?: string
  status?: TenantStatus
}

export async function createPlatformTenant(payload: CreatePlatformTenantPayload) {
  const { data } = await apiClient.post<ApiEnvelope<PlatformTenantDetail>>('/platform/tenants', payload)
  return data.data
}

export interface UpdatePlatformTenantPayload {
  name?: string
  commissionRate?: number | null
  limitsOverride?: Record<string, number> | null
  adminMetadata?: Record<string, unknown>
}

export async function updatePlatformTenant(id: string, payload: UpdatePlatformTenantPayload) {
  const { data } = await apiClient.patch<ApiEnvelope<PlatformTenantDetail>>(`/platform/tenants/${id}`, payload)
  return data.data
}

export async function deletePlatformTenant(id: string) {
  await apiClient.delete(`/platform/tenants/${id}`)
}

export async function suspendTenant(id: string, reason: string) {
  const { data } = await apiClient.post<ApiEnvelope<PlatformTenantDetail>>(`/platform/tenants/${id}/suspend`, {
    reason,
  })
  return data.data
}

export async function activateTenant(id: string, reason: string) {
  const { data } = await apiClient.post<ApiEnvelope<PlatformTenantDetail>>(`/platform/tenants/${id}/activate`, {
    reason,
  })
  return data.data
}

export interface ImpersonateResult {
  accessToken: string
  expiresAt: string
  tenantId: string
  tenantName: string
}

export async function impersonateTenant(id: string, reason?: string) {
  const { data } = await apiClient.post<ApiEnvelope<ImpersonateResult>>(`/platform/tenants/${id}/impersonate`, {
    reason,
  })
  return data.data
}

export async function listTenantMembers(id: string, params: { page?: number; limit?: number }) {
  const { data } = await apiClient.get<ApiEnvelope<PaginatedResult<PlatformTenantMember>>>(
    `/platform/tenants/${id}/members`,
    { params },
  )
  return data.data
}

export async function getTenantHistory(id: string, params: { page?: number; limit?: number }) {
  const { data } = await apiClient.get<ApiEnvelope<PaginatedResult<TenantStatusHistoryEntry>>>(
    `/platform/tenants/${id}/history`,
    { params },
  )
  return data.data
}

export async function listTenantNotes(id: string, params: { page?: number; limit?: number }) {
  const { data } = await apiClient.get<ApiEnvelope<PaginatedResult<TenantNote>>>(`/platform/tenants/${id}/notes`, {
    params,
  })
  return data.data
}

export async function addTenantNote(id: string, body: string) {
  const { data } = await apiClient.post<ApiEnvelope<TenantNote>>(`/platform/tenants/${id}/notes`, { body })
  return data.data
}

export interface ListAuditLogsParams {
  page?: number
  limit?: number
  search?: string
  action?: string
  entityType?: string
  tenantId?: string
  actorId?: string
  dateFrom?: string
  dateTo?: string
}

export async function listAuditLogs(params: ListAuditLogsParams) {
  const { data } = await apiClient.get<ApiEnvelope<PaginatedResult<AuditLogEntry>>>('/platform/audit-logs', { params })
  return data.data
}

export async function listAuditActions() {
  const { data } = await apiClient.get<ApiEnvelope<string[]>>('/platform/audit-logs/actions')
  return data.data
}

export interface PlatformSettings {
  id: string
  defaultCommissionRate: number
  smtpEnabled: boolean
  smtpHost: string | null
  smtpPort: number | null
  smtpUser: string | null
  smtpFrom: string | null
  smtpPasswordSet: boolean
  createdAt: string
  updatedAt: string
}

export async function getPlatformSettings() {
  const { data } = await apiClient.get<ApiEnvelope<PlatformSettings>>('/platform/settings')
  return data.data
}

export interface UpdatePlatformSettingsPayload {
  defaultCommissionRate?: number
  smtpEnabled?: boolean
  smtpHost?: string | null
  smtpPort?: number | null
  smtpUser?: string | null
  smtpPassword?: string
  smtpFrom?: string | null
}

export async function updatePlatformSettings(payload: UpdatePlatformSettingsPayload) {
  const { data } = await apiClient.patch<ApiEnvelope<PlatformSettings>>('/platform/settings', payload)
  return data.data
}

export interface ListPlatformProductsParams {
  page?: number
  limit?: number
  search?: string
  tenantId?: string
  isActive?: boolean
  isPublished?: boolean
}

export async function listPlatformProducts(params: ListPlatformProductsParams) {
  const { data } = await apiClient.get<ApiEnvelope<PaginatedResult<PlatformProductListItem>>>('/platform/products', {
    params,
  })
  return data.data
}

export async function moderateProduct(id: string, isActive: boolean, reason?: string) {
  const { data } = await apiClient.patch<ApiEnvelope<PlatformProductListItem>>(`/platform/products/${id}/moderate`, {
    isActive,
    reason,
  })
  return data.data
}

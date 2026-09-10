import { apiClient } from './api-client'
import type { ApiEnvelope, CustomerDetail, CustomerListItem, CustomerSegment, PaginatedResult } from '@/types/api'

export interface CustomerListParams {
  page?: number
  limit?: number
  search?: string
  segment?: CustomerSegment
}

export async function listCustomers(params: CustomerListParams) {
  const { data } = await apiClient.get<ApiEnvelope<PaginatedResult<CustomerListItem>>>('/customers', { params })
  return data.data
}

export async function getCustomer(id: string) {
  const { data } = await apiClient.get<ApiEnvelope<CustomerDetail>>(`/customers/${id}`)
  return data.data
}

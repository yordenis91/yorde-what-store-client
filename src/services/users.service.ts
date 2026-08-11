import { apiClient } from './api-client'
import type { ApiEnvelope, TenantMember } from '@/types/api'

export async function listMembers() {
  const { data } = await apiClient.get<ApiEnvelope<TenantMember[]>>('/users')
  return data.data
}

export async function inviteStaff(payload: { email: string; name: string; temporaryPassword: string }) {
  const { data } = await apiClient.post<ApiEnvelope<TenantMember>>('/users', payload)
  return data.data
}

export async function removeMember(id: string) {
  await apiClient.delete(`/users/${id}`)
}

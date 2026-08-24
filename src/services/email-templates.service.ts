import { apiClient } from './api-client'
import type { ApiEnvelope } from '@/types/api'

export interface ResolvedEmailTemplate {
  key: string
  subject: string
  body: string
  isOverridden: boolean
}

export interface UpsertEmailTemplateInput {
  subject: string
  body: string
}

export async function listEmailTemplates() {
  const { data } = await apiClient.get<ApiEnvelope<ResolvedEmailTemplate[]>>('/email-templates')
  return data.data
}

export async function upsertEmailTemplate(key: string, payload: UpsertEmailTemplateInput) {
  const { data } = await apiClient.put<ApiEnvelope<ResolvedEmailTemplate>>(`/email-templates/${key}`, payload)
  return data.data
}

export async function revertEmailTemplate(key: string) {
  await apiClient.delete(`/email-templates/${key}`)
}

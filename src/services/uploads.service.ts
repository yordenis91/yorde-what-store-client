import { apiClient } from './api-client'
import type { ApiEnvelope } from '@/types/api'

export async function uploadImage(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await apiClient.post<ApiEnvelope<{ url: string }>>('/uploads/image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.data.url
}

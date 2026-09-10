import { apiClient } from './api-client'
import type { ApiEnvelope } from '@/types/api'

/** 'logo' gets resized much smaller server-side — it's never shown larger than a few dozen px. Omit for a product photo or the store banner, which need the full size. */
export type UploadImageType = 'logo' | 'banner' | 'product'

export async function uploadImage(file: File, type?: UploadImageType): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  if (type) form.append('type', type)
  const { data } = await apiClient.post<ApiEnvelope<{ url: string }>>('/uploads/image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.data.url
}

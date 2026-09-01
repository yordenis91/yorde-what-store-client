import { apiClient } from './api-client'
import type { ApiEnvelope, CategoryTemplate } from '@/types/api'

// --- Platform (SUPER_ADMIN): the curated catalog ("nomenclador de categorías") ---

export interface CategoryTemplateInput {
  name: string
  parentId?: string | null
  sortOrder?: number
  isActive?: boolean
}

export async function listAllCategoryTemplates() {
  const { data } = await apiClient.get<ApiEnvelope<CategoryTemplate[]>>('/platform/category-templates')
  return data.data
}

export async function createCategoryTemplate(payload: CategoryTemplateInput) {
  const { data } = await apiClient.post<ApiEnvelope<CategoryTemplate>>('/platform/category-templates', payload)
  return data.data
}

export async function updateCategoryTemplate(id: string, payload: Partial<CategoryTemplateInput>) {
  const { data } = await apiClient.patch<ApiEnvelope<CategoryTemplate>>(`/platform/category-templates/${id}`, payload)
  return data.data
}

export async function deleteCategoryTemplate(id: string) {
  await apiClient.delete(`/platform/category-templates/${id}`)
}

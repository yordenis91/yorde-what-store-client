import { apiClient } from './api-client'
import type { ApiEnvelope, PaginatedResult, Product, ProductCategory, ProductTax } from '@/types/api'

export interface ProductListParams {
  page?: number
  limit?: number
  search?: string
}

export interface ProductVariantInput {
  name: string
  sku?: string
  price: number
  cost?: number
  quantity?: number
}

export interface ProductInput {
  name: string
  sku?: string
  description?: string
  price: number
  cost?: number
  quantity?: number
  isActive?: boolean
  isPublished?: boolean
  categoryIds?: string[]
  taxIds?: string[]
  variants?: ProductVariantInput[]
}

const adminBase = '/products'
const storefrontBase = '/storefront/products'

export async function listProducts(params: ProductListParams) {
  const { data } = await apiClient.get<ApiEnvelope<PaginatedResult<Product>>>(adminBase, { params })
  return data.data
}

export async function listPublishedProducts(slug: string, params: ProductListParams) {
  const { data } = await apiClient.get<ApiEnvelope<PaginatedResult<Product>>>(storefrontBase, {
    params,
    headers: { 'X-Tenant-ID': slug },
  })
  return data.data
}

export async function getPublishedProduct(slug: string, id: string) {
  const { data } = await apiClient.get<ApiEnvelope<Product>>(`${storefrontBase}/${id}`, {
    headers: { 'X-Tenant-ID': slug },
  })
  return data.data
}

export async function getProduct(id: string) {
  const { data } = await apiClient.get<ApiEnvelope<Product>>(`${adminBase}/${id}`)
  return data.data
}

export async function createProduct(payload: ProductInput) {
  const { data } = await apiClient.post<ApiEnvelope<Product>>(adminBase, payload)
  return data.data
}

export async function updateProduct(id: string, payload: Partial<ProductInput>) {
  const { data } = await apiClient.patch<ApiEnvelope<Product>>(`${adminBase}/${id}`, payload)
  return data.data
}

export async function deleteProduct(id: string) {
  await apiClient.delete(`${adminBase}/${id}`)
}

export async function addProductImage(id: string, url: string, isCover?: boolean) {
  const { data } = await apiClient.post<ApiEnvelope<unknown>>(`${adminBase}/${id}/images`, { url, isCover })
  return data.data
}

export async function listCategories() {
  const { data } = await apiClient.get<ApiEnvelope<ProductCategory[]>>(`${adminBase}/categories`)
  return data.data
}

export async function createCategory(name: string) {
  const { data } = await apiClient.post<ApiEnvelope<ProductCategory>>(`${adminBase}/categories`, { name })
  return data.data
}

export async function listTaxes() {
  const { data } = await apiClient.get<ApiEnvelope<ProductTax[]>>(`${adminBase}/taxes`)
  return data.data
}

export async function createTax(name: string, rate: number) {
  const { data } = await apiClient.post<ApiEnvelope<ProductTax>>(`${adminBase}/taxes`, { name, rate })
  return data.data
}

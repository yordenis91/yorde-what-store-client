import { apiClient } from './api-client'
import type { ApiEnvelope } from '@/types/api'

export interface Location {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  zipcode: string | null
  country: string | null
}

export interface Shipping {
  id: string
  name: string
  cost: string
  locationId: string | null
  isActive: boolean
  location?: Location | null
}

export async function listLocations() {
  const { data } = await apiClient.get<ApiEnvelope<Location[]>>('/locations')
  return data.data
}

export async function createLocation(payload: Partial<Location> & { name: string }) {
  const { data } = await apiClient.post<ApiEnvelope<Location>>('/locations', payload)
  return data.data
}

export async function deleteLocation(id: string) {
  await apiClient.delete(`/locations/${id}`)
}

export async function listShippings() {
  const { data } = await apiClient.get<ApiEnvelope<Shipping[]>>('/shipping')
  return data.data
}

export async function createShipping(payload: { name: string; cost: number; locationId?: string; isActive?: boolean }) {
  const { data } = await apiClient.post<ApiEnvelope<Shipping>>('/shipping', payload)
  return data.data
}

export async function updateShipping(id: string, payload: Partial<{ name: string; cost: number; locationId: string; isActive: boolean }>) {
  const { data } = await apiClient.patch<ApiEnvelope<Shipping>>(`/shipping/${id}`, payload)
  return data.data
}

export async function deleteShipping(id: string) {
  await apiClient.delete(`/shipping/${id}`)
}

export async function listPublicShippings(slug: string) {
  const { data } = await apiClient.get<ApiEnvelope<Shipping[]>>('/storefront/shipping', {
    headers: { 'X-Tenant-ID': slug },
  })
  return data.data
}

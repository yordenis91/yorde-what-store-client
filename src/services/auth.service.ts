import { apiClient } from './api-client'
import type { ApiEnvelope, Tenant, User } from '@/types/api'

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  password: string
  name: string
  storeName: string
  storeSlug: string
}

export type LoginResult = { requiresTwoFactor: true; challengeToken: string } | { user: User; accessToken: string }

export async function login(payload: LoginPayload) {
  const { data } = await apiClient.post<ApiEnvelope<LoginResult>>('/auth/login', payload)
  return data.data
}

export async function register(payload: RegisterPayload) {
  const { data } = await apiClient.post<ApiEnvelope<{ user: User; tenant: Tenant; accessToken: string }>>(
    '/auth/register',
    payload,
  )
  return data.data
}

export async function verifyTwoFactor(challengeToken: string, code: string) {
  const { data } = await apiClient.post<ApiEnvelope<{ user: User; accessToken: string }>>('/auth/2fa/verify', {
    challengeToken,
    code,
  })
  return data.data
}

export async function getProfile() {
  const { data } = await apiClient.get<ApiEnvelope<User>>('/auth/me')
  return data.data
}

export async function logout() {
  await apiClient.post('/auth/logout')
}

export async function switchTenant(tenantId: string) {
  const { data } = await apiClient.post<ApiEnvelope<{ user: User; accessToken: string }>>('/auth/switch-tenant', {
    tenantId,
  })
  return data.data
}

export async function setupTwoFactor() {
  const { data } = await apiClient.post<ApiEnvelope<{ secret: string; otpauthUrl: string; qrDataUrl: string }>>(
    '/auth/2fa/setup',
  )
  return data.data
}

export async function enableTwoFactor(code: string) {
  const { data } = await apiClient.post<ApiEnvelope<{ twoFactorEnabled: boolean }>>('/auth/2fa/enable', { code })
  return data.data
}

export async function disableTwoFactor() {
  const { data } = await apiClient.post<ApiEnvelope<{ twoFactorEnabled: boolean }>>('/auth/2fa/disable')
  return data.data
}

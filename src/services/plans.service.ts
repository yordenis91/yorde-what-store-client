import { apiClient } from './api-client'
import type { ApiEnvelope, Plan } from '@/types/api'

export async function listActivePlans() {
  const { data } = await apiClient.get<ApiEnvelope<Plan[]>>('/plans')
  return data.data
}

export interface Subscription {
  id: string
  planId: string
  requestedPlanId: string | null
  status: string
  expiresAt: string | null
  plan: Plan
}

export async function getCurrentSubscription() {
  const { data } = await apiClient.get<ApiEnvelope<Subscription | null>>('/plans/current/subscription')
  return data.data
}

export async function subscribeToPlan(planId: string) {
  const { data } = await apiClient.post<ApiEnvelope<Subscription>>('/plans/current/subscribe', { planId })
  return data.data
}

/** For paid plans: requires SUPER_ADMIN approval (see platform Upgrade requests panel) rather than switching instantly. */
export async function requestPlanUpgrade(planId: string) {
  const { data } = await apiClient.post<ApiEnvelope<Subscription>>('/plans/current/request-upgrade', { planId })
  return data.data
}

// --- Platform (SUPER_ADMIN) ---

export interface PlanInput {
  name: string
  price: number
  duration: Plan['duration']
  maxStores: number
  maxProducts: number
  features?: string[]
  isActive?: boolean
}

export async function listAllPlans() {
  const { data } = await apiClient.get<ApiEnvelope<Plan[]>>('/plans/admin/all')
  return data.data
}

export async function createPlan(payload: PlanInput) {
  const { data } = await apiClient.post<ApiEnvelope<Plan>>('/plans', payload)
  return data.data
}

export async function updatePlan(id: string, payload: Partial<PlanInput>) {
  const { data } = await apiClient.patch<ApiEnvelope<Plan>>(`/plans/${id}`, payload)
  return data.data
}

export async function deactivatePlan(id: string) {
  await apiClient.delete(`/plans/${id}`)
}

export interface UpgradeRequest {
  id: string
  tenant: { id: string; name: string; slug: string }
  currentPlan: Plan
  requestedPlan: Plan | null
  createdAt: string
}

export async function listUpgradeRequests() {
  const { data } = await apiClient.get<ApiEnvelope<UpgradeRequest[]>>('/plans/admin/upgrade-requests')
  return data.data
}

export async function approveUpgrade(subscriptionId: string) {
  const { data } = await apiClient.post<ApiEnvelope<Subscription>>(`/plans/${subscriptionId}/approve-upgrade`)
  return data.data
}

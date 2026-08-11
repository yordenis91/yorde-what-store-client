import { apiClient } from './api-client'
import type { ApiEnvelope, Plan } from '@/types/api'

export async function listActivePlans() {
  const { data } = await apiClient.get<ApiEnvelope<Plan[]>>('/plans')
  return data.data
}

export interface Subscription {
  id: string
  planId: string
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

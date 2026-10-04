import { apiClient } from './api-client'
import type { ApiEnvelope, FulfillmentMethod, Plan, PlanEntitlements } from '@/types/api'

export async function listActivePlans() {
  const { data } = await apiClient.get<ApiEnvelope<Plan[]>>('/plans')
  return data.data
}

export interface Subscription {
  id: string
  planId: string
  requestedPlanId: string | null
  requestedPaymentReference: string | null
  status: string
  /** Null for free and lifetime plans: they never expire. */
  expiresAt: string | null
  /** After this, an unrenewed paid plan drops to Free limits. Null when it never expires. */
  graceEndsAt: string | null
  /** Past expiry and grace: the store already has Free limits. */
  lapsed: boolean
  billingProvider: 'MANUAL' | 'STRIPE'
  stripeSubscriptionId: string | null
  stripeCustomerId: string | null
  /** A card plan cancelled from the billing portal: runs to expiresAt, then stops. */
  cancelAtPeriodEnd: boolean
  plan: Plan
}

export async function getCurrentSubscription() {
  const { data } = await apiClient.get<ApiEnvelope<Subscription | null>>('/plans/current/subscription')
  return data.data
}

export async function getCurrentEntitlements() {
  const { data } = await apiClient.get<ApiEnvelope<PlanEntitlements>>('/plans/current/entitlements')
  return data.data
}

export async function subscribeToPlan(planId: string) {
  const { data } = await apiClient.post<ApiEnvelope<Subscription>>('/plans/current/subscribe', { planId })
  return data.data
}

/**
 * Manual purchase or renewal of a paid plan (Zelle, transfer): a SUPER_ADMIN
 * approves it from the platform Upgrade requests panel. Requesting the current
 * plan again is a renewal.
 */
export async function requestPlanUpgrade({ planId, paymentReference }: { planId: string; paymentReference?: string }) {
  const { data } = await apiClient.post<ApiEnvelope<Subscription>>('/plans/current/request-upgrade', {
    planId,
    paymentReference: paymentReference || undefined,
  })
  return data.data
}

export async function getBillingStatus() {
  const { data } = await apiClient.get<ApiEnvelope<{ cardBillingEnabled: boolean }>>('/billing/status')
  return data.data
}

/** Stripe Checkout for a paid plan; the caller redirects the browser to `url`. */
export async function startCardCheckout(planId: string) {
  const { data } = await apiClient.post<ApiEnvelope<{ url: string }>>('/billing/checkout', { planId })
  return data.data
}

/** Stripe's billing portal (card, invoices, cancel); the caller redirects the browser to `url`. */
export async function openBillingPortal() {
  const { data } = await apiClient.post<ApiEnvelope<{ url: string }>>('/billing/portal')
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
  fulfillmentMethods?: FulfillmentMethod[]
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
  /** Same plan requested again: extends the current period instead of switching. */
  isRenewal: boolean
  paymentReference: string | null
  expiresAt: string | null
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

export async function rejectUpgrade(subscriptionId: string) {
  const { data } = await apiClient.post<ApiEnvelope<Subscription>>(`/plans/${subscriptionId}/reject-upgrade`)
  return data.data
}

import { apiClient } from './api-client'
import type { ApiEnvelope } from '@/types/api'

export async function createStripeCheckout(
  slug: string,
  payload: { orderId: string; successUrl: string; cancelUrl: string },
) {
  const { data } = await apiClient.post<ApiEnvelope<{ checkoutUrl: string; providerReference: string }>>(
    '/storefront/payments/stripe/checkout',
    payload,
    { headers: { 'X-Tenant-ID': slug } },
  )
  return data.data
}

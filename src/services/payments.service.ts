import { apiClient } from './api-client'
import type { ApiEnvelope, OrderStatus, PaymentStatus } from '@/types/api'

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

export async function createMercadoPagoCheckout(
  slug: string,
  payload: { orderId: string; successUrl: string; cancelUrl: string },
) {
  const { data } = await apiClient.post<ApiEnvelope<{ checkoutUrl: string; providerReference: string }>>(
    '/storefront/payments/mercadopago/checkout',
    payload,
    { headers: { 'X-Tenant-ID': slug } },
  )
  return data.data
}

export async function createPayPalCheckout(
  slug: string,
  payload: { orderId: string; successUrl: string; cancelUrl: string },
) {
  const { data } = await apiClient.post<ApiEnvelope<{ checkoutUrl: string; providerReference: string }>>(
    '/storefront/payments/paypal/checkout',
    payload,
    { headers: { 'X-Tenant-ID': slug } },
  )
  return data.data
}

/**
 * Called when the buyer lands back from PayPal. Returning proves nothing: this asks the server to
 * capture, and the server confirms the order only if PayPal says the payment completed.
 * Safe to call more than once.
 */
export async function capturePayPalOrder(slug: string, orderId: string) {
  const { data } = await apiClient.post<ApiEnvelope<{ paymentStatus: PaymentStatus; status: OrderStatus }>>(
    '/storefront/payments/paypal/capture',
    { orderId },
    { headers: { 'X-Tenant-ID': slug } },
  )
  return data.data
}

import { apiClient } from './api-client'
import type { ApiEnvelope, Customer, CustomerOrderSummary, Order } from '@/types/api'

export interface RegisterCustomerPayload {
  email: string
  password: string
  name: string
  phone?: string
}

export interface LoginCustomerPayload {
  email: string
  password: string
}

export interface CustomerSession {
  customer: Customer
  accessToken: string
}

export async function registerCustomer(payload: RegisterCustomerPayload) {
  const { data } = await apiClient.post<ApiEnvelope<CustomerSession>>('/storefront/customers/auth/register', payload)
  return data.data
}

export async function loginCustomer(payload: LoginCustomerPayload) {
  const { data } = await apiClient.post<ApiEnvelope<CustomerSession>>('/storefront/customers/auth/login', payload)
  return data.data
}

export async function logoutCustomer() {
  await apiClient.post('/storefront/customers/auth/logout')
}

export async function forgotCustomerPassword(email: string) {
  const { data } = await apiClient.post<ApiEnvelope<{ sent: boolean }>>('/storefront/customers/auth/forgot-password', {
    email,
  })
  return data.data
}

export async function resetCustomerPassword(token: string, password: string) {
  const { data } = await apiClient.post<ApiEnvelope<{ reset: boolean }>>('/storefront/customers/auth/reset-password', {
    token,
    password,
  })
  return data.data
}

export async function getMyProfile() {
  const { data } = await apiClient.get<ApiEnvelope<Customer>>('/storefront/customers/me')
  return data.data
}

export async function listMyOrders() {
  const { data } = await apiClient.get<ApiEnvelope<CustomerOrderSummary[]>>('/storefront/customers/orders')
  return data.data
}

export async function getMyOrder(id: string) {
  const { data } = await apiClient.get<ApiEnvelope<Order>>(`/storefront/customers/orders/${id}`)
  return data.data
}

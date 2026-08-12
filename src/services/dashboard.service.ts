import { apiClient } from './api-client'
import type { ApiEnvelope } from '@/types/api'

export interface DashboardSummary {
  totalProducts: number
  totalOrders: number
  pendingOrders: number
  revenue: number
  ordersLast7Days: { date: string; count: number; revenue: number }[]
  topProducts: { productId: string; name: string; quantitySold: number; revenue: number }[]
  recentOrders: {
    id: string
    orderNumber: string
    customerName: string
    status: string
    grandTotal: string
    createdAt: string
  }[]
}

export async function getDashboardSummary() {
  const { data } = await apiClient.get<ApiEnvelope<DashboardSummary>>('/dashboard/summary')
  return data.data
}

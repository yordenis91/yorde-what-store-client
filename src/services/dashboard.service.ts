import { apiClient } from './api-client'
import type { ApiEnvelope } from '@/types/api'

export const DASHBOARD_RANGES = ['7d', '30d', '90d'] as const
export type DashboardRange = (typeof DASHBOARD_RANGES)[number]

export interface DashboardSummary {
  range: DashboardRange
  totalProducts: number
  totalOrders: number
  pendingOrders: number
  /** All-time revenue from PAID orders — a stable reference figure, independent of `range`. */
  lifetimeRevenue: number
  periodRevenue: number
  periodOrders: number
  averageOrderValue: number
  revenueOverTime: { date: string; orders: number; revenue: number }[]
  topProducts: { productId: string | null; name: string; quantitySold: number; revenue: number }[]
  couponPerformance: { code: string; timesUsed: number; discountGiven: number }[]
  recentOrders: {
    id: string
    orderNumber: string
    customerName: string
    status: string
    grandTotal: string
    createdAt: string
  }[]
  uniqueVisitors: number
  totalPageviews: number
  /** Converted sessions divided by unique visitor sessions in the range. Null with no visits yet. */
  conversionRate: number | null
  visitsOverTime: { date: string; visitors: number; pageviews: number }[]
  topReferrers: { referrer: string; sessions: number }[]
}

export async function getDashboardSummary(range: DashboardRange = '7d') {
  const { data } = await apiClient.get<ApiEnvelope<DashboardSummary>>('/dashboard/summary', { params: { range } })
  return data.data
}

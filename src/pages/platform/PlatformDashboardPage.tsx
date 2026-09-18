import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from '@/components/ui/Card'
import { getPlatformSummary } from '@/services/platform.service'
import { DASHBOARD_RANGES, type DashboardRange } from '@/services/dashboard.service'
import { formatDate, formatMoney } from '@/utils/format'

function GmvChart({ data }: { data: { date: string; orders: number; gmv: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ left: -20, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} fontSize={11} stroke="#9ca3af" />
        <YAxis fontSize={11} stroke="#9ca3af" allowDecimals={false} />
        <Tooltip formatter={(value, name) => [name === 'gmv' ? Number(value).toFixed(2) : value, name]} />
        <Bar dataKey="orders" fill="#c7d2fe" radius={[4, 4, 0, 0]} />
        <Line type="monotone" dataKey="gmv" stroke="#4f46e5" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export function PlatformDashboardPage() {
  const { t } = useTranslation()
  const [range, setRange] = useState<DashboardRange>('7d')
  const { data, isLoading } = useQuery({
    queryKey: ['platform-summary', range],
    queryFn: () => getPlatformSummary(range),
  })

  const lifetimeStats = [
    { label: t('platformDashboard.totalTenants'), value: data?.totalTenants ?? '—' },
    { label: t('platformDashboard.activeTenants'), value: data?.activeTenants ?? '—' },
    { label: t('platformDashboard.totalUsers'), value: data?.totalUsers ?? '—' },
    { label: t('platformDashboard.totalOrders'), value: data?.totalOrders ?? '—' },
    { label: t('platformDashboard.platformRevenue'), value: formatMoney(data?.totalRevenue ?? 0) },
  ]

  const periodStats = [
    { label: t('platformDashboard.periodOrders'), value: data?.periodOrders ?? '—' },
    { label: t('platformDashboard.periodGmv'), value: formatMoney(data?.periodRevenue ?? 0) },
    { label: t('platformDashboard.commissions'), value: formatMoney(data?.commissionsTotal ?? 0) },
  ]

  const billingStats = [
    { label: t('platformDashboard.mrr'), value: formatMoney(data?.mrr ?? 0) },
    { label: t('platformDashboard.activeSubscriptions'), value: data?.activeSubscriptions ?? '—' },
  ]

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">{t('platformDashboard.title')}</h1>
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {DASHBOARD_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                range === r ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t(`dashboard.range${r}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {lifetimeStats.map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{stat.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {periodStats.map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{stat.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-medium text-gray-900">{t('platformDashboard.gmvOverTime')}</h2>
          {isLoading ? (
            <p className="text-sm text-gray-500">{t('common.loading')}</p>
          ) : (
            <GmvChart data={data?.gmvOverTime ?? []} />
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-medium text-gray-900">{t('platformDashboard.topTenants')}</h2>
          <div className="flex flex-col divide-y divide-gray-100">
            {data?.topTenantsByRevenue.map((tenant) => (
              <Link
                key={tenant.tenantId}
                to={`/platform/tenants/${tenant.tenantId}`}
                className="flex items-center justify-between py-2 text-sm hover:text-brand-700"
              >
                <span className="text-gray-700">{tenant.name}</span>
                <span className="font-medium text-gray-900">{formatMoney(tenant.revenue)}</span>
              </Link>
            ))}
            {data?.topTenantsByRevenue.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-400">{t('platformDashboard.noTopTenants')}</p>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="grid grid-cols-2 gap-4 lg:col-span-1">
          {billingStats.map((stat) => (
            <Card key={stat.label}>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{stat.value}</p>
            </Card>
          ))}
        </div>

        <Card className="lg:col-span-2">
          <h2 className="mb-3 font-medium text-gray-900">{t('platformDashboard.mrrByPlan')}</h2>
          <div className="flex flex-col divide-y divide-gray-100">
            {data?.planBreakdown.map((p) => (
              <div key={p.planId} className="flex items-center justify-between py-2 text-sm">
                <span className="text-gray-700">
                  {p.name} <span className="text-gray-400">({p.activeSubscriptions})</span>
                </span>
                <span className="font-medium text-gray-900">{formatMoney(p.mrr)}</span>
              </div>
            ))}
            {data?.planBreakdown.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-400">{t('platformDashboard.noActiveSubscriptions')}</p>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="mb-3 font-medium text-gray-900">{t('platformDashboard.recentTenants')}</h2>
        {isLoading ? (
          <p className="text-sm text-gray-500">{t('common.loading')}</p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-100">
            {data?.recentTenants.map((tenant) => (
              <div key={tenant.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <Link to={`/platform/tenants/${tenant.id}`} className="font-medium text-gray-900 hover:text-brand-700">
                    {tenant.name}
                  </Link>
                  <span className="ml-2 text-gray-500">{tenant.owner.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${tenant.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {tenant.isActive ? t('platformDashboard.active') : t('platformDashboard.inactive')}
                  </span>
                  <span className="text-gray-400">{formatDate(tenant.createdAt)}</span>
                </div>
              </div>
            ))}
            {data?.recentTenants.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-400">{t('platformDashboard.noTenantsYet')}</p>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}

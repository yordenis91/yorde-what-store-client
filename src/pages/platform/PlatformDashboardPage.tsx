import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { getPlatformSummary } from '@/services/platform.service'
import { formatDate, formatMoney } from '@/utils/format'

export function PlatformDashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ['platform-summary'], queryFn: getPlatformSummary })

  const stats = [
    { label: 'Total tenants', value: data?.totalTenants ?? '—' },
    { label: 'Active tenants', value: data?.activeTenants ?? '—' },
    { label: 'Total users', value: data?.totalUsers ?? '—' },
    { label: 'Total orders', value: data?.totalOrders ?? '—' },
    { label: 'Platform revenue', value: formatMoney(data?.totalRevenue ?? 0) },
  ]

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Platform dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{stat.value}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <h2 className="mb-3 font-medium text-gray-900">Recently created tenants</h2>
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-100">
            {data?.recentTenants.map((tenant) => (
              <div key={tenant.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <Link to="/platform/tenants" className="font-medium text-gray-900 hover:text-brand-700">
                    {tenant.name}
                  </Link>
                  <span className="ml-2 text-gray-500">{tenant.owner.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${tenant.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {tenant.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-gray-400">{formatDate(tenant.createdAt)}</span>
                </div>
              </div>
            ))}
            {data?.recentTenants.length === 0 && <p className="py-4 text-center text-sm text-gray-400">No tenants yet.</p>}
          </div>
        )}
      </Card>
    </div>
  )
}

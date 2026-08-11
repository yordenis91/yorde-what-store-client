import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { listProducts } from '@/services/products.service'
import { listOrders } from '@/services/orders.service'
import { useAuthStore } from '@/store/auth.store'
import { formatMoney } from '@/utils/format'

export function DashboardPage() {
  const { t } = useTranslation()
  const activeTenant = useAuthStore((s) => s.activeTenant)

  const { data: products } = useQuery({
    queryKey: ['dashboard-products'],
    queryFn: () => listProducts({ page: 1, limit: 1 }),
  })
  const { data: orders } = useQuery({
    queryKey: ['dashboard-orders'],
    queryFn: () => listOrders({ page: 1, limit: 100 }),
  })

  const pendingOrders = orders?.items.filter((o) => o.status === 'PENDING').length ?? 0
  const revenue = orders?.items.filter((o) => o.paymentStatus === 'PAID').reduce((sum, o) => sum + Number(o.grandTotal), 0) ?? 0

  const stats = [
    { label: t('dashboard.totalProducts'), value: products?.meta.total ?? '—' },
    { label: t('dashboard.totalOrders'), value: orders?.meta.total ?? '—' },
    { label: t('dashboard.pendingOrders'), value: pendingOrders },
    {
      label: t('dashboard.revenue'),
      value: formatMoney(revenue, activeTenant?.currencySymbol ?? '$', (activeTenant?.currencySymbolPosition as 'pre' | 'post') ?? 'pre'),
    },
  ]

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">{t('dashboard.title')}</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{stat.value}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

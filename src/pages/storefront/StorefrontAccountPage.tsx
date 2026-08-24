import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Seo } from '@/components/storefront/Seo'
import { useStorefront } from '@/hooks/useStorefront'
import { useCustomerStore } from '@/store/customer.store'
import { listMyOrders, logoutCustomer } from '@/services/customers.service'
import { formatDate, formatMoney } from '@/utils/format'

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  REFUNDED: 'bg-red-100 text-red-700',
}

export function StorefrontAccountPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { tenant, path } = useStorefront()
  const customer = useCustomerStore((s) => s.customer)
  const isBootstrapping = useCustomerStore((s) => s.isBootstrapping)
  const clearCustomer = useCustomerStore((s) => s.clear)

  useEffect(() => {
    if (!isBootstrapping && !customer) navigate(path('/login'), { replace: true })
  }, [isBootstrapping, customer, navigate, path])

  const { data: orders, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: listMyOrders,
    enabled: !!customer,
  })

  const symbol = tenant.currencySymbol
  const position = tenant.currencySymbolPosition as 'pre' | 'post'

  async function handleLogout() {
    await logoutCustomer()
    clearCustomer()
    navigate(path())
  }

  if (isBootstrapping || !customer) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Seo title={`${t('account.myAccount')} — ${tenant.name}`} noIndex />
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('account.myAccount')}</h1>
          <p className="text-sm text-gray-500">
            {customer.name} — {customer.email}
          </p>
        </div>
        <Button variant="secondary" onClick={() => void handleLogout()}>
          {t('account.signOut')}
        </Button>
      </div>

      <h2 className="mb-3 font-medium text-gray-900">{t('account.myOrders')}</h2>
      {isLoading ? (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      ) : orders && orders.length > 0 ? (
        <div className="flex flex-col gap-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium text-gray-900">{order.orderNumber}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${statusColors[order.status]}`}>{order.status}</span>
              </div>
              <p className="mb-2 text-xs text-gray-500">{formatDate(order.createdAt)}</p>
              <div className="flex flex-col divide-y divide-gray-100">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-1.5 text-sm">
                    <span>
                      {item.quantity} × {item.productName}
                      {item.variantName ? ` (${item.variantName})` : ''}
                    </span>
                    <span className="font-medium">{formatMoney(item.lineTotal, symbol, position)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-end border-t border-gray-100 pt-2 text-sm font-semibold text-gray-900">
                {formatMoney(order.grandTotal, symbol, position)}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center text-sm text-gray-500">{t('account.noOrders')}</Card>
      )}
    </div>
  )
}

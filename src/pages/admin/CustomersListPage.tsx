import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Input } from '@/components/ui/Input'
import { listCustomers } from '@/services/customers-admin.service'
import { useAuthStore } from '@/store/auth.store'
import { formatDate, formatMoney } from '@/utils/format'
import type { CustomerSegment } from '@/types/api'

const segmentColors: Record<CustomerSegment, string> = {
  new: 'bg-gray-100 text-gray-600',
  recurring: 'bg-blue-100 text-blue-700',
  vip: 'bg-amber-100 text-amber-700',
}

const SEGMENTS: CustomerSegment[] = ['new', 'recurring', 'vip']

export function CustomersListPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState<CustomerSegment | ''>('')
  const activeTenant = useAuthStore((s) => s.activeTenant)
  const symbol = activeTenant?.currencySymbol ?? '$'
  const position = (activeTenant?.currencySymbolPosition as 'pre' | 'post') ?? 'pre'

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search, segment],
    queryFn: () =>
      listCustomers({
        page: 1,
        limit: 50,
        search: search || undefined,
        segment: segment || undefined,
      }),
  })

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">{t('customers.title')}</h1>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Input
          placeholder={t('common.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs flex-1 sm:flex-none"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">{t('customers.segment')}</label>
          <select
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm sm:w-auto sm:py-2"
            value={segment}
            onChange={(e) => setSegment(e.target.value as CustomerSegment | '')}
          >
            <option value="">{t('customers.allSegments')}</option>
            {SEGMENTS.map((s) => (
              <option key={s} value={s}>
                {t(`customers.segments.${s}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">{t('customers.name')}</th>
                <th className="px-4 py-3">{t('customers.contact')}</th>
                <th className="px-4 py-3">{t('customers.totalOrders')}</th>
                <th className="px-4 py-3">{t('customers.totalSpent')}</th>
                <th className="px-4 py-3">{t('customers.lastOrderAt')}</th>
                <th className="px-4 py-3">{t('customers.segment')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data?.items.map((customer) => (
                <tr key={customer.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-900">{customer.name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {customer.email && <div>{customer.email}</div>}
                    {customer.phone && <div>{customer.phone}</div>}
                  </td>
                  <td className="px-4 py-3">{customer.totalOrders}</td>
                  <td className="px-4 py-3">{formatMoney(customer.totalSpent, symbol, position)}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {customer.lastOrderAt ? formatDate(customer.lastOrderAt) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${segmentColors[customer.segment]}`}>
                      {t(`customers.segments.${customer.segment}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/admin/customers/${customer.id}`} className="font-medium text-brand-700">
                      {t('orders.viewDetail')}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

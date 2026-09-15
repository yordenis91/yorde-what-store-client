import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { exportOrdersCsv, listOrders } from '@/services/orders.service'
import { useAuthStore } from '@/store/auth.store'
import { useOrderNotificationsStore } from '@/store/order-notifications.store'
import { extractErrorMessage } from '@/services/api-client'
import { formatDate, formatMoney } from '@/utils/format'
import type { OrderStatus } from '@/types/api'

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  REFUNDED: 'bg-red-100 text-red-700',
}

const STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'REFUNDED']

export function OrdersListPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const activeFilterCount = [status, dateFrom, dateTo].filter(Boolean).length
  const activeTenant = useAuthStore((s) => s.activeTenant)
  const symbol = activeTenant?.currencySymbol ?? '$'
  const position = (activeTenant?.currencySymbolPosition as 'pre' | 'post') ?? 'pre'

  // Opening the list is how staff "sees" whatever the live feed announced.
  useEffect(() => {
    useOrderNotificationsStore.getState().clear()
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['orders', search, status, dateFrom, dateTo],
    queryFn: () =>
      listOrders({
        page: 1,
        limit: 50,
        search: search || undefined,
        status: status || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
  })

  async function handleExport() {
    setExporting(true)
    try {
      await exportOrdersCsv({
        search: search || undefined,
        status: status || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })
    } catch (error) {
      toast.error(extractErrorMessage(error, t('errors.generic')))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">{t('orders.title')}</h1>
        <Button variant="secondary" onClick={() => void handleExport()} loading={exporting}>
          {t('orders.exportCsv')}
        </Button>
      </div>

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Input
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs flex-1 sm:flex-none"
          />
          {/*
            On sm+ the filter row below is always visible (plenty of room),
            so this toggle only exists on narrow screens — flex-wrap on a
            fixed-width row was wrapping the two date fields inconsistently
            (2 up top, 1 stranded below) with no indication of which was
            "from" and which was "to".
          */}
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 sm:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16M7 12h10M10 19h4" />
            </svg>
            {t('orders.filters')}
            {activeFilterCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className={`h-3.5 w-3.5 transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>

        <div className={`${filtersOpen ? 'flex' : 'hidden'} flex-col gap-3 sm:flex sm:flex-row sm:flex-wrap`}>
          <div className="flex min-w-0 flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">{t('orders.status')}</label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm sm:w-auto sm:py-2"
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus | '')}
            >
              <option value="">{t('orders.allStatuses')}</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <Input
            label={t('orders.dateFrom')}
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full sm:w-40"
          />
          <Input
            label={t('orders.dateTo')}
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full sm:w-40"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">{t('orders.orderNumber')}</th>
                <th className="px-4 py-3">{t('orders.customer')}</th>
                <th className="px-4 py-3">{t('orders.fulfillment')}</th>
                <th className="px-4 py-3">{t('orders.status')}</th>
                <th className="px-4 py-3">{t('orders.total')}</th>
                <th className="px-4 py-3">{t('orders.date')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data?.items.map((order) => (
                <tr key={order.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-900">{order.orderNumber}</td>
                  <td className="px-4 py-3">{order.customerName}</td>
                  <td className="px-4 py-3">{order.fulfillmentMethod}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${statusColors[order.status]}`}>{order.status}</span>
                  </td>
                  <td className="px-4 py-3">{formatMoney(order.grandTotal, symbol, position)}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link to={`/admin/orders/${order.id}`} className="font-medium text-brand-700">
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

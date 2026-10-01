import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { QueryErrorState } from '@/components/ui/QueryErrorState'
import { EyeIcon, PencilIcon, TrashIcon } from '@/components/ui/icons'
import {
  exportOrdersCsv,
  hideOrder,
  listOrders,
  updateOrderStatus,
  type OrderSortField,
} from '@/services/orders.service'
import { useAuthStore } from '@/store/auth.store'
import { useOrderNotificationsStore } from '@/store/order-notifications.store'
import { extractErrorMessage } from '@/services/api-client'
import { formatDate, formatMoney } from '@/utils/format'
import type { Order, OrderStatus } from '@/types/api'

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  REFUNDED: 'bg-red-100 text-red-700',
}

const STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'REFUNDED']

/** Mirror the API's rules so the UI doesn't offer a change it will reject with a 409. */
const TERMINAL_STATUSES: OrderStatus[] = ['CANCELLED', 'REFUNDED']
const HIDEABLE_STATUSES: OrderStatus[] = ['COMPLETED', 'CANCELLED', 'REFUNDED']
/** These can't be walked back (stock released / money returned), so they ask first. */
const CONFIRM_STATUSES: OrderStatus[] = ['CANCELLED', 'REFUNDED']

export function OrdersListPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [sortBy, setSortBy] = useState<OrderSortField>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState<Order | null>(null)
  const [pendingStatus, setPendingStatus] = useState<{ order: Order; status: OrderStatus } | null>(null)
  const queryClient = useQueryClient()
  const activeFilterCount = [status, dateFrom, dateTo].filter(Boolean).length
  const activeTenant = useAuthStore((s) => s.activeTenant)
  const symbol = activeTenant?.currencySymbol ?? '$'
  const position = (activeTenant?.currencySymbolPosition as 'pre' | 'post') ?? 'pre'

  // Opening the list is how staff "sees" whatever the live feed announced.
  useEffect(() => {
    useOrderNotificationsStore.getState().clear()
  }, [])

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['orders', search, status, dateFrom, dateTo, sortBy, sortDir],
    queryFn: () =>
      listOrders({
        page: 1,
        limit: 50,
        search: search || undefined,
        status: status || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sortBy,
        sortDir,
      }),
  })

  function toggleSort(field: OrderSortField) {
    if (field === sortBy) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortBy(field)
      // Dates and totals read best biggest/newest first; names and numbers A→Z.
      setSortDir(field === 'createdAt' || field === 'grandTotal' ? 'desc' : 'asc')
    }
  }

  const statusMutation = useMutation({
    mutationFn: ({ order, status }: { order: Order; status: OrderStatus }) => updateOrderStatus(order.id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success(t('orders.statusChanged'))
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
    onSettled: () => setPendingStatus(null),
  })

  const deleteMutation = useMutation({
    mutationFn: (order: Order) => hideOrder(order.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success(t('orders.deleted'))
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
    onSettled: () => setDeleting(null),
  })

  function requestStatus(order: Order, next: OrderStatus) {
    if (next === order.status) return
    if (CONFIRM_STATUSES.includes(next)) setPendingStatus({ order, status: next })
    else statusMutation.mutate({ order, status: next })
  }

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

  const sortProps = { sortBy, sortDir, onSort: toggleSort }

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
      ) : isError ? (
        <QueryErrorState onRetry={() => void refetch()} />
      ) : data && data.items.length === 0 ? (
        <Card className="text-center text-sm text-gray-400">{t('orders.empty')}</Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <SortableTh field="orderNumber" label={t('orders.orderNumber')} {...sortProps} />
                <SortableTh field="customerName" label={t('orders.customer')} {...sortProps} />
                <th className="px-4 py-3">{t('orders.fulfillment')}</th>
                <th className="px-4 py-3">{t('orders.status')}</th>
                <SortableTh field="grandTotal" label={t('orders.total')} {...sortProps} />
                <SortableTh field="createdAt" label={t('orders.date')} {...sortProps} />
                <th className="px-4 py-3 text-right">{t('orders.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((order) => {
                const locked = TERMINAL_STATUSES.includes(order.status)
                const canDelete = HIDEABLE_STATUSES.includes(order.status)
                return (
                  <tr key={order.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-900">{order.orderNumber}</td>
                    <td className="px-4 py-3">{order.customerName}</td>
                    <td className="px-4 py-3">{order.fulfillmentMethod}</td>
                    <td className="px-4 py-3">
                      <select
                        aria-label={t('orders.statusFor', { number: order.orderNumber })}
                        value={order.status}
                        disabled={locked || (statusMutation.isPending && statusMutation.variables?.order.id === order.id)}
                        title={locked ? t('orders.statusLocked', { status: order.status }) : undefined}
                        onChange={(e) => requestStatus(order, e.target.value as OrderStatus)}
                        className={`rounded-full border-0 py-1 pl-2.5 pr-7 text-xs font-medium disabled:cursor-not-allowed ${statusColors[order.status]}`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">{formatMoney(order.grandTotal, symbol, position)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/admin/orders/${order.id}`}
                          aria-label={`${t('orders.view')} ${order.orderNumber}`}
                          title={t('orders.view')}
                          className={iconButton}
                        >
                          <EyeIcon className="h-5 w-5" />
                        </Link>
                        <button
                          type="button"
                          aria-label={`${t('orders.editOrder')} ${order.orderNumber}`}
                          title={locked ? t('orders.editLocked', { status: order.status }) : t('orders.editOrder')}
                          disabled={locked}
                          onClick={() => navigate(`/admin/orders/${order.id}/edit`)}
                          className={iconButton}
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`${t('orders.deleteOrder')} ${order.orderNumber}`}
                          title={canDelete ? t('orders.deleteOrder') : t('orders.deleteLocked')}
                          disabled={!canDelete}
                          onClick={() => setDeleting(order)}
                          className={`${iconButton} hover:text-red-600`}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {deleting && (
        <Modal title={t('orders.deleteTitle')} onClose={() => setDeleting(null)}>
          <p className="text-sm text-gray-600">{t('orders.deleteConfirm', { number: deleting.orderNumber })}</p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleting)}>
              {t('common.delete')}
            </Button>
          </div>
        </Modal>
      )}

      {pendingStatus && (
        <Modal
          title={t('orders.changeStatusTitle', { status: pendingStatus.status })}
          onClose={() => setPendingStatus(null)}
        >
          <p className="text-sm text-gray-600">
            {pendingStatus.status === 'REFUNDED' ? t('orders.refundConfirm') : t('orders.cancelConfirm')}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPendingStatus(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              loading={statusMutation.isPending}
              onClick={() => statusMutation.mutate(pendingStatus)}
            >
              {t('orders.confirm')}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

const iconButton =
  'flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-500'

function SortableTh({
  field,
  label,
  sortBy,
  sortDir,
  onSort,
}: {
  field: OrderSortField
  label: string
  sortBy: OrderSortField
  sortDir: 'asc' | 'desc'
  onSort: (field: OrderSortField) => void
}) {
  const { t } = useTranslation()
  const active = sortBy === field
  return (
    <th className="px-4 py-3" aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(field)}
        title={t('orders.sortBy', { column: label })}
        className={`inline-flex items-center gap-1 uppercase ${active ? 'text-gray-900' : 'hover:text-gray-700'}`}
      >
        {label}
        <span aria-hidden className="text-[10px]">
          {active ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  )
}

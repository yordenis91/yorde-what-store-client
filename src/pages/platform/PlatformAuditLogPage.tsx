import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { QueryErrorState } from '@/components/ui/QueryErrorState'
import { listAuditActions, listAuditLogs } from '@/services/platform.service'
import { formatDateTime } from '@/utils/format'

export function PlatformAuditLogPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('')
  const [tenantId, setTenantId] = useState(searchParams.get('tenantId') ?? '')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const { data: actions } = useQuery({ queryKey: ['audit-actions'], queryFn: listAuditActions })

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['audit-logs', page, search, action, tenantId, dateFrom, dateTo],
    queryFn: () =>
      listAuditLogs({
        page,
        limit: 20,
        search: search || undefined,
        action: action || undefined,
        tenantId: tenantId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
  })

  function updateFilter(setter: (value: string) => void) {
    return (value: string) => {
      setter(value)
      setPage(1)
    }
  }

  function clearFilters() {
    setSearch('')
    setAction('')
    setTenantId('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">{t('auditLog.title')}</h1>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Input
          label={t('auditLog.searchLabel')}
          placeholder={t('auditLog.searchPlaceholder')}
          value={search}
          onChange={(e) => updateFilter(setSearch)(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">{t('auditLog.actionLabel')}</label>
          <select
            value={action}
            onChange={(e) => updateFilter(setAction)(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700"
          >
            <option value="">{t('auditLog.allActions')}</option>
            {actions?.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <Input
          label={t('auditLog.tenantIdLabel')}
          placeholder={t('auditLog.tenantIdPlaceholder')}
          value={tenantId}
          onChange={(e) => updateFilter(setTenantId)(e.target.value)}
          className="max-w-[220px]"
        />
        <Input
          label={t('auditLog.fromLabel')}
          type="date"
          value={dateFrom}
          onChange={(e) => updateFilter(setDateFrom)(e.target.value)}
        />
        <Input
          label={t('auditLog.toLabel')}
          type="date"
          value={dateTo}
          onChange={(e) => updateFilter(setDateTo)(e.target.value)}
        />
        <Button variant="secondary" onClick={clearFilters}>
          {t('auditLog.clearFilters')}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      ) : isError ? (
        <QueryErrorState onRetry={() => void refetch()} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">{t('auditLog.columnWhen')}</th>
                <th className="px-4 py-3">{t('auditLog.columnActor')}</th>
                <th className="px-4 py-3">{t('auditLog.columnAction')}</th>
                <th className="px-4 py-3">{t('auditLog.columnEntity')}</th>
                <th className="px-4 py-3">{t('auditLog.columnIp')}</th>
                <th className="px-4 py-3">{t('auditLog.columnDetails')}</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-100 align-top last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-gray-500">{formatDateTime(entry.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{entry.actorEmail ?? '—'}</div>
                    <div className="text-xs text-gray-500">{entry.actorRole}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div>{entry.entityType}</div>
                    <div className="max-w-[160px] truncate text-xs text-gray-400" title={entry.entityId ?? ''}>
                      {entry.entityId}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{entry.ipAddress}</td>
                  <td className="max-w-xs px-4 py-3">
                    <pre className="max-h-24 overflow-auto whitespace-pre-wrap break-all text-xs text-gray-500">
                      {JSON.stringify(entry.metadata, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-400">
                    {t('auditLog.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {data && data.meta.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ←
          </Button>
          <span className="text-sm text-gray-500">
            {page} / {data.meta.totalPages}
          </span>
          <Button variant="secondary" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>
            →
          </Button>
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { listPlatformProducts, moderateProduct } from '@/services/platform.service'
import { extractErrorMessage } from '@/services/api-client'
import { formatDate, formatMoney } from '@/utils/format'
import type { PlatformProductListItem } from '@/types/api'

interface ModerateFormValues {
  reason: string
}

/** Deactivating asks for a reason (a real moderation action, worth a trail); reactivating doesn't. */
function ModerateModal({
  product,
  onClose,
  onDone,
}: {
  product: PlatformProductListItem
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation()
  const { register, handleSubmit } = useForm<ModerateFormValues>()

  const mutation = useMutation({
    mutationFn: (reason: string) => moderateProduct(product.id, false, reason || undefined),
    onSuccess: onDone,
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  return (
    <Modal title={t('platformProducts.deactivateTitle', { name: product.name })} onClose={onClose}>
      <form
        onSubmit={(e) => void handleSubmit((values) => mutation.mutate(values.reason))(e)}
        className="flex flex-col gap-3"
      >
        <p className="text-sm text-gray-600">
          {t('platformProducts.deactivateBody', { tenant: product.tenant.name })}
        </p>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">{t('platformProducts.reasonLabel')}</label>
          <textarea
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            rows={3}
            placeholder={t('platformProducts.reasonPlaceholder')}
            {...register('reason')}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="danger" loading={mutation.isPending}>
            {t('platformProducts.deactivate')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export function PlatformProductsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [isActive, setIsActive] = useState<'' | 'true' | 'false'>('')
  const [page, setPage] = useState(1)
  const [moderating, setModerating] = useState<PlatformProductListItem | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['platform-products', page, search, isActive],
    queryFn: () =>
      listPlatformProducts({
        page,
        limit: 20,
        search: search || undefined,
        isActive: isActive === '' ? undefined : isActive === 'true',
      }),
  })

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => moderateProduct(id, true),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['platform-products'] }),
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  function closeModalAndRefresh() {
    setModerating(null)
    void queryClient.invalidateQueries({ queryKey: ['platform-products'] })
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">{t('platformProducts.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('platformProducts.subtitle')}</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder={t('platformProducts.searchPlaceholder')}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="max-w-sm"
        />
        <select
          value={isActive}
          onChange={(e) => {
            setIsActive(e.target.value as '' | 'true' | 'false')
            setPage(1)
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700"
        >
          <option value="">{t('platformProducts.allStatuses')}</option>
          <option value="true">{t('platformProducts.active')}</option>
          <option value="false">{t('platformProducts.inactive')}</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">{t('platformProducts.columnProduct')}</th>
                <th className="px-4 py-3">{t('platformProducts.columnStore')}</th>
                <th className="px-4 py-3">{t('platformProducts.columnPrice')}</th>
                <th className="px-4 py-3">{t('platformProducts.columnStatus')}</th>
                <th className="px-4 py-3">{t('platformProducts.columnCreated')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                    {t('platformProducts.empty')}
                  </td>
                </tr>
              )}
              {data?.items.map((product) => (
                <tr key={product.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{product.name}</div>
                    {product.sku && <div className="text-xs text-gray-500">SKU {product.sku}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/platform/tenants/${product.tenant.id}`} className="text-brand-600 hover:underline">
                      {product.tenant.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{formatMoney(product.price)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        product.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {t(product.isActive ? 'platformProducts.active' : 'platformProducts.inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(product.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {product.isActive ? (
                      <Button variant="secondary" onClick={() => setModerating(product)}>
                        {t('platformProducts.deactivate')}
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        loading={reactivateMutation.isPending}
                        onClick={() => reactivateMutation.mutate(product.id)}
                      >
                        {t('platformProducts.reactivate')}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
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

      {moderating && (
        <ModerateModal product={moderating} onClose={() => setModerating(null)} onDone={closeModalAndRefresh} />
      )}
    </div>
  )
}

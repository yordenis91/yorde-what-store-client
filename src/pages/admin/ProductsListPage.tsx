import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { deleteProduct, listProducts } from '@/services/products.service'
import { useAuthStore } from '@/store/auth.store'
import { formatMoney } from '@/utils/format'
import { extractErrorMessage } from '@/services/api-client'

export function ProductsListPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const activeTenant = useAuthStore((s) => s.activeTenant)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search],
    queryFn: () => listProducts({ page, limit: 12, search: search || undefined }),
  })

  const removeMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success(t('common.delete'))
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  const symbol = activeTenant?.currencySymbol ?? '$'
  const position = (activeTenant?.currencySymbolPosition as 'pre' | 'post') ?? 'pre'

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{t('products.title')}</h1>
        <Link to="/admin/products/new">
          <Button>{t('products.new')}</Button>
        </Link>
      </div>

      <Input
        placeholder={t('common.search')}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setPage(1)
        }}
        className="mb-4 max-w-xs"
      />

      {isLoading ? (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.items.map((product) => (
            <Card key={product.id} className="flex flex-col gap-2">
              <div className="flex items-start justify-between">
                <span className="font-medium text-gray-900">{product.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    product.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {product.isActive ? t('products.active') : t('products.inactive')}
                </span>
              </div>
              <p className="text-lg font-semibold text-gray-900">{formatMoney(product.price, symbol, position)}</p>
              <p className="text-sm text-gray-500">
                {t('products.stock')}: {product.quantity}
              </p>
              <div className="mt-2 flex gap-2">
                <Link to={`/admin/products/${product.id}`} className="flex-1">
                  <Button variant="secondary" className="w-full">
                    {t('common.edit')}
                  </Button>
                </Link>
                <Button
                  variant="danger"
                  onClick={() => {
                    if (confirm(t('products.deleteConfirm'))) removeMutation.mutate(product.id)
                  }}
                >
                  {t('common.delete')}
                </Button>
              </div>
            </Card>
          ))}
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

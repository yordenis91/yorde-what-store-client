import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { createCoupon, deleteCoupon, listCoupons, type CouponInput, type DiscountType } from '@/services/coupons.service'
import { extractErrorMessage } from '@/services/api-client'
import { formatDate } from '@/utils/format'

interface FormValues {
  code: string
  name: string
  discountType: DiscountType
  discountValue: number
  usageLimit?: number
  expiresAt?: string
}

export function CouponsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const { data, isLoading } = useQuery({ queryKey: ['coupons'], queryFn: () => listCoupons({ page: 1, limit: 50 }) })
  const { register, handleSubmit, reset } = useForm<FormValues>({ defaultValues: { discountType: 'PERCENTAGE' } })

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      createCoupon({
        ...values,
        usageLimit: values.usageLimit || undefined,
        expiresAt: values.expiresAt || undefined,
      } as CouponInput),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['coupons'] })
      reset()
      setShowForm(false)
      toast.success(t('common.save'))
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  const removeMutation = useMutation({
    mutationFn: deleteCoupon,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['coupons'] }),
  })

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{t('coupons.title')}</h1>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? t('common.cancel') : t('coupons.new')}</Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <form
            onSubmit={(e) => void handleSubmit((values) => createMutation.mutate(values))(e)}
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          >
            <Input placeholder={t('coupons.codePlaceholder')} {...register('code', { required: true })} />
            <Input placeholder={t('coupons.namePlaceholder')} {...register('name', { required: true })} />
            <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm" {...register('discountType')}>
              <option value="PERCENTAGE">{t('coupons.percentage')}</option>
              <option value="FLAT">{t('coupons.flatAmount')}</option>
            </select>
            <Input
              placeholder={t('coupons.discountValuePlaceholder')}
              type="number"
              step="0.01"
              {...register('discountValue', { required: true, valueAsNumber: true })}
            />
            <Input placeholder={t('coupons.usageLimitPlaceholder')} type="number" {...register('usageLimit', { valueAsNumber: true })} />
            <Input placeholder={t('coupons.expiresAtPlaceholder')} type="date" {...register('expiresAt')} />
            <Button type="submit" loading={createMutation.isPending} className="sm:col-span-3 w-fit">
              {t('common.save')}
            </Button>
          </form>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">{t('coupons.code')}</th>
                <th className="px-4 py-3">{t('coupons.name')}</th>
                <th className="px-4 py-3">{t('coupons.discount')}</th>
                <th className="px-4 py-3">{t('coupons.usage')}</th>
                <th className="px-4 py-3">{t('coupons.expires')}</th>
                <th className="px-4 py-3">{t('coupons.status')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    {t('coupons.empty')}
                  </td>
                </tr>
              )}
              {data?.items.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-mono font-medium text-gray-900">{c.code}</td>
                  <td className="px-4 py-3">{c.name}</td>
                  <td className="px-4 py-3">
                    {c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `$${c.discountValue}`}
                  </td>
                  <td className="px-4 py-3">
                    {c.usageCount}
                    {c.usageLimit ? ` / ${c.usageLimit}` : ''}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{c.expiresAt ? formatDate(c.expiresAt) : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.isActive ? t('products.active') : t('products.inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="danger" onClick={() => removeMutation.mutate(c.id)}>
                      {t('common.delete')}
                    </Button>
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

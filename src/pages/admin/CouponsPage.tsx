import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PencilIcon } from '@/components/ui/icons'
import {
  createCoupon,
  deleteCoupon,
  listCoupons,
  updateCoupon,
  type Coupon,
  type CouponInput,
  type DiscountType,
} from '@/services/coupons.service'
import { extractErrorMessage } from '@/services/api-client'
import { formatDate } from '@/utils/format'

interface FormValues {
  code: string
  name: string
  discountType: DiscountType
  discountValue: number
  usageLimit?: number
  expiresAt?: string
  isActive: boolean
}

const EMPTY: FormValues = { code: '', name: '', discountType: 'PERCENTAGE', discountValue: 0, isActive: true }

export function CouponsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  // The coupon being edited; null means the form creates a new one.
  const [editing, setEditing] = useState<Coupon | null>(null)
  const { data, isLoading } = useQuery({ queryKey: ['coupons'], queryFn: () => listCoupons({ page: 1, limit: 50 }) })
  const { register, handleSubmit, reset } = useForm<FormValues>({ defaultValues: EMPTY })

  function openCreate() {
    setEditing(null)
    reset(EMPTY)
    setShowForm(true)
  }

  function openEdit(c: Coupon) {
    setEditing(c)
    reset({
      code: c.code,
      name: c.name,
      discountType: c.discountType,
      discountValue: Number(c.discountValue),
      usageLimit: c.usageLimit ?? undefined,
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : undefined,
      isActive: c.isActive,
    })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
  }

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const limit = Number.isFinite(values.usageLimit) && values.usageLimit ? values.usageLimit : undefined
      if (editing) {
        // The code is the coupon's identity (it is what customers type), so it stays fixed.
        // Emptying the limit or date sends null so it actually clears.
        return updateCoupon(editing.id, {
          name: values.name,
          discountType: values.discountType,
          discountValue: values.discountValue,
          usageLimit: limit ?? null,
          expiresAt: values.expiresAt || null,
          isActive: values.isActive,
        })
      }
      return createCoupon({
        ...values,
        usageLimit: limit,
        expiresAt: values.expiresAt || undefined,
      } as CouponInput)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['coupons'] })
      closeForm()
      toast.success(editing ? t('coupons.updated') : t('common.save'))
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
        <Button onClick={() => (showForm ? closeForm() : openCreate())}>
          {showForm ? t('common.cancel') : t('coupons.new')}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <h2 className="mb-3 font-medium text-gray-900">{editing ? t('coupons.edit') : t('coupons.new')}</h2>
          <form
            onSubmit={(e) => void handleSubmit((values) => saveMutation.mutate(values))(e)}
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          >
            <div>
              <Input
                label={t('coupons.code')}
                placeholder={t('coupons.codePlaceholder')}
                readOnly={Boolean(editing)}
                className={editing ? 'opacity-70' : ''}
                {...register('code', { required: true })}
              />
              {editing && <p className="mt-1 text-xs text-gray-500">{t('coupons.codeLocked')}</p>}
            </div>
            <Input label={t('coupons.name')} {...register('name', { required: true })} />
            <div className="flex min-w-0 flex-col gap-1">
              <label htmlFor="discountType" className="text-sm font-medium text-gray-700">
                {t('coupons.type')}
              </label>
              <select
                id="discountType"
                className="rounded-lg border border-gray-300 px-3 py-3 text-sm sm:py-2"
                {...register('discountType')}
              >
                <option value="PERCENTAGE">{t('coupons.percentage')}</option>
                <option value="FLAT">{t('coupons.flatAmount')}</option>
              </select>
            </div>
            <Input
              label={t('coupons.discountValuePlaceholder')}
              type="number"
              step="0.01"
              {...register('discountValue', { required: true, valueAsNumber: true })}
            />
            <Input label={t('coupons.usageLimitPlaceholder')} type="number" {...register('usageLimit', { valueAsNumber: true })} />
            <Input label={t('coupons.expiresAtPlaceholder')} type="date" {...register('expiresAt')} />
            {editing && (
              <label className="flex items-center gap-2 text-sm text-gray-700 sm:col-span-3">
                <input type="checkbox" {...register('isActive')} /> {t('coupons.active')}
              </label>
            )}
            <Button type="submit" loading={saveMutation.isPending} className="sm:col-span-3 w-fit">
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
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        aria-label={`${t('common.edit')} ${c.code}`}
                        title={t('common.edit')}
                        onClick={() => openEdit(c)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-brand-700"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <Button variant="danger" onClick={() => removeMutation.mutate(c.id)}>
                        {t('common.delete')}
                      </Button>
                    </div>
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

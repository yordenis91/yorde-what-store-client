import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { createPlan, deactivatePlan, listAllPlans, updatePlan, type PlanInput } from '@/services/plans.service'
import { extractErrorMessage } from '@/services/api-client'
import type { Plan } from '@/types/api'

const DURATION_KEYS: Record<Plan['duration'], string> = {
  MONTHLY: 'platformPlans.monthly',
  YEARLY: 'platformPlans.yearly',
  LIFETIME: 'platformPlans.lifetime',
}

interface FormValues {
  name: string
  price: number
  duration: Plan['duration']
  maxStores: number
  maxProducts: number
  features: string
}

export function PlatformPlansPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const { data: plans, isLoading } = useQuery({ queryKey: ['platform-plans'], queryFn: listAllPlans })
  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { duration: 'MONTHLY', maxStores: 1, maxProducts: 50, features: '' },
  })

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: PlanInput = {
        name: values.name,
        price: Number(values.price),
        duration: values.duration,
        maxStores: Number(values.maxStores),
        maxProducts: Number(values.maxProducts),
        features: values.features
          .split(',')
          .map((f) => f.trim())
          .filter(Boolean),
      }
      return editingId ? updatePlan(editingId, payload) : createPlan(payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['platform-plans'] })
      void queryClient.invalidateQueries({ queryKey: ['plans'] })
      reset()
      setShowForm(false)
      setEditingId(null)
      toast.success(t('platformPlans.saved'))
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  const deactivateMutation = useMutation({
    mutationFn: deactivatePlan,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['platform-plans'] }),
  })

  function startEdit(plan: Plan) {
    setEditingId(plan.id)
    setShowForm(true)
    reset({
      name: plan.name,
      price: Number(plan.price),
      duration: plan.duration,
      maxStores: plan.maxStores,
      maxProducts: plan.maxProducts,
      features: plan.features.join(', '),
    })
  }

  function startCreate() {
    setEditingId(null)
    reset({ name: '', price: 0, duration: 'MONTHLY', maxStores: 1, maxProducts: 50, features: '' })
    setShowForm(true)
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{t('platformPlans.title')}</h1>
        <Button onClick={() => (showForm ? setShowForm(false) : startCreate())}>
          {showForm ? t('common.cancel') : t('platformPlans.newPlan')}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <form
            onSubmit={(e) => void handleSubmit((values) => saveMutation.mutate(values))(e)}
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          >
            <Input placeholder={t('platformPlans.namePlaceholder')} {...register('name', { required: true })} />
            <Input
              placeholder={t('platformPlans.pricePlaceholder')}
              type="number"
              step="0.01"
              {...register('price', { required: true, valueAsNumber: true })}
            />
            <select
              aria-label={t('platformPlans.durationLabel')}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              {...register('duration')}
            >
              <option value="MONTHLY">{t('platformPlans.monthly')}</option>
              <option value="YEARLY">{t('platformPlans.yearly')}</option>
              <option value="LIFETIME">{t('platformPlans.lifetime')}</option>
            </select>
            <Input
              placeholder={t('platformPlans.maxStoresPlaceholder')}
              type="number"
              {...register('maxStores', { required: true, valueAsNumber: true })}
            />
            <Input
              placeholder={t('platformPlans.maxProductsPlaceholder')}
              type="number"
              {...register('maxProducts', { required: true, valueAsNumber: true })}
            />
            <Input
              placeholder={t('platformPlans.featuresPlaceholder')}
              {...register('features')}
              className="sm:col-span-3"
            />
            <Button type="submit" loading={saveMutation.isPending} className="sm:col-span-3 w-fit">
              {t('platformPlans.save')}
            </Button>
          </form>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {plans?.map((plan) => (
            <Card key={plan.id} className={!plan.isActive ? 'opacity-50' : ''}>
              <div className="mb-1 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">{plan.name}</h2>
                {!plan.isActive && <span className="text-xs text-gray-400">{t('platformPlans.inactive')}</span>}
              </div>
              <p className="text-xl font-bold text-gray-900">
                ${plan.price}{' '}
                <span className="text-sm font-normal text-gray-500">/{t(DURATION_KEYS[plan.duration]).toLowerCase()}</span>
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {plan.maxStores === -1
                  ? t('platformPlans.unlimitedStores')
                  : t('platformPlans.storesCount', { count: plan.maxStores })}{' '}
                ·{' '}
                {plan.maxProducts === -1
                  ? t('platformPlans.unlimitedProducts')
                  : t('platformPlans.productsCount', { count: plan.maxProducts })}
              </p>
              <ul className="mt-2 flex flex-col gap-0.5 text-xs text-gray-600">
                {plan.features.map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" onClick={() => startEdit(plan)} className="flex-1">
                  {t('platformPlans.edit')}
                </Button>
                {plan.isActive && (
                  <Button variant="danger" onClick={() => deactivateMutation.mutate(plan.id)}>
                    {t('platformPlans.deactivate')}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

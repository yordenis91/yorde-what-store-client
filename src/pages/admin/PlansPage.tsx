import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getCurrentSubscription, listActivePlans, subscribeToPlan } from '@/services/plans.service'
import { extractErrorMessage } from '@/services/api-client'

export function PlansPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: plans, isLoading } = useQuery({ queryKey: ['plans'], queryFn: listActivePlans })
  const { data: subscription } = useQuery({ queryKey: ['subscription'], queryFn: getCurrentSubscription })

  const mutation = useMutation({
    mutationFn: subscribeToPlan,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscription'] })
      toast.success(t('common.save'))
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  if (isLoading) return <p className="text-sm text-gray-500">{t('common.loading')}</p>

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">{t('nav.plans')}</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {plans?.map((plan) => {
          const isCurrent = subscription?.planId === plan.id
          return (
            <Card key={plan.id} className={isCurrent ? 'ring-2 ring-brand-600' : ''}>
              <h2 className="text-lg font-semibold text-gray-900">{plan.name}</h2>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                ${plan.price} <span className="text-sm font-normal text-gray-500">/{plan.duration.toLowerCase()}</span>
              </p>
              <ul className="mt-3 flex flex-col gap-1 text-sm text-gray-600">
                {plan.features.map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
              <Button
                className="mt-4 w-full"
                variant={isCurrent ? 'secondary' : 'primary'}
                disabled={isCurrent || mutation.isPending}
                onClick={() => mutation.mutate(plan.id)}
              >
                {isCurrent ? 'Current plan' : 'Subscribe'}
              </Button>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

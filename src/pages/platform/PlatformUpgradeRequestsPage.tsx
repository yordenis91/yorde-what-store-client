import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { QueryErrorState } from '@/components/ui/QueryErrorState'
import { approveUpgrade, listUpgradeRequests, rejectUpgrade } from '@/services/plans.service'
import { formatDate } from '@/utils/format'
import { extractErrorMessage } from '@/services/api-client'

export function PlatformUpgradeRequestsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const {
    data: requests,
    isLoading,
    isError,
    refetch,
  } = useQuery({ queryKey: ['upgrade-requests'], queryFn: listUpgradeRequests })

  const approveMutation = useMutation({
    mutationFn: approveUpgrade,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['upgrade-requests'] })
      toast.success(t('upgradeRequests.approved'))
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  const rejectMutation = useMutation({
    mutationFn: rejectUpgrade,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['upgrade-requests'] })
      toast.success(t('upgradeRequests.rejected'))
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })
  const busy = approveMutation.isPending || rejectMutation.isPending

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">{t('upgradeRequests.title')}</h1>

      {isLoading ? (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      ) : isError ? (
        <QueryErrorState onRetry={() => void refetch()} />
      ) : (
        <div className="flex flex-col gap-3">
          {requests?.map((req) => (
            <Card key={req.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900">{req.tenant.name}</p>
                {req.isRenewal ? (
                  <p className="text-sm text-gray-500">
                    <span className="font-medium text-brand-700">
                      {t('upgradeRequests.renewal', { plan: req.currentPlan.name })}
                    </span>
                    {req.expiresAt && ` · ${t('upgradeRequests.expires', { date: formatDate(req.expiresAt) })}`}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">
                    {req.currentPlan.name} →{' '}
                    <span className="font-medium text-brand-700">{req.requestedPlan?.name ?? '—'}</span>
                  </p>
                )}
                {req.paymentReference && (
                  <p className="text-sm text-gray-700">
                    {t('upgradeRequests.reference')}: <span className="font-mono">{req.paymentReference}</span>
                  </p>
                )}
                <p className="text-xs text-gray-400">{t('upgradeRequests.requested', { date: formatDate(req.createdAt) })}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" disabled={busy} onClick={() => rejectMutation.mutate(req.id)}>
                  {t('upgradeRequests.reject')}
                </Button>
                <Button
                  loading={approveMutation.isPending && approveMutation.variables === req.id}
                  disabled={busy}
                  onClick={() => approveMutation.mutate(req.id)}
                >
                  {t('upgradeRequests.approve')}
                </Button>
              </div>
            </Card>
          ))}
          {requests?.length === 0 && (
            <Card className="text-center text-sm text-gray-400">{t('upgradeRequests.empty')}</Card>
          )}
        </div>
      )}
    </div>
  )
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { approveUpgrade, listUpgradeRequests } from '@/services/plans.service'
import { formatDate } from '@/utils/format'
import { extractErrorMessage } from '@/services/api-client'

export function PlatformUpgradeRequestsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: requests, isLoading } = useQuery({ queryKey: ['upgrade-requests'], queryFn: listUpgradeRequests })

  const approveMutation = useMutation({
    mutationFn: approveUpgrade,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['upgrade-requests'] })
      toast.success(t('upgradeRequests.approved'))
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">{t('upgradeRequests.title')}</h1>

      {isLoading ? (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {requests?.map((req) => (
            <Card key={req.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{req.tenant.name}</p>
                <p className="text-sm text-gray-500">
                  {req.currentPlan.name} → <span className="font-medium text-brand-700">{req.requestedPlan?.name ?? '—'}</span>
                </p>
                <p className="text-xs text-gray-400">{t('upgradeRequests.requested', { date: formatDate(req.createdAt) })}</p>
              </div>
              <Button loading={approveMutation.isPending} onClick={() => approveMutation.mutate(req.id)}>
                {t('upgradeRequests.approve')}
              </Button>
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

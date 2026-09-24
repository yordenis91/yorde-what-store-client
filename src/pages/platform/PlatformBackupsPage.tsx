import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { listBackups, runBackupNow } from '@/services/platform.service'
import { extractErrorMessage } from '@/services/api-client'
import { formatDateTime } from '@/utils/format'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(1)} ${units[unit]}`
}

export function PlatformBackupsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: backups, isLoading, isError } = useQuery({ queryKey: ['platform-backups'], queryFn: listBackups })

  const runMutation = useMutation({
    mutationFn: runBackupNow,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['platform-backups'] })
      toast.success(t('backups.started'))
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  const latest = backups?.[0]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('backups.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('backups.subtitle')}</p>
        </div>
        <Button onClick={() => runMutation.mutate()} loading={runMutation.isPending}>
          {t('backups.runNow')}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      ) : isError ? (
        <Card>
          <p className="text-sm text-red-600">{t('backups.loadError')}</p>
        </Card>
      ) : !backups || backups.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-500">{t('backups.empty')}</p>
        </Card>
      ) : (
        <>
          <Card className="mb-4">
            <p className="text-sm text-gray-500">{t('backups.lastBackup')}</p>
            <p className="mt-1 text-lg font-medium text-gray-900">
              {latest ? formatDateTime(latest.lastModified) : '—'}
            </p>
          </Card>

          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500">
                  <th className="px-4 py-3 font-medium">{t('backups.key')}</th>
                  <th className="px-4 py-3 font-medium">{t('backups.size')}</th>
                  <th className="px-4 py-3 font-medium">{t('backups.date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {backups.map((backup) => (
                  <tr key={backup.key}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{backup.key}</td>
                    <td className="px-4 py-3 text-gray-700">{formatBytes(backup.sizeBytes)}</td>
                    <td className="px-4 py-3 text-gray-700">{formatDateTime(backup.lastModified)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  )
}

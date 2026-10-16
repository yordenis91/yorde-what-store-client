import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { disableTwoFactor, enableTwoFactor, setupTwoFactor } from '@/services/auth.service'
import { extractErrorMessage } from '@/services/api-client'
import { useAuthStore } from '@/store/auth.store'

const schema = z.object({ code: z.string().regex(/^\d{6}$/) })
type FormValues = z.infer<typeof schema>

interface Enrollment {
  secret: string
  qrDataUrl: string
}

/**
 * Turns the account's two-factor authentication on or off. Shared by the store admin and the platform
 * admin. Both changes end the account's other sessions on the API (a refresh token someone already
 * stole must not survive the change), but not this one.
 */
export function SecurityPage() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const setSession = useAuthStore((s) => s.setSession)
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const { register, handleSubmit, reset, formState } = useForm<FormValues>({ resolver: zodResolver(schema) })

  function markTwoFactor(enabled: boolean) {
    if (user && accessToken) setSession({ user: { ...user, twoFactorEnabled: enabled }, accessToken })
    setEnrollment(null)
    reset()
  }

  const startMutation = useMutation({
    mutationFn: setupTwoFactor,
    onSuccess: (data) => setEnrollment({ secret: data.secret, qrDataUrl: data.qrDataUrl }),
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })
  const enableMutation = useMutation({
    mutationFn: (v: FormValues) => enableTwoFactor(v.code),
    onSuccess: () => {
      markTwoFactor(true)
      toast.success(t('security.enabledToast'))
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })
  const disableMutation = useMutation({
    mutationFn: (v: FormValues) => disableTwoFactor(v.code),
    onSuccess: () => {
      markTwoFactor(false)
      toast.success(t('security.disabledToast'))
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  const enabled = user?.twoFactorEnabled ?? false
  const codeInput = (
    <Input
      label={t('security.code')}
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      error={formState.errors.code && t('security.invalidCode')}
      {...register('code')}
    />
  )

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">{t('security.title')}</h1>
      <Card>
        <h2 className="mb-1 font-medium text-gray-900">{t('security.twoFactor')}</h2>
        <p className="mb-4 text-sm text-gray-600">{enabled ? t('security.statusOn') : t('security.statusOff')}</p>

        {enabled ? (
          <form onSubmit={(e) => void handleSubmit((v) => disableMutation.mutate(v))(e)} className="flex flex-col gap-3">
            <p className="text-xs text-gray-500">{t('security.disableHint')}</p>
            {codeInput}
            <Button type="submit" variant="danger" loading={disableMutation.isPending} className="w-fit">
              {t('security.disable')}
            </Button>
          </form>
        ) : enrollment ? (
          <form onSubmit={(e) => void handleSubmit((v) => enableMutation.mutate(v))(e)} className="flex flex-col gap-3">
            <p className="text-sm text-gray-700">{t('security.scan')}</p>
            <img src={enrollment.qrDataUrl} alt="" className="h-44 w-44 rounded border border-gray-200" />
            <p className="text-xs text-gray-500">
              {t('security.manualKey')}: <code className="break-all">{enrollment.secret}</code>
            </p>
            {codeInput}
            <Button type="submit" loading={enableMutation.isPending} className="w-fit">
              {t('security.confirm')}
            </Button>
          </form>
        ) : (
          <Button onClick={() => startMutation.mutate()} loading={startMutation.isPending}>
            {t('security.enable')}
          </Button>
        )}
      </Card>
    </div>
  )
}

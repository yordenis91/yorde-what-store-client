import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { verifyTwoFactor } from '@/services/auth.service'
import { getMyTenants } from '@/services/tenants.service'
import { useAuthStore } from '@/store/auth.store'
import { extractErrorMessage } from '@/services/api-client'

const schema = z.object({ code: z.string().length(6) })
type FormValues = z.infer<typeof schema>

export function TwoFactorPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const challengeToken = (location.state as { challengeToken?: string } | null)?.challengeToken
  const setSession = useAuthStore((s) => s.setSession)
  const setTenants = useAuthStore((s) => s.setTenants)
  const setActiveTenant = useAuthStore((s) => s.setActiveTenant)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!challengeToken) navigate('/login', { replace: true })
  }, [challengeToken, navigate])

  if (!challengeToken) return null

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      const result = await verifyTwoFactor(challengeToken!, values.code)
      setSession(result)
      const tenants = await getMyTenants()
      setTenants(tenants)
      if (tenants.length > 0) setActiveTenant(tenants[0])
      navigate('/admin')
    } catch (error) {
      toast.error(extractErrorMessage(error, t('errors.generic')))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{t('auth.twoFactorTitle')}</h1>
      <Input
        label={t('auth.twoFactorCode')}
        inputMode="numeric"
        maxLength={6}
        {...register('code')}
        error={errors.code?.message}
      />
      <Button type="submit" loading={loading}>
        {t('auth.twoFactorSubmit')}
      </Button>
    </form>
  )
}

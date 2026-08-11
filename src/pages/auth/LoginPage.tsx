import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { login } from '@/services/auth.service'
import { getMyTenants } from '@/services/tenants.service'
import { useAuthStore } from '@/store/auth.store'
import { extractErrorMessage } from '@/services/api-client'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const setTenants = useAuthStore((s) => s.setTenants)
  const setActiveTenant = useAuthStore((s) => s.setActiveTenant)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      const result = await login(values)
      if ('requiresTwoFactor' in result) {
        navigate('/2fa', { state: { challengeToken: result.challengeToken } })
        return
      }
      setSession(result)
      const tenants = await getMyTenants()
      setTenants(tenants)
      if (tenants.length > 0) setActiveTenant(tenants[0])
      navigate('/admin')
    } catch (error) {
      toast.error(extractErrorMessage(error, t('auth.invalidCredentials')))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{t('auth.loginTitle')}</h1>
      <Input label={t('auth.email')} type="email" autoComplete="email" {...register('email')} error={errors.email?.message} />
      <Input
        label={t('auth.password')}
        type="password"
        autoComplete="current-password"
        {...register('password')}
        error={errors.password?.message}
      />
      <Button type="submit" loading={loading} className="mt-2">
        {t('auth.submitLogin')}
      </Button>
      <p className="text-center text-sm text-gray-500">
        {t('auth.noAccount')}{' '}
        <Link to="/register" className="font-medium text-brand-700">
          {t('nav.register')}
        </Link>
      </p>
    </form>
  )
}

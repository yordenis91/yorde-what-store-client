import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { forgotPassword, login, resetPassword } from '@/services/auth.service'
import { getMyTenants } from '@/services/tenants.service'
import { useAuthStore } from '@/store/auth.store'
import { extractErrorMessage } from '@/services/api-client'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
const forgotSchema = z.object({ email: z.string().email() })
const resetSchema = z.object({ password: z.string().min(8) })

type LoginValues = z.infer<typeof loginSchema>
type ForgotValues = z.infer<typeof forgotSchema>
type ResetValues = z.infer<typeof resetSchema>

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const setTenants = useAuthStore((s) => s.setTenants)
  const setActiveTenant = useAuthStore((s) => s.setActiveTenant)
  const [searchParams] = useSearchParams()
  const resetToken = searchParams.get('token')
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>(resetToken ? 'reset' : 'login')
  const [loading, setLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })
  const forgotForm = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema) })
  const resetForm = useForm<ResetValues>({ resolver: zodResolver(resetSchema) })

  async function onLogin(values: LoginValues) {
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

  async function onForgot(values: ForgotValues) {
    setLoading(true)
    try {
      await forgotPassword(values.email)
      setForgotSent(true)
    } catch (error) {
      toast.error(extractErrorMessage(error, t('errors.generic')))
    } finally {
      setLoading(false)
    }
  }

  async function onReset(values: ResetValues) {
    if (!resetToken) return
    setLoading(true)
    try {
      await resetPassword(resetToken, values.password)
      setResetDone(true)
    } catch (error) {
      toast.error(extractErrorMessage(error, t('errors.generic')))
    } finally {
      setLoading(false)
    }
  }

  if (mode === 'forgot') {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold text-gray-900">{t('auth.forgotPassword')}</h1>
        {forgotSent ? (
          <p className="text-sm text-gray-600">{t('auth.forgotPasswordSent')}</p>
        ) : (
          <form onSubmit={(e) => void forgotForm.handleSubmit(onForgot)(e)} className="flex flex-col gap-4">
            <Input
              label={t('auth.email')}
              type="email"
              autoComplete="email"
              {...forgotForm.register('email')}
              error={forgotForm.formState.errors.email?.message}
            />
            <Button type="submit" loading={loading}>
              {t('auth.sendResetLink')}
            </Button>
          </form>
        )}
        <button type="button" onClick={() => setMode('login')} className="text-center text-sm text-brand-700">
          {t('common.back')}
        </button>
      </div>
    )
  }

  if (mode === 'reset') {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold text-gray-900">{t('auth.resetPassword')}</h1>
        {resetDone ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600">{t('auth.resetPasswordDone')}</p>
            <Button
              type="button"
              onClick={() => {
                setResetDone(false)
                setMode('login')
              }}
            >
              {t('auth.submitLogin')}
            </Button>
          </div>
        ) : (
          <form onSubmit={(e) => void resetForm.handleSubmit(onReset)(e)} className="flex flex-col gap-4">
            <Input
              label={t('auth.newPassword')}
              type="password"
              autoComplete="new-password"
              {...resetForm.register('password')}
              error={resetForm.formState.errors.password && t('auth.passwordTooShort')}
            />
            <Button type="submit" loading={loading}>
              {t('auth.resetPassword')}
            </Button>
          </form>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={(e) => void loginForm.handleSubmit(onLogin)(e)} className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{t('auth.loginTitle')}</h1>
      <Input
        label={t('auth.email')}
        type="email"
        autoComplete="email"
        {...loginForm.register('email')}
        error={loginForm.formState.errors.email?.message}
      />
      <Input
        label={t('auth.password')}
        type="password"
        autoComplete="current-password"
        {...loginForm.register('password')}
        error={loginForm.formState.errors.password?.message}
      />
      <button
        type="button"
        onClick={() => setMode('forgot')}
        className="self-end text-xs font-medium text-brand-700 hover:underline"
      >
        {t('auth.forgotPassword')}
      </button>
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

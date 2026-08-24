import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Seo } from '@/components/storefront/Seo'
import { useStorefront } from '@/hooks/useStorefront'
import { useCustomerStore } from '@/store/customer.store'
import {
  loginCustomer,
  registerCustomer,
  forgotCustomerPassword,
  resetCustomerPassword,
} from '@/services/customers.service'
import { extractErrorMessage } from '@/services/api-client'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
})

const resetSchema = z.object({
  password: z.string().min(8),
})

type LoginValues = z.infer<typeof loginSchema>
type RegisterValues = z.infer<typeof registerSchema>
type ResetValues = z.infer<typeof resetSchema>

export function StorefrontLoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { tenant, path } = useStorefront()
  const setSession = useCustomerStore((s) => s.setSession)
  const [searchParams] = useSearchParams()
  const resetToken = searchParams.get('token')
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>(resetToken ? 'reset' : 'login')
  const [loading, setLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })
  const registerForm = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) })
  const forgotForm = useForm<{ email: string }>({ resolver: zodResolver(z.object({ email: z.string().email() })) })
  const resetForm = useForm<ResetValues>({ resolver: zodResolver(resetSchema) })

  async function onLogin(values: LoginValues) {
    setLoading(true)
    try {
      const session = await loginCustomer(values)
      setSession(session)
      navigate(path('/account'))
    } catch (error) {
      toast.error(extractErrorMessage(error, t('account.invalidCredentials')))
    } finally {
      setLoading(false)
    }
  }

  async function onRegister(values: RegisterValues) {
    setLoading(true)
    try {
      const session = await registerCustomer(values)
      setSession(session)
      navigate(path('/account'))
    } catch (error) {
      toast.error(extractErrorMessage(error, t('errors.generic')))
    } finally {
      setLoading(false)
    }
  }

  async function onForgot(values: { email: string }) {
    setLoading(true)
    try {
      await forgotCustomerPassword(values.email)
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
      await resetCustomerPassword(resetToken, values.password)
      setResetDone(true)
    } catch (error) {
      toast.error(extractErrorMessage(error, t('errors.generic')))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm py-8">
      <Seo title={`${t('account.signIn')} — ${tenant.name}`} noIndex />
      <h1 className="mb-6 text-xl font-semibold text-gray-900">
        {mode === 'register'
          ? t('account.createAccount')
          : mode === 'forgot'
            ? t('account.forgotPassword')
            : mode === 'reset'
              ? t('account.resetPassword')
              : t('account.signIn')}
      </h1>

      {mode === 'login' && (
        <form onSubmit={(e) => void loginForm.handleSubmit(onLogin)(e)} className="flex flex-col gap-4">
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
            {t('account.forgotPassword')}
          </button>
          <Button type="submit" loading={loading}>
            {t('account.signIn')}
          </Button>
          <p className="text-center text-sm text-gray-500">
            {t('account.noAccount')}{' '}
            <button type="button" onClick={() => setMode('register')} className="font-medium text-brand-700">
              {t('account.createAccount')}
            </button>
          </p>
        </form>
      )}

      {mode === 'register' && (
        <form onSubmit={(e) => void registerForm.handleSubmit(onRegister)(e)} className="flex flex-col gap-4">
          <Input label={t('auth.name')} {...registerForm.register('name')} error={registerForm.formState.errors.name?.message} />
          <Input
            label={t('auth.email')}
            type="email"
            autoComplete="email"
            {...registerForm.register('email')}
            error={registerForm.formState.errors.email?.message}
          />
          <Input
            label={t('auth.password')}
            type="password"
            autoComplete="new-password"
            {...registerForm.register('password')}
            error={registerForm.formState.errors.password?.message}
          />
          <Button type="submit" loading={loading}>
            {t('account.createAccount')}
          </Button>
          <p className="text-center text-sm text-gray-500">
            <button type="button" onClick={() => setMode('login')} className="font-medium text-brand-700">
              {t('account.haveAccount')}
            </button>
          </p>
        </form>
      )}

      {mode === 'forgot' &&
        (forgotSent ? (
          <p className="text-sm text-gray-600">{t('account.forgotPasswordSent')}</p>
        ) : (
          <form onSubmit={(e) => void forgotForm.handleSubmit(onForgot)(e)} className="flex flex-col gap-4">
            <Input
              label={t('auth.email')}
              type="email"
              {...forgotForm.register('email')}
              error={forgotForm.formState.errors.email?.message}
            />
            <Button type="submit" loading={loading}>
              {t('account.sendResetLink')}
            </Button>
            <button type="button" onClick={() => setMode('login')} className="text-center text-sm text-brand-700">
              {t('common.back')}
            </button>
          </form>
        ))}

      {mode === 'reset' &&
        (resetDone ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600">{t('account.resetPasswordDone')}</p>
            <Button
              type="button"
              onClick={() => {
                setResetDone(false)
                setMode('login')
              }}
            >
              {t('account.signIn')}
            </Button>
          </div>
        ) : (
          <form onSubmit={(e) => void resetForm.handleSubmit(onReset)(e)} className="flex flex-col gap-4">
            <Input
              label={t('account.newPassword')}
              type="password"
              autoComplete="new-password"
              {...resetForm.register('password')}
              error={resetForm.formState.errors.password && t('account.passwordTooShort')}
            />
            <Button type="submit" loading={loading}>
              {t('account.resetPassword')}
            </Button>
          </form>
        ))}
    </div>
  )
}

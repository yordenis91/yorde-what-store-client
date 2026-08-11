import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { register as registerAccount } from '@/services/auth.service'
import { useAuthStore } from '@/store/auth.store'
import { extractErrorMessage } from '@/services/api-client'
import { slugify } from '@/utils/format'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  storeName: z.string().min(2),
  storeSlug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'lowercase letters, numbers and dashes only'),
})
type FormValues = z.infer<typeof schema>

export function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const setTenants = useAuthStore((s) => s.setTenants)
  const setActiveTenant = useAuthStore((s) => s.setActiveTenant)
  const [loading, setLoading] = useState(false)

  const {
    register: registerField,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const storeName = watch('storeName')

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      const result = await registerAccount(values)
      setSession(result)
      setTenants([result.tenant])
      setActiveTenant(result.tenant)
      navigate('/admin')
    } catch (error) {
      toast.error(extractErrorMessage(error, t('errors.generic')))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{t('auth.registerTitle')}</h1>
      <Input label={t('auth.name')} {...registerField('name')} error={errors.name?.message} />
      <Input label={t('auth.email')} type="email" {...registerField('email')} error={errors.email?.message} />
      <Input
        label={t('auth.password')}
        type="password"
        {...registerField('password')}
        error={errors.password?.message}
      />
      <Input
        label={t('auth.storeName')}
        {...registerField('storeName')}
        onChange={(e) => {
          setValue('storeName', e.target.value)
          setValue('storeSlug', slugify(e.target.value))
        }}
        error={errors.storeName?.message}
      />
      <Input
        label={t('auth.storeSlug')}
        {...registerField('storeSlug')}
        value={watch('storeSlug') ?? (storeName ? slugify(storeName) : '')}
        onChange={(e) => setValue('storeSlug', slugify(e.target.value))}
        error={errors.storeSlug?.message}
      />
      <Button type="submit" loading={loading} className="mt-2">
        {t('auth.submitRegister')}
      </Button>
      <p className="text-center text-sm text-gray-500">
        {t('auth.hasAccount')}{' '}
        <Link to="/login" className="font-medium text-brand-700">
          {t('nav.login')}
        </Link>
      </p>
    </form>
  )
}

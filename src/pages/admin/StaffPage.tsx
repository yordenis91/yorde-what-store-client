import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { inviteStaff, listMembers, removeMember } from '@/services/users.service'
import { extractErrorMessage } from '@/services/api-client'

interface FormValues {
  email: string
  name: string
  temporaryPassword: string
}

export function StaffPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: members, isLoading } = useQuery({ queryKey: ['members'], queryFn: listMembers })
  const { register, handleSubmit, reset } = useForm<FormValues>()

  const inviteMutation = useMutation({
    mutationFn: (values: FormValues) => inviteStaff(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['members'] })
      reset()
      toast.success(t('common.save'))
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  const removeMutation = useMutation({
    mutationFn: removeMember,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['members'] }),
  })

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">{t('nav.staff')}</h1>

      <Card className="mb-6">
        <h2 className="mb-3 font-medium text-gray-900">{t('products.new')}</h2>
        <form
          onSubmit={(e) => void handleSubmit((values) => inviteMutation.mutate(values))(e)}
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          <Input placeholder={t('auth.name')} {...register('name', { required: true })} />
          <Input placeholder={t('auth.email')} type="email" {...register('email', { required: true })} />
          <Input placeholder={t('auth.password')} {...register('temporaryPassword', { required: true, minLength: 8 })} />
          <Button type="submit" loading={inviteMutation.isPending} className="sm:col-span-3 w-fit">
            {t('common.save')}
          </Button>
        </form>
      </Card>

      {isLoading ? (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      ) : (
        <div className="flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          {members?.map((member) => (
            <div key={member.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{member.user.name}</p>
                <p className="text-xs text-gray-500">
                  {member.user.email} — {member.role}
                </p>
              </div>
              {member.role !== 'OWNER' && (
                <Button variant="danger" onClick={() => removeMutation.mutate(member.id)}>
                  {t('common.delete')}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

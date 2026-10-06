import { useRef, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { getCurrentEntitlements } from '@/services/plans.service'
import { extractErrorMessage, resolveMediaUrl } from '@/services/api-client'
import { uploadImage, type UploadImageType } from '@/services/uploads.service'
import type { FulfillmentMethod } from '@/types/api'
import { useCanEditSettings } from './hooks'

/** Wraps a section's fields so a collaborator sees them but cannot edit them. */
export function SectionFieldset({ children }: { children: ReactNode }) {
  const canEdit = useCanEditSettings()
  return (
    <fieldset disabled={!canEdit} className="m-0 flex min-w-0 flex-col gap-6 border-0 p-0">
      {children}
    </fieldset>
  )
}

export function SaveButton({ loading }: { loading: boolean }) {
  const { t } = useTranslation()
  const canEdit = useCanEditSettings()
  if (!canEdit) return null
  return (
    <Button type="submit" loading={loading} className="w-fit">
      {t('settings.save')}
    </Button>
  )
}

export function SectionCard({ title, hint, children }: { title?: string; hint?: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-4">
      {(title || hint) && (
        <div>
          {title && <h3 className="font-medium text-gray-900">{title}</h3>}
          {hint && <p className={`${title ? 'mt-1 ' : ''}text-xs text-gray-500`}>{hint}</p>}
        </div>
      )}
      {children}
    </Card>
  )
}

/**
 * The API refuses to switch on a channel the plan doesn't include; this says
 * so up front instead of only through the error toast on save.
 */
export function PlanLockedNotice({ method }: { method: FulfillmentMethod }) {
  const { t } = useTranslation()
  const { data: entitlements } = useQuery({
    queryKey: ['plan-entitlements'],
    queryFn: getCurrentEntitlements,
  })
  if (!entitlements || entitlements.fulfillmentMethods.includes(method)) return null
  return (
    <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
      {t('settings.channelNotInPlan')}{' '}
      <Link to="/admin/plans" className="font-medium underline">
        {t('settings.upgradePlan')}
      </Link>
    </p>
  )
}

/** Upload-or-clear field for a single stored image, with a live preview. */
export function ImageField({
  label,
  hint,
  value,
  onChange,
  previewClassName,
  uploadType,
}: {
  label: string
  hint: string
  value: string | null | undefined
  onChange: (url: string | null) => void
  previewClassName: string
  uploadType?: UploadImageType
}) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      onChange(await uploadImage(file, uploadType))
    } catch (error) {
      toast.error(extractErrorMessage(error, t('errors.generic')))
    } finally {
      setUploading(false)
      // Clear it so re-picking the same file still fires a change event.
      event.target.value = ''
    }
  }

  return (
    <div>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <p className="mt-0.5 text-xs text-gray-500">{hint}</p>
      {/*
        Stacked rather than side-by-side: the banner preview's own className
        sets width: 100% (it needs to show the actual wide aspect ratio), and
        a flex row with a 100%-wide, non-shrinking sibling pushes the upload
        button completely off the right edge instead of wrapping it.
      */}
      <div className="mt-2 flex flex-col items-start gap-3">
        <div className={`shrink-0 overflow-hidden border border-gray-200 bg-gray-50 ${previewClassName}`}>
          {value && <img src={resolveMediaUrl(value)} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="flex flex-col gap-2">
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void handleFile(e)} />
          <Button type="button" variant="secondary" loading={uploading} onClick={() => inputRef.current?.click()}>
            {t('settings.upload')}
          </Button>
          {value && (
            <button type="button" onClick={() => onChange(null)} className="text-xs text-gray-500 hover:text-red-600">
              {t('settings.remove')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

interface NotFoundProps {
  title: string
  body: string
  actionLabel: string
  actionTo: string
}

/** Shared 404 body, so an unknown route and an unknown store slug look alike. */
export function NotFound({ title, body, actionLabel, actionTo }: NotFoundProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-5xl font-bold text-gray-200">404</p>
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      <p className="max-w-sm text-sm text-gray-500">{body}</p>
      <Link
        to={actionTo}
        className="mt-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
      >
        {actionLabel}
      </Link>
    </div>
  )
}

export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <NotFound
      title={t('errors.notFoundTitle')}
      body={t('errors.notFoundBody')}
      actionLabel={t('errors.goHome')}
      actionTo="/"
    />
  )
}

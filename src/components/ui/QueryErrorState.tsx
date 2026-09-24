import { useTranslation } from 'react-i18next'
import { Card } from './Card'
import { Button } from './Button'

interface QueryErrorStateProps {
  onRetry: () => void
  className?: string
}

/**
 * A failed list query and an empty one used to render identically — an
 * empty <tbody>, indistinguishable from "no results" or a load that never
 * finishes. Every list page should check `isError` before falling through
 * to its own empty state.
 */
export function QueryErrorState({ onRetry, className = '' }: QueryErrorStateProps) {
  const { t } = useTranslation()
  return (
    <Card className={`flex flex-col items-center gap-3 py-8 text-center ${className}`}>
      <p className="text-sm text-red-600">{t('common.loadError')}</p>
      <Button variant="secondary" onClick={onRetry}>
        {t('common.retry')}
      </Button>
    </Card>
  )
}

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'

/**
 * A deploy replaces the content-hashed chunks the running tab still points at,
 * so any tab open across a release gets a load failure the first time it hits a
 * lazy route. That is not a crash — a reload fixes it — so it gets its own copy.
 */
const STALE_CHUNK_PATTERN =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading chunk \d+ failed/i

function ErrorFallback({ isStaleChunk }: { isStaleChunk: boolean }) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold text-gray-900">
        {isStaleChunk ? t('errors.staleVersionTitle') : t('errors.boundaryTitle')}
      </h1>
      <p className="max-w-sm text-sm text-gray-500">
        {isStaleChunk ? t('errors.staleVersionBody') : t('errors.boundaryBody')}
      </p>
      <Button onClick={() => window.location.reload()}>{t('errors.reload')}</Button>
    </div>
  )
}

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Catches render-time errors that would otherwise leave a blank page. Event
 * handler and async rejections do not reach here — those surface through the
 * toast in each page's own catch.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return <ErrorFallback isStaleChunk={STALE_CHUNK_PATTERN.test(error.message)} />
  }
}

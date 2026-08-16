import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon } from '@/components/ui/icons'

interface BackLinkProps {
  /** Where to go when there is no in-app history to return to. */
  fallbackTo: string
  label: string
  className?: string
}

/**
 * Goes back one entry when the customer reached this page from inside the store,
 * and to `fallbackTo` when they didn't.
 *
 * The distinction matters here: storefront links get shared over WhatsApp, so a
 * product page is often the first page of the session. A plain `navigate(-1)`
 * would drop the customer outside the store entirely. React Router tracks its
 * position in the history stack as `idx`, which is 0 on the entry page.
 */
export function BackLink({ fallbackTo, label, className = '' }: BackLinkProps) {
  const navigate = useNavigate()
  const historyIndex = (window.history.state as { idx?: number } | null)?.idx ?? 0

  return (
    <button
      type="button"
      onClick={() => (historyIndex > 0 ? navigate(-1) : navigate(fallbackTo))}
      className={`inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-brand-700 ${className}`}
    >
      <ArrowLeftIcon className="h-4 w-4" />
      {label}
    </button>
  )
}

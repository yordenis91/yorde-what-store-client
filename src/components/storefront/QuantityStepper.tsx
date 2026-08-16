import { useTranslation } from 'react-i18next'
import { MinusIcon, PlusIcon } from '@/components/ui/icons'

interface QuantityStepperProps {
  value: number
  onChange: (value: number) => void
  /** Upper bound, normally the product's stock. Omit when stock isn't tracked. */
  max?: number
  min?: number
  size?: 'sm' | 'md'
  className?: string
}

/** Shared by the product grid, the product page and the cart lines. */
export function QuantityStepper({
  value,
  onChange,
  max = Infinity,
  min = 1,
  size = 'sm',
  className = '',
}: QuantityStepperProps) {
  const { t } = useTranslation()
  const button = size === 'md' ? 'h-9 w-9' : 'h-7 w-7'
  const icon = size === 'md' ? 'h-4.5 w-4.5' : 'h-4 w-4'

  return (
    <div className={`flex items-center justify-between rounded-lg border border-gray-200 p-1 ${className}`}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={t('storefront.decreaseQuantity')}
        className={`flex ${button} items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
      >
        <MinusIcon className={icon} />
      </button>
      <span className="min-w-6 text-center text-sm font-medium tabular-nums text-gray-900">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={t('storefront.increaseQuantity')}
        className={`flex ${button} items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
      >
        <PlusIcon className={icon} />
      </button>
    </div>
  )
}

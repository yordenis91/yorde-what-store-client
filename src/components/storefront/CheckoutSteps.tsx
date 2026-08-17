import { CheckIcon } from '@/components/ui/icons'

interface CheckoutStepsProps {
  steps: string[]
  current: number
  /** Lets the customer jump back to a step they already completed. */
  onGoTo: (index: number) => void
}

export function CheckoutSteps({ steps, current, onGoTo }: CheckoutStepsProps) {
  return (
    <ol className="flex items-center gap-2">
      {steps.map((label, index) => {
        const done = index < current
        const active = index === current

        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => done && onGoTo(index)}
              disabled={!done}
              aria-current={active ? 'step' : undefined}
              className={`flex items-center gap-2 ${done ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  done
                    ? 'bg-brand-600 text-white'
                    : active
                      ? 'bg-brand-600 text-white ring-4 ring-brand-100'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {done ? <CheckIcon className="h-4 w-4" /> : index + 1}
              </span>
              <span
                className={`text-sm ${active ? 'inline' : 'hidden sm:inline'} ${
                  active ? 'font-semibold text-gray-900' : done ? 'font-medium text-gray-600' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </button>
            {index < steps.length - 1 && (
              <span className={`h-px flex-1 ${done ? 'bg-brand-600' : 'bg-gray-200'}`} />
            )}
          </li>
        )
      })}
    </ol>
  )
}

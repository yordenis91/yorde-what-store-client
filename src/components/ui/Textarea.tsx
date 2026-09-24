import { type TextareaHTMLAttributes, forwardRef } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  containerClassName?: string
}

/** Same label/id wiring as Input — a visible <label> with no htmlFor announces nothing to a screen reader. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', containerClassName = '', id, ...props }, ref) => {
    const textareaId = id ?? props.name
    return (
      <div className={`flex min-w-0 flex-col gap-1 ${containerClassName}`}>
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${
            error ? 'border-red-400' : 'border-gray-300'
          } ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    )
  },
)
Textarea.displayName = 'Textarea'

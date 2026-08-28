import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id ?? props.name
    return (
      // `className` belongs here, not on the <input>: this div is the element
      // callers actually lay out (as a flex/grid item — `flex-1`, `col-span-2`,
      // `w-40`, …), so a sizing class landing on the nested <input> instead
      // would have no effect on its parent's layout.
      <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-lg border px-3 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 sm:py-2 ${
            error ? 'border-red-400' : 'border-gray-300'
          }`}
          {...props}
        />
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    )
  },
)
Input.displayName = 'Input'

export function Spinner({ className = 'h-6 w-6' }: { className?: string }) {
  return <span className={`inline-block animate-spin rounded-full border-2 border-brand-600 border-t-transparent ${className}`} />
}

export function FullPageSpinner() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Spinner className="h-10 w-10" />
    </div>
  )
}

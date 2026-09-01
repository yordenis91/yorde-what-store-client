import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface LegalLayoutProps {
  title: string
  lastUpdated: string
  children: ReactNode
}

/** Shared chrome for standalone legal pages (Terms, Privacy) — not part of the admin or storefront layouts. */
export function LegalLayout({ title, lastUpdated, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <article className="mx-auto max-w-3xl rounded-xl bg-white p-6 shadow-sm sm:p-10">
        <Link to="/" className="text-sm font-medium text-brand-700 hover:text-brand-800">
          ← Yorde What Store
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">Last updated: {lastUpdated}</p>
        <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-gray-700 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-gray-900 [&_li]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1">
          {children}
        </div>
      </article>
    </div>
  )
}

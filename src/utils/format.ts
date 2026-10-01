export function formatMoney(value: string | number, symbol = '$', position: 'pre' | 'post' = 'pre'): string {
  const num = typeof value === 'string' ? Number(value) : value
  const formatted = num.toFixed(2)
  return position === 'pre' ? `${symbol}${formatted}` : `${formatted}${symbol}`
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Includes time-of-day — for logs/timelines where several events can land on the same day. */
export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const DIACRITICS_RANGE = new RegExp('[\\u0300-\\u036f]', 'g')

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS_RANGE, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** Whole-number percent off, or null when there is no real discount (missing, equal or lower "before" price). */
export function discountPercent(price: string | number, compareAt: string | number | null | undefined): number | null {
  const now = Number(price)
  const before = Number(compareAt)
  if (!compareAt || !(before > now) || !(before > 0)) return null
  return Math.round(((before - now) / before) * 100)
}

const STORAGE_KEY = 'yws_session_id'

/**
 * Anonymous, per-browser identifier used only to dedupe visits/orders into
 * "one shopper" for conversion metrics — no PII, no cookies, never sent
 * anywhere but our own backend. Falls back to undefined (rather than throwing)
 * when storage or crypto.randomUUID are unavailable (private-mode edge cases,
 * very old browsers): analytics must never block a pageview or a purchase.
 */
export function getAnalyticsSessionId(): string | undefined {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    window.localStorage.setItem(STORAGE_KEY, id)
    return id
  } catch {
    return undefined
  }
}

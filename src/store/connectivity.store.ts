import { create } from 'zustand'
import { runtimeValue } from '@/config/runtime'

// Resolved independently from api-client.ts's own API_URL (same source
// values) to avoid a circular import — api-client.ts calls into this store
// on every response, so this store cannot import api-client.ts back.
const HEALTH_URL = `${runtimeValue('apiUrl') ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'}/health`

interface ConnectivityState {
  /** Native browser signal — no network interface at all (e.g. airplane mode). */
  isOnline: boolean
  /** A real API call failed with no response (server unreachable, DNS, timeout) — distinct from a 4xx/5xx, which means the server IS reachable. */
  isDegraded: boolean
  reportFailure: () => void
  reportRecovered: () => void
}

const BACKOFF_STEPS_MS = [3000, 6000, 12000, 30000]

let recoveryTimer: ReturnType<typeof setTimeout> | null = null
let backoffIndex = 0

async function pingHealth(): Promise<boolean> {
  try {
    const res = await fetch(HEALTH_URL, { cache: 'no-store' })
    return res.ok
  } catch {
    return false
  }
}

function scheduleRecoveryCheck() {
  const delay = BACKOFF_STEPS_MS[Math.min(backoffIndex, BACKOFF_STEPS_MS.length - 1)]
  recoveryTimer = setTimeout(async () => {
    const ok = await pingHealth()
    if (ok) {
      useConnectivityStore.getState().reportRecovered()
    } else {
      backoffIndex += 1
      scheduleRecoveryCheck()
    }
  }, delay)
}

/**
 * A failed request only starts the recovery-check loop; it never retries the
 * request itself (auto-resubmitting a checkout would risk a double order).
 * The banner this feeds is purely informational — the user decides when to
 * try their own action again.
 */
export const useConnectivityStore = create<ConnectivityState>((set, get) => ({
  isOnline: typeof navigator === 'undefined' || navigator.onLine,
  isDegraded: false,

  reportFailure: () => {
    if (get().isDegraded) return
    set({ isDegraded: true })
    backoffIndex = 0
    scheduleRecoveryCheck()
  },

  reportRecovered: () => {
    if (recoveryTimer) {
      clearTimeout(recoveryTimer)
      recoveryTimer = null
    }
    backoffIndex = 0
    if (get().isDegraded) set({ isDegraded: false })
  },
}))

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => useConnectivityStore.setState({ isOnline: true }))
  window.addEventListener('offline', () => useConnectivityStore.setState({ isOnline: false }))
}

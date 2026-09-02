const MUTE_STORAGE_KEY = 'yws_notifications_muted'
const MIN_INTERVAL_MS = 1500

let audioContext: AudioContext | null = null
let lastPlayedAt = 0

function getAudioContext(): AudioContext | null {
  if (audioContext) return audioContext
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  audioContext = new Ctor()
  return audioContext
}

/**
 * Chrome/Safari suspend a freshly created AudioContext until a real user
 * gesture resumes it — call this from any click/keydown handler on the page
 * so the *next* notification chime has the best chance of being audible.
 * Safe to call repeatedly; a no-op once already running.
 */
export function unlockNotificationSound() {
  const ctx = getAudioContext()
  if (ctx?.state === 'suspended') void ctx.resume()
}

export function isNotificationSoundMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function setNotificationSoundMuted(muted: boolean) {
  try {
    window.localStorage.setItem(MUTE_STORAGE_KEY, muted ? '1' : '0')
  } catch {
    // Best-effort only — the toggle just won't persist across reloads.
  }
}

function tone(ctx: AudioContext, frequency: number, startTime: number, duration: number) {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  // Quick fade in/out avoids the audible "click" a hard on/off would produce.
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(0.2, startTime + 0.01)
  gain.gain.linearRampToValueAtTime(0, startTime + duration)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(startTime)
  oscillator.stop(startTime + duration)
}

/**
 * Short two-note "ding" for a new order — synthesized rather than a bundled
 * audio file, so there's no asset to fetch or ship. Throttled so a burst of
 * several orders arriving together doesn't sound like a machine gun; muted
 * or blocked-by-autoplay-policy failures are silent no-ops, never thrown.
 */
export function playNewOrderChime() {
  if (isNotificationSoundMuted()) return
  const now = Date.now()
  if (now - lastPlayedAt < MIN_INTERVAL_MS) return
  lastPlayedAt = now

  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const t0 = ctx.currentTime
    tone(ctx, 880, t0, 0.12)
    tone(ctx, 1318.5, t0 + 0.1, 0.18)
  } catch {
    // Never let a notification sound break the notification itself.
  }
}

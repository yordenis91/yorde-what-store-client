import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

class FakeGain {
  gain = {
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  }
  connect = vi.fn()
}

class FakeOscillator {
  type = ''
  frequency = { value: 0 }
  connect = vi.fn()
  start = vi.fn()
  stop = vi.fn()
}

class FakeAudioContext {
  state: 'running' | 'suspended' = 'running'
  currentTime = 0
  resume = vi.fn(() => {
    this.state = 'running'
    return Promise.resolve()
  })
  createOscillator = vi.fn(() => new FakeOscillator())
  createGain = vi.fn(() => new FakeGain())
  destination = {}
}

describe('notification-sound', () => {
  let ctxInstances: FakeAudioContext[]

  beforeEach(async () => {
    vi.resetModules()
    localStorage.clear()
    ctxInstances = []
    // A plain class, not vi.fn(() => ...) — arrow functions can't be used
    // with `new`, which the module under test does to construct one.
    // @ts-expect-error test double, not a real AudioContext
    window.AudioContext = class extends FakeAudioContext {
      constructor() {
        super()
        ctxInstances.push(this)
      }
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('plays two tones through a lazily created, reused AudioContext', async () => {
    const { playNewOrderChime } = await import('./notification-sound')
    playNewOrderChime()

    expect(ctxInstances).toHaveLength(1)
    expect(ctxInstances[0].createOscillator).toHaveBeenCalledTimes(2)
  })

  it('throttles rapid successive chimes so a burst of orders does not sound like a machine gun', async () => {
    vi.useFakeTimers()
    const { playNewOrderChime } = await import('./notification-sound')

    playNewOrderChime()
    playNewOrderChime()
    expect(ctxInstances[0].createOscillator).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(2000)
    playNewOrderChime()
    expect(ctxInstances[0].createOscillator).toHaveBeenCalledTimes(4)
  })

  it('stays silent (without throwing) once muted', async () => {
    const { playNewOrderChime, setNotificationSoundMuted } = await import('./notification-sound')
    setNotificationSoundMuted(true)

    expect(() => playNewOrderChime()).not.toThrow()
    expect(ctxInstances).toHaveLength(0)
  })

  it('persists the mute preference across reads', async () => {
    const { isNotificationSoundMuted, setNotificationSoundMuted } = await import('./notification-sound')

    expect(isNotificationSoundMuted()).toBe(false)
    setNotificationSoundMuted(true)
    expect(isNotificationSoundMuted()).toBe(true)
    setNotificationSoundMuted(false)
    expect(isNotificationSoundMuted()).toBe(false)
  })

  it('resumes a suspended context on unlock, e.g. from a user gesture', async () => {
    const { playNewOrderChime, unlockNotificationSound } = await import('./notification-sound')
    playNewOrderChime()
    ctxInstances[0].state = 'suspended'

    unlockNotificationSound()

    expect(ctxInstances[0].resume).toHaveBeenCalled()
  })
})

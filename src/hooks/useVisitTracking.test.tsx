import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom'
import { useVisitTracking } from './useVisitTracking'

const logVisit = vi.fn()
vi.mock('@/services/visits.service', () => ({ logVisit: (...args: unknown[]) => logVisit(...args) }))

beforeEach(() => {
  logVisit.mockClear()
})

function Probe() {
  useVisitTracking()
  return (
    <Link to="/product/p1" data-testid="go-to-product">
      go
    </Link>
  )
}

describe('useVisitTracking', () => {
  it('logs the page it mounts on, once', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="*" element={<Probe />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(logVisit).toHaveBeenCalledTimes(1)
    expect(logVisit).toHaveBeenCalledWith('/', expect.any(String))
  })

  it('logs again after an in-app navigation to a different route', async () => {
    const { getByTestId } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="*" element={<Probe />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(logVisit).toHaveBeenCalledTimes(1)

    await userEvent.click(getByTestId('go-to-product'))

    expect(logVisit).toHaveBeenCalledTimes(2)
    expect(logVisit).toHaveBeenLastCalledWith('/product/p1', expect.any(String))
  })
})

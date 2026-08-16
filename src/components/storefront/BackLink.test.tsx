import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { BackLink } from './BackLink'

const navigate = vi.fn()

vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual<typeof import('react-router-dom')>('react-router-dom')),
  useNavigate: () => navigate,
}))

/** React Router records its position in the history stack as `idx`. */
function withHistoryIndex(idx: number | undefined) {
  window.history.replaceState(idx === undefined ? {} : { idx }, '')
}

function renderBackLink() {
  return render(
    <MemoryRouter>
      <BackLink fallbackTo="/store/vortex" label="Back to store" />
    </MemoryRouter>,
  )
}

describe('BackLink', () => {
  it('steps back when the shopper arrived from inside the store', async () => {
    withHistoryIndex(2)
    renderBackLink()

    await userEvent.click(screen.getByRole('button', { name: 'Back to store' }))

    expect(navigate).toHaveBeenCalledWith(-1)
  })

  /**
   * Storefront links get shared over WhatsApp, so a product page is often the
   * first page of the session. Stepping back from there would leave the store
   * entirely — back to the chat, or a blank tab.
   */
  it('goes to the store instead of leaving the site when there is no history of ours', async () => {
    withHistoryIndex(0)
    renderBackLink()

    await userEvent.click(screen.getByRole('button', { name: 'Back to store' }))

    expect(navigate).toHaveBeenCalledWith('/store/vortex')
    expect(navigate).not.toHaveBeenCalledWith(-1)
  })

  it('treats a missing history index as no history of ours', async () => {
    withHistoryIndex(undefined)
    renderBackLink()

    await userEvent.click(screen.getByRole('button', { name: 'Back to store' }))

    expect(navigate).toHaveBeenCalledWith('/store/vortex')
  })
})

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { buildTenant } from '../../../tests/factories'
import { StorefrontHeader } from './StorefrontHeader'

function renderHeader(showHero: boolean) {
  return render(
    <MemoryRouter>
      <StorefrontHeader
        tenant={buildTenant()}
        cartCount={0}
        homePath="/"
        cartPath="/cart"
        accountPath="/account"
        loginPath="/login"
        showHero={showHero}
      />
    </MemoryRouter>,
  )
}

/**
 * Regression. `sticky` only holds while the element's parent is on screen. The bar
 * used to share a <header> with the hero, so its parent was only as tall as the bar
 * and it scrolled away. It must be its own sticky <header>, never wrapped together
 * with the hero (jsdom has no layout, so the structure is what can be asserted).
 */
describe('storefront top bar', () => {
  it.each([true, false])('is a sticky header that does not contain the hero (hero: %s)', (showHero) => {
    renderHeader(showHero)

    const bar = screen.getAllByRole('banner')[0]
    expect(bar).toHaveClass('sticky', 'top-0')
    if (showHero) expect(bar).not.toContainElement(screen.getByRole('heading', { level: 1 }))
  })
})

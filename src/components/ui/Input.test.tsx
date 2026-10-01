import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Input } from './Input'
import { Textarea } from './Textarea'

/**
 * Regression. A label was rendered with htmlFor={id ?? name}: with neither prop the
 * label pointed at nothing, so the field was announced with no name at all.
 */
describe('form fields are always named', () => {
  it('links a label to an Input that has neither id nor name', () => {
    render(<Input label="From" type="date" />)

    expect(screen.getByLabelText('From')).toBeInTheDocument()
  })

  it('gives two label-only Inputs different ids so each label finds its own field', () => {
    render(
      <>
        <Input label="From" type="date" />
        <Input label="To" type="date" />
      </>,
    )

    expect(screen.getByLabelText('From')).not.toBe(screen.getByLabelText('To'))
  })

  it('names a field that only has a placeholder, and lets an explicit aria-label win', () => {
    render(
      <>
        <Input placeholder="Search" />
        <Input placeholder="CODE" aria-label="Coupon code" />
      </>,
    )

    expect(screen.getByRole('textbox', { name: 'Search' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Coupon code' })).toBeInTheDocument()
  })

  it('links a label to a Textarea that has neither id nor name', () => {
    render(<Textarea label="Notes" />)

    expect(screen.getByLabelText('Notes')).toBeInTheDocument()
  })
})

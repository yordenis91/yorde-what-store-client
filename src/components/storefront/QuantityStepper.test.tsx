import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuantityStepper } from './QuantityStepper'

const increase = () => screen.getByRole('button', { name: /increase quantity/i })
const decrease = () => screen.getByRole('button', { name: /decrease quantity/i })

describe('QuantityStepper', () => {
  it('shows the current value', () => {
    render(<QuantityStepper value={3} onChange={vi.fn()} />)

    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('steps up and down by one', async () => {
    const onChange = vi.fn()
    render(<QuantityStepper value={3} onChange={onChange} />)

    await userEvent.click(increase())
    expect(onChange).toHaveBeenLastCalledWith(4)

    await userEvent.click(decrease())
    expect(onChange).toHaveBeenLastCalledWith(2)
  })

  it('stops at one, so a line cannot be stepped down to nothing', async () => {
    const onChange = vi.fn()
    render(<QuantityStepper value={1} onChange={onChange} />)

    expect(decrease()).toBeDisabled()
    await userEvent.click(decrease())

    expect(onChange).not.toHaveBeenCalled()
  })

  /**
   * The cap is what stops a shopper queueing more than exists and being
   * rejected at checkout instead.
   */
  it('stops at the maximum when one is given', async () => {
    const onChange = vi.fn()
    render(<QuantityStepper value={4} onChange={onChange} max={4} />)

    expect(increase()).toBeDisabled()
    await userEvent.click(increase())

    expect(onChange).not.toHaveBeenCalled()
  })

  it('keeps stepping up when no maximum is given', async () => {
    const onChange = vi.fn()
    render(<QuantityStepper value={999} onChange={onChange} />)

    expect(increase()).toBeEnabled()
    await userEvent.click(increase())

    expect(onChange).toHaveBeenLastCalledWith(1000)
  })

  it('honours a custom minimum', () => {
    render(<QuantityStepper value={5} onChange={vi.fn()} min={5} />)

    expect(decrease()).toBeDisabled()
  })

  it('labels both controls for screen readers', () => {
    render(<QuantityStepper value={1} onChange={vi.fn()} />)

    expect(increase()).toBeInTheDocument()
    expect(decrease()).toBeInTheDocument()
  })
})

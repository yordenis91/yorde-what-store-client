import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DigitalProductPanel } from './DigitalProductPanel'
import { useAuthStore } from '@/store/auth.store'
import type { Tenant } from '@/types/api'

const listDigitalAssets = vi.fn()
const uploadDigitalAsset = vi.fn()
const deleteDigitalAsset = vi.fn()
const listPriceSchedule = vi.fn()
const addPriceSchedule = vi.fn()
const deletePriceSchedule = vi.fn()

vi.mock('@/services/digital.service', () => ({
  listDigitalAssets: (...a: unknown[]) => listDigitalAssets(...a),
  uploadDigitalAsset: (...a: unknown[]) => uploadDigitalAsset(...a),
  deleteDigitalAsset: (...a: unknown[]) => deleteDigitalAsset(...a),
  listPriceSchedule: (...a: unknown[]) => listPriceSchedule(...a),
  addPriceSchedule: (...a: unknown[]) => addPriceSchedule(...a),
  deletePriceSchedule: (...a: unknown[]) => deletePriceSchedule(...a),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

function renderPanel(role: 'OWNER' | 'STAFF' = 'OWNER') {
  useAuthStore.setState({ activeTenant: { id: 't1', myRole: role } as Tenant, impersonation: null })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <DigitalProductPanel productId="p1" currencySymbol="$" currencySymbolPosition="pre" />
    </QueryClientProvider>,
  )
}

const BOOK = { id: 'a1', label: 'Los Códigos de Lola', fileName: 'libro.pdf', contentType: 'application/pdf', sizeBytes: 2 * 1024 * 1024, sortOrder: 0, createdAt: '2026-10-01' }

beforeEach(() => {
  vi.clearAllMocks()
  listDigitalAssets.mockResolvedValue([BOOK])
  listPriceSchedule.mockResolvedValue([])
  uploadDigitalAsset.mockResolvedValue(BOOK)
  addPriceSchedule.mockResolvedValue({})
  deleteDigitalAsset.mockResolvedValue(undefined)
  deletePriceSchedule.mockResolvedValue(undefined)
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

describe('files', () => {
  it('lists the files with their size, never a link to them', async () => {
    renderPanel()

    expect(await screen.findByText('Los Códigos de Lola')).toBeInTheDocument()
    expect(screen.getByText(/libro\.pdf · 2\.0 MB/)).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('warns when there is nothing to deliver yet', async () => {
    listDigitalAssets.mockResolvedValue([])
    renderPanel()
    expect(await screen.findByText(/would receive nothing/i)).toBeInTheDocument()
  })

  it('needs a name before a file can be uploaded', async () => {
    renderPanel()
    await screen.findByText('Los Códigos de Lola')
    expect(screen.getByRole('button', { name: /upload file/i })).toBeDisabled()
  })

  it('uploads the chosen file under the given name', async () => {
    const { container } = renderPanel()
    await screen.findByText('Los Códigos de Lola')
    await userEvent.type(screen.getByLabelText(/name shown to the buyer/i), 'Bonus 13')
    const file = new File(['%PDF-1.7'], 'bonus.pdf', { type: 'application/pdf' })
    await userEvent.upload(container.querySelector('input[type="file"]') as HTMLInputElement, file)

    await waitFor(() => expect(uploadDigitalAsset).toHaveBeenCalledWith('p1', file, 'Bonus 13'))
  })

  it('deletes a file only after confirmation', async () => {
    renderPanel()
    await screen.findByText('Los Códigos de Lola')
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false)
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(deleteDigitalAsset).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(deleteDigitalAsset).toHaveBeenCalledWith('p1', 'a1'))
  })

  it('is read-only for a collaborator (the API answers 403 to uploads and deletes)', async () => {
    renderPanel('STAFF')
    await screen.findByText('Los Códigos de Lola')
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /upload file/i })).not.toBeInTheDocument()
  })
})

describe('planned price changes', () => {
  it('lists scheduled and applied changes, and only lets a pending one be removed', async () => {
    listPriceSchedule.mockResolvedValue([
      { id: 's1', price: '9.99', effectiveFrom: '2026-10-01T00:00:00.000Z', appliedAt: '2026-10-01T00:00:30.000Z' },
      { id: 's2', price: '12.99', effectiveFrom: '2099-11-04T00:00:00.000Z', appliedAt: null },
    ])
    renderPanel()

    expect(await screen.findByText('$12.99')).toBeInTheDocument()
    expect(screen.getByText('applied')).toBeInTheDocument()
    expect(screen.getByText('scheduled')).toBeInTheDocument()
    // One Delete for the pending change; the file has its own.
    await userEvent.click(screen.getAllByRole('button', { name: 'Delete' }).at(-1)!)
    await waitFor(() => expect(deletePriceSchedule).toHaveBeenCalledWith('p1', 's2'))
  })

  it('schedules a price at an exact moment, stated in the browser time zone', async () => {
    renderPanel()
    await screen.findByText('Los Códigos de Lola')
    await userEvent.type(screen.getByLabelText('New price'), '12.99')
    await userEvent.type(screen.getByLabelText('Takes effect on'), '2099-11-04T00:00')

    expect(screen.getByText(/the price will change on/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /schedule price change/i }))

    await waitFor(() => expect(addPriceSchedule).toHaveBeenCalledTimes(1))
    const [productId, payload] = addPriceSchedule.mock.calls[0]
    expect(productId).toBe('p1')
    expect(payload.price).toBe(12.99)
    expect(payload.effectiveFrom).toBe(new Date('2099-11-04T00:00').toISOString())
  })

  it('will not schedule without both a price and a date', async () => {
    renderPanel()
    await screen.findByText('Los Códigos de Lola')
    expect(screen.getByRole('button', { name: /schedule price change/i })).toBeDisabled()
    await userEvent.type(screen.getByLabelText('New price'), '12.99')
    expect(screen.getByRole('button', { name: /schedule price change/i })).toBeDisabled()
  })
})

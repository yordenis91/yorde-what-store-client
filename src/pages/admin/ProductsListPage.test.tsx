import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AxiosError } from 'axios'
import { toast } from 'sonner'
import { ProductsListPage } from './ProductsListPage'
import { buildProduct } from '../../../tests/factories'

const listProducts = vi.fn()
const deleteProduct = vi.fn()

vi.mock('@/services/products.service', () => ({
  listProducts: (...a: unknown[]) => listProducts(...a),
  listCategories: () => Promise.resolve([]),
  deleteProduct: (...a: unknown[]) => deleteProduct(...a),
  updateProduct: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

function httpError(status: number, message: string) {
  return new AxiosError('failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    data: { message },
  } as never)
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ProductsListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  listProducts.mockResolvedValue({
    items: [buildProduct({ id: 'p1', name: 'Los Códigos de Lola' })],
    meta: { page: 1, limit: 12, total: 1, totalPages: 1 },
  })
})

describe('deleting a product', () => {
  it('explains, in the interface language, why a product with orders cannot be deleted', async () => {
    deleteProduct.mockRejectedValue(httpError(409, 'This product has orders and cannot be deleted'))
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: /^delete$/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    const [message] = vi.mocked(toast.error).mock.calls[0]
    expect(message).toMatch(/has orders/i)
    expect(message).toMatch(/inactive/i)
  })

  it("still shows the API's own message for other failures", async () => {
    deleteProduct.mockRejectedValue(httpError(403, 'Not allowed here'))
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: /^delete$/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Not allowed here', expect.anything()))
  })
})

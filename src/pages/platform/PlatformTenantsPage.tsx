import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { listPlatformTenants, updateTenantStatus } from '@/services/platform.service'
import { formatDate } from '@/utils/format'
import { extractErrorMessage } from '@/services/api-client'

export function PlatformTenantsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['platform-tenants', page, search],
    queryFn: () => listPlatformTenants({ page, limit: 20, search: search || undefined }),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateTenantStatus(id, isActive),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['platform-tenants'] }),
    onError: (error) => toast.error(extractErrorMessage(error, 'Error')),
  })

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Tenants</h1>
      <Input
        placeholder="Search by name, slug or owner email"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setPage(1)
        }}
        className="mb-4 max-w-sm"
      />

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Store</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data?.items.map((tenant) => (
                <tr key={tenant.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{tenant.name}</div>
                    <div className="text-xs text-gray-500">{tenant.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{tenant.owner.name}</div>
                    <div className="text-xs text-gray-500">{tenant.owner.email}</div>
                  </td>
                  <td className="px-4 py-3">{tenant.subscriptions[0]?.plan.name ?? '—'}</td>
                  <td className="px-4 py-3">{tenant._count.products}</td>
                  <td className="px-4 py-3">{tenant._count.orders}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(tenant.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${tenant.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {tenant.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant={tenant.isActive ? 'danger' : 'secondary'}
                      disabled={statusMutation.isPending}
                      onClick={() => statusMutation.mutate({ id: tenant.id, isActive: !tenant.isActive })}
                    >
                      {tenant.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-400">
                    No tenants found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {data && data.meta.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ←
          </Button>
          <span className="text-sm text-gray-500">
            {page} / {data.meta.totalPages}
          </span>
          <Button variant="secondary" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>
            →
          </Button>
        </div>
      )}
    </div>
  )
}

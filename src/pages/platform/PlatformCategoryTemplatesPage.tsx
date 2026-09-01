import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  createCategoryTemplate,
  deleteCategoryTemplate,
  listAllCategoryTemplates,
  updateCategoryTemplate,
  type CategoryTemplateInput,
} from '@/services/category-templates.service'
import { extractErrorMessage } from '@/services/api-client'
import type { CategoryTemplate } from '@/types/api'

interface FormValues {
  name: string
  parentId: string
  sortOrder: number
}

interface TreeNode extends CategoryTemplate {
  children: TreeNode[]
}

/** Flat list -> tree, sorted the way the catalog is meant to be browsed (sortOrder, then name). */
function buildTree(templates: CategoryTemplate[]): TreeNode[] {
  const nodes = new Map<string, TreeNode>(templates.map((t) => [t.id, { ...t, children: [] }]))
  const roots: TreeNode[] = []
  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  const byOrder = (a: TreeNode, b: TreeNode) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
  const sortRec = (list: TreeNode[]) => {
    list.sort(byOrder)
    list.forEach((n) => sortRec(n.children))
  }
  sortRec(roots)
  return roots
}

export function PlatformCategoryTemplatesPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data: templates, isLoading } = useQuery({
    queryKey: ['platform-category-templates'],
    queryFn: listAllCategoryTemplates,
  })

  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { name: '', parentId: '', sortOrder: 0 },
  })

  const tree = useMemo(() => buildTree(templates ?? []), [templates])

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: CategoryTemplateInput = {
        name: values.name,
        parentId: values.parentId || null,
        sortOrder: Number(values.sortOrder) || 0,
      }
      return editingId ? updateCategoryTemplate(editingId, payload) : createCategoryTemplate(payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['platform-category-templates'] })
      reset({ name: '', parentId: '', sortOrder: 0 })
      setShowForm(false)
      setEditingId(null)
      toast.success('Saved')
    },
    onError: (error) => toast.error(extractErrorMessage(error, 'Error')),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCategoryTemplate,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['platform-category-templates'] }),
    onError: (error) => toast.error(extractErrorMessage(error, 'Error')),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateCategoryTemplate(id, { isActive }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['platform-category-templates'] }),
  })

  function startCreate(parentId?: string) {
    setEditingId(null)
    reset({ name: '', parentId: parentId ?? '', sortOrder: 0 })
    setShowForm(true)
  }

  function startEdit(template: CategoryTemplate) {
    setEditingId(template.id)
    reset({ name: template.name, parentId: template.parentId ?? '', sortOrder: template.sortOrder })
    setShowForm(true)
  }

  function renderNode(node: TreeNode, depth: number) {
    return (
      <div key={node.id}>
        <div
          className="flex items-center justify-between gap-3 border-b border-gray-100 py-2 last:border-0"
          style={{ paddingLeft: depth * 20 }}
        >
          <div className="flex items-center gap-2">
            <span className={`text-sm ${node.isActive ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{node.name}</span>
            <span className="text-xs text-gray-400">{node.slug}</span>
          </div>
          <div className="flex shrink-0 gap-1">
            <button type="button" className="text-xs font-medium text-brand-700" onClick={() => startCreate(node.id)}>
              + Subcategory
            </button>
            <button type="button" className="text-xs font-medium text-gray-500" onClick={() => startEdit(node)}>
              Edit
            </button>
            <button
              type="button"
              className="text-xs font-medium text-gray-500"
              onClick={() => toggleActiveMutation.mutate({ id: node.id, isActive: !node.isActive })}
            >
              {node.isActive ? 'Deactivate' : 'Activate'}
            </button>
            <button type="button" className="text-xs font-medium text-red-600" onClick={() => deleteMutation.mutate(node.id)}>
              Delete
            </button>
          </div>
        </div>
        {node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Category catalog</h1>
          <p className="mt-1 text-sm text-gray-500">
            The standard category list stores can pick from instead of typing free-text names.
          </p>
        </div>
        <Button onClick={() => (showForm ? setShowForm(false) : startCreate())}>{showForm ? 'Cancel' : 'New category'}</Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <form
            onSubmit={(e) => void handleSubmit((values) => saveMutation.mutate(values))(e)}
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          >
            <Input placeholder="Name" className="sm:col-span-2" {...register('name', { required: true })} />
            <Input placeholder="Sort order" type="number" {...register('sortOrder', { valueAsNumber: true })} />
            <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-3" {...register('parentId')}>
              <option value="">No parent (top-level)</option>
              {templates?.map((t) => (
                <option key={t.id} value={t.id} disabled={t.id === editingId}>
                  {t.name}
                </option>
              ))}
            </select>
            <Button type="submit" loading={saveMutation.isPending} className="w-fit sm:col-span-3">
              Save
            </Button>
          </form>
        </Card>
      )}

      <Card>
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : tree.length === 0 ? (
          <p className="text-sm text-gray-500">No categories yet.</p>
        ) : (
          <div className="flex flex-col">{tree.map((node) => renderNode(node, 0))}</div>
        )}
      </Card>
    </div>
  )
}

import type { CategoryTemplate } from '@/types/api'

export interface CategoryTreeNode extends CategoryTemplate {
  children: CategoryTreeNode[]
}

const byOrder = (a: CategoryTemplate, b: CategoryTemplate) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)

/** Flat list -> tree, sorted the way the catalog is meant to be browsed (sortOrder, then name). */
export function buildCategoryTree(templates: CategoryTemplate[]): CategoryTreeNode[] {
  const nodes = new Map<string, CategoryTreeNode>(templates.map((t) => [t.id, { ...t, children: [] }]))
  const roots: CategoryTreeNode[] = []
  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  const sortRec = (list: CategoryTreeNode[]) => {
    list.sort(byOrder)
    list.forEach((n) => sortRec(n.children))
  }
  sortRec(roots)
  return roots
}

/**
 * Same tree, walked depth-first (a parent immediately followed by its own
 * children before the next sibling) and flattened back to a list — for a
 * flat picker like a <select>, where a plain sortOrder/name sort on the raw
 * rows would interleave unrelated parents and children whenever their
 * sortOrder values happen to overlap (every category's sortOrder restarts at
 * 0 within its own parent, so "Fitness" at 0 can sort ahead of "Bebés y
 * niños" at 2 even though they're in unrelated branches).
 */
export function flattenCategoryTree(templates: CategoryTemplate[]): CategoryTemplate[] {
  const result: CategoryTemplate[] = []
  const visit = (nodes: CategoryTreeNode[]) => {
    for (const node of nodes) {
      result.push(node)
      visit(node.children)
    }
  }
  visit(buildCategoryTree(templates))
  return result
}

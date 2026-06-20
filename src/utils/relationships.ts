import type { FamilyMember, TreeNode } from '../types'
import { sortSiblingMembers } from './siblingOrder'

export class FamilyGraph {
  private byId: Map<string, FamilyMember>

  constructor(members: FamilyMember[]) {
    this.byId = new Map(members.map((m) => [m.id, m]))
  }

  get(id: string | undefined): FamilyMember | undefined {
    if (!id) return undefined
    return this.byId.get(id)
  }

  getSpouse(member: FamilyMember): FamilyMember | undefined {
    return this.get(member.spouseId)
  }

  getParents(member: FamilyMember): { father?: FamilyMember; mother?: FamilyMember } {
    return {
      father: this.get(member.fatherId),
      mother: this.get(member.motherId),
    }
  }

  getChildren(member: FamilyMember): FamilyMember[] {
    const children: FamilyMember[] = []
    for (const candidate of this.byId.values()) {
      if (candidate.fatherId === member.id || candidate.motherId === member.id) {
        children.push(candidate)
      }
    }
    return sortSiblingMembers(children)
  }

  getSiblings(member: FamilyMember): FamilyMember[] {
    const { father, mother } = this.getParents(member)
    const siblingIds = new Set<string>()

    for (const candidate of this.byId.values()) {
      if (candidate.id === member.id) continue
      const sharesFather = father && candidate.fatherId === father.id
      const sharesMother = mother && candidate.motherId === mother.id
      if (sharesFather || sharesMother) siblingIds.add(candidate.id)
    }

    return sortSiblingMembers(
      [...siblingIds].map((id) => this.byId.get(id)!).filter(Boolean),
    )
  }

  buildTree(
    focusId: string,
    depth = 3,
    visited = new Set<string>(),
    showParents = true,
  ): TreeNode | null {
    const member = this.get(focusId)
    if (!member || visited.has(focusId)) return null

    visited.add(focusId)

    const spouse = this.getSpouse(member)
    const parents = showParents ? this.getParents(member) : undefined
    const children =
      depth > 0
        ? this.getChildren(member)
            .map((child) => this.buildTree(child.id, depth - 1, new Set(visited)))
            .filter((node): node is TreeNode => node !== null)
        : []

    return { member, spouse, children, parents }
  }

  hasChildren(id: string): boolean {
    const member = this.get(id)
    return member ? this.getChildren(member).length > 0 : false
  }

  isAncestorOf(ancestorId: string, descendantId: string): boolean {
    if (ancestorId === descendantId) return true

    let current = this.get(descendantId)
    const seen = new Set<string>()
    while (current) {
      if (seen.has(current.id)) break
      seen.add(current.id)
      const { father, mother } = this.getParents(current)
      const parent = father ?? mother
      if (!parent) break
      if (parent.id === ancestorId) return true
      current = parent
    }
    return false
  }

  /** Focus couple (and ancestors) only until a branch is expanded */
  buildExpandableTree(
    focusId: string,
    expandedId: string | null,
    revealedChildCount: number = 0,
    showParents = true,
  ): TreeNode | null {
    const root = this.buildTree(focusId, 0, new Set(), showParents)
    if (!root || !expandedId || revealedChildCount <= 0) return root

    if (!this.isAncestorOf(focusId, expandedId) && expandedId !== focusId) return root

    const childMembers = this.getChildren(root.member)
    root.children = childMembers.map((child) => {
      const childNode = this.buildTree(child.id, 0)!
      if (child.id === expandedId || this.isAncestorOf(child.id, expandedId)) {
        return this.expandBranch(childNode, expandedId, revealedChildCount)
      }
      return childNode
    })

    if (expandedId === focusId) {
      root.children = root.children.map((child) => ({ ...child, children: [] }))
    }

    return root
  }

  private expandBranch(node: TreeNode, expandedId: string, revealedChildCount: number): TreeNode {
    if (node.member.id === expandedId) {
      const childMembers = this.getChildren(node.member)
      return {
        ...node,
        children: childMembers
          .map((child) => {
            const childNode = this.buildTree(child.id, 0)
            if (!childNode) return null
            return { ...childNode, children: [] as TreeNode[] }
          })
          .filter((n): n is TreeNode => n !== null),
      }
    }

    const childMembers = this.getChildren(node.member)
    return {
      ...node,
      children: childMembers.map((child) => {
        const childNode = this.buildTree(child.id, 0)!
        if (child.id === expandedId || this.isAncestorOf(child.id, expandedId)) {
          return this.expandBranch(childNode, expandedId, revealedChildCount)
        }
        return { ...childNode, children: [] }
      }),
    }
  }

  findRoots(): FamilyMember[] {
    const hasParentLink = new Set<string>()
    for (const member of this.byId.values()) {
      if (member.fatherId) hasParentLink.add(member.id)
      if (member.motherId) hasParentLink.add(member.id)
    }

    const roots = [...this.byId.values()].filter((m) => !hasParentLink.has(m.id))
    return sortSiblingMembers(roots)
  }

  getConnectedMembers(focusId: string): Set<string> {
    const connected = new Set<string>()
    const queue = [focusId]

    while (queue.length) {
      const id = queue.pop()!
      if (connected.has(id)) continue
      connected.add(id)

      const member = this.get(id)
      if (!member) continue

      const { father, mother } = this.getParents(member)
      if (father) queue.push(father.id)
      if (mother) queue.push(mother.id)
      if (member.spouseId) queue.push(member.spouseId)
      for (const child of this.getChildren(member)) queue.push(child.id)
    }

    return connected
  }

  stats() {
    let withParents = 0
    let withSpouse = 0
    for (const member of this.byId.values()) {
      if (member.fatherId || member.motherId) withParents++
      if (member.spouseId) withSpouse++
    }
    return {
      total: this.byId.size,
      withParents,
      withSpouse,
    }
  }
}

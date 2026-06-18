import type { FamilyMember, TreeNode } from '../types'
import {
  isJayantiSundarSiblingGroup,
  isKomalaChariSiblingGroup,
  isKrishnamachariSiblingGroup,
  isSangeetaRamprasadSiblingGroup,
  isUshaRamanujamSiblingGroup,
  isVedamSiblingGroup,
  JAYANTI_SUNDAR_CHILDREN_ORDER,
  KOMALA_CHARI_CHILDREN_ORDER,
  KRISHNAMACHARI_CHILDREN_ORDER,
  SANGEETA_RAMPRASAD_CHILDREN_ORDER,
  sortByCustomOrder,
  USHA_RAMANUJAM_CHILDREN_ORDER,
  VEDAM_CHILDREN_ORDER,
} from './siblingOrder'

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
    return sortMembers(children)
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

    return sortMembers(
      [...siblingIds].map((id) => this.byId.get(id)!).filter(Boolean),
    )
  }

  buildTree(focusId: string, depth = 3, visited = new Set<string>()): TreeNode | null {
    const member = this.get(focusId)
    if (!member || visited.has(focusId)) return null

    visited.add(focusId)

    const spouse = this.getSpouse(member)
    const parents = this.getParents(member)
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

  /** One generation visible by default; expandedId reveals that person's children only */
  buildExpandableTree(focusId: string, expandedId: string | null): TreeNode | null {
    const root = this.buildTree(focusId, 1)
    if (!root || !expandedId) return root

    if (!this.isAncestorOf(focusId, expandedId)) return root

    return {
      ...root,
      children: root.children.map((child) =>
        this.isAncestorOf(child.member.id, expandedId)
          ? this.expandBranch(child, expandedId)
          : child,
      ),
    }
  }

  private expandBranch(node: TreeNode, expandedId: string): TreeNode {
    if (node.member.id === expandedId) {
      return this.buildTree(expandedId, 1)!
    }

    const rebuilt = this.buildTree(node.member.id, 1)!
    return {
      ...node,
      spouse: rebuilt.spouse,
      children: rebuilt.children.map((child) =>
        this.isAncestorOf(child.member.id, expandedId)
          ? this.expandBranch(child, expandedId)
          : { ...child, children: [] },
      ),
    }
  }

  findRoots(): FamilyMember[] {
    const hasParentLink = new Set<string>()
    for (const member of this.byId.values()) {
      if (member.fatherId) hasParentLink.add(member.id)
      if (member.motherId) hasParentLink.add(member.id)
    }

    const roots = [...this.byId.values()].filter((m) => !hasParentLink.has(m.id))
    return sortByBirth(roots)
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

function sortMembers(members: FamilyMember[]): FamilyMember[] {
  if (isKrishnamachariSiblingGroup(members)) {
    return sortByCustomOrder(members, KRISHNAMACHARI_CHILDREN_ORDER)
  }
  if (isVedamSiblingGroup(members)) {
    return sortByCustomOrder(members, VEDAM_CHILDREN_ORDER)
  }
  if (isJayantiSundarSiblingGroup(members)) {
    return sortByCustomOrder(members, JAYANTI_SUNDAR_CHILDREN_ORDER)
  }
  if (isKomalaChariSiblingGroup(members)) {
    return sortByCustomOrder(members, KOMALA_CHARI_CHILDREN_ORDER)
  }
  if (isSangeetaRamprasadSiblingGroup(members)) {
    return sortByCustomOrder(members, SANGEETA_RAMPRASAD_CHILDREN_ORDER)
  }
  if (isUshaRamanujamSiblingGroup(members)) {
    return sortByCustomOrder(members, USHA_RAMANUJAM_CHILDREN_ORDER)
  }
  return sortByBirth(members)
}

function sortByBirth(members: FamilyMember[]): FamilyMember[] {
  return [...members].sort((a, b) => {
    const ay = extractYear(a.birthYear)
    const by = extractYear(b.birthYear)
    if (ay !== null && by !== null) return ay - by
    if (ay !== null) return -1
    if (by !== null) return 1
    return a.firstName.localeCompare(b.firstName)
  })
}

function extractYear(value?: string): number | null {
  if (!value) return null
  const match = value.match(/\b(18|19|20)\d{2}\b/)
  return match ? Number(match[0]) : null
}

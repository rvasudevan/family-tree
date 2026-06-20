export interface FamilyMember {
  id: string
  firstName: string
  lastName: string
  gender: 'male' | 'female' | 'other'
  birthYear?: string
  deathYear?: string
  birthPlace?: string
  profession?: string
  bio?: string
  avatarUrl?: string
  spouseId?: string
  fatherId?: string
  motherId?: string
  generation?: number
  anniversary?: string
  /** Left-to-right sibling order among children of the same parents */
  siblingOrder?: number
}

export interface TreeNode {
  member: FamilyMember
  spouse?: FamilyMember
  children: TreeNode[]
  parents?: { father?: FamilyMember; mother?: FamilyMember }
}

export interface LayoutNode {
  id: string
  member: FamilyMember
  x: number
  y: number
  role: 'focus' | 'spouse' | 'parent' | 'child'
  depth: number
  cardW: number
  cardH: number
}

export interface LayoutEdge {
  from: string
  to: string
  type: 'marriage' | 'parent-child'
  /** Parent-child line drops from midpoint between this couple */
  coupleFrom?: [string, string]
  marriageLayout?: 'horizontal' | 'vertical'
}

export interface TreeLayout {
  nodes: LayoutNode[]
  edges: LayoutEdge[]
  width: number
  height: number
}

export type ViewMode = 'tree' | 'list'

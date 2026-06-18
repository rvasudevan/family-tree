import type { FamilyMember, LayoutEdge, LayoutNode, TreeLayout, TreeNode } from '../types'
import { cardDisplayName } from './family'

const CARD_W = 180
const CARD_W_DEEP = 228
const CARD_H = 88
const CARD_H_DEEP = 96
const CARD_CHROME = 72
const PX_PER_CHAR = 8.2
const CARD_W_MAX = 300
const H_GAP = 48
const H_GAP_DEEP = 64
const V_GAP = 100
const COUPLE_GAP = 24
const PARENT_V_GAP = 120
const SPOUSE_V_GAP = 20
const MAX_CHILDREN_PER_ROW = 5
const CHILD_ROW_GAP = 72

function cardWidthFloor(level: number): number {
  return level >= 2 ? CARD_W_DEEP : CARD_W
}

function cardHeightForLevel(level: number): number {
  return level >= 2 ? CARD_H_DEEP : CARD_H
}

function hGapForLevel(level: number): number {
  return level >= 2 ? H_GAP_DEEP : H_GAP
}

/** Fit card width to the displayed name so labels are not clipped */
function measureCardWidth(member: FamilyMember, level: number): number {
  const floor = cardWidthFloor(level)
  const name = cardDisplayName(member)
  const needed = Math.ceil(name.length * PX_PER_CHAR) + CARD_CHROME
  return Math.max(floor, Math.min(needed, CARD_W_MAX))
}

function coupleSlotWidth(
  member: FamilyMember,
  spouse: FamilyMember | undefined,
  level: number,
): number {
  const memberW = measureCardWidth(member, level)
  if (!spouse) return memberW
  return memberW + COUPLE_GAP + measureCardWidth(spouse, level)
}

function verticalSlotWidth(member: FamilyMember, spouse: FamilyMember | undefined, level: number): number {
  if (!spouse) return measureCardWidth(member, level)
  return Math.max(measureCardWidth(member, level), measureCardWidth(spouse, level))
}

/** Female partner on the left, male on the right (focus row & deeper generations) */
function orderCoupleFemaleFirst(a: FamilyMember, b: FamilyMember): [FamilyMember, FamilyMember] {
  if (a.gender === 'female' && b.gender !== 'female') return [a, b]
  if (b.gender === 'female' && a.gender !== 'female') return [b, a]
  return [a, b]
}

interface SubtreeSize {
  width: number
  height: number
}

function firstGenStackHeight(node: TreeNode): number {
  return CARD_H + (node.spouse ? SPOUSE_V_GAP + CARD_H : 0)
}

function childSlotWidth(node: TreeNode, firstGenRow: boolean, level: number): number {
  const lvl = firstGenRow ? 1 : level
  if (firstGenRow) return verticalSlotWidth(node.member, node.spouse, lvl)
  return coupleSlotWidth(node.member, node.spouse, lvl)
}

function chunkChildren(children: TreeNode[]): TreeNode[][] {
  if (children.length <= MAX_CHILDREN_PER_ROW) return [children]

  const rows: TreeNode[][] = []
  for (let i = 0; i < children.length; i += MAX_CHILDREN_PER_ROW) {
    rows.push(children.slice(i, i + MAX_CHILDREN_PER_ROW))
  }
  return rows
}

function rowSlotWidth(row: TreeNode[], firstGenRow: boolean, level: number): number {
  const gap = hGapForLevel(firstGenRow ? 1 : level)
  return (
    row.reduce((sum, child) => sum + childSlotWidth(child, firstGenRow, level), 0) +
    Math.max(0, row.length - 1) * gap
  )
}

function measureFirstGenColumn(node: TreeNode): SubtreeSize {
  const stack = firstGenStackHeight(node)
  const descendants =
    node.children.length > 0 ? V_GAP + measureChildrenBlock(node.children, 1).height : 0
  return {
    width: verticalSlotWidth(node.member, node.spouse, 1),
    height: stack + descendants,
  }
}

function measureChildrenBlock(children: TreeNode[], parentLevel: number): { width: number; height: number } {
  if (children.length === 0) return { width: 0, height: 0 }

  if (parentLevel === 0) {
    const columns = children.map(measureFirstGenColumn)
    const slotWidths = children.map((child) => verticalSlotWidth(child.member, child.spouse, 1))
    const totalWidth =
      slotWidths.reduce((sum, w) => sum + w, 0) + Math.max(0, children.length - 1) * H_GAP
    return {
      width: totalWidth,
      height: V_GAP + Math.max(...columns.map((c) => c.height)),
    }
  }

  const childLevel = parentLevel + 1
  const rows = chunkChildren(children)
  let height = 0
  let width = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowSizes = row.map((child) => measureSubtree(child, childLevel))
    width = Math.max(width, rowSlotWidth(row, false, childLevel))
    height += V_GAP + Math.max(...rowSizes.map((size) => size.height))
    if (i < rows.length - 1) height += CHILD_ROW_GAP
  }

  return { width, height }
}

export function layoutTree(root: TreeNode): TreeLayout {
  const nodes: LayoutNode[] = []
  const edges: LayoutEdge[] = []
  const placed = new Set<string>()

  const size = measureSubtree(root)
  placeSubtree(root, size.width / 2, 0, nodes, edges, placed, 0)

  const minX = Math.min(...nodes.map((n) => n.x - n.cardW / 2))
  const maxX = Math.max(...nodes.map((n) => n.x + n.cardW / 2))
  const minY = Math.min(...nodes.map((n) => n.y))
  const maxY = Math.max(...nodes.map((n) => n.y + n.cardH))

  const padding = 48
  const normalized = nodes.map((n) => ({
    ...n,
    x: n.x - minX + padding,
    y: n.y - minY + padding,
  }))

  return {
    nodes: normalized,
    edges,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  }
}

function hasDisplayedParents(node: TreeNode): boolean {
  return Boolean(node.parents?.father || node.parents?.mother)
}

/** Stack spouse below the focus person when they're a first-gen child or when parents sit above */
function useVerticalFocusCouple(level: number, node: TreeNode): boolean {
  return level === 1 || (level === 0 && hasDisplayedParents(node))
}

function focusCoupleWidth(node: TreeNode, level: number): number {
  return useVerticalFocusCouple(level, node)
    ? verticalSlotWidth(node.member, node.spouse, level)
    : coupleSlotWidth(node.member, node.spouse, level)
}

function focusCoupleHeight(node: TreeNode, level: number): number {
  const h = cardHeightForLevel(level)
  return useVerticalFocusCouple(level, node) && node.spouse ? h + SPOUSE_V_GAP + h : h
}

function measureSubtree(node: TreeNode, level = 0): SubtreeSize {
  const childrenBlock = measureChildrenBlock(node.children, level)
  const h = cardHeightForLevel(level)
  const coupleWidth = focusCoupleWidth(node, level)
  const memberW = measureCardWidth(node.member, level)

  const hasParents = hasDisplayedParents(node)
  let parentWidth = 0
  if (hasParents) {
    const { father, mother } = node.parents!
    parentWidth =
      mother && father
        ? coupleSlotWidth(mother, father, level)
        : measureCardWidth((mother ?? father)!, level)
  }

  const rowWidth = Math.max(coupleWidth, childrenBlock.width, parentWidth)
  const parentHeight = hasParents ? PARENT_V_GAP + h : 0

  return {
    width: Math.max(rowWidth, memberW),
    height: focusCoupleHeight(node, level) + parentHeight + childrenBlock.height,
  }
}

function placeVerticalCouple(
  node: TreeNode,
  centerX: number,
  y: number,
  memberRole: LayoutNode['role'],
  level: number,
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  placed: Set<string>,
): number {
  const { member, spouse } = node
  const h = cardHeightForLevel(level)
  addNode(nodes, placed, member, centerX, y, memberRole, level)

  if (!spouse) return y + h

  const spouseY = y + h + SPOUSE_V_GAP
  addNode(nodes, placed, spouse, centerX, spouseY, 'spouse', level)
  edges.push({ from: member.id, to: spouse.id, type: 'marriage', marriageLayout: 'vertical' })
  return spouseY + h
}

function horizontalCoupleCenters(
  centerX: number,
  leftW: number,
  rightW: number,
): { leftX: number; rightX: number } {
  const span = leftW / 2 + COUPLE_GAP + rightW / 2
  return {
    leftX: centerX - span / 2,
    rightX: centerX + span / 2,
  }
}

function placeHorizontalCouple(
  node: TreeNode,
  centerX: number,
  y: number,
  memberRole: LayoutNode['role'],
  level: number,
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  placed: Set<string>,
): void {
  const { member, spouse } = node

  if (spouse) {
    const [left, right] = orderCoupleFemaleFirst(member, spouse)
    const leftW = measureCardWidth(left, level)
    const rightW = measureCardWidth(right, level)
    const { leftX, rightX } = horizontalCoupleCenters(centerX, leftW, rightW)
    addNode(nodes, placed, left, leftX, y, left.id === member.id ? memberRole : 'spouse', level)
    addNode(nodes, placed, right, rightX, y, right.id === member.id ? memberRole : 'spouse', level)
    edges.push({ from: left.id, to: right.id, type: 'marriage', marriageLayout: 'horizontal' })
  } else {
    addNode(nodes, placed, member, centerX, y, memberRole, level)
  }
}

function placeSubtree(
  node: TreeNode,
  centerX: number,
  y: number,
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  placed: Set<string>,
  level: number,
): void {
  const { member, spouse, children, parents } = node
  const h = cardHeightForLevel(level)

  if (parents?.father || parents?.mother) {
    const parentY = y
    const mother = parents.mother
    const father = parents.father

    if (mother && father) {
      const motherW = measureCardWidth(mother, level)
      const fatherW = measureCardWidth(father, level)
      const { leftX, rightX } = horizontalCoupleCenters(centerX, motherW, fatherW)
      addNode(nodes, placed, mother, leftX, parentY, 'parent', level)
      addNode(nodes, placed, father, rightX, parentY, 'parent', level)
      edges.push({
        from: mother.id,
        to: member.id,
        type: 'parent-child',
        coupleFrom: [mother.id, father.id],
      })
      edges.push({ from: mother.id, to: father.id, type: 'marriage', marriageLayout: 'horizontal' })
    } else {
      const single = mother ?? father!
      addNode(nodes, placed, single, centerX, parentY, 'parent', level)
      edges.push({ from: single.id, to: member.id, type: 'parent-child' })
    }

    y += PARENT_V_GAP
  }

  const memberRole: LayoutNode['role'] = level === 1 ? 'child' : 'focus'
  let stackBottom = y + h

  if (useVerticalFocusCouple(level, node)) {
    stackBottom = placeVerticalCouple(node, centerX, y, memberRole, level, nodes, edges, placed)
  } else {
    placeHorizontalCouple(node, centerX, y, memberRole, level, nodes, edges, placed)
    stackBottom = y + h
  }

  if (children.length === 0) return

  if (level === 0) {
    placeFirstGenChildrenRow(node, centerX, y + CARD_H, nodes, edges, placed)
    return
  }

  const childLevel = level + 1
  const rows = chunkChildren(children)
  let rowY = stackBottom + V_GAP

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex]
    const slotWidths = row.map((child) => childSlotWidth(child, false, childLevel))
    const gap = hGapForLevel(childLevel)
    const totalWidth =
      slotWidths.reduce((sum, w) => sum + w, 0) + Math.max(0, row.length - 1) * gap
    let cx = centerX - totalWidth / 2

    for (let i = 0; i < row.length; i++) {
      const child = row[i]
      const childCenter = cx + slotWidths[i] / 2
      placeSubtree(child, childCenter, rowY, nodes, edges, placed, childLevel)
      pushParentChildEdge(node, child.member.id, edges, spouse)

      cx += slotWidths[i] + gap
    }

    const rowDepth = Math.max(...row.map((child) => measureSubtree(child, childLevel).height))
    rowY += rowDepth
    if (rowIndex < rows.length - 1) rowY += CHILD_ROW_GAP
  }
}

function placeFirstGenChildrenRow(
  node: TreeNode,
  centerX: number,
  parentBottomY: number,
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  placed: Set<string>,
): void {
  const { children, spouse } = node
  const childRowY = parentBottomY + V_GAP
  const slotWidths = children.map((child) => verticalSlotWidth(child.member, child.spouse, 1))
  const totalWidth =
    slotWidths.reduce((sum, w) => sum + w, 0) + Math.max(0, children.length - 1) * H_GAP
  let cx = centerX - totalWidth / 2

  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    const childCenter = cx + slotWidths[i] / 2
    placeSubtree(child, childCenter, childRowY, nodes, edges, placed, 1)
    pushParentChildEdge(node, child.member.id, edges, spouse)
    cx += slotWidths[i] + H_GAP
  }
}

function pushParentChildEdge(
  node: TreeNode,
  childId: string,
  edges: LayoutEdge[],
  spouse: FamilyMember | undefined,
): void {
  if (spouse) {
    const [left, right] = orderCoupleFemaleFirst(node.member, spouse)
    edges.push({
      from: left.id,
      to: childId,
      type: 'parent-child',
      coupleFrom: [left.id, right.id],
    })
  } else {
    edges.push({ from: node.member.id, to: childId, type: 'parent-child' })
  }
}

function addNode(
  nodes: LayoutNode[],
  placed: Set<string>,
  member: FamilyMember,
  x: number,
  y: number,
  role: LayoutNode['role'],
  depth: number,
): void {
  if (placed.has(member.id)) return
  placed.add(member.id)
  nodes.push({
    id: member.id,
    member,
    x,
    y,
    role,
    depth,
    cardW: measureCardWidth(member, depth),
    cardH: cardHeightForLevel(depth),
  })
}

export const LAYOUT_CARD_W = CARD_W
export const LAYOUT_CARD_H = CARD_H
export const LAYOUT_CARD_W_DEEP = CARD_W_DEEP
export const LAYOUT_CARD_H_DEEP = CARD_H_DEEP

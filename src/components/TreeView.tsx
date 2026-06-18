import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TreeNode } from '../types'
import type { FamilyGraph } from '../utils/relationships'
import { layoutTree } from '../utils/treeLayout'
import { PersonCard } from './PersonCard'

interface TreeViewProps {
  graph: FamilyGraph
  focusId: string
  selectedId: string | null
  onSelect: (id: string) => void
  onFocus: (id: string) => void
}


function centerX(node: { x: number }) {
  return node.x
}

export function TreeView({ graph, focusId, selectedId, onSelect, onFocus }: TreeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  useEffect(() => {
    setExpandedId(null)
  }, [focusId])

  const tree = useMemo(
    () => graph.buildExpandableTree(focusId, expandedId),
    [graph, focusId, expandedId],
  )
  const layout = useMemo(() => (tree ? layoutTree(tree) : null), [tree])

  const fitToView = useCallback(() => {
    const container = containerRef.current
    if (!container || !layout) return

    const padding = 32
    const sx = (container.clientWidth - padding * 2) / layout.width
    const sy = (container.clientHeight - padding * 2) / layout.height
    const nextScale = Math.min(Math.max(Math.min(sx, sy), 0.08), 1.2)

    setScale(nextScale)
    setOffset({
      x: (container.clientWidth - layout.width * nextScale) / 2,
      y: (container.clientHeight - layout.height * nextScale) / 2,
    })
  }, [layout])

  useEffect(() => {
    fitToView()
  }, [fitToView, focusId, expandedId])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(() => fitToView())
    observer.observe(container)
    return () => observer.disconnect()
  }, [fitToView])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.92 : 1.08
      setScale((s) => Math.min(Math.max(s * delta, 0.25), 2.5))
    }

    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    const target = e.target as Element
    if (target.closest('button')) return
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    setOffset({
      x: dragRef.current.ox + (e.clientX - dragRef.current.x),
      y: dragRef.current.oy + (e.clientY - dragRef.current.y),
    })
  }

  const onPointerUp = () => {
    dragRef.current = null
  }

  const handleCardClick = (id: string) => {
    onSelect(id)
    if (graph.hasChildren(id)) {
      setExpandedId((prev) => (prev === id ? null : id))
    }
  }

  if (!layout || !tree) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--color-bark-light)]">
        Select a family member to view the tree
      </div>
    )
  }

  const nodeMap = new Map(layout.nodes.map((n) => [n.id, n]))
  const spouseMap = useMemo(() => buildSpouseMap(layout.edges), [layout.edges])

  const descendantHints = useMemo(
    () => collectDescendantHints(tree, nodeMap, graph),
    [tree, layout.nodes, graph],
  )

  const bottomY = (node: (typeof layout.nodes)[0]) => node.y + node.cardH
  const topY = (node: (typeof layout.nodes)[0]) => node.y
  const midHeightY = (node: (typeof layout.nodes)[0]) => node.y + node.cardH / 2

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="absolute right-4 top-4 z-10 flex gap-2 rounded-2xl p-1 glass">
        <ToolbarButton onClick={() => setScale((s) => Math.min(s * 1.15, 2.5))}>+</ToolbarButton>
        <ToolbarButton onClick={() => setScale((s) => Math.max(s * 0.85, 0.25))}>−</ToolbarButton>
        <ToolbarButton onClick={fitToView}>Fit</ToolbarButton>
      </div>

      <div
        ref={containerRef}
        className="tree-canvas relative z-0 min-h-0 flex-1 overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="family-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--color-sage)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--color-sage-light)" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          <g transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}>
            {layout.edges.map((edge, i) => {
              const from = nodeMap.get(edge.from)
              const to = nodeMap.get(edge.to)
              if (!from || !to) return null

              if (edge.type === 'marriage') {
                const vertical = edge.marriageLayout === 'vertical'
                if (vertical) {
                  const top = topY(from) < topY(to) ? from : to
                  const bottom = top === from ? to : from
                  const x = centerX(top)
                  return (
                    <MarriageChainLink
                      key={`e-${i}`}
                      x1={x}
                      y1={bottomY(top)}
                      x2={x}
                      y2={topY(bottom)}
                      vertical
                    />
                  )
                }

                const left = centerX(from) < centerX(to) ? from : to
                const right = left === from ? to : from
                const y = midHeightY(left)
                return (
                  <MarriageChainLink
                    key={`e-${i}`}
                    x1={centerX(left) + left.cardW / 2}
                    y1={y}
                    x2={centerX(right) - right.cardW / 2}
                    y2={y}
                    vertical={false}
                  />
                )
              }

              const child = to
              let parentX = centerX(from)
              let y1 = bottomY(from)
              if (edge.coupleFrom) {
                const [idA, idB] = edge.coupleFrom
                const nodeA = nodeMap.get(idA)
                const nodeB = nodeMap.get(idB)
                if (nodeA && nodeB) {
                  if (Math.abs(centerX(nodeA) - centerX(nodeB)) < 4) {
                    const bottomNode = nodeA.y > nodeB.y ? nodeA : nodeB
                    parentX = centerX(bottomNode)
                    y1 = bottomY(bottomNode)
                  } else {
                    parentX = (centerX(nodeA) + centerX(nodeB)) / 2
                    y1 = Math.max(bottomY(nodeA), bottomY(nodeB))
                  }
                }
              }

              const childAnchor = childColumnAnchor(child.id, nodeMap, spouseMap)
              const x1 = parentX
              const x2 = childAnchor.x
              const y2 = childAnchor.y
              const busY = y1 + Math.max(18, (y2 - y1) * 0.45)

              return (
                <path
                  key={`e-${i}`}
                  d={`M ${x1} ${y1} L ${x1} ${busY} L ${x2} ${busY} L ${x2} ${y2}`}
                  fill="none"
                  stroke="var(--color-sage-light)"
                  strokeWidth={1.25}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )
            })}
          </g>
        </svg>

        <div
          className="tree-nodes-3d absolute left-0 top-0 origin-top-left"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            width: layout.width,
            height: layout.height,
          }}
        >
          {layout.nodes.map((node) => (
            <div
              key={node.id}
              className="person-card-slot absolute"
              data-deep={node.depth >= 2 ? 'true' : undefined}
              style={{
                left: node.x - node.cardW / 2,
                top: node.y,
                width: node.cardW,
                height: node.cardH,
                ['--card-h' as string]: `${node.cardH}px`,
                zIndex: 80 - node.depth * 12 + (node.role === 'child' ? 6 : 0),
              }}
            >
              <PersonCard
                member={node.member}
                graph={graph}
                displayRole={node.role}
                selected={selectedId === node.id}
                expanded={expandedId === node.id}
                showBirthPlace={false}
                onClick={() => handleCardClick(node.id)}
                onDoubleClick={() => onFocus(node.id)}
              />
            </div>
          ))}
          {descendantHints.map((hint) => (
            <DescendantBranchHintInteractive
              key={`hint-${hint.id}`}
              cx={hint.cx}
              y={hint.y}
              memberId={hint.id}
              onFocus={onFocus}
            />
          ))}
        </div>
      </div>

      <div className="glass shrink-0 border-t border-[color-mix(in_srgb,white_35%,transparent)] px-4 py-2.5 text-center text-xs text-[var(--color-bark-light)]">
        Click someone to reveal their children · Click again to collapse · Double-click to re-center ·
        Drag to pan
      </div>
    </div>
  )
}

function buildSpouseMap(edges: { from: string; to: string; type: string }[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const edge of edges) {
    if (edge.type !== 'marriage') continue
    map.set(edge.from, edge.to)
    map.set(edge.to, edge.from)
  }
  return map
}

type LayoutPoint = { x: number; y: number; cardW: number; cardH: number }

/** Anchor parent-child lines on the child column center (matches the trunk from ancestors). */
function childColumnAnchor(
  childId: string,
  nodeMap: Map<string, LayoutPoint>,
  spouseMap: Map<string, string>,
): { x: number; y: number } {
  const child = nodeMap.get(childId)
  if (!child) return { x: 0, y: 0 }

  const spouseId = spouseMap.get(childId)
  const spouse = spouseId ? nodeMap.get(spouseId) : undefined
  if (!spouse) {
    return { x: child.x, y: child.y }
  }

  const sameColumn = Math.abs(child.x - spouse.x) < 4
  if (sameColumn) {
    const top = child.y < spouse.y ? child : spouse
    return { x: child.x, y: top.y }
  }

  const left = child.x < spouse.x ? child : spouse
  const right = left === child ? spouse : child
  return {
    x: (left.x + right.x) / 2,
    y: Math.min(child.y, spouse.y),
  }
}

function ToolbarButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="glass-toolbar flex h-9 w-9 items-center justify-center rounded-xl text-sm font-medium text-[var(--color-bark)]"
    >
      {children}
    </button>
  )
}

/** Interlocking rings between spouses, with lines connecting card edges */
function MarriageChainLink({
  x1,
  y1,
  x2,
  y2,
  vertical,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  vertical: boolean
}) {
  const cx = (x1 + x2) / 2
  const cy = (y1 + y2) / 2

  return (
    <g className="marriage-chain-link">
      <line className="marriage-chain-connector" x1={x1} y1={y1} x2={x2} y2={y2} />
      <g transform={`translate(${cx}, ${cy}) rotate(${vertical ? 90 : 0})`}>
        <ellipse className="marriage-chain-ring" cx={-4.5} cy={0} rx={7.5} ry={4.8} />
        <ellipse className="marriage-chain-ring" cx={4.5} cy={0} rx={7.5} ry={4.8} />
      </g>
    </g>
  )
}

interface DescendantHint {
  id: string
  cx: number
  y: number
}

function collectDescendantHints(
  node: TreeNode,
  nodeMap: Map<string, { x: number; y: number; cardH: number }>,
  graph: FamilyGraph,
): DescendantHint[] {
  const hints: DescendantHint[] = []

  const walk = (treeNode: TreeNode) => {
    if (graph.hasChildren(treeNode.member.id) && treeNode.children.length === 0) {
      const column = columnBottom(treeNode, nodeMap)
      if (column) hints.push({ id: treeNode.member.id, ...column })
    }
    treeNode.children.forEach(walk)
  }

  walk(node)
  return hints
}

function columnBottom(
  treeNode: TreeNode,
  nodeMap: Map<string, { x: number; y: number; cardH: number }>,
): { cx: number; y: number } | null {
  const memberLayout = nodeMap.get(treeNode.member.id)
  if (!memberLayout) return null

  let bottom = memberLayout.y + memberLayout.cardH
  if (treeNode.spouse) {
    const spouseLayout = nodeMap.get(treeNode.spouse.id)
    if (spouseLayout) bottom = Math.max(bottom, spouseLayout.y + spouseLayout.cardH)
  }

  return { cx: memberLayout.x, y: bottom + 10 }
}

/** Small branching motif below siblings who have hidden descendants */
function DescendantBranchHintInteractive({
  cx,
  y,
  memberId,
  onFocus,
}: {
  cx: number
  y: number
  memberId: string
  onFocus: (id: string) => void
}) {
  const width = 48
  const height = 40
  const center = width / 2
  const stemEnd = 16
  const branchY = 24

  const stopDrag = (e: React.PointerEvent) => {
    e.stopPropagation()
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onFocus(memberId)
  }

  return (
    <button
      type="button"
      className="descendant-branch-hint-interactive absolute"
      style={{ left: cx - center, top: y, width, height }}
      onPointerDown={stopDrag}
      onDoubleClick={handleDoubleClick}
      aria-label="Re-center tree on this branch"
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="descendant-branch-hint-svg pointer-events-none"
        aria-hidden="true"
      >
        <line className="descendant-branch-stem" x1={center} y1={0} x2={center} y2={stemEnd} />
        <line className="descendant-branch-fork" x1={center} y1={stemEnd} x2={center - 11} y2={branchY} />
        <line className="descendant-branch-fork" x1={center} y1={stemEnd} x2={center} y2={branchY + 2} />
        <line className="descendant-branch-fork" x1={center} y1={stemEnd} x2={center + 11} y2={branchY} />
        <circle
          className="descendant-branch-node descendant-branch-node-left"
          cx={center - 11}
          cy={branchY}
          r={3.2}
        />
        <circle
          className="descendant-branch-node descendant-branch-node-center"
          cx={center}
          cy={branchY + 2}
          r={3.6}
        />
        <circle
          className="descendant-branch-node descendant-branch-node-right"
          cx={center + 11}
          cy={branchY}
          r={3.2}
        />
      </svg>
    </button>
  )
}

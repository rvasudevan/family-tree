import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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

const CHILD_REVEAL_STAGGER_MS = 2200
const CHILD_REVEAL_ANIM_MS = 2200
const VIEWPORT_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'

export function TreeView({ graph, focusId, selectedId, onSelect, onFocus }: TreeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [revealedChildCount, setRevealedChildCount] = useState(0)
  const [enteringChildId, setEnteringChildId] = useState<string | null>(null)
  const [smoothViewport, setSmoothViewport] = useState(false)
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const slotRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  useEffect(() => {
    setExpandedId(null)
    setRevealedChildCount(0)
    setEnteringChildId(null)
  }, [focusId])

  useEffect(() => {
    if (!expandedId || revealedChildCount <= 0) return

    const member = graph.get(expandedId)
    if (!member) return

    const children = graph.getChildren(member)
    const entering = children[revealedChildCount - 1]
    if (entering) setEnteringChildId(entering.id)

    const animTimer = window.setTimeout(() => setEnteringChildId(null), CHILD_REVEAL_ANIM_MS)
    if (revealedChildCount >= children.length) {
      return () => window.clearTimeout(animTimer)
    }

    const revealTimer = window.setTimeout(() => {
      setRevealedChildCount((count) => count + 1)
    }, CHILD_REVEAL_STAGGER_MS)

    return () => {
      window.clearTimeout(revealTimer)
      window.clearTimeout(animTimer)
    }
  }, [expandedId, revealedChildCount, graph])

  const tree = useMemo(
    () => graph.buildExpandableTree(focusId, expandedId, revealedChildCount),
    [graph, focusId, expandedId, revealedChildCount],
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
  }, [fitToView, focusId, expandedId, layout?.width, layout?.height])

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
    setSmoothViewport(false)
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
    if (!graph.hasChildren(id)) return

    if (expandedId === id) {
      setExpandedId(null)
      setRevealedChildCount(0)
      setEnteringChildId(null)
      return
    }

    setExpandedId(id)
    setRevealedChildCount(1)
    setSmoothViewport(true)
  }

  const hiddenNodeIds = useMemo(() => {
    const hidden = new Set<string>()
    if (!expandedId || revealedChildCount <= 0) return hidden

    const parent = graph.get(expandedId)
    if (!parent) return hidden

    for (const child of graph.getChildren(parent).slice(revealedChildCount)) {
      hidden.add(child.id)
      const spouse = graph.getSpouse(child)
      if (spouse) hidden.add(spouse.id)
    }
    return hidden
  }, [graph, expandedId, revealedChildCount])

  const enteringIds = useMemo(() => {
    if (!enteringChildId) return new Set<string>()
    const ids = new Set<string>([enteringChildId])
    const member = graph.get(enteringChildId)
    const spouse = member ? graph.getSpouse(member) : undefined
    if (spouse) ids.add(spouse.id)
    return ids
  }, [enteringChildId, graph])

  const spouseMap = useMemo(
    () => buildSpouseMap(layout?.edges ?? []),
    [layout?.edges],
  )

  const nodeMap = useMemo(
    () => new Map((layout?.nodes ?? []).map((n) => [n.id, n])),
    [layout?.nodes],
  )

  const parentOrigin = useMemo(() => {
    if (!expandedId || !layout) return null
    return parentRevealOrigin(expandedId, nodeMap, spouseMap)
  }, [expandedId, layout, nodeMap, spouseMap])

  const descendantHints = useMemo(
    () => (tree && layout ? collectDescendantHints(tree, nodeMap, graph) : []),
    [tree, layout, nodeMap, graph],
  )

  useLayoutEffect(() => {
    if (!enteringChildId || !parentOrigin || !layout) return

    const member = graph.get(enteringChildId)
    const spouse = member ? graph.getSpouse(member) : undefined
    const ids = [enteringChildId, spouse?.id].filter((id): id is string => Boolean(id))

    const animations = ids
      .map((id) => {
        const el = slotRefs.current.get(id)
        const node = nodeMap.get(id)
        if (!el || !node) return null
        return runSpiralReveal(el, node, parentOrigin)
      })
      .filter((anim): anim is Animation => anim != null)

    return () => {
      animations.forEach((anim) => {
        if (anim.playState !== 'finished') anim.cancel()
      })
    }
  }, [enteringChildId, parentOrigin, layout, nodeMap, graph])

  if (!layout || !tree) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--color-bark-light)]">
        Select a family member to view the tree
      </div>
    )
  }

  const bottomY = (node: (typeof layout.nodes)[0]) => node.y + node.cardH
  const topY = (node: (typeof layout.nodes)[0]) => node.y
  const midHeightY = (node: (typeof layout.nodes)[0]) => node.y + node.cardH / 2
  const viewportTransform = `translate(${offset.x}px, ${offset.y}px) scale(${scale})`
  const viewportStyle = smoothViewport
    ? { transition: `transform 0.9s ${VIEWPORT_EASE}` }
    : undefined

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
          <g
            transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}
            style={viewportStyle}
          >
            {layout.edges.map((edge, i) => {
              const from = nodeMap.get(edge.from)
              const to = nodeMap.get(edge.to)
              if (!from || !to) return null
              if (hiddenNodeIds.has(edge.from) || hiddenNodeIds.has(edge.to)) return null

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
              const edgeEntering = enteringChildId === child.id

              return (
                <path
                  key={`e-${i}`}
                  className={edgeEntering ? 'child-edge-entering' : undefined}
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
            transform: viewportTransform,
            width: layout.width,
            height: layout.height,
            ...viewportStyle,
          }}
        >
          {layout.nodes.map((node) => {
            if (hiddenNodeIds.has(node.id)) return null

            return (
            <div
              key={node.id}
              ref={(el) => {
                if (el) slotRefs.current.set(node.id, el)
                else slotRefs.current.delete(node.id)
              }}
              className="person-card-slot absolute"
              data-deep={node.depth >= 2 ? 'true' : undefined}
              style={{
                left: node.x - node.cardW / 2,
                top: node.y,
                width: node.cardW,
                height: node.cardH,
                ['--card-h' as string]: `${node.cardH}px`,
                zIndex: enteringIds.has(node.id) ? 200 : 80 - node.depth * 12 + (node.role === 'child' ? 6 : 0),
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
            )
          })}
        </div>

        <div
          className="tree-hints-layer absolute left-0 top-0 origin-top-left"
          style={{
            transform: viewportTransform,
            width: layout.width,
            height: layout.height,
            ...viewportStyle,
          }}
        >
          {descendantHints.map((hint) => (
            <DescendantBranchHintInteractive
              key={`hint-${hint.id}`}
              cx={hint.cx}
              y={hint.y}
              memberId={hint.id}
              focusId={focusId}
              expandedId={expandedId}
              hasChildren={graph.hasChildren(hint.id)}
              onFocus={onFocus}
              onExpand={handleCardClick}
            />
          ))}
        </div>
      </div>

      <div className="glass shrink-0 border-t border-[color-mix(in_srgb,white_35%,transparent)] px-4 py-2.5 text-center text-xs text-[var(--color-bark-light)]">
        Click someone to reveal their children · Click again to collapse · Double-click a card or branch
        hint to re-center · Drag to pan
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

function parentRevealOrigin(
  expandedId: string,
  nodeMap: Map<string, LayoutPoint>,
  spouseMap: Map<string, string>,
): { x: number; y: number } | null {
  const parent = nodeMap.get(expandedId)
  if (!parent) return null

  const spouseId = spouseMap.get(expandedId)
  const spouse = spouseId ? nodeMap.get(spouseId) : undefined

  let originX = parent.x
  let originY = parent.y + parent.cardH

  if (spouse) {
    const sameColumn = Math.abs(spouse.x - parent.x) < 4
    if (sameColumn) {
      originY = Math.max(originY, spouse.y + spouse.cardH)
    } else {
      originX = (parent.x + spouse.x) / 2
      originY = Math.max(parent.y + parent.cardH, spouse.y + spouse.cardH)
    }
  }

  return { x: originX, y: originY }
}

function revealOffset(node: LayoutPoint, origin: { x: number; y: number }) {
  const centerY = node.y + node.cardH / 2
  const dx = origin.x - node.x
  const dy = origin.y - centerY
  const curve = Math.min(80, Math.max(32, Math.abs(dx) * 0.4)) * (dx >= 0 ? -1 : 1)
  return { dx, dy, curve }
}

function runSpiralReveal(
  el: HTMLElement,
  node: LayoutPoint,
  origin: { x: number; y: number },
): Animation {
  const { dx, dy, curve } = revealOffset(node, origin)

  el.style.transformOrigin = '50% 50%'
  el.style.willChange = 'transform, opacity'

  const anim = el.animate(
    [
      {
        transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.05) rotateZ(-220deg) rotateY(42deg)`,
        opacity: 0,
      },
      {
        offset: 0.28,
        transform: `translate3d(${dx * 0.72 + curve * 0.6}px, ${dy * 0.58 - 28}px, 0) scale(0.22) rotateZ(-168deg) rotateY(26deg)`,
        opacity: 0.35,
      },
      {
        offset: 0.52,
        transform: `translate3d(${dx * 0.38 + curve * 0.3}px, ${dy * 0.28 - 8}px, 0) scale(0.55) rotateZ(-88deg) rotateY(14deg)`,
        opacity: 0.68,
      },
      {
        offset: 0.76,
        transform: `translate3d(${dx * 0.1}px, ${dy * 0.05}px, 0) scale(0.9) rotateZ(-18deg) rotateY(4deg)`,
        opacity: 0.94,
      },
      {
        transform: 'translate3d(0, 0, 0) scale(1) rotateZ(0deg) rotateY(0deg)',
        opacity: 1,
      },
    ],
    {
      duration: CHILD_REVEAL_ANIM_MS,
      easing: VIEWPORT_EASE,
      fill: 'both',
    },
  )

  anim.onfinish = () => {
    el.style.willChange = 'auto'
    el.style.transform = ''
    el.style.opacity = ''
  }

  return anim
}

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
  focusId,
  expandedId,
  hasChildren,
  onFocus,
  onExpand,
}: {
  cx: number
  y: number
  memberId: string
  focusId: string
  expandedId: string | null
  hasChildren: boolean
  onFocus: (id: string) => void
  onExpand: (id: string) => void
}) {
  const width = 56
  const height = 48
  const center = width / 2
  const stemEnd = 18
  const branchY = 28

  const stopDrag = (e: React.PointerEvent) => {
    e.stopPropagation()
  }

  const activate = () => {
    if (memberId === focusId && hasChildren) {
      onExpand(memberId)
      return
    }
    onFocus(memberId)
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    activate()
  }

  const isCurrentFocus = memberId === focusId
  const label = isCurrentFocus
    ? expandedId === memberId
      ? 'Collapse this branch'
      : 'Reveal children for this branch'
    : 'Re-center tree on this branch'

  return (
    <button
      type="button"
      className="descendant-branch-hint-interactive absolute"
      style={{ left: cx - center, top: y, width, height }}
      onPointerDown={stopDrag}
      onDoubleClick={handleDoubleClick}
      aria-label={label}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="descendant-branch-hint-svg pointer-events-none"
        aria-hidden="true"
      >
        <line className="descendant-branch-stem" x1={center} y1={0} x2={center} y2={stemEnd} />
        <line className="descendant-branch-fork" x1={center} y1={stemEnd} x2={center - 12} y2={branchY} />
        <line className="descendant-branch-fork" x1={center} y1={stemEnd} x2={center} y2={branchY + 2} />
        <line className="descendant-branch-fork" x1={center} y1={stemEnd} x2={center + 12} y2={branchY} />
        <circle
          className="descendant-branch-node descendant-branch-node-left"
          cx={center - 12}
          cy={branchY}
          r={3.6}
        />
        <circle
          className="descendant-branch-node descendant-branch-node-center"
          cx={center}
          cy={branchY + 2}
          r={3.6}
        />
        <circle
          className="descendant-branch-node descendant-branch-node-right"
          cx={center + 12}
          cy={branchY}
          r={3.6}
        />
      </svg>
    </button>
  )
}

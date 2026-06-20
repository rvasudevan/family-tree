import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { LayoutEdge, LayoutNode, TreeNode } from '../types'

const BRANCH_HINT_PAD = 58
import type { FamilyGraph } from '../utils/relationships'
import { layoutTree } from '../utils/treeLayout'
import { PersonCard } from './PersonCard'
import { ThenkalaiNamamMark } from './ThenkalaiNamamMark'

interface TreeViewProps {
  graph: FamilyGraph
  focusId: string
  omitParents?: boolean
  isAdmin?: boolean
  onFocus: (id: string, options?: { omitParents?: boolean }) => void
  onAdminEdit?: (id: string) => void
}


function centerX(node: { x: number }) {
  return node.x
}

const CHILD_REVEAL_STAGGER_MS = 733
const CHILD_REVEAL_ANIM_MS = 733
const VIEWPORT_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'

const KRISHNAMACHARI_ROOT_ID = 'kr'
const KANAKAVALLI_ROOT_ID = 'ka'
const KRISHNAMACHARI_COUPLE_IDS = new Set([KRISHNAMACHARI_ROOT_ID, KANAKAVALLI_ROOT_ID])

type MarriageSymbol = 'chain' | 'thenkalai-namam'

function isKrKaMarriage(from: string, to: string): boolean {
  return (
    (from === KRISHNAMACHARI_ROOT_ID && to === KANAKAVALLI_ROOT_ID) ||
    (from === KANAKAVALLI_ROOT_ID && to === KRISHNAMACHARI_ROOT_ID)
  )
}

interface FocusReturnContext {
  focusId: string
  expandedId: string | null
  revealedChildCount: number
}

function krKaChildrenExpansion(
  focusId: string,
  graph: FamilyGraph,
): { expandedId: string; revealedChildCount: number } | null {
  if (!KRISHNAMACHARI_COUPLE_IDS.has(focusId)) return null
  const member = graph.get(focusId)
  if (!member || !graph.hasChildren(focusId)) return null
  return { expandedId: focusId, revealedChildCount: graph.getChildren(member).length }
}

export function TreeView({
  graph,
  focusId,
  omitParents = false,
  isAdmin = false,
  onFocus,
  onAdminEdit,
}: TreeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [revealedChildCount, setRevealedChildCount] = useState(0)
  const [enteringChildId, setEnteringChildId] = useState<string | null>(null)
  const [unsettledNodeIds, setUnsettledNodeIds] = useState<Set<string>>(() => new Set())
  const [smoothViewport, setSmoothViewport] = useState(false)
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const slotRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const preferAncestorFrameRef = useRef(false)
  const pendingHintNavigationRef = useRef(false)
  const pendingRestoreRef = useRef<FocusReturnContext | null>(null)
  const returnContextRef = useRef<FocusReturnContext | null>(null)

  useEffect(() => {
    if (pendingRestoreRef.current) {
      const ctx = pendingRestoreRef.current
      pendingRestoreRef.current = null
      setSmoothViewport(true)

      const krKaExpansion = krKaChildrenExpansion(ctx.focusId, graph)
      if (krKaExpansion) {
        setExpandedId(krKaExpansion.expandedId)
        setRevealedChildCount(krKaExpansion.revealedChildCount)
      } else if (ctx.expandedId && ctx.revealedChildCount > 0) {
        setExpandedId(ctx.expandedId)
        setRevealedChildCount(ctx.revealedChildCount)
      } else {
        setExpandedId(null)
        setRevealedChildCount(0)
      }
      setEnteringChildId(null)
      return
    }

    if (pendingHintNavigationRef.current) {
      pendingHintNavigationRef.current = false
      preferAncestorFrameRef.current = true
      setSmoothViewport(true)

      const member = graph.get(focusId)
      if (member && graph.hasChildren(focusId)) {
        setExpandedId(focusId)
        setRevealedChildCount(graph.getChildren(member).length)
        setEnteringChildId(null)
        return
      }
    }

    setExpandedId(null)
    setRevealedChildCount(0)
    setEnteringChildId(null)
    setUnsettledNodeIds(new Set())
    returnContextRef.current = null
  }, [focusId, graph])

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
    () => graph.buildExpandableTree(focusId, expandedId, revealedChildCount, !omitParents),
    [graph, focusId, expandedId, revealedChildCount, omitParents],
  )
  const layout = useMemo(() => (tree ? layoutTree(tree) : null), [tree])

  const fitToView = useCallback(() => {
    const container = containerRef.current
    if (!container || !layout) return

    const padding = 40
    const useAncestorFrame = preferAncestorFrameRef.current
    preferAncestorFrameRef.current = false

    const ancestorFrame = useAncestorFrame
      ? ancestorViewportFrame(layout.nodes, focusId, graph, expandedId !== null)
      : null

    const minX = ancestorFrame?.minX ?? 0
    const minY = ancestorFrame?.minY ?? 0
    const frameW = ancestorFrame ? ancestorFrame.maxX - ancestorFrame.minX : layout.width
    const frameH = ancestorFrame
      ? ancestorFrame.maxY - ancestorFrame.minY + BRANCH_HINT_PAD
      : layout.height

    const sx = (container.clientWidth - padding * 2) / frameW
    const sy = (container.clientHeight - padding * 2) / frameH
    const nextScale = Math.min(Math.max(Math.min(sx, sy), 0.08), 1.2)

    setScale(nextScale)
    setOffset({
      x: (container.clientWidth - frameW * nextScale) / 2 - minX * nextScale,
      y: (container.clientHeight - frameH * nextScale) / 2 - minY * nextScale,
    })
  }, [layout, focusId, graph, expandedId])

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
    if (id === focusId && omitParents) {
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
      return
    }

    returnContextRef.current = {
      focusId,
      expandedId,
      revealedChildCount,
    }
    pendingHintNavigationRef.current = true
    setSmoothViewport(true)
    onFocus(id, { omitParents: true })
  }

  const handleFocusFromHint = (id: string) => {
    returnContextRef.current = {
      focusId,
      expandedId,
      revealedChildCount,
    }
    pendingHintNavigationRef.current = true
    onFocus(id, { omitParents: true })
  }

  const handleMoveUpGeneration = (memberId: string) => {
    if (omitParents && returnContextRef.current) {
      const ctx = returnContextRef.current
      returnContextRef.current = null
      pendingRestoreRef.current = ctx
      preferAncestorFrameRef.current = false
      setSmoothViewport(true)
      onFocus(ctx.focusId, { omitParents: false })
      return
    }

    const member = graph.get(memberId)
    if (!member) return

    const { father, mother } = graph.getParents(member)
    const parentId = father?.id ?? mother?.id
    if (!parentId) return

    preferAncestorFrameRef.current = true
    setSmoothViewport(true)
    onFocus(parentId)
  }

  const handleExpandFromHint = (id: string) => {
    preferAncestorFrameRef.current = true
    setSmoothViewport(true)
    handleCardClick(id)
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

  const horizontalCoupleMeta = useMemo(
    () => buildHorizontalCoupleMeta(layout?.nodes ?? [], layout?.edges ?? []),
    [layout?.nodes, layout?.edges],
  )

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

  const descendantHints = useMemo(() => {
    if (!tree || !layout) return []
    const rootCoupleCenterX = rootLevelCoupleCenterX(layout.nodes, focusId, spouseMap)
    return collectDescendantHints(tree, nodeMap, graph, focusId, rootCoupleCenterX, spouseMap)
  }, [tree, layout, nodeMap, graph, focusId, spouseMap])

  const ancestorHints = useMemo(
    () => (layout ? collectAncestorHints(layout.nodes, graph, spouseMap) : []),
    [layout, graph, spouseMap],
  )

  const isHintReady = useCallback(
    (memberId: string) => !unsettledNodeIds.has(memberId) && !hiddenNodeIds.has(memberId),
    [unsettledNodeIds, hiddenNodeIds],
  )

  const visibleAncestorHints = useMemo(
    () => ancestorHints.filter((hint) => isHintReady(hint.id)),
    [ancestorHints, isHintReady],
  )

  const visibleDescendantHints = useMemo(
    () => descendantHints.filter((hint) => isHintReady(hint.id)),
    [descendantHints, isHintReady],
  )

  useLayoutEffect(() => {
    if (!enteringChildId || !parentOrigin || !layout) return

    const member = graph.get(enteringChildId)
    const spouse = member ? graph.getSpouse(member) : undefined
    const ids = [enteringChildId, spouse?.id].filter((id): id is string => Boolean(id))

    setUnsettledNodeIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.add(id))
      return next
    })

    const markSettled = () => {
      setUnsettledNodeIds((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      })
    }

    const animations = ids
      .map((id) => {
        const el = slotRefs.current.get(id)
        const node = nodeMap.get(id)
        if (!el || !node) return null
        return runSpiralReveal(el, node, parentOrigin)
      })
      .filter((anim): anim is Animation => anim != null)

    if (animations.length === 0) {
      markSettled()
    } else {
      void Promise.all(animations.map((anim) => anim.finished)).then(markSettled).catch(markSettled)
    }

    return () => {
      animations.forEach((anim) => {
        if (anim.playState !== 'finished') anim.cancel()
      })
      markSettled()
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
                      symbol={isKrKaMarriage(edge.from, edge.to) ? 'thenkalai-namam' : 'chain'}
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
                    symbol={isKrKaMarriage(edge.from, edge.to) ? 'thenkalai-namam' : 'chain'}
                  />
                )
              }

              const child = to
              let parentX = centerX(from)
              let y1 = bottomY(from)
              if (edge.coupleFrom) {
                const [idA, idB] = edge.coupleFrom
                const parentAnchor = coupleFromAnchor(idA, idB, nodeMap)
                if (parentAnchor) {
                  parentX = parentAnchor.cx
                  y1 = parentAnchor.bottomY
                }
              }

              const childAnchor = childColumnAnchor(child.id, nodeMap, spouseMap)
              const x1 = parentX
              const x2 = childAnchor.x
              const y2 = childAnchor.y
              const aligned = Math.abs(x1 - x2) < 0.5
              const busY = aligned ? y1 + (y2 - y1) * 0.45 : y1 + Math.max(18, (y2 - y1) * 0.45)
              const edgeEntering = enteringChildId === child.id

              return (
                <path
                  key={`e-${i}`}
                  className={edgeEntering ? 'child-edge-entering' : undefined}
                  d={
                    aligned
                      ? `M ${x1} ${y1} L ${x2} ${y2}`
                      : `M ${x1} ${y1} L ${x1} ${busY} L ${x2} ${busY} L ${x2} ${y2}`
                  }
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

            const hCouple = horizontalCoupleMeta.get(node.id)

            return (
            <div
              key={node.id}
              ref={(el) => {
                if (el) slotRefs.current.set(node.id, el)
                else slotRefs.current.delete(node.id)
              }}
              className="person-card-slot absolute"
              data-deep={node.depth >= 2 ? 'true' : undefined}
              data-hcouple={hCouple?.pairKey}
              style={{
                left: node.x - node.cardW / 2,
                top: node.y,
                width: node.cardW,
                height: node.cardH,
                ['--card-h' as string]: `${node.cardH}px`,
                zIndex: stackZIndex(node, enteringIds, nodeMap, spouseMap),
              }}
            >
              <PersonCard
                member={node.member}
                graph={graph}
                displayRole={node.role}
                expanded={expandedId === node.id}
                showBirthPlace={false}
                onClick={() => handleCardClick(node.id)}
                onDoubleClick={() => {
                  if (isAdmin && onAdminEdit) onAdminEdit(node.id)
                  else onFocus(node.id)
                }}
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
          {visibleAncestorHints.map((hint) => (
            <AncestorBranchHintInteractive
              key={`up-${hint.id}`}
              cx={hint.cx}
              y={hint.y}
              memberId={hint.id}
              graph={graph}
              omitParents={omitParents}
              returnFocusId={returnContextRef.current?.focusId}
              onMoveUp={handleMoveUpGeneration}
            />
          ))}
          {visibleDescendantHints.map((hint) => (
            <DescendantBranchHintInteractive
              key={`hint-${hint.id}`}
              cx={hint.cx}
              y={hint.y}
              memberId={hint.id}
              focusId={focusId}
              expandedId={expandedId}
              hasChildren={graph.hasChildren(hint.id)}
              onFocus={handleFocusFromHint}
              onExpand={handleExpandFromHint}
            />
          ))}
        </div>
      </div>

      <div className="glass shrink-0 border-t border-[color-mix(in_srgb,white_35%,transparent)] px-4 py-2.5 text-center text-xs text-[var(--color-bark-light)]">
        Click someone to center on them · Click again to collapse their children · Click the arrow above to
        move up · Click the arrow below a branch to open it · Double-click a card to re-center · Drag to pan
      </div>
    </div>
  )
}

function buildHorizontalCoupleMeta(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
): Map<string, { pairKey: string; rowCenterY: number }> {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const meta = new Map<string, { pairKey: string; rowCenterY: number }>()

  for (const edge of edges) {
    if (edge.type !== 'marriage' || edge.marriageLayout !== 'horizontal') continue
    const left = nodeMap.get(edge.from)
    const right = nodeMap.get(edge.to)
    if (!left || !right) continue

    const rowTop = Math.min(left.y, right.y)
    const rowHeight = Math.max(left.cardH, right.cardH)
    const rowCenterY = rowTop + rowHeight / 2
    const pairKey = [edge.from, edge.to].sort().join(':')

    meta.set(edge.from, { pairKey, rowCenterY })
    meta.set(edge.to, { pairKey, rowCenterY })
  }

  return meta
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

/** Keep vertically stacked spouses under their partner until hover lifts the card. */
function stackZIndex(
  node: { id: string; x: number; y: number; depth: number; role: string },
  enteringIds: Set<string>,
  nodeMap: Map<string, { x: number; y: number }>,
  spouseMap: Map<string, string>,
): number {
  if (enteringIds.has(node.id)) return 200

  let z = 80 - node.depth * 12 + (node.role === 'child' ? 6 : 0)

  if (node.role === 'parent') z += 12

  if (node.role === 'spouse') {
    const partnerId = spouseMap.get(node.id)
    const partner = partnerId ? nodeMap.get(partnerId) : undefined
    if (partner && Math.abs(partner.x - node.x) < 4 && node.y > partner.y) {
      z -= 8
    }
  }

  return z
}

type LayoutPoint = { x: number; y: number; cardW: number; cardH: number }
type ColumnPoint = Pick<LayoutPoint, 'x' | 'y' | 'cardH'>

function parentRevealOrigin(
  expandedId: string,
  nodeMap: Map<string, LayoutPoint>,
  spouseMap: Map<string, string>,
): { x: number; y: number } | null {
  const column = coupleColumnBounds(expandedId, nodeMap, spouseMap)
  if (!column) return null
  return { x: column.cx, y: column.bottomY }
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

/** Shared column geometry for a person and their spouse in the layout. */
function coupleColumnBounds(
  memberId: string,
  nodeMap: Map<string, ColumnPoint>,
  spouseMap: Map<string, string>,
): { cx: number; topY: number; bottomY: number } | null {
  const member = nodeMap.get(memberId)
  if (!member) return null

  const spouseId = spouseMap.get(memberId)
  const spouse = spouseId ? nodeMap.get(spouseId) : undefined

  if (!spouse) {
    return {
      cx: member.x,
      topY: member.y,
      bottomY: member.y + member.cardH,
    }
  }

  const sameColumn = Math.abs(member.x - spouse.x) < 4
  if (sameColumn) {
    return {
      cx: member.x,
      topY: Math.min(member.y, spouse.y),
      bottomY: Math.max(member.y + member.cardH, spouse.y + spouse.cardH),
    }
  }

  return {
    cx: (member.x + spouse.x) / 2,
    topY: Math.min(member.y, spouse.y),
    bottomY: Math.max(member.y + member.cardH, spouse.y + spouse.cardH),
  }
}

function coupleFromAnchor(
  idA: string,
  idB: string,
  nodeMap: Map<string, LayoutPoint>,
): { cx: number; bottomY: number } | null {
  const nodeA = nodeMap.get(idA)
  const nodeB = nodeMap.get(idB)
  if (!nodeA || !nodeB) return null

  if (Math.abs(nodeA.x - nodeB.x) < 4) {
    const bottomNode = nodeA.y > nodeB.y ? nodeA : nodeB
    return { cx: nodeA.x, bottomY: bottomNode.y + bottomNode.cardH }
  }

  return {
    cx: (nodeA.x + nodeB.x) / 2,
    bottomY: Math.max(nodeA.y + nodeA.cardH, nodeB.y + nodeB.cardH),
  }
}

/** Anchor parent-child lines on the child column center (matches the trunk from ancestors). */
function childColumnAnchor(
  childId: string,
  nodeMap: Map<string, LayoutPoint>,
  spouseMap: Map<string, string>,
): { x: number; y: number } {
  const column = coupleColumnBounds(childId, nodeMap, spouseMap)
  if (!column) return { x: 0, y: 0 }
  return { x: column.cx, y: column.topY }
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

/** Marriage connector between spouses — chain rings, or Thenkalai namam for Kr & Ka */
function MarriageChainLink({
  x1,
  y1,
  x2,
  y2,
  vertical,
  symbol = 'chain',
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  vertical: boolean
  symbol?: MarriageSymbol
}) {
  const cx = (x1 + x2) / 2
  const cy = (y1 + y2) / 2
  const namamScale = vertical ? 0.78 : 0.92

  return (
    <g className="marriage-chain-link">
      <line className="marriage-chain-connector" x1={x1} y1={y1} x2={x2} y2={y2} />
      <g transform={`translate(${cx}, ${cy}) rotate(${vertical ? 90 : 0})`}>
        {symbol === 'thenkalai-namam' ? (
          <g transform={`scale(${namamScale})`}>
            <ThenkalaiNamamMark />
          </g>
        ) : (
          <>
            <ellipse className="marriage-chain-ring" cx={-4.5} cy={0} rx={7.5} ry={4.8} />
            <ellipse className="marriage-chain-ring" cx={4.5} cy={0} rx={7.5} ry={4.8} />
          </>
        )}
      </g>
    </g>
  )
}

interface AncestorHint {
  id: string
  cx: number
  y: number
}

const BRANCH_HINT_HIT_WIDTH = 52
const ANCESTOR_HINT_GAP = 8
const ANCESTOR_HINT_HIT_HEIGHT = 52
const ANCESTOR_HINT_VISUAL_WIDTH = 32
const ANCESTOR_HINT_VISUAL_HEIGHT = 32
const DESCENDANT_HINT_HIT_HEIGHT = 56
const DESCENDANT_HINT_VISUAL_WIDTH = 32
const DESCENDANT_HINT_VISUAL_HEIGHT = 44

function collectAncestorHints(
  nodes: LayoutNode[],
  graph: FamilyGraph,
  spouseMap: Map<string, string>,
): AncestorHint[] {
  const hints: AncestorHint[] = []
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const handledPairs = new Set<string>()

  for (const node of nodes) {
    if (node.id === KRISHNAMACHARI_ROOT_ID) continue

    const member = graph.get(node.id)
    if (!member) continue

    const { father, mother } = graph.getParents(member)
    if (!father && !mother) continue

    const spouseId = spouseMap.get(node.id)
    const spouseNode = spouseId ? nodeMap.get(spouseId) : undefined

    if (spouseNode && Math.abs(spouseNode.x - node.x) >= 4) {
      const pairKey = [node.id, spouseNode.id].sort().join(':')
      if (handledPairs.has(pairKey)) continue
      handledPairs.add(pairKey)

      const column = coupleColumnBounds(node.id, nodeMap, spouseMap)
      if (!column) continue

      const spouseMember = graph.get(spouseNode.id)
      const spouseParents = spouseMember ? graph.getParents(spouseMember) : {}
      const memberId =
        father || mother
          ? node.id
          : spouseParents.father || spouseParents.mother
            ? spouseNode.id
            : node.id

      hints.push({
        id: memberId,
        cx: column.cx,
        y: column.topY - ANCESTOR_HINT_HIT_HEIGHT - ANCESTOR_HINT_GAP,
      })
      continue
    }

    const column = coupleColumnBounds(node.id, nodeMap, spouseMap)
    hints.push({
      id: node.id,
      cx: column?.cx ?? node.x,
      y: (column?.topY ?? node.y) - ANCESTOR_HINT_HIT_HEIGHT - ANCESTOR_HINT_GAP,
    })
  }

  return hints
}

interface DescendantHint {
  id: string
  cx: number
  y: number
}

function rootLevelCoupleCenterX(
  nodes: LayoutNode[],
  focusId: string,
  _spouseMap: Map<string, string>,
): number | null {
  if (!KRISHNAMACHARI_COUPLE_IDS.has(focusId)) return null

  const kr = nodes.find((n) => n.id === KRISHNAMACHARI_ROOT_ID)
  const ka = nodes.find((n) => n.id === KANAKAVALLI_ROOT_ID)
  if (kr && ka) return (kr.x + ka.x) / 2

  const focus = nodes.find((n) => n.id === focusId)
  return focus?.x ?? null
}

function collectDescendantHints(
  node: TreeNode,
  nodeMap: Map<string, { x: number; y: number; cardH: number }>,
  graph: FamilyGraph,
  focusId: string,
  rootCoupleCenterX: number | null,
  spouseMap: Map<string, string>,
): DescendantHint[] {
  const hints: DescendantHint[] = []
  const atKrKaRoot = rootCoupleCenterX !== null

  const walk = (treeNode: TreeNode) => {
    if (graph.hasChildren(treeNode.member.id) && treeNode.children.length === 0) {
      const column = columnBottom(treeNode, nodeMap, spouseMap)
      if (!column) return

      const centerOnParents = atKrKaRoot && treeNode.member.id === focusId

      hints.push({
        id: treeNode.member.id,
        cx: centerOnParents ? rootCoupleCenterX! : column.cx,
        y: column.y,
      })
    }
    treeNode.children.forEach(walk)
  }

  walk(node)
  return hints
}

function columnBottom(
  treeNode: TreeNode,
  nodeMap: Map<string, ColumnPoint>,
  spouseMap: Map<string, string>,
): { cx: number; y: number } | null {
  const column = coupleColumnBounds(treeNode.member.id, nodeMap, spouseMap)
  if (!column) return null
  return { cx: column.cx, y: column.bottomY + 10 }
}

/** Frame parents + focus couple (and expanded descendants) for branch-hint navigation */
function ancestorViewportFrame(
  nodes: LayoutNode[],
  focusId: string,
  graph: FamilyGraph,
  includeExpanded: boolean,
): { minX: number; maxX: number; minY: number; maxY: number } | null {
  const focusMember = graph.get(focusId)
  if (!focusMember) return null

  const spouse = graph.getSpouse(focusMember)
  const focusIds = new Set([focusId, spouse?.id].filter((id): id is string => Boolean(id)))

  let selected = nodes.filter((n) => n.role === 'parent' || focusIds.has(n.id))
  if (selected.length === 0) return null

  if (includeExpanded) {
    const focusRowY = Math.min(...selected.filter((n) => focusIds.has(n.id)).map((n) => n.y))
    const below = nodes.filter(
      (n) => n.y > focusRowY && !focusIds.has(n.id) && n.role !== 'parent',
    )
    selected = [...selected, ...below]
  }

  return {
    minX: Math.min(...selected.map((n) => n.x - n.cardW / 2)),
    maxX: Math.max(...selected.map((n) => n.x + n.cardW / 2)),
    minY: Math.min(...selected.map((n) => n.y)),
    maxY: Math.max(...selected.map((n) => n.y + n.cardH)),
  }
}

function LiquidBranchArrow({
  id,
  direction,
  center,
  tipY,
  baseY,
  half,
  tone,
}: {
  id: string
  direction: 'up' | 'down'
  center: number
  tipY: number
  baseY: number
  half: number
  tone: 'gold' | 'sage'
}) {
  const points = `${center},${tipY} ${center + half},${baseY} ${center - half},${baseY}`
  const depthPoints =
    direction === 'up'
      ? `${center},${tipY + 0.8} ${center + half + 0.55},${baseY + 1.15} ${center - half + 0.55},${baseY + 1.15}`
      : `${center},${tipY + 1.15} ${center + half + 0.55},${baseY + 0.8} ${center - half - 0.55},${baseY + 0.8}`
  const shinePoints =
    direction === 'up'
      ? `${center},${tipY + 2.2} ${center - half * 0.44},${baseY - 1.4} ${center - half + 1},${baseY - 0.35}`
      : `${center},${tipY - 2.2} ${center - half * 0.44},${baseY + 1.4} ${center - half + 1},${baseY + 0.35}`

  const bodyId = `${id}-body`
  const shineId = `${id}-shine`
  const filterId = `${id}-filter`
  const palette =
    tone === 'gold'
      ? { hi: '#e8dcc8', mid: '#a8926a', lo: '#6a5a44', spec: '#f8f4ee', stroke: '#8a7858' }
      : { hi: '#c8d4de', mid: '#9aabb8', lo: '#5a6a78', spec: '#f4f6f8', stroke: '#6b7d8f' }
  const gradY1 = direction === 'up' ? '0%' : '100%'
  const gradY2 = direction === 'up' ? '100%' : '0%'

  return (
    <g className={`branch-arrow-liquid branch-arrow-liquid-${tone} branch-arrow-${direction}`}>
      <defs>
        <linearGradient id={bodyId} x1="18%" y1={gradY1} x2="88%" y2={gradY2}>
          <stop offset="0%" stopColor={palette.hi} />
          <stop offset="46%" stopColor={palette.mid} />
          <stop offset="100%" stopColor={palette.lo} />
        </linearGradient>
        <linearGradient id={shineId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={palette.spec} stopOpacity="0.9" />
          <stop offset="100%" stopColor={palette.spec} stopOpacity="0" />
        </linearGradient>
        <filter id={filterId} x="-90%" y="-90%" width="280%" height="280%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.15" floodColor="#2a3140" floodOpacity="0.4" />
          <feDropShadow dx="0" dy="0" stdDeviation="0.7" floodColor={palette.mid} floodOpacity="0.38" />
        </filter>
      </defs>
      <g filter={`url(#${filterId})`}>
        <polygon className="branch-arrow-depth" points={depthPoints} />
        <polygon
          className="branch-arrow-body"
          points={points}
          fill={`url(#${bodyId})`}
          stroke={palette.stroke}
        />
        <polygon className="branch-arrow-shine" points={shinePoints} fill={`url(#${shineId})`} />
      </g>
    </g>
  )
}

/** Upward arrow above a card — click to move up one generation */
function AncestorBranchHintInteractive({
  cx,
  y,
  memberId,
  graph,
  omitParents,
  returnFocusId,
  onMoveUp,
}: {
  cx: number
  y: number
  memberId: string
  graph: FamilyGraph
  omitParents?: boolean
  returnFocusId?: string
  onMoveUp: (memberId: string) => void
}) {
  const visualWidth = ANCESTOR_HINT_VISUAL_WIDTH
  const visualHeight = ANCESTOR_HINT_VISUAL_HEIGHT
  const hitWidth = BRANCH_HINT_HIT_WIDTH
  const hitHeight = ANCESTOR_HINT_HIT_HEIGHT
  const center = visualWidth / 2
  const arrowTipY = 4
  const arrowBaseY = 13
  const arrowHalf = 7
  const stemStart = arrowBaseY

  const stopDrag = (e: React.PointerEvent) => {
    e.stopPropagation()
  }

  const member = graph.get(memberId)
  const { father, mother } = member ? graph.getParents(member) : {}
  const returnMember = returnFocusId ? graph.get(returnFocusId) : undefined
  const label =
    omitParents && returnMember
      ? KRISHNAMACHARI_COUPLE_IDS.has(returnFocusId!)
        ? 'Return to Krishnamachari and Kanakavalli with children'
        : `Return to ${returnMember.firstName}`
      : father && mother
        ? `Move up to ${father.firstName} and ${mother.firstName}`
        : father || mother
          ? `Move up to ${(father ?? mother)!.firstName}`
          : 'Move up one generation'

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onMoveUp(memberId)
  }

  return (
    <button
      type="button"
      className="ancestor-branch-hint-interactive absolute flex items-end justify-center"
      style={{ left: cx - hitWidth / 2, top: y, width: hitWidth, height: hitHeight }}
      onPointerDown={stopDrag}
      onClick={handleClick}
      aria-label={label}
    >
      <svg
        width={visualWidth}
        height={visualHeight}
        viewBox={`0 0 ${visualWidth} ${visualHeight}`}
        className="ancestor-branch-hint-svg pointer-events-none"
        aria-hidden="true"
      >
        <LiquidBranchArrow
          id={`ancestor-${memberId}`}
          direction="up"
          center={center}
          tipY={arrowTipY}
          baseY={arrowBaseY}
          half={arrowHalf}
          tone="gold"
        />
        <line
          className="descendant-branch-stem ancestor-branch-stem"
          x1={center}
          y1={stemStart}
          x2={center}
          y2={visualHeight}
        />
      </svg>
    </button>
  )
}

/** Downward arrow below siblings who have hidden descendants */
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
  const visualWidth = DESCENDANT_HINT_VISUAL_WIDTH
  const visualHeight = DESCENDANT_HINT_VISUAL_HEIGHT
  const hitWidth = BRANCH_HINT_HIT_WIDTH
  const hitHeight = DESCENDANT_HINT_HIT_HEIGHT
  const center = visualWidth / 2
  const arrowTipY = visualHeight - 4
  const arrowBaseY = visualHeight - 16
  const arrowHalf = 7
  const stemEnd = arrowBaseY

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

  const handleClick = (e: React.MouseEvent) => {
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
      className="descendant-branch-hint-interactive absolute flex items-start justify-center"
      style={{ left: cx - hitWidth / 2, top: y, width: hitWidth, height: hitHeight }}
      onPointerDown={stopDrag}
      onClick={handleClick}
      aria-label={label}
    >
      <svg
        width={visualWidth}
        height={visualHeight}
        viewBox={`0 0 ${visualWidth} ${visualHeight}`}
        className="descendant-branch-hint-svg pointer-events-none"
        aria-hidden="true"
      >
        <line className="descendant-branch-stem descendant-branch-stem-solid" x1={center} y1={0} x2={center} y2={stemEnd} />
        <LiquidBranchArrow
          id={`descendant-${memberId}`}
          direction="down"
          center={center}
          tipY={arrowTipY}
          baseY={arrowBaseY}
          half={arrowHalf}
          tone="sage"
        />
      </svg>
    </button>
  )
}

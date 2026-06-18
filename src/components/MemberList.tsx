import { useMemo } from 'react'
import type { FamilyMember } from '../types'
import type { FamilyGraph } from '../utils/relationships'
import { displayName, searchMembers } from '../utils/family'
import { PersonCard } from './PersonCard'

interface MemberListProps {
  members: FamilyMember[]
  graph: FamilyGraph
  query: string
  selectedId: string | null
  onSelect: (id: string) => void
  onFocus: (id: string) => void
}

export function MemberList({
  members,
  graph,
  query,
  selectedId,
  onSelect,
  onFocus,
}: MemberListProps) {
  const filtered = useMemo(() => {
    if (query.trim()) return searchMembers(members, query)
    return [...members].sort((a, b) => {
      const ga = a.generation ?? 99
      const gb = b.generation ?? 99
      if (ga !== gb) return ga - gb
      return displayName(a).localeCompare(displayName(b), undefined, { sensitivity: 'base' })
    })
  }, [members, query])

  const connected = useMemo(
    () => (selectedId ? graph.getConnectedMembers(selectedId) : new Set<string>()),
    [graph, selectedId],
  )

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
      <p className="mb-4 text-sm font-medium text-[var(--color-bark-light)]">
        {filtered.length} {filtered.length === 1 ? 'member' : 'members'}
        {query.trim() ? ` matching “${query.trim()}”` : ', by generation'}
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((member) => {
          const hasLinks =
            member.fatherId ||
            member.motherId ||
            member.spouseId ||
            graph.getChildren(member).length > 0

          return (
            <div key={member.id} className="person-card-slot relative">
              <PersonCard
                member={member}
                graph={graph}
                selected={selectedId === member.id}
                onClick={() => onSelect(member.id)}
                onDoubleClick={() => onFocus(member.id)}
              />
              {!hasLinks && (
                <span className="absolute right-2 top-2 rounded-full bg-[color-mix(in_srgb,var(--color-gold)_20%,white)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-bark-light)]">
                  unlinked
                </span>
              )}
              {selectedId && connected.has(member.id) && member.id !== selectedId && (
                <span className="absolute left-2 top-2 rounded-full bg-[color-mix(in_srgb,var(--color-sage)_20%,white)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-sage)]">
                  related
                </span>
              )}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center text-[var(--color-bark-light)]">
          No members match your search.
        </div>
      )}

      {filtered.length > 0 && (
        <p className="mt-8 text-center text-xs text-[var(--color-bark-light)]">
          Tip: double-click any card to jump to their tree view
        </p>
      )}
    </div>
  )
}

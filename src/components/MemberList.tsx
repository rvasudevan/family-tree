import { useMemo } from 'react'
import type { FamilyMember } from '../types'
import type { FamilyGraph } from '../utils/relationships'
import { displayName, searchMembers } from '../utils/family'
import { PersonCard } from './PersonCard'

interface MemberListProps {
  members: FamilyMember[]
  graph: FamilyGraph
  query: string
  isAdmin?: boolean
  onFocus: (id: string) => void
  onAdminEdit?: (id: string) => void
}

export function MemberList({
  members,
  graph,
  query,
  isAdmin = false,
  onFocus,
  onAdminEdit,
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
                onDoubleClick={() => {
                  if (isAdmin && onAdminEdit) onAdminEdit(member.id)
                  else onFocus(member.id)
                }}
              />
              {!hasLinks && (
                <span className="absolute right-2 top-2 rounded-full bg-[color-mix(in_srgb,var(--color-gold)_20%,white)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-bark-light)]">
                  unlinked
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
          {isAdmin
            ? 'Tip: double-click any card to open the details panel'
            : 'Tip: double-click any card to jump to their tree view'}
        </p>
      )}
    </div>
  )
}

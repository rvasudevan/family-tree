import { useState } from 'react'
import type { FamilyMember } from '../types'
import type { FamilyGraph } from '../utils/relationships'
import { cardDisplayName, displayName, genderLabel, lifespan } from '../utils/family'
import { MemberAvatar } from './MemberAvatar'
import { PersonCard } from './PersonCard'
import { PersonEditForm } from './PersonEditForm'

interface PersonDetailProps {
  member: FamilyMember
  members: FamilyMember[]
  graph: FamilyGraph
  isAdmin: boolean
  onClose: () => void
  onNavigate: (id: string) => void
  onSaveMember?: (id: string, patch: Partial<FamilyMember>, spouseId?: string) => void
  onDelete?: (id: string) => void
}

export function PersonDetail({
  member,
  members,
  graph,
  isAdmin,
  onClose,
  onNavigate,
  onSaveMember,
  onDelete,
}: PersonDetailProps) {
  const [editing, setEditing] = useState(false)
  const spouse = graph.getSpouse(member)
  const parents = graph.getParents(member)
  const children = graph.getChildren(member)
  const siblings = graph.getSiblings(member)
  const life = lifespan(member)

  const handleDelete = () => {
    onDelete?.(member.id)
    onClose()
  }

  if (editing && isAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-stretch justify-end liquid-overlay">
        <aside className="slide-in-right flex w-full max-w-md flex-col glass-modal sm:w-[28rem]">
          <div className="flex items-start justify-between gap-3 border-b border-[color-mix(in_srgb,var(--color-bark)_8%,transparent)] px-5 py-4">
            <div className="flex items-start gap-3">
              <MemberAvatar member={member} size="lg" />
              <div>
                <h2 className="font-serif text-xl font-semibold leading-tight text-[var(--color-bark)]">
                  Edit {displayName(member)}
                </h2>
                <p className="mt-1 text-sm text-[var(--color-bark-light)]">Update details and relationships</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditing(false)}
              aria-label="Close editor"
              className="rounded-lg px-2 py-1 text-[var(--color-bark-light)] transition-colors hover:bg-[var(--color-cream)] hover:text-[var(--color-bark)]"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <PersonEditForm
              member={member}
              members={members}
              onSave={(patch, spouseId) => {
                onSaveMember?.(member.id, patch, spouseId)
                setEditing(false)
              }}
              onDelete={handleDelete}
              onCancel={() => setEditing(false)}
            />
          </div>
        </aside>
      </div>
    )
  }

  return (
    <aside className="slide-in-right relative z-30 flex w-full max-w-sm shrink-0 flex-col glass border-l border-[color-mix(in_srgb,white_40%,transparent)] sm:w-96">
      <div className="flex items-start justify-between gap-3 border-b border-[color-mix(in_srgb,var(--color-bark)_6%,transparent)] px-5 py-4">
        <div className="flex items-start gap-3">
          <MemberAvatar member={member} size="lg" />
          <div>
            <h2 className="font-serif text-xl font-semibold leading-tight">
              {cardDisplayName(member, 'focus')}
            </h2>
            {life && <p className="mt-1 text-sm text-[var(--color-bark-light)]">{life}</p>}
          </div>
        </div>
        <div className="flex gap-1">
          {isAdmin && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg px-2 py-1 text-sm text-[var(--color-sage)] transition-colors hover:bg-[var(--color-cream)]"
            >
              Edit
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="rounded-lg px-2 py-1 text-[var(--color-bark-light)] transition-colors hover:bg-[var(--color-cream)] hover:text-[var(--color-bark)]"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <>
          <dl className="space-y-3 text-sm">
              <DetailRow label="Gender" value={genderLabel(member.gender)} />
              {member.birthPlace && <DetailRow label="Birth place" value={member.birthPlace} />}
              {member.anniversary && <DetailRow label="Anniversary" value={member.anniversary} />}
              {member.generation != null && (
                <DetailRow label="Generation" value={`Gen ${member.generation}`} />
              )}
              {member.profession && <DetailRow label="Profession" value={member.profession} />}
              {member.bio && <DetailRow label="Bio" value={member.bio} />}
            </dl>

            <div className="mt-6 space-y-5">
              <RelationSection title="Parents">
                {!parents.father && !parents.mother ? (
                  <EmptyHint />
                ) : (
                  <div className="space-y-2">
                    {parents.father && (
                      <MiniNav
                        member={parents.father}
                        onNavigate={onNavigate}
                        label="Father"
                        displayRole="parent"
                      />
                    )}
                    {parents.mother && (
                      <MiniNav
                        member={parents.mother}
                        onNavigate={onNavigate}
                        label="Mother"
                        displayRole="parent"
                      />
                    )}
                  </div>
                )}
              </RelationSection>

              <RelationSection title="Spouse">
                {spouse ? (
                  <MiniNav member={spouse} onNavigate={onNavigate} displayRole="spouse" />
                ) : (
                  <EmptyHint />
                )}
              </RelationSection>

              <RelationSection title={`Children (${children.length})`}>
                {children.length === 0 ? (
                  <EmptyHint />
                ) : (
                  <div className="space-y-2">
                    {children.map((child) => (
                      <MiniNav key={child.id} member={child} onNavigate={onNavigate} />
                    ))}
                  </div>
                )}
              </RelationSection>

              {siblings.length > 0 && (
                <RelationSection title={`Siblings (${siblings.length})`}>
                  <div className="space-y-2">
                    {siblings.map((sibling) => (
                      <MiniNav key={sibling.id} member={sibling} onNavigate={onNavigate} />
                    ))}
                  </div>
                </RelationSection>
              )}
            </div>
          </>
      </div>

      <div className="border-t border-[color-mix(in_srgb,var(--color-bark)_6%,transparent)] p-4">
          <button
            type="button"
            onClick={() => onNavigate(member.id)}
            className="btn-liquid btn-primary w-full rounded-2xl py-2.5 text-sm font-medium text-[var(--color-cream)]"
          >
            Center tree on {member.firstName}
          </button>
      </div>
    </aside>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-bark-light)]">
        {label}
      </dt>
      <dd className="mt-0.5 text-[var(--color-bark)]">{value}</dd>
    </div>
  )
}

function RelationSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-sage)]">
        {title}
      </h3>
      {children}
    </section>
  )
}

function MiniNav({
  member,
  onNavigate,
  label,
  displayRole,
}: {
  member: FamilyMember
  onNavigate: (id: string) => void
  label?: string
  displayRole?: 'spouse' | 'parent'
}) {
  return (
    <div>
      {label && <p className="mb-1 text-xs text-[var(--color-bark-light)]">{label}</p>}
      <PersonCard member={member} displayRole={displayRole} compact onClick={() => onNavigate(member.id)} />
    </div>
  )
}

function EmptyHint() {
  return <p className="text-sm italic text-[var(--color-bark-light)]">Not linked yet</p>
}

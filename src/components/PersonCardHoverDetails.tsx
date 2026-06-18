import type { FamilyMember } from '../types'
import type { FamilyGraph } from '../utils/relationships'
import {
  cardDisplayName,
  displayName,
  genderLabel,
  lifespan,
  type CardDisplayRole,
} from '../utils/family'

interface PersonCardHoverDetailsProps {
  member: FamilyMember
  displayRole?: CardDisplayRole
  graph?: FamilyGraph
}

export function PersonCardHoverDetails({
  member,
  displayRole,
  graph,
}: PersonCardHoverDetailsProps) {
  const life = lifespan(member)
  const spouse = graph?.getSpouse(member)
  const parents = graph?.getParents(member)
  const children = graph ? graph.getChildren(member) : []
  const fullName = displayName(member)
  const shortName = cardDisplayName(member, displayRole)
  const showFullName = fullName !== shortName

  const rows: { label: string; value: string }[] = []

  if (showFullName) rows.push({ label: 'Full name', value: fullName })
  rows.push({ label: 'Gender', value: genderLabel(member.gender) })
  if (member.birthYear) rows.push({ label: 'Birth', value: member.birthYear })
  if (member.deathYear) rows.push({ label: 'Death', value: member.deathYear })
  if (!member.birthYear && !member.deathYear && life) rows.push({ label: 'Dates', value: life })
  if (member.birthPlace) rows.push({ label: 'Birth place', value: member.birthPlace })
  if (member.anniversary) rows.push({ label: 'Anniversary', value: member.anniversary })
  if (member.generation != null) rows.push({ label: 'Generation', value: `Gen ${member.generation}` })
  if (member.profession) rows.push({ label: 'Profession', value: member.profession })
  if (parents?.father) rows.push({ label: 'Father', value: displayName(parents.father) })
  if (parents?.mother) rows.push({ label: 'Mother', value: cardDisplayName(parents.mother, 'parent') })
  if (spouse) rows.push({ label: 'Spouse', value: cardDisplayName(spouse, 'spouse') })
  if (children.length > 0) {
    rows.push({
      label: children.length === 1 ? 'Child' : 'Children',
      value: children.map((c) => cardDisplayName(c, 'child')).join(', '),
    })
  }
  if (member.bio) rows.push({ label: 'Bio', value: member.bio })

  if (rows.length === 0) return null

  return (
    <span className="person-card-hover-panel">
      <span className="person-card-hover-inner">
        {rows.map((row) => (
          <span key={row.label} className="person-card-detail-row">
            <span className="person-card-detail-label">{row.label}</span>
            <span className="person-card-detail-value">{row.value}</span>
          </span>
        ))}
      </span>
    </span>
  )
}

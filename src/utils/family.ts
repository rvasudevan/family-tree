import type { FamilyMember } from '../types'

export type CardDisplayRole = 'focus' | 'spouse' | 'parent' | 'child'

export function displayName(member: FamilyMember): string {
  const first = member.firstName.trim()
  const last = member.lastName.trim()
  if (!last || first === last || last.includes(first)) return first
  return `${first} ${last}`
}

/** Tree card label — women show first name only (no surname / married name) */
export function cardDisplayName(member: FamilyMember, _role?: CardDisplayRole): string {
  if (member.gender === 'female') {
    return femaleFirstName(member)
  }
  return displayName(member)
}

function femaleFirstName(member: FamilyMember): string {
  const withoutInitials = stripLeadingInitials(member.firstName.trim())
  const firstWord = withoutInitials.split(/\s+/).find(Boolean)
  return firstWord ?? withoutInitials
}

function stripLeadingInitials(name: string): string {
  const stripped = name.replace(/^(?:[A-Z]\.)+/, '').trim()
  return stripped || name
}

export function initials(member: FamilyMember): string {
  const parts = displayName(member).split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function avatarEmoji(member: FamilyMember): string {
  if (member.avatarUrl && member.avatarUrl.length <= 4 && !member.avatarUrl.includes('/')) {
    return member.avatarUrl
  }
  if (member.gender === 'male') return '👨'
  if (member.gender === 'female') return '👩'
  return '👤'
}

/** @deprecated use avatarEmoji or MemberAvatar */
export function avatar(member: FamilyMember): string {
  return avatarEmoji(member)
}

export function lifespan(member: FamilyMember): string | null {
  const birth = member.birthYear?.trim()
  const death = member.deathYear?.trim()
  if (birth && death) return `${birth} – ${death}`
  if (birth) return `b. ${birth}`
  if (death) return `d. ${death}`
  return null
}

function monthFromDateFragment(fragment: string): string | null {
  const match = fragment.trim().match(/\b([A-Za-z]{3,9})\b/)
  return match ? match[1] : null
}

function yearFromDateFragment(fragment: string): string | null {
  const match = fragment.trim().match(/\b(\d{4})\b/)
  return match ? match[1] : null
}

/** Shorten ambiguous birth ranges for tree cards; full value stays in hover panel */
function compactBirthFragment(value: string): string {
  const rangeMatch = value.match(/^(.+?)\s+to\s+(.+)$/i)
  if (!rangeMatch) return value

  const [, start, end] = rangeMatch
  const startMonth = monthFromDateFragment(start)
  const endMonth = monthFromDateFragment(end)
  const year = yearFromDateFragment(end) ?? yearFromDateFragment(start)
  if (!startMonth || !endMonth || !year) return value
  if (startMonth === endMonth) return `${startMonth} ${year}`
  return `${startMonth}–${endMonth} ${year}`
}

/** Birth line for tree cards */
export function cardBirthLine(member: FamilyMember): string | null {
  const birth = member.birthYear?.trim()
  if (!birth) return null
  return `b. ${compactBirthFragment(birth)}`
}

/** Death line for tree cards */
export function cardDeathLine(member: FamilyMember): string | null {
  const death = member.deathYear?.trim()
  if (!death) return null
  return `d. ${compactBirthFragment(death)}`
}

/** Date rows reserved on tree cards (birth row + death row when birth is known). */
export function cardDateLineSlots(member: FamilyMember): number {
  if (member.birthYear?.trim()) return 2
  if (member.deathYear?.trim()) return 1
  return 0
}

export function genderLabel(gender: FamilyMember['gender']): string {
  if (gender === 'male') return 'Male'
  if (gender === 'female') return 'Female'
  return 'Other'
}

export function searchMembers(members: FamilyMember[], query: string): FamilyMember[] {
  const q = query.trim().toLowerCase()
  if (!q) return members

  return members.filter((member) => {
    const haystack = [
      member.firstName,
      member.lastName,
      displayName(member),
      member.birthPlace,
      member.profession,
      member.birthYear,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
}

export function sortMembers(members: FamilyMember[]): FamilyMember[] {
  return [...members].sort((a, b) =>
    displayName(a).localeCompare(displayName(b), undefined, { sensitivity: 'base' }),
  )
}

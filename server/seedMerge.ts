import type { FamilyMember } from '../src/types'

/** Original CSV import placeholders superseded in seed. */
const STALE_BIRTH_PLACES: Record<string, string[]> = {
  kr: ['Vedanthangal, India'],
  ka: ['Vedanthangal, India'],
}

function isMissing(value: unknown): boolean {
  return value == null || (typeof value === 'string' && !value.trim())
}

function shouldFillFromSeed(
  memberValue: string | undefined,
  seedValue: string | undefined,
  staleValues?: string[],
): boolean {
  if (!seedValue?.trim()) return false
  if (isMissing(memberValue)) return true
  return staleValues?.includes(memberValue.trim()) ?? false
}

export function mergeSeedDefaults(
  members: FamilyMember[],
  seedMembers: FamilyMember[],
): FamilyMember[] {
  const seedById = new Map(seedMembers.map((m) => [m.id, m]))
  return members.map((member) => {
    const seed = seedById.get(member.id)
    if (!seed) return member

    const patch: Partial<FamilyMember> = {}
    if (seed.avatarUrl && !member.avatarUrl) patch.avatarUrl = seed.avatarUrl
    if (seed.deathYear && !member.deathYear) patch.deathYear = seed.deathYear
    if (
      shouldFillFromSeed(member.birthPlace, seed.birthPlace, STALE_BIRTH_PLACES[member.id])
    ) {
      patch.birthPlace = seed.birthPlace
    }

    return Object.keys(patch).length ? { ...member, ...patch } : member
  })
}

import importBaselineData from '../data/importBaseline.json'
import type { FamilyMember } from '../types'

const IMPORT_BASELINE = importBaselineData as FamilyMember[]

const MANAGED_FIELDS = [
  'firstName',
  'lastName',
  'gender',
  'birthYear',
  'deathYear',
  'birthPlace',
  'anniversary',
  'profession',
  'bio',
  'avatarUrl',
  'generation',
  'spouseId',
  'fatherId',
  'motherId',
  'siblingOrder',
] as const satisfies readonly (keyof FamilyMember)[]

function isMissing(value: unknown): boolean {
  return value == null || (typeof value === 'string' && !value.trim())
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (isMissing(a) && isMissing(b)) return true
  return false
}

function reconcileMember(
  member: FamilyMember,
  seed: FamilyMember,
  baseline?: FamilyMember,
): FamilyMember {
  const patch: Record<string, unknown> = {}

  for (const field of MANAGED_FIELDS) {
    const seedValue = seed[field]
    const memberValue = member[field]
    const baselineValue = baseline?.[field]

    if (isMissing(seedValue)) continue
    if (valuesEqual(seedValue, memberValue)) continue

    if (isMissing(memberValue)) {
      patch[field] = seedValue
      continue
    }

    if (baseline && valuesEqual(memberValue, baselineValue)) {
      patch[field] = seedValue
    }
  }

  return Object.keys(patch).length ? ({ ...member, ...patch, id: member.id } as FamilyMember) : member
}

export function mergeSeedDefaults(
  members: FamilyMember[],
  seedMembers: FamilyMember[],
): FamilyMember[] {
  const seedById = new Map(seedMembers.map((m) => [m.id, m]))
  const baselineById = new Map(IMPORT_BASELINE.map((m) => [m.id, m]))

  return members.map((member) => {
    const seed = seedById.get(member.id)
    if (!seed) return member
    return reconcileMember(member, seed, baselineById.get(member.id))
  })
}

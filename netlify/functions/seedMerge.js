const importBaseline = require('./importBaseline.json')

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
]

function isMissing(value) {
  return value == null || (typeof value === 'string' && !value.trim())
}

function valuesEqual(a, b) {
  if (a === b) return true
  if (isMissing(a) && isMissing(b)) return true
  return false
}

function reconcileMember(member, seed, baseline) {
  const patch = {}

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

  return Object.keys(patch).length ? { ...member, ...patch, id: member.id } : member
}

function mergeSeedDefaults(members, seedMembers) {
  const seedById = new Map(seedMembers.map((m) => [m.id, m]))
  const baselineById = new Map(importBaseline.map((m) => [m.id, m]))

  return members.map((member) => {
    const seed = seedById.get(member.id)
    if (!seed) return member
    return reconcileMember(member, seed, baselineById.get(member.id))
  })
}

module.exports = { mergeSeedDefaults }

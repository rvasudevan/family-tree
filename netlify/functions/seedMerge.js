/** Original CSV import placeholders superseded in seed. */
const STALE_BIRTH_PLACES = {
  kr: ['Vedanthangal, India'],
  ka: ['Vedanthangal, India'],
}

function isMissing(value) {
  return value == null || (typeof value === 'string' && !value.trim())
}

function shouldFillFromSeed(memberValue, seedValue, staleValues) {
  if (!seedValue?.trim()) return false
  if (isMissing(memberValue)) return true
  return staleValues?.includes(memberValue.trim()) ?? false
}

function mergeSeedDefaults(members, seedMembers) {
  const seedById = new Map(seedMembers.map((m) => [m.id, m]))
  return members.map((member) => {
    const seed = seedById.get(member.id)
    if (!seed) return member

    const patch = {}
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

module.exports = { mergeSeedDefaults }

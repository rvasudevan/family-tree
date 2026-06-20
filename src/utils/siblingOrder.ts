import type { FamilyMember } from '../types'

/** Left-to-right order for children of R. Krishnamachari & Kannakavalli */
export const KRISHNAMACHARI_CHILDREN_ORDER = [
  've', // K.Vedam
  'ko', // Komala
  'sh', // Shantha
  'ja', // Jaya
  'pa', // Parthasarathi
  'jn', // Janaki
  'in', // Indira
  'na', // Narayanan
  'my', // Mythili
]

/** Left-to-right order for children of Janaki & N. Raghavan (oldest first) */
export const JANAKI_RAGHAVAN_CHILDREN_ORDER = [
  'nj', // N.Janardhanan
  'nn', // N.Narasimhan
  'ls', // Lakshmi Srinivasan
]

/** Left-to-right order for children of Indira & N.Parthasarathy (oldest first) */
export const INDIRA_PARTHASARATHY_CHILDREN_ORDER = [
  'vk', // P.Venkatesh
  'vij', // Vijay
  're', // Rema Sriram
]

/** Left-to-right order for children of P.T.Jagannathan & Padmaja (oldest first) */
export const JAGANNATHAN_CHILDREN_ORDER = [
  'vt', // Vishnu Teja
  'si', // Srinivas
]

/** Left-to-right order for children of P.T.Rangarajan & Alamelu (oldest first) */
export const RANGARAJAN_CHILDREN_ORDER = [
  'sv', // Srividya
  'aw2', // Ashwin (Rangarajan)
]

/** Left-to-right order for children of Jaya & P.T.Ramanujam (oldest first) */
export const JAYA_RAMANUJAM_CHILDREN_ORDER = [
  'pv', // P.T.Vasu
  'sa', // Santha
  'rn', // P.T.Rangarajan
  'ns', // Dr.P.T.Narasimhan
  'pj', // P.T.Jagannathan
  'um', // Uma
]

/** Left-to-right order for children of Shantha & R.S.Rangaswamy (oldest first) */
export const SHANTHA_CHILDREN_ORDER = [
  'se', // R.Seshadri
  'rv', // R.Vasudevan
  'rj', // R.Jagannathan
]

/** Left-to-right order for children of K.Vedam & V.Sundararajan (oldest first) */
export const VEDAM_CHILDREN_ORDER = [
  'vs', // Vasanta
  'lk', // Lakshmi
]

/** Left-to-right order for children of Jayanti & Sundar (oldest first) */
export const JAYANTI_SUNDAR_CHILDREN_ORDER = [
  'ml', // Mallika
  'ad', // Aditya
]

/** Left-to-right order for children of Komala & R.S.Chari (oldest first) */
export const KOMALA_CHARI_CHILDREN_ORDER = [
  'sd', // Sadagopan
  'us', // Usha
  'he', // Hema — youngest
]

/** Left-to-right order for children of Sangeeta & Ramprasad (oldest first) */
export const SANGEETA_RAMPRASAD_CHILDREN_ORDER = [
  'sh4', // Sahana
  'rj3', // Ranjani
]

/** Left-to-right order for children of Usha & R.Ramanujam (oldest first) */
export const USHA_RAMANUJAM_CHILDREN_ORDER = [
  'py', // Priya
  'mr', // Mythili
]

export function isKrishnamachariSiblingGroup(members: FamilyMember[]): boolean {
  return members.length > 0 && members.every((m) => m.fatherId === 'kr' && m.motherId === 'ka')
}

export function isJanakiRaghavanSiblingGroup(members: FamilyMember[]): boolean {
  return members.length > 0 && members.every((m) => m.fatherId === 'nr' && m.motherId === 'jn')
}

export function isIndiraParthasarathySiblingGroup(members: FamilyMember[]): boolean {
  return members.length > 0 && members.every((m) => m.fatherId === 'np' && m.motherId === 'in')
}

export function isJagannathanSiblingGroup(members: FamilyMember[]): boolean {
  return members.length > 0 && members.every((m) => m.fatherId === 'pj' && m.motherId === 'pd')
}

export function isRangarajanSiblingGroup(members: FamilyMember[]): boolean {
  return members.length > 0 && members.every((m) => m.fatherId === 'rn' && m.motherId === 'al')
}

export function isJayaRamanujamSiblingGroup(members: FamilyMember[]): boolean {
  return members.length > 0 && members.every((m) => m.fatherId === 'pr' && m.motherId === 'ja')
}

export function isShanthaRangaswamySiblingGroup(members: FamilyMember[]): boolean {
  return members.length > 0 && members.every((m) => m.fatherId === 'rw' && m.motherId === 'sh')
}

export function isVedamSiblingGroup(members: FamilyMember[]): boolean {
  return members.length > 0 && members.every((m) => m.fatherId === 'su' && m.motherId === 've')
}

export function isJayantiSundarSiblingGroup(members: FamilyMember[]): boolean {
  return members.length > 0 && members.every((m) => m.fatherId === 'snd' && m.motherId === 'jy')
}

export function isKomalaChariSiblingGroup(members: FamilyMember[]): boolean {
  return members.length > 0 && members.every((m) => m.fatherId === 'ch' && m.motherId === 'ko')
}

export function isSangeetaRamprasadSiblingGroup(members: FamilyMember[]): boolean {
  return members.length > 0 && members.every((m) => m.fatherId === 'rpr' && m.motherId === 'sg')
}

export function isUshaRamanujamSiblingGroup(members: FamilyMember[]): boolean {
  return members.length > 0 && members.every((m) => m.fatherId === 'rm' && m.motherId === 'us')
}

export function sortByCustomOrder(
  members: FamilyMember[],
  order: string[],
): FamilyMember[] {
  const rank = new Map(order.map((id, index) => [id, index]))
  return [...members].sort((a, b) => {
    const rankA = rank.get(a.id) ?? 999
    const rankB = rank.get(b.id) ?? 999
    if (rankA !== rankB) return rankA - rankB
    return a.firstName.localeCompare(b.firstName, undefined, { sensitivity: 'base' })
  })
}

const SIBLING_GROUPS: { order: readonly string[]; match: (members: FamilyMember[]) => boolean }[] = [
  { order: KRISHNAMACHARI_CHILDREN_ORDER, match: isKrishnamachariSiblingGroup },
  { order: VEDAM_CHILDREN_ORDER, match: isVedamSiblingGroup },
  { order: SHANTHA_CHILDREN_ORDER, match: isShanthaRangaswamySiblingGroup },
  { order: JAYANTI_SUNDAR_CHILDREN_ORDER, match: isJayantiSundarSiblingGroup },
  { order: JAGANNATHAN_CHILDREN_ORDER, match: isJagannathanSiblingGroup },
  { order: JANAKI_RAGHAVAN_CHILDREN_ORDER, match: isJanakiRaghavanSiblingGroup },
  { order: INDIRA_PARTHASARATHY_CHILDREN_ORDER, match: isIndiraParthasarathySiblingGroup },
  { order: JAYA_RAMANUJAM_CHILDREN_ORDER, match: isJayaRamanujamSiblingGroup },
  { order: RANGARAJAN_CHILDREN_ORDER, match: isRangarajanSiblingGroup },
  { order: KOMALA_CHARI_CHILDREN_ORDER, match: isKomalaChariSiblingGroup },
  { order: SANGEETA_RAMPRASAD_CHILDREN_ORDER, match: isSangeetaRamprasadSiblingGroup },
  { order: USHA_RAMANUJAM_CHILDREN_ORDER, match: isUshaRamanujamSiblingGroup },
]

function matchesIdSet(members: FamilyMember[], order: readonly string[]): boolean {
  if (members.length === 0 || members.length !== order.length) return false
  const expected = new Set(order)
  return members.every((member) => expected.has(member.id))
}

/** Resolve a custom left-to-right order for a sibling set, if known. */
export function resolveSiblingOrder(members: FamilyMember[]): readonly string[] | null {
  if (members.length === 0) return null

  for (const group of SIBLING_GROUPS) {
    if (group.match(members) || matchesIdSet(members, group.order)) {
      return group.order
    }
  }

  return null
}

export function sortSiblingMembers(members: FamilyMember[]): FamilyMember[] {
  const explicit = members.every((member) => typeof member.siblingOrder === 'number')
  if (explicit) {
    return [...members].sort((a, b) => a.siblingOrder! - b.siblingOrder!)
  }

  const order = resolveSiblingOrder(members)
  if (order) return sortByCustomOrder(members, [...order])

  return [...members].sort((a, b) => {
    const ay = extractYear(a.birthYear)
    const by = extractYear(b.birthYear)
    if (ay !== null && by !== null) return ay - by
    if (ay !== null) return -1
    if (by !== null) return 1
    return a.firstName.localeCompare(b.firstName, undefined, { sensitivity: 'base' })
  })
}

function extractYear(value?: string): number | null {
  if (!value) return null
  const match = value.match(/\b(18|19|20)\d{2}\b/)
  return match ? Number(match[0]) : null
}

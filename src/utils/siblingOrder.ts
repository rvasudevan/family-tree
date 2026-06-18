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

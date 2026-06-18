import type { FamilyMember } from '../types'
import { displayName } from './family'

export function generateId(firstName: string, members: FamilyMember[]): string {
  const base = firstName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 12) || 'member'
  let id = base
  let n = 1
  const ids = new Set(members.map((m) => m.id))
  while (ids.has(id)) {
    id = `${base}${n++}`
  }
  return id
}

export function updateMember(
  members: FamilyMember[],
  id: string,
  patch: Partial<FamilyMember>,
): FamilyMember[] {
  return members.map((m) => {
    if (m.id !== id) return m
    const next = { ...m, ...patch, id }
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) {
        delete next[key as keyof FamilyMember]
      }
    }
    return next
  })
}

export function linkSpouses(
  members: FamilyMember[],
  idA: string,
  idB: string | undefined,
): FamilyMember[] {
  let next = members.map((m) => {
    if (m.id === idA) return { ...m, spouseId: idB || undefined }
    if (m.spouseId === idA) return { ...m, spouseId: undefined }
    return m
  })

  if (idB) {
    next = next.map((m) => {
      if (m.id === idB) return { ...m, spouseId: idA }
      if (m.spouseId === idB && m.id !== idA) return { ...m, spouseId: undefined }
      return m
    })
  }

  return next.map((m) => {
    const cleaned = { ...m }
    if (!cleaned.spouseId) delete cleaned.spouseId
    return cleaned
  })
}

export function addMember(members: FamilyMember[], member: FamilyMember): FamilyMember[] {
  return [...members, member]
}

export function deleteMember(members: FamilyMember[], id: string): FamilyMember[] {
  return members
    .filter((m) => m.id !== id)
    .map((m) => {
      const next = { ...m }
      if (next.fatherId === id) delete next.fatherId
      if (next.motherId === id) delete next.motherId
      if (next.spouseId === id) delete next.spouseId
      return next
    })
}

export function exportToCsv(members: FamilyMember[]): string {
  const header =
    'id,name,birth_date,anniversary,birthplace,parent1_id,parent2_id,spouse_id,generation'
  const rows = members.map((m) => {
    const name = displayName(m)
    return [
      m.id,
      csvCell(name),
      csvCell(m.birthYear ?? ''),
      csvCell(m.anniversary ?? ''),
      csvCell(m.birthPlace ?? ''),
      m.fatherId ?? '',
      m.motherId ?? '',
      m.spouseId ?? '',
      m.generation != null ? String(m.generation) : '',
    ].join(',')
  })
  return [header, ...rows].join('\n')
}

function csvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function downloadFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

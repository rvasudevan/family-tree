import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FamilyMember } from '../types'
import { fetchMembers, isAdminSession, saveMembers } from '../api/client'
import {
  addMember,
  deleteMember,
  generateId,
  linkSpouses,
  updateMember,
} from '../utils/admin'
import { FamilyGraph } from '../utils/relationships'

export function useFamilyData() {
  const [members, setMembersState] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const membersRef = useRef(members)

  useEffect(() => {
    membersRef.current = members
  }, [members])

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchMembers()
      setMembersState(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load family data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const graph = useMemo(() => new FamilyGraph(members), [members])
  const stats = useMemo(() => graph.stats(), [graph])

  const persist = useCallback(
    async (updater: (prev: FamilyMember[]) => FamilyMember[]) => {
      if (!isAdminSession()) return

      const next = updater(membersRef.current)
      setMembersState(next)
      setSaving(true)
      setError(null)

      try {
        await saveMembers(next)
      } catch (err) {
        await reload()
        setError(err instanceof Error ? err.message : 'Failed to save changes')
        throw err
      } finally {
        setSaving(false)
      }
    },
    [reload],
  )

  const saveMember = useCallback(
    async (id: string, patch: Partial<FamilyMember>, spouseId?: string) => {
      await persist((prev) => {
        let next = updateMember(prev, id, patch)
        next = linkSpouses(next, id, spouseId)
        return next
      })
    },
    [persist],
  )

  const setSpouse = useCallback(
    async (id: string, spouseId: string | undefined) => {
      await persist((prev) => linkSpouses(prev, id, spouseId))
    },
    [persist],
  )

  const create = useCallback(
    async (partial: Omit<FamilyMember, 'id'> & { id?: string }) => {
      let newId = ''
      await persist((prev) => {
        const id = partial.id ?? generateId(partial.firstName, prev)
        newId = id
        return addMember(prev, { ...partial, id })
      })
      return newId
    },
    [persist],
  )

  const remove = useCallback(
    async (id: string) => {
      await persist((prev) => deleteMember(prev, id))
    },
    [persist],
  )

  return { members, graph, stats, loading, error, saving, reload, saveMember, setSpouse, create, remove }
}

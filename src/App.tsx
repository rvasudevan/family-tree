import { useEffect, useState } from 'react'
import type { FamilyMember, ViewMode } from './types'
import { isAdminSession, logoutAdmin } from './api/client'
import { useFamilyData } from './hooks/useFamilyData'
import { FamilyGraph } from './utils/relationships'
import { Header } from './components/Header'
import { SearchBar } from './components/SearchBar'
import { TreeView } from './components/TreeView'
import { MemberList } from './components/MemberList'
import { PersonDetail } from './components/PersonDetail'
import { AdminLogin } from './components/AdminLogin'
import { AddPersonModal } from './components/AddPersonModal'
import { downloadFile, exportToCsv } from './utils/admin'
import { cardDisplayName } from './utils/family'

const STORAGE_KEY = 'family-tree-focus'

function loadInitialFocus(members: FamilyMember[], graph: FamilyGraph): string {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved && members.some((m) => m.id === saved)) return saved

  const krishnamachari = members.find((m) => m.id === 'kr' || m.lastName === 'Krishnamachari')
  if (krishnamachari) return krishnamachari.id

  const roots = graph.findRoots()
  return roots[0]?.id ?? members[0]?.id
}

export default function App() {
  const [isAdmin, setIsAdmin] = useState(isAdminSession())
  const { members, graph, stats, loading, error, saving, reload, saveMember, create, remove } =
    useFamilyData()

  const [focusId, setFocusId] = useState<string | null>(null)
  const [omitParentsOnFocus, setOmitParentsOnFocus] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('tree')
  const [searchQuery, setSearchQuery] = useState('')
  const [showLogin, setShowLogin] = useState(false)
  const [showAddPerson, setShowAddPerson] = useState(false)

  useEffect(() => {
    if (members.length > 0 && focusId == null) {
      const id = loadInitialFocus(members, graph)
      setFocusId(id)
      setSelectedId(id)
    }
  }, [members, graph, focusId])

  const focusMember = focusId ? graph.get(focusId) : undefined
  const selectedMember = graph.get(selectedId ?? undefined)

  const handleFocus = (id: string, options?: { omitParents?: boolean }) => {
    setOmitParentsOnFocus(options?.omitParents ?? false)
    setFocusId(id)
    setSelectedId(id)
    localStorage.setItem(STORAGE_KEY, id)
    if (viewMode === 'list') setViewMode('tree')
  }

  const handleExport = () => {
    const csv = exportToCsv(members)
    downloadFile(csv, 'krishnamachari_family_tree.csv', 'text/csv')
  }

  const handleLogout = () => {
    logoutAdmin()
    setIsAdmin(false)
  }

  if (loading && members.length === 0) {
    return (
      <div className="app-shell flex h-full items-center justify-center">
        <p className="text-sm text-[var(--color-bark-light)]">Loading family tree…</p>
      </div>
    )
  }

  if (error && members.length === 0) {
    return (
      <div className="app-shell flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-[var(--color-rose)]">{error}</p>
        <button
          type="button"
          onClick={() => void reload()}
          className="btn-liquid btn-primary rounded-2xl px-4 py-2 text-sm font-medium text-[var(--color-cream)]"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!focusId) {
    return null
  }

  return (
    <div className="app-shell flex h-full flex-col">
      <div className="liquid-bg" aria-hidden="true">
        <div className="liquid-blob liquid-blob-1" />
        <div className="liquid-blob liquid-blob-2" />
        <div className="liquid-blob liquid-blob-3" />
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {error && (
          <div className="border-b border-[color-mix(in_srgb,var(--color-rose)_20%,transparent)] bg-[color-mix(in_srgb,var(--color-rose)_8%,white)] px-4 py-2 text-center text-sm text-[var(--color-rose)]">
            {error}
          </div>
        )}
        {saving && (
          <div className="border-b border-[color-mix(in_srgb,var(--color-sage)_20%,transparent)] bg-[color-mix(in_srgb,var(--color-sage)_8%,white)] px-4 py-2 text-center text-sm text-[var(--color-sage)]">
            Saving changes…
          </div>
        )}

        <Header
          stats={stats}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          focusName={focusMember ? cardDisplayName(focusMember, 'focus') : undefined}
          isAdmin={isAdmin}
          onAdminClick={() => setShowLogin(true)}
          onLogout={handleLogout}
          onExport={handleExport}
          onAddPerson={() => setShowAddPerson(true)}
        />

        <div className="flex min-h-0 flex-1">
          <main className="relative flex min-w-0 flex-1 flex-col">
            <div className="glass border-b border-[color-mix(in_srgb,white_30%,transparent)] px-4 py-3">
              <SearchBar
                members={members}
                query={searchQuery}
                onQueryChange={setSearchQuery}
                onSelect={handleFocus}
              />
            </div>

            {viewMode === 'tree' ? (
              <TreeView
                graph={graph}
                focusId={focusId}
                omitParents={omitParentsOnFocus}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onFocus={handleFocus}
              />
            ) : (
              <MemberList
                members={members}
                graph={graph}
                query={searchQuery}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onFocus={handleFocus}
              />
            )}
          </main>

          {selectedMember && (
            <PersonDetail
              member={selectedMember}
              members={members}
              graph={graph}
              isAdmin={isAdmin}
              onClose={() => setSelectedId(null)}
              onNavigate={handleFocus}
              onSaveMember={saveMember}
              onDelete={(id) => {
                void remove(id)
                if (selectedId === id) setSelectedId(null)
                if (focusId === id) {
                  const fallback = members.find((m) => m.id !== id)
                  if (fallback) handleFocus(fallback.id)
                }
              }}
            />
          )}
        </div>

        {showLogin && (
          <AdminLogin
            onSuccess={() => {
              setIsAdmin(true)
              setShowLogin(false)
            }}
            onClose={() => setShowLogin(false)}
          />
        )}

        {showAddPerson && isAdmin && (
          <AddPersonModal
            onAdd={create}
            onClose={() => setShowAddPerson(false)}
            onCreated={handleFocus}
          />
        )}
      </div>
    </div>
  )
}

import type { ViewMode } from '../types'

interface HeaderProps {
  stats: { total: number; withParents: number; withSpouse: number }
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  focusName?: string
  isAdmin: boolean
  onAdminClick: () => void
  onLogout?: () => void
  onExport?: () => void
  onAddPerson?: () => void
}

export function Header({
  stats,
  viewMode,
  onViewModeChange,
  focusName,
  isAdmin,
  onAdminClick,
  onLogout,
  onExport,
  onAddPerson,
}: HeaderProps) {
  return (
    <header className="glass-dark relative z-20 flex shrink-0 items-center justify-between gap-4 px-5 py-3.5 text-[var(--color-cream)]">
      <div className="min-w-0">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">
          Family Tree
          {isAdmin && (
            <span className="ml-2 rounded-full bg-gradient-to-r from-[var(--color-gold)] to-[#c4b49a] px-2.5 py-0.5 text-xs font-sans font-semibold text-[var(--color-bark)] shadow-sm">
              Admin
            </span>
          )}
        </h1>
        <p className="truncate text-sm text-[color-mix(in_srgb,var(--color-cream)_72%,transparent)]">
          {stats.total} members
          {focusName ? ` · Viewing ${focusName}` : ''}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {isAdmin && (
          <>
            <IconButton onClick={onAddPerson} title="Add person">+</IconButton>
            <IconButton onClick={onExport} title="Export CSV">↓</IconButton>
            <IconButton onClick={onLogout} title="Exit admin">⏻</IconButton>
          </>
        )}
        {!isAdmin && (
          <button
            type="button"
            onClick={onAdminClick}
            className="btn-liquid rounded-full px-3.5 py-1.5 text-sm text-[color-mix(in_srgb,var(--color-cream)_85%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-cream)_14%,transparent)] hover:text-[var(--color-cream)]"
          >
            Admin
          </button>
        )}
        <div className="flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--color-cream)_10%,transparent)] p-1 ring-1 ring-[color-mix(in_srgb,white_12%,transparent)]">
          <TabButton active={viewMode === 'tree'} onClick={() => onViewModeChange('tree')}>
            Tree
          </TabButton>
          <TabButton active={viewMode === 'list'} onClick={() => onViewModeChange('list')}>
            All members
          </TabButton>
        </div>
      </div>
    </header>
  )
}

function IconButton({
  onClick,
  title,
  children,
}: {
  onClick?: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="btn-liquid flex h-8 w-8 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-cream)_12%,transparent)] text-sm ring-1 ring-[color-mix(in_srgb,white_15%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-cream)_22%,transparent)]"
    >
      {children}
    </button>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`btn-liquid rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
        active
          ? 'bg-[var(--color-cream)] text-[var(--color-bark)] shadow-md'
          : 'text-[color-mix(in_srgb,var(--color-cream)_80%,transparent)] hover:text-[var(--color-cream)]'
      }`}
    >
      {children}
    </button>
  )
}

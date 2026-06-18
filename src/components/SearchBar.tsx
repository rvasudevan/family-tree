import { useEffect, useMemo, useRef, useState } from 'react'
import type { FamilyMember } from '../types'
import { displayName, searchMembers } from '../utils/family'
import { MemberAvatar } from './MemberAvatar'

interface SearchBarProps {
  members: FamilyMember[]
  query: string
  onQueryChange: (query: string) => void
  onSelect: (id: string) => void
}

export function SearchBar({ members, query, onQueryChange, onSelect }: SearchBarProps) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const results = useMemo(() => searchMembers(members, query).slice(0, 8), [members, query])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    setHighlight(0)
  }, [query])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const pick = (member: FamilyMember) => {
    onSelect(member.id)
    onQueryChange('')
    setOpen(false)
    inputRef.current?.blur()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => (h + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => (h - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      pick(results[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative mx-auto max-w-xl">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-bark-light)]">
          ⌕
        </span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          placeholder="Search family members…"
          aria-label="Search family members"
          className="glass-input w-full rounded-2xl py-2.5 pl-9 pr-24 text-sm outline-none"
          onChange={(e) => {
            onQueryChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-[color-mix(in_srgb,var(--color-bark)_15%,transparent)] bg-[var(--color-cream)] px-2 py-0.5 text-xs text-[var(--color-bark-light)] sm:inline">
          ⌘K
        </kbd>
      </div>

      {open && query.trim() && (
        <ul className="glass fade-in absolute z-20 mt-2 w-full overflow-hidden rounded-2xl">
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-[var(--color-bark-light)]">No matches found</li>
          ) : (
            results.map((member, i) => (
              <li key={member.id}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                    i === highlight
                      ? 'bg-[color-mix(in_srgb,var(--color-sage)_15%,transparent)]'
                      : 'hover:bg-[var(--color-cream)]'
                  }`}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => pick(member)}
                >
                  <MemberAvatar member={member} size="sm" />
                  <span>
                    <span className="font-medium">{displayName(member)}</span>
                    {member.birthYear && (
                      <span className="ml-2 text-[var(--color-bark-light)]">{member.birthYear}</span>
                    )}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

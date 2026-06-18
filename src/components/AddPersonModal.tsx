import { useState } from 'react'
import type { FamilyMember } from '../types'

interface AddPersonModalProps {
  onAdd: (member: Omit<FamilyMember, 'id'>) => Promise<string>
  onClose: () => void
  onCreated: (id: string) => void
}

export function AddPersonModal({ onAdd, onClose, onCreated }: AddPersonModalProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [gender, setGender] = useState<FamilyMember['gender']>('other')
  const [generation, setGeneration] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || submitting) return
    setSubmitting(true)
    try {
      const id = await onAdd({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender,
        generation: generation.trim() ? Number(generation) : undefined,
      })
      onCreated(id)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center liquid-overlay p-4">
      <form onSubmit={submit} className="glass-modal fade-in w-full max-w-sm rounded-3xl p-6">
        <h2 className="font-serif text-xl font-semibold text-[var(--color-bark)]">Add person</h2>

        <div className="mt-4 space-y-3">
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            required
            className={inputClass}
          />
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
            className={inputClass}
          />
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as FamilyMember['gender'])}
            className={inputClass}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          <input
            type="number"
            min={1}
            value={generation}
            onChange={(e) => setGeneration(e.target.value)}
            placeholder="Generation (optional)"
            className={inputClass}
          />
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-liquid flex-1 rounded-2xl border border-[color-mix(in_srgb,var(--color-bark)_12%,transparent)] py-2.5 text-sm font-medium text-[var(--color-bark-light)] hover:bg-[color-mix(in_srgb,var(--color-cream)_80%,transparent)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-liquid btn-primary flex-1 rounded-2xl py-2.5 text-sm font-medium text-[var(--color-cream)]"
          >
            {submitting ? 'Adding…' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  )
}

const inputClass = 'glass-input w-full rounded-xl px-3 py-2 text-sm outline-none'

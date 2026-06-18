import { useState } from 'react'
import type { FamilyMember } from '../types'
import { displayName } from '../utils/family'

interface PersonEditFormProps {
  member: FamilyMember
  members: FamilyMember[]
  onSave: (patch: Partial<FamilyMember>, spouseId: string | undefined) => void
  onDelete: () => void
  onCancel: () => void
}

export function PersonEditForm({
  member,
  members,
  onSave,
  onDelete,
  onCancel,
}: PersonEditFormProps) {
  const [firstName, setFirstName] = useState(member.firstName)
  const [lastName, setLastName] = useState(member.lastName)
  const [gender, setGender] = useState(member.gender)
  const [birthYear, setBirthYear] = useState(member.birthYear ?? '')
  const [deathYear, setDeathYear] = useState(member.deathYear ?? '')
  const [birthPlace, setBirthPlace] = useState(member.birthPlace ?? '')
  const [anniversary, setAnniversary] = useState(member.anniversary ?? '')
  const [generation, setGeneration] = useState(
    member.generation != null ? String(member.generation) : '',
  )
  const [profession, setProfession] = useState(member.profession ?? '')
  const [bio, setBio] = useState(member.bio ?? '')
  const [fatherId, setFatherId] = useState(member.fatherId ?? '')
  const [motherId, setMotherId] = useState(member.motherId ?? '')
  const [spouseId, setSpouseId] = useState(member.spouseId ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const others = members.filter((m) => m.id !== member.id)

  const handleSave = () => {
    onSave(
      {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender,
        birthYear: birthYear.trim() || undefined,
        deathYear: deathYear.trim() || undefined,
        birthPlace: birthPlace.trim() || undefined,
        anniversary: anniversary.trim() || undefined,
        generation: generation.trim() ? Number(generation) : undefined,
        profession: profession.trim() || undefined,
        bio: bio.trim() || undefined,
        fatherId: fatherId || undefined,
        motherId: motherId || undefined,
      },
      spouseId || undefined,
    )
  }

  return (
    <div className="space-y-4 bg-white">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="First name">
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Last name">
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Gender">
        <select value={gender} onChange={(e) => setGender(e.target.value as FamilyMember['gender'])} className={inputClass}>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Birth date">
          <input value={birthYear} onChange={(e) => setBirthYear(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Death date">
          <input value={deathYear} onChange={(e) => setDeathYear(e.target.value)} className={inputClass} />
        </Field>
      </div>

      <Field label="Birth place">
        <input value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} className={inputClass} />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Anniversary">
          <input value={anniversary} onChange={(e) => setAnniversary(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Generation">
          <input
            type="number"
            min={1}
            value={generation}
            onChange={(e) => setGeneration(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Profession">
        <input value={profession} onChange={(e) => setProfession(e.target.value)} className={inputClass} />
      </Field>

      <Field label="Bio">
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          className={inputClass}
        />
      </Field>

      <div className="border-t border-[color-mix(in_srgb,var(--color-bark)_8%,transparent)] pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-sage)]">
          Relationships
        </p>
        <div className="space-y-3">
          <Field label="Father">
            <MemberSelect
              value={fatherId}
              onChange={setFatherId}
              members={others.filter((m) => m.gender === 'male' || m.gender === 'other')}
            />
          </Field>
          <Field label="Mother">
            <MemberSelect
              value={motherId}
              onChange={setMotherId}
              members={others.filter((m) => m.gender === 'female' || m.gender === 'other')}
            />
          </Field>
          <Field label="Spouse">
            <MemberSelect value={spouseId} onChange={setSpouseId} members={others} />
          </Field>
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-2">
        <button
          type="button"
          onClick={handleSave}
          className="w-full rounded-xl bg-[var(--color-sage)] py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          Save changes
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-xl border border-[color-mix(in_srgb,var(--color-bark)_15%,transparent)] py-2.5 text-sm font-medium text-[var(--color-bark-light)] hover:bg-[var(--color-cream)]"
        >
          Cancel
        </button>
      </div>

      <div className="border-t border-[color-mix(in_srgb,var(--color-bark)_8%,transparent)] pt-4">
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="text-sm text-[var(--color-rose)] hover:underline"
          >
            Delete this person
          </button>
        ) : (
          <div className="rounded-xl bg-[color-mix(in_srgb,var(--color-rose)_10%,white)] p-3">
            <p className="text-sm text-[var(--color-bark)]">
              Delete {displayName(member)}? This cannot be undone.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-[var(--color-bark-light)] hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg bg-[var(--color-rose)] px-3 py-1.5 text-sm font-medium text-white"
              >
                Confirm delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-bark-light)]">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

function MemberSelect({
  value,
  onChange,
  members,
}: {
  value: string
  onChange: (id: string) => void
  members: FamilyMember[]
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
      <option value="">— None —</option>
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {displayName(m)}
          {m.generation != null ? ` (Gen ${m.generation})` : ''}
        </option>
      ))}
    </select>
  )
}

const inputClass =
  'w-full rounded-lg border border-[color-mix(in_srgb,var(--color-bark)_15%,transparent)] bg-white px-3 py-2 text-sm text-[var(--color-bark)] outline-none focus:border-[var(--color-sage)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-sage)_20%,transparent)]'

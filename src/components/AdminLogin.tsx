import { useState } from 'react'
import { loginAdmin } from '../api/client'

interface AdminLoginProps {
  onSuccess: () => void
  onClose: () => void
}

export function AdminLogin({ onSuccess, onClose }: AdminLoginProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await loginAdmin(password)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Incorrect password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center liquid-overlay p-4">
      <form
        onSubmit={submit}
        className="glass-modal fade-in w-full max-w-sm rounded-3xl p-6"
      >
        <h2 className="font-serif text-xl font-semibold text-[var(--color-bark)]">Admin mode</h2>
        <p className="mt-1 text-sm text-[var(--color-bark-light)]">
          Enter the admin password to edit family members.
        </p>

        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setError('')
          }}
          placeholder="Password"
          autoFocus
          disabled={submitting}
          className="glass-input mt-4 w-full rounded-2xl px-3 py-2.5 text-sm outline-none"
        />

        {error && <p className="mt-2 text-sm text-[var(--color-rose)]">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="btn-liquid flex-1 rounded-2xl border border-[color-mix(in_srgb,var(--color-bark)_12%,transparent)] py-2.5 text-sm font-medium text-[var(--color-bark-light)] hover:bg-[color-mix(in_srgb,var(--color-cream)_80%,transparent)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-liquid btn-primary flex-1 rounded-2xl py-2.5 text-sm font-medium text-[var(--color-cream)]"
          >
            {submitting ? 'Signing in…' : 'Unlock'}
          </button>
        </div>
      </form>
    </div>
  )
}

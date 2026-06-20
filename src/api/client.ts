import seedMembers from '../data/family.json'
import type { FamilyMember } from '../types'
import { mergeSeedDefaults } from '../utils/seedMerge'

const SEED = seedMembers as FamilyMember[]

const API_BASE = import.meta.env.VITE_API_URL ?? ''
const ADMIN_TOKEN_KEY = 'family-tree-admin-token'

export function getAdminToken(): string | null {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY)
}

export function setAdminToken(token: string): void {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token)
}

export function clearAdminToken(): void {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY)
}

export function isAdminSession(): boolean {
  return Boolean(getAdminToken())
}

function withSeedDefaults(members: FamilyMember[]): FamilyMember[] {
  return mergeSeedDefaults(members, SEED)
}

export async function fetchMembers(): Promise<FamilyMember[]> {
  try {
    const res = await fetch(`${API_BASE}/api/members`)
    if (res.ok) {
      const members = (await res.json()) as FamilyMember[]
      return withSeedDefaults(members)
    }
  } catch {
    // try static fallback below
  }

  const fallback = await fetch(`${API_BASE}/members.json`)
  if (!fallback.ok) {
    throw new Error('Could not load family data')
  }
  const members = (await fallback.json()) as FamilyMember[]
  return withSeedDefaults(members)
}

export async function saveMembers(members: FamilyMember[]): Promise<void> {
  const token = getAdminToken()
  if (!token) {
    throw new Error('Not authenticated')
  }

  const res = await fetch(`${API_BASE}/api/members`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(members),
  })

  if (res.status === 401) {
    clearAdminToken()
    throw new Error('Session expired. Please sign in again.')
  }

  if (!res.ok) {
    throw new Error('Could not save changes')
  }
}

export async function loginAdmin(password: string): Promise<void> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
  } catch {
    throw new Error(
      'Could not reach the admin API. On Netlify, confirm the site is deployed with functions. Locally, run npm run dev:all.',
    )
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    if (res.status === 404) {
      throw new Error('Admin login API not found. Try redeploying the latest version from GitHub.')
    }
    throw new Error(body.error || 'Incorrect password')
  }

  const data = (await res.json()) as { token: string }
  setAdminToken(data.token)
}

export function logoutAdmin(): void {
  clearAdminToken()
}

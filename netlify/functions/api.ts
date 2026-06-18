import type { Handler } from '@netlify/functions'
import jwt from 'jsonwebtoken'
import seedData from './data/family.json'
import { getStore } from '@netlify/blobs'

type FamilyMember = {
  id: string
  firstName: string
  lastName: string
  gender: 'male' | 'female' | 'other'
  birthYear?: string
  deathYear?: string
  birthPlace?: string
  profession?: string
  bio?: string
  avatarUrl?: string
  spouseId?: string
  fatherId?: string
  motherId?: string
  generation?: number
  anniversary?: string
}

const SEED = seedData as FamilyMember[]
const BLOB_KEY = 'members'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'krishnamachari'
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me'

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
}

async function loadMembers(): Promise<FamilyMember[]> {
  try {
    const store = getStore({ name: 'family-tree', consistency: 'strong' })
    const data = await store.get(BLOB_KEY, { type: 'json' })
    if (data) return data as FamilyMember[]
    await store.setJSON(BLOB_KEY, SEED)
    return SEED
  } catch (err) {
    console.error('Blob read failed, using seed:', err)
    return SEED
  }
}

async function saveMembers(members: FamilyMember[]): Promise<void> {
  const store = getStore({ name: 'family-tree', consistency: 'strong' })
  await store.setJSON(BLOB_KEY, members)
}

function requestPath(event: { path: string; rawUrl?: string }): string {
  if (event.rawUrl) {
    try {
      return new URL(event.rawUrl).pathname
    } catch {
      // fall through
    }
  }
  return event.path
}

function verifyAdmin(event: { headers: Record<string, string | undefined> }): boolean {
  const header = event.headers.authorization ?? event.headers.Authorization
  if (!header?.startsWith('Bearer ')) return false
  try {
    jwt.verify(header.slice(7), JWT_SECRET)
    return true
  } catch {
    return false
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' }
  }

  const path = requestPath(event)

  try {
    if (path === '/api/health' && event.httpMethod === 'GET') {
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true }) }
    }

    if (path === '/api/members' && event.httpMethod === 'GET') {
      const members = await loadMembers()
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(members) }
    }

    if (path === '/api/auth/login' && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body ?? '{}') as { password?: string }
      if (body.password !== ADMIN_PASSWORD) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Incorrect password' }),
        }
      }
      const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '7d' })
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ token }) }
    }

    if (path === '/api/members' && event.httpMethod === 'PUT') {
      if (!verifyAdmin(event)) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Unauthorized' }),
        }
      }
      const members = JSON.parse(event.body ?? '[]')
      if (!Array.isArray(members)) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Expected an array of members' }),
        }
      }
      await saveMembers(members as FamilyMember[])
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true }) }
    }

    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Not found', path }),
    }
  } catch (err) {
    console.error('API error:', err)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Server error' }),
    }
  }
}

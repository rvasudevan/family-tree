const jwt = require('jsonwebtoken')
const { getStore } = require('@netlify/blobs')
const seed = require('./data/family.json')

const BLOB_KEY = 'members'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'krishnamachari'
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
}

const { mergeSeedDefaults } = require('./seedMerge')

async function loadMembers() {
  try {
    const store = getStore({ name: 'family-tree', consistency: 'strong' })
    const data = await store.get(BLOB_KEY, { type: 'json' })
    if (data) return mergeSeedDefaults(data, seed)
    await store.setJSON(BLOB_KEY, seed)
    return seed
  } catch (err) {
    console.error('Blob read failed, using seed:', err)
    return seed
  }
}

async function saveMembers(members) {
  const store = getStore({ name: 'family-tree', consistency: 'strong' })
  await store.setJSON(BLOB_KEY, members)
}

function requestPath(event) {
  const candidates = []

  if (event.rawUrl) {
    try {
      candidates.push(new URL(event.rawUrl).pathname)
    } catch {
      // fall through
    }
  }

  if (event.rawPath) candidates.push(event.rawPath)
  if (event.path) candidates.push(event.path)

  const forwarded =
    event.headers?.['x-nf-request-url'] ||
    event.headers?.['X-Nf-Request-Url'] ||
    event.headers?.['x-forwarded-uri'] ||
    event.headers?.['X-Forwarded-Uri']
  if (forwarded) {
    try {
      candidates.push(new URL(forwarded).pathname)
    } catch {
      candidates.push(forwarded)
    }
  }

  for (const path of candidates) {
    if (path && path.startsWith('/api/')) return path
  }

  return event.path || '/'
}

function verifyAdmin(event) {
  const header = event.headers.authorization || event.headers.Authorization
  if (!header || !header.startsWith('Bearer ')) return false
  try {
    jwt.verify(header.slice(7), JWT_SECRET)
    return true
  } catch {
    return false
  }
}

const handler = async (event) => {
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
      const body = JSON.parse(event.body || '{}')
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
      const members = JSON.parse(event.body || '[]')
      if (!Array.isArray(members)) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Expected an array of members' }),
        }
      }
      await saveMembers(members)
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

module.exports = { handler }

import cors from 'cors'
import express from 'express'
import jwt from 'jsonwebtoken'
import type { FamilyMember } from '../src/types'
import { getMembers, setMembers } from './store.js'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'krishnamachari'
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me'

function requireAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    jwt.verify(header.slice(7), JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
  }
}

export function createApp(): express.Application {
  const app = express()

  app.use(cors())
  app.use(express.json({ limit: '4mb' }))

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true })
  })

  app.get('/api/members', async (_req, res) => {
    try {
      const members = await getMembers()
      res.json(members)
    } catch {
      res.status(500).json({ error: 'Failed to load family data' })
    }
  })

  app.post('/api/auth/login', (req, res) => {
    const password = req.body?.password
    if (typeof password !== 'string' || password !== ADMIN_PASSWORD) {
      res.status(401).json({ error: 'Incorrect password' })
      return
    }

    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ token })
  })

  app.put('/api/members', requireAdmin, async (req, res) => {
    const members = req.body
    if (!Array.isArray(members)) {
      res.status(400).json({ error: 'Expected an array of members' })
      return
    }

    try {
      await setMembers(members as FamilyMember[])
      res.json({ ok: true })
    } catch {
      res.status(500).json({ error: 'Failed to save family data' })
    }
  })

  return app
}

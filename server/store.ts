import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import seedData from './seed/family.json' with { type: 'json' }
import type { FamilyMember } from '../src/types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const DATA_FILE = process.env.DATA_FILE ?? path.join(DATA_DIR, 'family.json')
const BLOB_KEY = 'members'
const SEED_MEMBERS = seedData as FamilyMember[]

function useNetlifyBlobs(): boolean {
  return Boolean(process.env.NETLIFY) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME)
}

async function readSeed(): Promise<FamilyMember[]> {
  return SEED_MEMBERS
}

async function ensureDataFile(): Promise<void> {
  try {
    await fs.access(DATA_FILE)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(DATA_FILE, `${JSON.stringify(SEED_MEMBERS, null, 2)}\n`)
  }
}

async function getMembersFromFile(): Promise<FamilyMember[]> {
  await ensureDataFile()
  const raw = await fs.readFile(DATA_FILE, 'utf8')
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) {
    throw new Error('Family data file is invalid')
  }
  return mergeSeedAvatars(parsed as FamilyMember[])
}

function mergeSeedAvatars(members: FamilyMember[]): FamilyMember[] {
  const seedById = new Map(SEED_MEMBERS.map((m) => [m.id, m]))
  return members.map((member) => {
    const seed = seedById.get(member.id)
    if (seed?.avatarUrl && !member.avatarUrl) {
      return { ...member, avatarUrl: seed.avatarUrl }
    }
    return member
  })
}

async function setMembersToFile(members: FamilyMember[]): Promise<void> {
  await ensureDataFile()
  await fs.writeFile(DATA_FILE, `${JSON.stringify(members, null, 2)}\n`)
}

async function getMembersFromBlob(): Promise<FamilyMember[]> {
  try {
    const { getStore } = await import('@netlify/blobs')
    const store = getStore({ name: 'family-tree', consistency: 'strong' })
    const data = await store.get(BLOB_KEY, { type: 'json' })
    if (data) return mergeSeedAvatars(data as FamilyMember[])
    const seed = await readSeed()
    await store.setJSON(BLOB_KEY, seed)
    return seed
  } catch (err) {
    console.error('Netlify Blobs unavailable, using seed data:', err)
    return readSeed()
  }
}

async function setMembersToBlob(members: FamilyMember[]): Promise<void> {
  const { getStore } = await import('@netlify/blobs')
  const store = getStore({ name: 'family-tree', consistency: 'strong' })
  await store.setJSON(BLOB_KEY, members)
}

export async function getMembers(): Promise<FamilyMember[]> {
  if (useNetlifyBlobs()) {
    return getMembersFromBlob()
  }
  return getMembersFromFile()
}

export async function setMembers(members: FamilyMember[]): Promise<void> {
  if (useNetlifyBlobs()) {
    await setMembersToBlob(members)
    return
  }
  await setMembersToFile(members)
}

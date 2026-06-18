import { readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const csvPath =
  process.argv[2] ??
  join(process.env.HOME ?? '', 'Downloads/krishnamachari_family_tree.csv')

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/)
  const headers = splitCsvLine(lines[0])
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line)
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })
}

function splitCsvLine(line) {
  const values = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      values.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  values.push(current)
  return values
}

function splitName(name) {
  const trimmed = name.trim()
  const parts = trimmed.split(/\s+/)
  if (parts.length <= 1) return { firstName: trimmed, lastName: '' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

const FEMALE_NAMES = new Set([
  'kannakavalli', 'vedam', 'komala', 'shantha', 'jaya', 'janaki', 'indira', 'mythily',
  'vasantha', 'lakshmi', 'revathi', 'usha', 'hema', 'sherry', 'jayasri', 'kamala',
  'santha', 'alamelu', 'padmaja', 'uma', 'radhika', 'vidya', 'sweta', 'rajani', 'rema',
  'ramya', 'vijaya', 'sowmya', 'aarti', 'sangeeta', 'priya', 'mythili', 'harini', 'radha',
  'carin', 'jana', 'rinara', 'aishwarya', 'archana', 'rajeswari', 'srividya', 'neharika',
  'sahana', 'madhumitha', 'upasana', 'shubha', 'krupa', 'sindhu', 'niranjana', 'shruti',
  'divya', 'mallika', 'ranjani', 'medha', 'anjali', 'shreya', 'hana', 'beverly', 'jayanti',
  'vasanthi', 'vaijayanthi',
])

const MALE_NAMES = new Set([
  'krishnamachari', 'sundararajan', 'chari', 'rangaswamy', 'ramanujam', 'parthasarathi',
  'raghavan', 'narayanan', 'sarathy', 'rajagopalan', 'gopal', 'srinivasan', 'santhanam',
  'seshadri', 'vasudevan', 'jagannathan', 'vasu', 'rangarajan', 'narasimhan', 'padmanabhan',
  'iyengar', 'janardhanan', 'venkatesh', 'vijay', 'sriram', 'krishnan', 'srinath', 'athreya',
  'vijayaraghavan', 'sundar', 'ramprasad', 'sarathi', 'ramprakash', 'kapoor', 'mandeep',
  'balaji', 'srivastava', 'teja', 'srinivas', 'prashanth', 'anish', 'bharath', 'arjun',
  'siddharth', 'rohan', 'hrishi', 'aditya', 'jaron', 'kai', 'leor', 'vikshar', 'vibhav',
  'ved', 'aditya', 'sudarsan', 'damu', 'aakash', 'anisha', 'ashwin', 'vishnu', 'gautam',
])

function guessGender(name, id) {
  if (id === 'kr') return 'male'
  if (id === 'ka') return 'female'

  const lower = name.toLowerCase()
  if (lower.startsWith('dr.') || lower.startsWith('dr ')) return 'male'

  const tokens = lower.replace(/[.(]/g, ' ').split(/\s+/).filter(Boolean)
  for (const token of tokens) {
    if (FEMALE_NAMES.has(token)) return 'female'
    if (MALE_NAMES.has(token)) return 'male'
  }

  const first = tokens[0] ?? ''
  if (/^(k|r|s|n|p|t|v|j|d|m|g|a)\./.test(first) && !FEMALE_NAMES.has(first.replace(/\./g, ''))) {
    return 'male'
  }

  return undefined
}

function inferGenders(rows) {
  const gender = {}

  for (const row of rows) {
    const g = guessGender(row.name, row.id)
    if (g) gender[row.id] = g
  }

  let changed = true
  while (changed) {
    changed = false
    for (const row of rows) {
      if (row.spouse_id && gender[row.id] && !gender[row.spouse_id]) {
        gender[row.spouse_id] = gender[row.id] === 'male' ? 'female' : 'male'
        changed = true
      }
      if (row.parent1_id && gender[row.id] && !gender[row.parent1_id]) {
        gender[row.parent1_id] = gender[row.id] === 'male' ? 'female' : 'male'
        changed = true
      }
      if (row.parent2_id && gender[row.id] && !gender[row.parent2_id]) {
        gender[row.parent2_id] = gender[row.id] === 'male' ? 'female' : 'male'
        changed = true
      }
    }
  }

  for (const row of rows) {
    if (!gender[row.id]) gender[row.id] = 'other'
  }

  return gender
}

function toMember(row, gender) {
  const { firstName, lastName } = splitName(row.name)
  const g = gender[row.id]

  let fatherId
  let motherId

  if (row.parent1_id && row.parent2_id) {
    const p1 = gender[row.parent1_id]
    const p2 = gender[row.parent2_id]
    if (p1 === 'male') {
      fatherId = row.parent1_id
      motherId = row.parent2_id
    } else if (p2 === 'male') {
      fatherId = row.parent2_id
      motherId = row.parent1_id
    } else if (p1 === 'female') {
      motherId = row.parent1_id
      fatherId = row.parent2_id
    } else {
      fatherId = row.parent1_id
      motherId = row.parent2_id
    }
  } else if (row.parent1_id) {
    if (gender[row.parent1_id] === 'male') fatherId = row.parent1_id
    else if (gender[row.parent1_id] === 'female') motherId = row.parent1_id
    else fatherId = row.parent1_id
  } else if (row.parent2_id) {
    if (gender[row.parent2_id] === 'male') fatherId = row.parent2_id
    else if (gender[row.parent2_id] === 'female') motherId = row.parent2_id
    else motherId = row.parent2_id
  }

  const member = {
    id: row.id,
    firstName,
    lastName,
    gender: g,
    birthYear: row.birth_date || undefined,
    birthPlace: row.birthplace || undefined,
    spouseId: row.spouse_id || undefined,
    fatherId,
    motherId,
    generation: row.generation ? Number(row.generation) : undefined,
    anniversary: row.anniversary || undefined,
  }

  return Object.fromEntries(Object.entries(member).filter(([, v]) => v !== undefined))
}

const csv = readFileSync(csvPath, 'utf8')
const rows = parseCsv(csv)

const gender = inferGenders(rows)
const members = rows.map((row) => toMember(row, gender))

const outJson = join(root, 'src/data/family.json')
const outCsv = join(root, 'src/data/krishnamachari_family_tree.csv')

writeFileSync(outJson, JSON.stringify(members, null, 2) + '\n')
copyFileSync(csvPath, outCsv)

const withParents = members.filter((m) => m.fatherId || m.motherId).length
const withSpouse = members.filter((m) => m.spouseId).length

console.log(`Imported ${members.length} members from ${csvPath}`)
console.log(`  → ${outJson}`)
console.log(`  ${withParents} with parents, ${withSpouse} with spouse`)

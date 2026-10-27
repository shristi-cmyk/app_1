import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { viasocket } from './viasocket.js'

// viaSocket's own app table: every app with its website. Paged once, kept in memory and (on Embarko)
// in DATA_DIR for a day, so a partner's domain comes from viaSocket instead of being guessed.
const FILE = process.env.DATA_DIR ? join(process.env.DATA_DIR, 'catalog.json') : null
const TTL = 24 * 3600 * 1000
const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')

let index = null // { at, apps: [{ serviceId, name, slug, domain, iconUrl }] }
let loading = null

function readCache() {
  if (!FILE) return null
  try {
    const c = JSON.parse(readFileSync(FILE, 'utf8'))
    return Date.now() - c.at < TTL && c.apps?.length ? c : null
  } catch { return null }
}

async function fetchAll() {
  const apps = []
  for (let offset = 0; offset < 8000; offset += 200) {
    const page = await viasocket().catalog.list({ limit: 200, offset })
    if (!page.length) break
    for (const a of page) apps.push({ serviceId: a.serviceId, name: a.name, slug: a.slug ?? '', domain: a.domain ?? '', iconUrl: a.iconUrl ?? '' })
  }
  if (!apps.length) throw new Error('catalog list was empty')
  return { at: Date.now(), apps }
}

async function load() {
  if (index && Date.now() - index.at < TTL) return index
  index = readCache()
  if (index) return index
  loading ??= fetchAll().then((c) => {
    index = c
    if (FILE) { try { mkdirSync(join(FILE, '..'), { recursive: true }); writeFileSync(FILE, JSON.stringify(c)) } catch { /* memory only */ } }
    return c
  }).finally(() => { loading = null })
  return loading
}

const cleanDomain = (d) => String(d ?? '').trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/[/?#].*$/, '').toLowerCase()

/**
 * Look an app up by name in viaSocket's table. Returns { app, domain, matches }:
 * exactly one website → `domain`; several different websites → `matches` so the caller can ask;
 * not in the table (or table unreachable) → null.
 */
export async function lookup(name) {
  let idx
  try { idx = await load() } catch { return null }
  const key = norm(name)
  if (!key) return null
  const rows = idx.apps.filter((a) => norm(a.name) === key || norm(a.slug) === key)
  if (!rows.length) return null
  const withDomain = rows.filter((r) => cleanDomain(r.domain))
  const domains = [...new Set(withDomain.map((r) => cleanDomain(r.domain)))]
  return {
    app: rows[0],
    domain: domains.length === 1 ? domains[0] : null,
    matches: domains.length > 1 ? withDomain.map((r) => ({ name: r.name, domain: cleanDomain(r.domain) })) : []
  }
}

/**
 * Which of these app names viaSocket lists. A name matches when it equals a catalog name or slug, or when one
 * starts with the other (so "Zendesk" finds "Zendesk Support"). null when the table could not be read.
 */
export async function listed(names) {
  let idx
  try { idx = await load() } catch { return null }
  const keys = idx.apps.flatMap((a) => [norm(a.name), norm(a.slug)]).filter(Boolean)
  const set = new Set(keys)
  return new Set(names.filter((n) => {
    const k = norm(n)
    if (k.length < 3) return false
    return set.has(k) || (k.length >= 5 && keys.some((x) => x.startsWith(k) || (x.length >= 5 && k.startsWith(x))))
  }))
}

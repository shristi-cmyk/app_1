import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

// Researched partners, kept in a SQLite file under DATA_DIR (Embarko's persistent folder) so each partner is
// researched once. Without DATA_DIR (local runs) nothing is stored and every deck is researched fresh.
const MAX_AGE = 30 * 24 * 3600 * 1000
let db = null
if (process.env.DATA_DIR) {
  try {
    mkdirSync(process.env.DATA_DIR, { recursive: true })
    db = new DatabaseSync(join(process.env.DATA_DIR, 'partners.db'))
    db.exec('PRAGMA journal_mode=WAL')
    db.exec('CREATE TABLE IF NOT EXISTS partners (slug TEXT PRIMARY KEY, name TEXT NOT NULL, research TEXT NOT NULL, updated_at INTEGER NOT NULL)')
  } catch (e) { console.warn('partner store unavailable:', e.message); db = null }
}

export const slugOf = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** The stored research ({ brief, assets, sources }) for a partner, or null if none or older than 30 days. */
export function recall(name) {
  if (!db) return null
  try {
    const row = db.prepare('SELECT research, updated_at FROM partners WHERE slug = ?').get(slugOf(name))
    return row && Date.now() - row.updated_at < MAX_AGE ? JSON.parse(row.research) : null
  } catch { return null }
}

export function remember(name, research) {
  if (!db) return
  try { db.prepare('INSERT OR REPLACE INTO partners (slug, name, research, updated_at) VALUES (?, ?, ?, ?)').run(slugOf(name), name, JSON.stringify(research), Date.now()) } catch (e) { console.warn('could not store partner:', e.message) }
}

export function list() {
  if (!db) return []
  try { return db.prepare('SELECT slug, name, updated_at FROM partners ORDER BY updated_at DESC').all() } catch { return [] }
}

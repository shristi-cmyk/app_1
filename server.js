import 'dotenv/config'
import express from 'express'
import { randomUUID, randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import * as icons from './src/icons.js'
import { research } from './src/research.js'
import { lookup, listed } from './src/catalog.js'
import { renderHtmlDeck, calLink } from './src/htmldeck.js'
import { recall, remember, list as storedPartners } from './src/store.js'
import { viasocket, ViaSocketError } from './src/viasocket.js'

const app = express()
app.use(express.json({ limit: '8mb' }))
app.use(express.static(fileURLToPath(new URL('./public', import.meta.url))))

const PUBLIC_URL = process.env.PUBLIC_URL ?? (process.env.APP_NAME ? `https://${process.env.APP_NAME}.embarko.app` : '')
const TOOL_KEY = process.env.TOOL_KEY ?? randomBytes(16).toString('hex')

// One id per end user, forever: a cookie here; swap for your auth user id if you add sign-in.
app.use((req, res, next) => {
  const m = /(?:^|; )uid=([\w-]+)/.exec(req.headers.cookie ?? '')
  req.uid = m?.[1] ?? randomUUID()
  if (!m) res.setHeader('Set-Cookie', `uid=${req.uid}; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly`)
  next()
})

const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  const status = e instanceof ViaSocketError ? 502 : 400
  res.status(status).json({ error: e.message, ...(e.body && { detail: e.body }) })
})

// ---------- animated 6-slide HTML decks: application name in, shareable link out ----------
// Deck pages are kept in memory and, on Embarko, as files under DATA_DIR so shared links survive restarts.
const htmlDecks = new Map()
const DECK_DIR = process.env.DATA_DIR ? join(process.env.DATA_DIR, 'decks') : null
if (DECK_DIR) mkdirSync(DECK_DIR, { recursive: true })
const loadDeck = (id) => {
  if (htmlDecks.has(id)) return htmlDecks.get(id)
  if (!DECK_DIR || !/^[a-z0-9-]+$/.test(id)) return null
  try { return readFileSync(join(DECK_DIR, `${id}.html`), 'utf8') } catch { return null }
}
let aisensy = null
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

async function partnerDeck(input, uid) {
  if (!input?.name) throw new Error('name (the application name) is required')
  // First time for a partner: research it and store the result. After that reuse it (refresh, or giving a
  // website, colour or description, researches again and replaces it). The presenter still has to be given.
  const fresh = input.refresh || input.domain || input.color || input.context
  const stored = fresh ? null : recall(input.name)
  let r
  if (stored) {
    const missing = []
    if (!String(input.presenterName ?? '').trim()) missing.push({ field: 'presenter', name: input.name, hint: 'Who is presenting this deck? (their name, shown on the last slide)' })
    if (!calLink(input.cal)) missing.push({ field: 'cal', name: input.name, hint: 'The presenter’s cal.id link or username (e.g. cal.id/yourname or just yourname)' })
    if (missing.length) return { status: 'needs_input', missing }
    r = { ...stored, sources: { ...stored.sources, fromStore: true } }
  } else {
    r = await research({ ...input, uid })
    if (r.missing) return { status: 'needs_input', missing: r.missing, found: r.found }
    remember(input.name, { brief: r.brief, assets: r.assets, sources: r.sources })
  }
  const id = `${slugify(input.name)}-${randomUUID().slice(0, 6)}`
  const html = await renderHtmlDeck(r.brief, r.assets, { name: input.presenterName, cal: input.cal })
  htmlDecks.set(id, html)
  if (DECK_DIR) writeFileSync(join(DECK_DIR, `${id}.html`), html)
  return { status: 'ready', url: `${PUBLIC_URL}/p/${id}`, sources: r.sources }
}

// Which website viaSocket's own app table lists for an app (read-only; used to check the lookup).
app.get('/api/catalog/lookup', wrap(async (req, res) => {
  const name = String(req.query.name ?? '')
  const hit = await lookup(name)
  const ok = await listed([name])
  res.json({ ...(hit ? { name: hit.app.name, domain: hit.domain, matches: hit.matches } : { found: false }), listed: ok ? ok.has(name) : null })
}))

app.get('/api/partners', (_req, res) => res.json(storedPartners()))
app.post('/api/partner-deck', wrap(async (req, res) => res.json(await partnerDeck(req.body, req.uid))))

app.post('/api/assets', wrap(async (req, res) => {
  const { name, field, url, base64, mime } = req.body
  if (!name || !(url || base64)) throw new Error('name and a url or base64 image are required')
  if (url) await icons.supplyFromUrl(name, url)
  else icons.supply(name, base64, mime)
  res.json({ ok: true })
}))

app.get('/p/:id', wrap(async (req, res) => {
  // The AiSensy preset has a fixed link; the presenter goes in the link: /p/aisensy?by=Name&cal=username
  if (req.params.id === 'aisensy') {
    aisensy ??= await research({ name: 'AiSensy', uid: 'preset', requirePresenter: false })
    if (aisensy.missing) return res.status(503).send('AiSensy deck is unavailable right now.')
    return res.type('html').send(await renderHtmlDeck(aisensy.brief, aisensy.assets, { name: req.query.by, cal: req.query.cal }))
  }
  const html = loadDeck(req.params.id)
  if (!html) return res.status(404).send('This deck is no longer stored here. Build it again.')
  res.type('html').send(html)
}))

// ---------- the product's AI, with this agent's tools ----------
app.post('/api/chat', wrap(async (req, res) => {
  const reply = await viasocket().user(req.uid).ai.send({
    threadId: req.body.threadId,
    message: req.body.message,
    prompt: `You are Partnership Deck Manager. Given an application name, you build an animated 6-slide viaSocket partnership deck and return its shareable link.
Call partner_deck with the application name, the presenter's name and their cal.id link (ask for them if missing), and the domain or brand colour only if the user gave them.
If it returns needs_input, ask the user for exactly the missing items (logo URL, brand colour, presenter name, cal.id link, website) and never guess them.
When it returns ready, reply with the link.`,
    tools: [{
      name: 'partner_deck',
      description: 'Research an application (logo, brand colour, use case) and build its animated 6-slide viaSocket pitch deck. Returns the link or what is missing.',
      url: `${PUBLIC_URL}/tools/partner_deck`,
      headers: { Authorization: `Bearer ${TOOL_KEY}`, 'X-User': req.uid },
      fields: {
        name: { type: 'string', description: 'Application name, e.g. AiSensy' },
        domain: { type: 'string', description: 'Website domain if known, e.g. aisensy.com' },
        color: { type: 'string', description: 'Brand colour as hex if the user gave one' },
        presenterName: { type: 'string', description: 'Name of the person presenting the deck' },
        cal: { type: 'string', description: 'The presenter’s cal.id username or link' },
        context: { type: 'string', description: 'Anything the user said about the pitch angle' }
      },
      requiredParams: ['name', 'presenterName', 'cal']
    }]
  })
  res.json(reply)
}))

app.post('/tools/partner_deck', wrap(async (req, res) => {
  if (req.headers.authorization !== `Bearer ${TOOL_KEY}`) return res.sendStatus(401)
  res.json(await partnerDeck(req.body, req.headers['x-user']))
}))

// ---------- agent-to-agent ----------
const peers = new Map(JSON.parse(process.env.PEER_AGENTS ?? '[]').map((p) => [p.name, p]))

app.get('/.well-known/agent.json', (_req, res) => res.json({
  name: 'Partnership Deck Manager',
  description: 'Application name in, shareable 5-slide viaSocket partnership deck out. Crawls the partner site for its use case, logo and colour, and asks when it cannot find one.',
  url: PUBLIC_URL,
  skills: [
    { id: 'partner_deck', description: 'Application name in, link to an animated 6-slide pitch deck out', input: { name: 'string', presenterName: 'string', cal: 'string (cal.id username or link)', domain: 'string?', color: 'string?', context: 'string?' } },
    { id: 'supply_icon', description: 'Provide a missing icon', input: { name: 'string', url: 'string' } }
  ]
}))

app.post('/a2a/tasks', wrap(async (req, res) => {
  const { skill, input = {}, from } = req.body
  if (skill === 'partner_deck') return res.json(await partnerDeck(input, `agent-${from ?? 'peer'}`))
  if (skill === 'supply_icon') { await icons.supplyFromUrl(input.name, input.url); return res.json({ ok: true }) }
  throw new Error(`Unknown skill "${skill}"`)
}))

app.get('/a2a/peers', (_req, res) => res.json([...peers.values()]))
app.post('/a2a/peers', wrap(async (req, res) => {
  const { name, url } = req.body
  if (!name || !url) throw new Error('name and url are required')
  peers.set(name, { name, url: url.replace(/\/$/, '') })
  res.json([...peers.values()])
}))

// Ask a peer agent: read its card, then send it a task.
app.post('/a2a/peers/:name/tasks', wrap(async (req, res) => {
  const peer = peers.get(req.params.name)
  if (!peer) throw new Error(`Unknown peer "${req.params.name}"`)
  const r = await fetch(`${peer.url}/a2a/tasks`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...req.body, from: 'Partnership Deck Manager' }), signal: AbortSignal.timeout(30000) })
  res.status(r.status).type('json').send(await r.text())
}))
app.get('/a2a/peers/:name/card', wrap(async (req, res) => {
  const peer = peers.get(req.params.name)
  if (!peer) throw new Error(`Unknown peer "${req.params.name}"`)
  const r = await fetch(`${peer.url}/.well-known/agent.json`, { signal: AbortSignal.timeout(10000) })
  res.status(r.status).type('json').send(await r.text())
}))

app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0', () => console.log(`Partnership Deck Manager on :${process.env.PORT ?? 3000}`))

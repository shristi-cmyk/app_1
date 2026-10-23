import 'dotenv/config'
import express from 'express'
import { randomUUID, randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { generate, decks } from './src/generate.js'
import * as icons from './src/icons.js'
import { PRESETS } from './src/briefs.js'
import { viasocket, planDelivery, runDelivery, ViaSocketError } from './src/viasocket.js'

const app = express()
app.use(express.json({ limit: '8mb' }))
app.use(express.static(fileURLToPath(new URL('./public', import.meta.url))))

const PUBLIC_URL = process.env.PUBLIC_URL ?? ''
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

// ---------- decks ----------
app.get('/api/presets', (_req, res) => res.json(Object.keys(PRESETS)))

app.post('/api/deck', wrap(async (req, res) => res.json(await generate({ ...req.body, uid: req.uid }))))

app.post('/api/icons', wrap(async (req, res) => {
  const { name, url, base64, mime } = req.body
  if (!name) throw new Error('name is required')
  if (url) await icons.supplyFromUrl(name, url)
  else if (base64) icons.supply(name, base64, mime)
  else throw new Error('Send a url or base64 image')
  res.json({ ok: true })
}))

app.get('/decks/:id/:file', (req, res) => {
  const d = decks.get(req.params.id)
  const ext = req.params.file.split('.').pop()
  if (!d?.[ext]) return res.sendStatus(404)
  res.type(ext === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.presentationml.presentation').send(d[ext])
})

// ---------- viaSocket: deliver a deck through the user's own app ----------
app.get('/api/viasocket/token', wrap(async (req, res) => res.json({ embedToken: await viasocket().user(req.uid).token() })))

app.get('/api/viasocket/apps', wrap(async (req, res) => res.json(await viasocket().catalog.search(String(req.query.q ?? '')))))

app.get('/api/viasocket/connections', wrap(async (req, res) => res.json(await viasocket().user(req.uid).listConnections())))

app.post('/api/viasocket/enable', wrap(async (req, res) => {
  const { serviceId, authId } = req.body
  const user = viasocket().user(req.uid)
  const scriptId = (await user.findEnabled(serviceId)) ?? (await user.enable(serviceId, authId)).scriptId
  res.json({ enabled: !!scriptId }) // the scriptId is a credential: it stays on the server
}))

app.get('/api/viasocket/plan', wrap(async (req, res) => res.json(await planDelivery(req.uid, String(req.query.serviceId), req.query.authId && String(req.query.authId)))))

app.post('/api/viasocket/send', wrap(async (req, res) => {
  const { serviceId, versionId, deckId, inputData } = req.body
  const d = decks.get(deckId)
  if (!d) throw new Error('Unknown deck')
  const link = `${PUBLIC_URL}/decks/${deckId}/${d.base}.${d.pdf ? 'pdf' : 'pptx'}`
  const fill = (v) => (v === '{{deck_link}}' ? link : v === '{{deck_name}}' ? d.base.replace('_', ' ').replace('_', ' ') : v)
  const data = Object.fromEntries(Object.entries(inputData).map(([k, v]) => [k, typeof v === 'string' ? fill(v) : v]))
  res.json(await runDelivery(req.uid, serviceId, versionId, data))
}))

// ---------- the product's AI, with this agent's tools ----------
app.post('/api/chat', wrap(async (req, res) => {
  const reply = await viasocket().user(req.uid).ai.send({
    threadId: req.body.threadId,
    message: req.body.message,
    prompt: `You are Partnership Deck Manager, which builds customised viaSocket pitch decks for partners.
Use generate_deck when the user names a partner. Ask for the partner's website domain and brand colour if you don't have them.
If generate_deck returns status needs_icons, ask the user for the missing icons (a logo URL or image) and do not guess.
When it returns ready, give the user the file links.`,
    tools: [{
      name: 'generate_deck',
      description: 'Build the seven-slide viaSocket pitch deck for a partner. Returns file links or the icons that are missing.',
      url: `${PUBLIC_URL}/tools/generate_deck`,
      headers: { Authorization: `Bearer ${TOOL_KEY}`, 'X-User': req.uid },
      fields: {
        name: { type: 'string', description: 'Partner name, e.g. AiSensy' },
        domain: { type: 'string', description: 'Partner website domain, e.g. aisensy.com' },
        color: { type: 'string', description: 'Partner brand colour as hex, e.g. #07CF65' },
        context: { type: 'string', description: 'What the partner does and the pitch angle' }
      },
      requiredParams: ['name', 'domain']
    }]
  })
  res.json(reply)
}))

app.post('/tools/generate_deck', wrap(async (req, res) => {
  if (req.headers.authorization !== `Bearer ${TOOL_KEY}`) return res.sendStatus(401)
  const { name, domain, color, context } = req.body
  const preset = PRESETS[String(name).toLowerCase()] ? name : undefined
  const out = await generate({ preset, partner: { name, domain, color }, context, useAi: !!context, uid: req.headers['x-user'] })
  if (out.files) for (const k of Object.keys(out.files)) out.files[k] = PUBLIC_URL + out.files[k]
  res.json(out)
}))

// ---------- agent-to-agent ----------
const peers = new Map(JSON.parse(process.env.PEER_AGENTS ?? '[]').map((p) => [p.name, p]))

app.get('/.well-known/agent.json', (_req, res) => res.json({
  name: 'Partnership Deck Manager',
  description: 'Builds customised viaSocket pitch decks for partners, crawling for their icons and asking when one cannot be found.',
  url: PUBLIC_URL,
  skills: [
    { id: 'generate_deck', description: 'Build a partner deck', input: { preset: 'string?', partner: '{name, domain, color}?', context: 'string?' } },
    { id: 'supply_icon', description: 'Provide a missing icon', input: { name: 'string', url: 'string' } }
  ]
}))

app.post('/a2a/tasks', wrap(async (req, res) => {
  const { skill, input = {}, from } = req.body
  if (skill === 'generate_deck') {
    const out = await generate({ ...input, uid: `agent-${from ?? 'peer'}` })
    if (out.files) for (const k of Object.keys(out.files)) out.files[k] = PUBLIC_URL + out.files[k]
    return res.json(out)
  }
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

app.listen(process.env.PORT ?? 3000, () => console.log(`Partnership Deck Manager on :${process.env.PORT ?? 3000}`))

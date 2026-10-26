// Read-only viaSocket lookups the agent uses to verify product and catalog claims.
// All endpoints are public; no embed token or secret is involved.
const SEARCH_URL = 'https://flow.sokt.io/func/scri12BSufQM'
const CATALOG_URL = 'https://flow.sokt.io/func/scriK4LFg2kc'
const DOC_BASE = 'https://flow.viasocket.com/documentation/'
const DOCS = ['embed', 'catalog-api', 'automations', 'form-renderer']
const MAX_DOC_CHARS = 30000

export const TOOL_DEFS = [
  {
    name: 'viasocket_search_apps',
    description: 'Search the public viaSocket app catalog by name. Returns up to 10 matches with service_id. Use it to check whether an app has a viaSocket connector.',
    input_schema: { type: 'object', properties: { query: { type: 'string', description: 'App name, e.g. "HubSpot"' } }, required: ['query'], additionalProperties: false },
  },
  {
    name: 'viasocket_app_capabilities',
    description: 'List the published actions and triggers of one viaSocket app, by the service_id returned from viasocket_search_apps. Use it to verify what viaSocket can actually do with an app.',
    input_schema: { type: 'object', properties: { service_id: { type: 'string', description: 'Exact service_id from search results' } }, required: ['service_id'], additionalProperties: false },
  },
  {
    name: 'viasocket_product_docs',
    description: 'Fetch one of viaSocket\'s public product documents to verify what its integration layer supports: "embed" (prebuilt embedded UI), "catalog-api" (apps and actions for a product\'s own UI or AI agent tools), "automations" (flows run on viaSocket), "form-renderer".',
    input_schema: { type: 'object', properties: { doc: { type: 'string', enum: DOCS } }, required: ['doc'], additionalProperties: false },
  },
]

async function getJson(url, init) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`viaSocket responded ${res.status}`)
  return res.json()
}

const names = (list) => (Array.isArray(list) ? list.map((x) => x.name || x.action_name || x.trigger_name).filter(Boolean) : [])

export async function runTool(name, input) {
  if (name === 'viasocket_search_apps') {
    const j = await getJson(`${SEARCH_URL}?key=${encodeURIComponent(String(input.query || '').slice(0, 80))}`)
    return (j.data || []).slice(0, 10).map(({ service_id, name, description }) => ({ service_id, name, description: String(description || '').slice(0, 160) }))
  }
  if (name === 'viasocket_app_capabilities') {
    const j = await getJson(CATALOG_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service_id: String(input.service_id || '') }),
    })
    const d = j.data || j
    return {
      service: d.service && { name: d.service.name, auth_type: d.service.auth_type },
      actions: names(d.actions),
      triggers: names(d.triggers),
      note: 'Empty lists mean no published actions or triggers in the catalog.',
    }
  }
  if (name === 'viasocket_product_docs') {
    if (!DOCS.includes(input.doc)) throw new Error('Unknown doc')
    const res = await fetch(`${DOC_BASE}${input.doc}.md`, { signal: AbortSignal.timeout(20000) })
    if (!res.ok) throw new Error(`viaSocket docs responded ${res.status}`)
    const text = await res.text()
    return text.length > MAX_DOC_CHARS ? text.slice(0, MAX_DOC_CHARS) + '\n[truncated]' : text
  }
  throw new Error(`Unknown tool ${name}`)
}

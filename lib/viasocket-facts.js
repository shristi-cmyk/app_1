import { getViasocket } from './viasocket.js'

const DOC_BASE = 'https://flow.viasocket.com/documentation/'
// Public viaSocket documents that describe what its integration layer supports.
const DOCS = [
  ['embed.md', 'Prebuilt embedded UI (Embed)'],
  ['catalog-api.md', 'Catalog API: apps/actions in a product\'s own UI or as AI agent tools'],
  ['automations.md', 'Automations: flows run on viaSocket'],
]
const DOC_CHARS = 5000
let docCache = { at: 0, text: '' }

async function productDocs() {
  if (Date.now() - docCache.at < 3600_000 && docCache.text) return docCache.text
  const parts = await Promise.all(DOCS.map(async ([file, title]) => {
    try {
      const res = await fetch(DOC_BASE + file, { signal: AbortSignal.timeout(20000) })
      if (!res.ok) return `### ${title} (${DOC_BASE}${file})\nUnavailable: HTTP ${res.status}`
      const t = await res.text()
      return `### ${title} (${DOC_BASE}${file})\n${t.slice(0, DOC_CHARS)}${t.length > DOC_CHARS ? '\n[truncated]' : ''}`
    } catch (e) {
      return `### ${title} (${DOC_BASE}${file})\nUnavailable: ${e.message}`
    }
  }))
  docCache = { at: Date.now(), text: parts.join('\n\n') }
  return docCache.text
}

// Does the target application have a viaSocket connector, and what can it do?
async function appCoverage(name) {
  try {
    const matches = (await getViasocket().catalog.search(name)).slice(0, 8)
    if (!matches.length) return `No viaSocket catalog match for "${name}".`
    const lower = name.toLowerCase()
    const best = matches.find((m) => m.name.toLowerCase() === lower) || matches.find((m) => m.name.toLowerCase().includes(lower))
    let detail = 'No close name match, so no connector is confirmed for this application.'
    if (best) {
      const v = await getViasocket().catalog.versions(best.serviceId)
      const names = (xs) => (xs || []).map((x) => x.name).filter(Boolean)
      detail = v
        ? `Closest match "${best.name}" (service_id ${best.serviceId}). Published actions (${names(v.actions).length}): ${names(v.actions).join(', ') || 'none'}. Published triggers (${names(v.triggers).length}): ${names(v.triggers).join(', ') || 'none'}.`
        : `Closest match "${best.name}" (service_id ${best.serviceId}) has nothing published.`
    }
    return `Catalog search for "${name}" returned: ${matches.map((m) => m.name).join('; ')}.\n${detail}`
  } catch (e) {
    return `viaSocket catalog lookup failed: ${e.message}`
  }
}

export async function gatherViaSocketFacts(name) {
  const [coverage, docs] = await Promise.all([appCoverage(name), productDocs()])
  return { coverage, docs }
}

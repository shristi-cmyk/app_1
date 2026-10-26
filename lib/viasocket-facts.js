import { getViasocket } from './viasocket.js'

// The viaSocket skill page: what the product offers, in viaSocket's own words.
const OVERVIEW_URL = 'https://flow.viasocket.com/documentation/skill.md'
const OVERVIEW_CHARS = 3500
let overviewCache = { at: 0, text: '' }

async function overview() {
  if (Date.now() - overviewCache.at < 3600_000 && overviewCache.text) return overviewCache.text
  try {
    const res = await fetch(OVERVIEW_URL, { signal: AbortSignal.timeout(20000) })
    if (!res.ok) return `viaSocket overview unavailable: HTTP ${res.status}`
    const t = await res.text()
    const start = Math.max(0, t.indexOf('## What viaSocket gives the product'))
    overviewCache = { at: Date.now(), text: `Source: ${OVERVIEW_URL}\n${t.slice(start, start + OVERVIEW_CHARS)}` }
    return overviewCache.text
  } catch (e) {
    return `viaSocket overview unavailable: ${e.message}`
  }
}

// Does the target application have a viaSocket connector, and what can it do?
async function appCoverage(name) {
  try {
    const matches = (await getViasocket().catalog.search(name)).slice(0, 8)
    if (!matches.length) return `No viaSocket catalog match for "${name}".`
    const lower = name.toLowerCase()
    const best = matches.find((m) => m.name.toLowerCase() === lower) || matches.find((m) => m.name.toLowerCase().includes(lower))
    if (!best) return `Catalog search for "${name}" returned: ${matches.map((m) => m.name).join('; ')}. No close name match, so no connector is confirmed.`
    const v = await getViasocket().catalog.versions(best.serviceId)
    const names = (xs) => (xs || []).map((x) => x.name).filter(Boolean)
    return v
      ? `viaSocket catalog has "${best.name}". Published actions (${names(v.actions).length}): ${names(v.actions).join(', ') || 'none'}. Published triggers (${names(v.triggers).length}): ${names(v.triggers).join(', ') || 'none'}. (Source: live viaSocket catalog lookup.)`
      : `viaSocket catalog has "${best.name}" but nothing is published for it.`
  } catch (e) {
    return `viaSocket catalog lookup failed: ${e.message}`
  }
}

export async function gatherViaSocketFacts(name) {
  const [coverage, docs] = await Promise.all([appCoverage(name), overview()])
  return { coverage, docs }
}

import { getViasocket } from './viasocket.js'
import { findConnection } from './connections.js'

// Web search runs through viaSocket's Tavily app on the owner's own Tavily connection (connected once at /setup).
export const OWNER_ID = 'research-agent-owner'
export const SEARCH_ACTION_ID = 'rowuyf913awm' // Tavily · Search the web
const SEARCH_VERSION = 'V3'

let cached = null // { scriptId, actionVersionId }

// The owner's Tavily connection, if any.
export function findSearchConnection() {
  return findConnection(OWNER_ID, 'tavily')
}

async function ready() {
  if (cached) return cached
  const { serviceId, authId, expired } = await findSearchConnection()
  if (!authId) throw new Error('Web search is not connected yet (open /setup).')
  if (expired) throw new Error('The Tavily connection has expired (reconnect at /setup).')
  const user = getViasocket().user(OWNER_ID)
  const scriptId = (await user.findEnabled(serviceId)) ?? (await user.enable(serviceId, authId)).scriptId
  const actionVersionId = await getViasocket().catalog.versionIdFor(serviceId, SEARCH_ACTION_ID, SEARCH_VERSION)
  cached = { scriptId, actionVersionId }
  return cached
}

export function resetSearchCache() { cached = null }

// One search. Keys of inputData, and where each comes from:
//   query               — built per run from the app name (code)
//   topic               — "General", or "News" for the news query (code: right for every run)
//   search_depth        — "advanced": better page content for reading reviews (code)
//   include_answer      — false: we read the sources, not Tavily's summary (code)
//   include_raw_content — true only where page text is read (reviews, community, help docs)
//   include_domains     — review/community sites or the app's own domain, per query (code); omitted for open searches
export async function webSearch(query, { domains, raw = false, news = false, limit = 8 } = {}) {
  const { scriptId, actionVersionId } = await ready()
  const inputData = { query, topic: news ? 'News' : 'General', search_depth: 'advanced', include_answer: false, include_raw_content: raw }
  if (domains?.length) inputData.include_domains = domains
  const out = await getViasocket().runAction(scriptId, actionVersionId, inputData)
  const body = out?.data ?? out
  if (out?.success === false) throw new Error(out?.message || 'search failed')
  const results = (body?.results || []).slice(0, limit).map((r) => ({
    title: String(r.title || ''), url: String(r.url || ''), snippet: String(r.content || '').slice(0, 500), raw: r.raw_content ? String(r.raw_content) : '',
  })).filter((r) => /^https?:\/\//.test(r.url))
  return { results, engine: 'tavily' }
}

import { timingSafeEqual } from 'node:crypto'
import { getViasocket } from '../../../lib/viasocket.js'
import { OWNER_ID, SEARCH_ACTION_ID, findSearchConnection, resetSearchCache, webSearch } from '../../../lib/search.js'

export const dynamic = 'force-dynamic'

// The owner's setup screen: connect the web-search app once. Guarded by SETUP_KEY because it hands out the owner's embed token.
function allowed(key) {
  const want = process.env.SETUP_KEY
  if (!want || typeof key !== 'string' || key.length !== want.length) return false
  return timingSafeEqual(Buffer.from(key), Buffer.from(want))
}

const notFound = () => new Response('Not found', { status: 404 })

export async function GET(req) {
  if (!allowed(new URL(req.url).searchParams.get('key'))) return notFound()
  const conn = await findSearchConnection()
  return Response.json({
    serviceId: conn.serviceId,
    actions: [SEARCH_ACTION_ID],
    connected: Boolean(conn.authId),
    expired: Boolean(conn.expired),
    authId: conn.expired ? conn.authId : undefined, // only to reconnect an expired connection in place
    token: await getViasocket().user(OWNER_ID).token(),
  }, { headers: { 'Cache-Control': 'no-store' } })
}

// Runs one real search to prove the connection works.
export async function POST(req) {
  const body = await req.json().catch(() => ({}))
  if (!allowed(body.key)) return notFound()
  resetSearchCache()
  try {
    const { results } = await webSearch('viaSocket integration platform', { limit: 3 })
    return Response.json({ ok: true, count: results.length, first: results[0] ? { title: results[0].title, url: results[0].url } : null })
  } catch (e) {
    return Response.json({ ok: false, error: String(e.message || e) }, { status: 502 })
  }
}

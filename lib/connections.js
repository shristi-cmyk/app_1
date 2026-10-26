import { getViasocket } from './viasocket.js'

// One user's connection to an app, found by slug. The package does not type connection entries; an entry's id ends in _<service_id>.
// The server looks it up each time, so no connection id is stored or taken from the browser.
export async function findConnection(userId, slug) {
  const serviceId = await getViasocket().catalog.serviceIdFor(slug)
  const list = await getViasocket().user(userId).listConnections()
  const conn = list.find((c) => String(c?.id || c?.auth_id || '').endsWith(`_${serviceId}`))
  if (!conn) return { serviceId, authId: null, expired: false }
  return { serviceId, authId: String(conn.id || conn.auth_id), expired: Boolean(conn.isExpired || conn.is_expired) }
}

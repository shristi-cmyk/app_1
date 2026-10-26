import { randomBytes } from 'node:crypto'

// The app has no login, so each browser gets a random id in an httpOnly cookie. viaSocket keeps that visitor's
// Google connection under it, and it is the only thing that lets a browser use that connection.
const COOKIE = 'rv'
const ID_RE = /^[a-f0-9]{32}$/

export function readVisitorId(req) {
  const m = (req.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([a-f0-9]{32})(?:;|$)`))
  return m && ID_RE.test(m[1]) ? m[1] : null
}

export function newVisitor(req) {
  const id = randomBytes(16).toString('hex')
  const secure = (req.headers.get('x-forwarded-proto') || new URL(req.url).protocol.replace(':', '')) === 'https'
  return { id, cookie: `${COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure ? '; Secure' : ''}` }
}

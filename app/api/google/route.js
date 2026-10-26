import { docsConnect, createDoc, MAX_DOC_CHARS } from '../../../lib/google-docs.js'
import { markdownToText } from '../../../lib/plaintext.js'
import { readVisitorId, newVisitor } from '../../../lib/visitor.js'

export const dynamic = 'force-dynamic'

const headers = (extra = {}) => ({ 'Cache-Control': 'no-store', ...extra })

// The visitor's Google Docs connection state and a token for the Connect popup (never the secret).
export async function GET(req) {
  let id = readVisitorId(req)
  const fresh = id ? null : newVisitor(req)
  id = id || fresh.id
  try {
    const c = await docsConnect(id)
    return Response.json({ serviceId: c.serviceId, actions: c.actions, token: c.token, connected: Boolean(c.authId), expired: c.expired, authId: c.expired ? c.authId : undefined },
      { headers: headers(fresh ? { 'Set-Cookie': fresh.cookie } : {}) })
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 502, headers: headers() })
  }
}

// Creates the Google Doc from the finished report.
export async function POST(req) {
  const id = readVisitorId(req)
  if (!id) return Response.json({ error: 'not_connected' }, { status: 409, headers: headers() })
  const body = await req.json().catch(() => ({}))
  const report = String(body.report || '')
  const title = String(body.title || 'Integration research').replace(/\s+/g, ' ').trim().slice(0, 150)
  if (!report.trim()) return Response.json({ error: 'There is no report to save.' }, { status: 400, headers: headers() })
  if (report.length > MAX_DOC_CHARS) return Response.json({ error: 'The report is too long to save.' }, { status: 413, headers: headers() })
  try {
    const r = await createDoc(id, { title, content: markdownToText(report) })
    if (r.error) return Response.json(r, { status: 409, headers: headers() })
    return Response.json(r, { headers: headers() })
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 502, headers: headers() })
  }
}

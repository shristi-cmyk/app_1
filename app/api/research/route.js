import { runResearch } from '../../../lib/agent.js'
import { acquire } from '../../../lib/limits.js'

export const dynamic = 'force-dynamic'
export const maxDuration = 900

function validUrl(s) {
  try { const u = new URL(s); return u.protocol === 'https:' || u.protocol === 'http:' } catch { return false }
}

// Streams NDJSON events: {t:'status'|'text'|'done'|'error', v}; 'done' carries the clean final report
export async function POST(req) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY is not set on the server.' }, { status: 503 })
  }
  const body = await req.json().catch(() => ({}))
  const name = String(body.name || '').trim().slice(0, 120)
  const url = String(body.url || '').trim().slice(0, 500)
  const context = String(body.context || '').trim().slice(0, 2000)
  if (!name || !validUrl(url)) return Response.json({ error: 'An application name and a valid http(s) URL are required.' }, { status: 400 })

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
  const slot = acquire(ip)
  if (!slot.ok) return Response.json({ error: slot.reason }, { status: 429 })

  const enc = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (t, v) => controller.enqueue(enc.encode(JSON.stringify({ t, v }) + '\n'))
      try {
        const report = await runResearch({ name, url, context }, {
          onText: (v) => send('text', v),
          onStatus: (v) => send('status', v),
          signal: req.signal,
        })
        send('done', report)
      } catch (e) {
        try { send('error', String(e.message || e)) } catch {}
      } finally {
        slot.release()
        try { controller.close() } catch {}
      }
    },
    cancel() { slot.release() },
  })
  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' } })
}

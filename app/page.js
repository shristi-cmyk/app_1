'use client'
import { useEffect, useRef, useState } from 'react'
import { connect, loadConnectScript } from 'viasocket-apps/browser'
import { renderMarkdown, splitAtUseCases } from '../lib/markdown.js'
import UseCaseSlideshow from './UseCaseSlideshow.js'

const DOCS_ICON = 'https://stuff.thingsofbrand.com/google.com/images/imgc_Google_Docs.png'

const card = { background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,.08)' }
const input = { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccd', boxSizing: 'border-box', font: 'inherit', marginBottom: 12 }
const button = { padding: '10px 16px', borderRadius: 8, border: 0, background: '#2f5bea', color: '#fff', font: 'inherit', cursor: 'pointer' }

export default function Home() {
  const [form, setForm] = useState({ name: '', url: '', context: '' })
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState([])
  const [report, setReport] = useState('')
  const [visual, setVisual] = useState(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const abort = useRef(null)
  const [google, setGoogle] = useState(null) // { serviceId, actions, token, connected, expired, authId }
  const [doc, setDoc] = useState({ busy: false, url: '', error: '' })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  // Fetched on page load, not in the click: the Connect popup must open straight from the click or the browser blocks it.
  async function loadGoogle() {
    try {
      const r = await fetch('/api/google', { cache: 'no-store' })
      const j = await r.json()
      if (r.ok) { setGoogle(j); return j }
    } catch {}
    return null
  }

  useEffect(() => { loadGoogle(); loadConnectScript().catch(() => {}) }, [])

  async function saveToGoogleDoc() {
    setDoc({ busy: true, url: '', error: '' })
    try {
      let g = google
      if (!g?.connected || g.expired) {
        const finish = () => loadGoogle()
        try {
          await connect({ embedToken: g.token, serviceId: g.serviceId, actions: g.actions, skipActionSelection: true, authId: g.expired ? g.authId : undefined, onLateSuccess: finish })
        } catch (e) {
          if (e.code === 'closed') { setDoc({ busy: false, url: '', error: '' }); return } // not a failure: a late success may still follow
          throw e
        }
        g = await loadGoogle()
        if (!g?.connected) throw new Error('Google Docs is not connected yet.')
      }
      const title = `${form.name} — integration research (${new Date().toISOString().slice(0, 10)})`
      const res = await fetch('/api/google', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, report }) })
      const j = await res.json()
      if (!res.ok) { if (j.error === 'not_connected' || j.error === 'expired') await loadGoogle(); throw new Error(j.error === 'not_connected' ? 'Connect Google Docs first.' : j.error === 'expired' ? 'Your Google connection expired. Click again to reconnect.' : j.error) }
      setDoc({ busy: false, url: j.url, error: '' })
    } catch (err) {
      setDoc({ busy: false, url: '', error: err.message })
    }
  }

  async function run(e) {
    e.preventDefault()
    setRunning(true); setError(''); setReport(''); setVisual(null); setNotice(''); setStatus([]); setDoc({ busy: false, url: '', error: '' })
    abort.current = new AbortController()
    try {
      const res = await fetch('/api/research', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form), signal: abort.current.signal,
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Request failed')
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop()
        for (const l of lines.filter(Boolean)) {
          const ev = JSON.parse(l)
          if (ev.t === 'status') setStatus((s) => [...s.slice(-5), ev.v])
          else if (ev.t === 'visual') setVisual(ev.v)
          else if (ev.t === 'notice') setNotice(ev.v)
          else if (ev.t === 'done') setReport(ev.v)
          else if (ev.t === 'error') setError(ev.v)
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message)
    } finally {
      setRunning(false)
    }
  }

  function download() {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([report], { type: 'text/markdown' }))
    a.download = `${form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'report'}-viasocket-research.md`
    a.click()
  }

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Integration use-case research</h1>
      <p style={{ color: '#555' }}>Enter an application and its URL. The agent researches where an integration layer could fit inside the product and returns a short, source-backed report. Runs take several minutes.</p>
      <form onSubmit={run} style={card}>
        <label>Application name<input style={input} value={form.name} onChange={set('name')} required maxLength={120} placeholder="e.g. Cal.com" /></label>
        <label>Application URL<input style={input} value={form.url} onChange={set('url')} required type="url" placeholder="https://cal.com" /></label>
        <label>Optional context (segment, workflow, partner note)<textarea style={{ ...input, minHeight: 70 }} value={form.context} onChange={set('context')} maxLength={2000} /></label>
        <button style={{ ...button, opacity: running ? 0.6 : 1 }} disabled={running}>{running ? 'Researching…' : 'Run research'}</button>
        {running && <button type="button" style={{ ...button, background: '#888', marginLeft: 8 }} onClick={() => abort.current?.abort()}>Stop</button>}
      </form>
      {status.length > 0 && running && (
        <div style={{ ...card, fontSize: 13, color: '#555', fontFamily: 'monospace' }}>{status.map((s, i) => <div key={i}>{s}</div>)}</div>
      )}
      {error && <div style={{ ...card, background: '#fdecec', color: '#8a1f1f' }}>{error}</div>}
      {report && (
        <div style={card}>
          {!running && (
            <div style={{ marginBottom: 12 }}>
              <button style={{ ...button, background: '#1a73e8', display: 'inline-flex', alignItems: 'center', gap: 8, opacity: doc.busy || !google ? 0.6 : 1 }} disabled={doc.busy || !google} onClick={saveToGoogleDoc}>
                <img src={DOCS_ICON} alt="" width={18} height={18} style={{ background: '#fff', borderRadius: 3 }} />
                {doc.busy ? 'Saving…' : google?.connected && !google.expired ? 'Save as Google Doc' : 'Connect Google Docs and save'}
              </button>
              <button style={{ ...button, background: '#555', marginLeft: 8 }} onClick={download}>Download .md</button>
              {doc.url && <p style={{ margin: '10px 0 0' }}>Saved to your Google Drive: <a href={doc.url} target="_blank" rel="noopener noreferrer">open the document</a></p>}
              {doc.error && <p style={{ margin: '10px 0 0', color: '#8a1f1f' }}>{doc.error}</p>}
            </div>
          )}
          {(() => {
            const [before, after] = splitAtUseCases(report)
            return (
              <>
                <div className="report" dangerouslySetInnerHTML={{ __html: renderMarkdown(before) }} />
                {visual && <UseCaseSlideshow data={visual} />}
                {!visual && notice && <p style={{ color: '#8a5a00', background: '#fff7e6', padding: '8px 12px', borderRadius: 8, fontSize: 14 }}>{notice}</p>}
                {after && <div className="report" dangerouslySetInnerHTML={{ __html: renderMarkdown(after) }} />}
              </>
            )
          })()}
        </div>
      )}
      <style>{`.report table{border-collapse:collapse;width:100%;font-size:14px}.report th,.report td{border:1px solid #dde;padding:6px 8px;text-align:left;vertical-align:top}.report code{background:#eef;padding:1px 4px;border-radius:4px}.report{line-height:1.55;overflow-wrap:anywhere}`}</style>
    </main>
  )
}

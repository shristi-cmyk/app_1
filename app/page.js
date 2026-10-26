'use client'
import { useRef, useState } from 'react'
import { renderMarkdown } from '../lib/markdown.js'

const card = { background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,.08)' }
const input = { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccd', boxSizing: 'border-box', font: 'inherit', marginBottom: 12 }
const button = { padding: '10px 16px', borderRadius: 8, border: 0, background: '#2f5bea', color: '#fff', font: 'inherit', cursor: 'pointer' }

export default function Home() {
  const [form, setForm] = useState({ name: '', url: '', context: '' })
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState([])
  const [report, setReport] = useState('')
  const [error, setError] = useState('')
  const abort = useRef(null)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function run(e) {
    e.preventDefault()
    setRunning(true); setError(''); setReport(''); setStatus([])
    abort.current = new AbortController()
    try {
      const res = await fetch('/api/research', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form), signal: abort.current.signal,
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Request failed')
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = '', live = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop()
        for (const l of lines.filter(Boolean)) {
          const ev = JSON.parse(l)
          if (ev.t === 'text') { live += ev.v; setReport(live) }
          else if (ev.t === 'status') setStatus((s) => [...s.slice(-5), ev.v])
          else if (ev.t === 'done') setReport(ev.v || live)
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
      <p style={{ color: '#555' }}>Enter an application and its URL. The agent researches the product, verifies viaSocket coverage against the live viaSocket catalog and docs, and returns a source-backed report. Runs take several minutes.</p>
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
          {!running && <button style={{ ...button, marginBottom: 12 }} onClick={download}>Download .md</button>}
          <div className="report" dangerouslySetInnerHTML={{ __html: renderMarkdown(report) }} />
        </div>
      )}
      <style>{`.report table{border-collapse:collapse;width:100%;font-size:14px}.report th,.report td{border:1px solid #dde;padding:6px 8px;text-align:left;vertical-align:top}.report code{background:#eef;padding:1px 4px;border-radius:4px}.report{line-height:1.55;overflow-wrap:anywhere}`}</style>
    </main>
  )
}

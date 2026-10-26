'use client'
import { useEffect, useState } from 'react'
import { connect, loadConnectScript } from 'viasocket-apps/browser'

const ICON = 'https://stuff.thingsofbrand.com/tavily.com/images/img8_tavily.png'
const card = { background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,.08)' }
const button = { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 8, border: 0, background: '#2f5bea', color: '#fff', font: 'inherit', cursor: 'pointer' }

// Owner-only: connect the Tavily account the research agent searches the web with.
export default function Setup() {
  const [key, setKey] = useState('')
  const [info, setInfo] = useState(null)
  const [msg, setMsg] = useState('')

  async function load(k) {
    const r = await fetch(`/api/setup?key=${encodeURIComponent(k)}`, { cache: 'no-store' })
    if (!r.ok) { setMsg('This setup link is not valid.'); return }
    setInfo(await r.json())
  }

  useEffect(() => {
    const k = new URLSearchParams(window.location.search).get('key') || ''
    setKey(k)
    load(k)
    loadConnectScript()
  }, [])

  async function onConnect() {
    setMsg('')
    const done = () => { setMsg('Connected.'); load(key) }
    try {
      await connect({ embedToken: info.token, serviceId: info.serviceId, actions: info.actions, skipActionSelection: true, authId: info.expired ? info.authId : undefined, onLateSuccess: done })
      done()
    } catch (e) {
      if (e.code !== 'closed') setMsg(e.message) // 'closed' is not a failure: a late success may still follow
    }
  }

  async function onTest() {
    setMsg('Searching…')
    const r = await fetch('/api/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) }).then((x) => x.json())
    setMsg(r.ok ? `Search works: ${r.count} results${r.first ? ` (first: ${r.first.title})` : ''}.` : `Search failed: ${r.error}`)
  }

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Research agent setup</h1>
      <div style={card}>
        <p style={{ marginTop: 0 }}>The agent searches the web and reads reviews through your Tavily account, connected via viaSocket. Connect it once.</p>
        {info && (
          <>
            <p>Status: <strong>{info.connected ? (info.expired ? 'expired — reconnect' : 'connected') : 'not connected'}</strong></p>
            <button style={button} onClick={onConnect}>
              <img src={ICON} alt="" width={20} height={20} style={{ borderRadius: 4, background: '#fff' }} />
              {info.connected ? 'Reconnect Tavily' : 'Connect Tavily'}
            </button>
            {info.connected && <button style={{ ...button, background: '#555', marginLeft: 8 }} onClick={onTest}>Test search</button>}
          </>
        )}
        {msg && <p>{msg}</p>}
      </div>
    </main>
  )
}

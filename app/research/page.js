'use client'
import { useEffect, useState, useCallback } from 'react'
import { connect, loadConnectScript } from 'viasocket-apps/browser'

const SLACK = 'slack'
const SLACK_ICON = 'https://stuff.thingsofbrand.com/slack.com/images/img668216333e_slack.jpg'
const card = { background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,.08)' }
const input = { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccd', boxSizing: 'border-box', font: 'inherit', marginBottom: 10 }
const button = { padding: '10px 16px', borderRadius: 8, border: 0, background: '#2f5bea', color: '#fff', font: 'inherit', cursor: 'pointer' }

async function getJson(url, init) {
  const r = await fetch(url, init)
  const j = await r.json()
  if (!r.ok) throw new Error(j.error || 'Something went wrong')
  return j
}
const post = (url, body) => getJson(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export default function Research() {
  const [status, setStatus] = useState({ slackConnected: false, runs: [] })
  const [embed, setEmbed] = useState(null)
  const [form, setForm] = useState({ appName: '', appUrl: '', context: '' })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [channels, setChannels] = useState([])
  const [channelId, setChannelId] = useState('')
  const [openRun, setOpenRun] = useState(null)

  const refresh = useCallback(() => getJson('/api/research/status').then(setStatus).catch((e) => setMessage(e.message)), [])
  useEffect(() => {
    refresh()
    // token fetched on load so the Connect popup opens straight from the click
    getJson('/api/research/token').then((t) => { setEmbed(t); loadConnectScript() }).catch((e) => setMessage(e.message))
  }, [refresh])
  useEffect(() => {
    if (status.slackConnected) getJson('/api/research/channels').then(setChannels).catch((e) => setMessage(e.message))
  }, [status.slackConnected])

  const save = (authId) => post('/api/research/connected', { authId }).then(refresh)
  async function connectSlack() {
    try {
      const { authId } = await connect({
        embedToken: embed.token, serviceId: embed.serviceIds[SLACK], actions: ['row1jrbor'], skipActionSelection: true,
        onLateSuccess: ({ authId }) => save(authId)
      })
      await save(authId)
    } catch (e) { if (e.code !== 'closed') setMessage(e.message) }
  }

  async function run(e) {
    e.preventDefault(); setBusy(true); setMessage('Researching… this can take a few minutes.')
    try { const r = await post('/api/research/run', form); setOpenRun(r.id); setMessage(''); await refresh() }
    catch (err) { setMessage(err.message) } finally { setBusy(false) }
  }
  async function send(runId) {
    try { await post('/api/research/post', { runId, channelId }); setMessage('Posted to Slack.'); refresh() } catch (e) { setMessage(e.message) }
  }

  return (
    <main style={{ maxWidth: 820, margin: '32px auto', padding: '0 16px', fontFamily: 'system-ui, sans-serif', background: '#f4f5f9' }}>
      <h1>Integration Use-Case Research Agent</h1>
      {message && <p style={{ ...card, background: '#fff8e1' }}>{message}</p>}
      <form style={card} onSubmit={run}>
        <input style={input} placeholder="Application name" value={form.appName} onChange={(e) => setForm({ ...form, appName: e.target.value })} required />
        <input style={input} placeholder="https://application-url.com" value={form.appUrl} onChange={(e) => setForm({ ...form, appUrl: e.target.value })} required />
        <textarea style={{ ...input, minHeight: 70 }} placeholder="Optional context: segment, workflow, partner note" value={form.context} onChange={(e) => setForm({ ...form, context: e.target.value })} />
        <button style={button} disabled={busy}>{busy ? 'Researching…' : 'Run research'}</button>
      </form>
      <div style={card}>
        <h3>Share to Slack</h3>
        {!status.slackConnected ? (
          <button style={{ ...button, display: 'inline-flex', gap: 8, alignItems: 'center' }} onClick={connectSlack} disabled={!embed}>
            <img src={SLACK_ICON} alt="" width={20} height={20} /> Connect Slack
          </button>
        ) : (
          <select style={input} value={channelId} onChange={(e) => setChannelId(e.target.value)}>
            <option value="">Choose a channel…</option>
            {channels.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        )}
      </div>
      {status.runs.map((r) => (
        <div style={card} key={r.id}>
          <b>{r.appName}</b> <small>{r.appUrl} · {new Date(r.at).toLocaleString()}{r.postedTo ? ' · posted to Slack' : ''}</small>
          <div style={{ marginTop: 8 }}>
            <button style={button} onClick={() => setOpenRun(openRun === r.id ? null : r.id)}>{openRun === r.id ? 'Hide' : 'View'} report</button>{' '}
            <button style={button} disabled={!channelId} onClick={() => send(r.id)}>Post to Slack</button>
          </div>
          {openRun === r.id && <pre style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{r.report}</pre>}
        </div>
      ))}
    </main>
  )
}

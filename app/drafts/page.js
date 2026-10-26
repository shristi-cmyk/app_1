'use client'
import { useEffect, useState } from 'react'
import UseCaseMap from '../UseCaseMap.js'
import UseCaseSlideshow from '../UseCaseSlideshow.js'

// DRAFT visuals for the use-case section. Sample data comes from a Bolna report; colours are placeholders
// that will later be matched to the researched app's own brand.
const THEMES = {
  Violet: { p: '#5b3df5', a: '#ff8a4c', soft: '#efeaff' },
  Teal: { p: '#0e9f8e', a: '#f5a524', soft: '#e3f7f4' },
  Coral: { p: '#e5484d', a: '#2f6fed', soft: '#fdecec' },
}

const APP = 'Bolna'
const CASES = [
  { title: 'In-dashboard automation builder for call events', area: 'Bolna Dashboard', menu: 'Automations', gets: 'Build multi-step flows from call start, end and transcript events without leaving Bolna.', apps: ['CRM', 'Sheets', 'Slack'], strength: 'Strong' },
  { title: 'Mid-call tools for the voice agent', area: 'Agent Studio · tools', menu: 'Agent tools', gets: 'Agents can book, look up or push data in each customer’s CRM, helpdesk or scheduler during a live call.', apps: ['Calendar', 'CRM', 'Helpdesk'], strength: 'Strong' },
  { title: 'Integrations marketplace inside the product', area: 'Tools & Workflows', menu: 'Marketplace', gets: 'Users connect their own CRM, helpdesk, sheets and email tools from inside Bolna.', apps: ['CRM', 'Helpdesk', 'Email'], strength: 'Strong' },
  { title: 'Integration layer for agencies and resellers', area: 'Sub-accounts', menu: 'Sub-accounts', gets: 'Agencies ship Bolna to their clients with per-client integrations ready to go.', apps: ['CRM', 'Sheets', 'Email'], strength: 'Worth testing' },
  { title: 'Workflows and campaigns gain steps in other apps', area: 'Workflows · Campaigns', menu: 'Workflows', gets: 'Call orchestration can trigger or wait on actions in the user’s other tools.', apps: ['CRM', 'Slack', 'Calendar'], strength: 'Worth testing' },
]

function useCycle(n, ms, paused) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (paused) return undefined
    const t = setInterval(() => setI((x) => (x + 1) % n), ms)
    return () => clearInterval(t)
  }, [n, ms, paused])
  return [i, setI]
}

const Badge = ({ s }) => <span className={`badge ${s === 'Strong' ? 'strong' : 'test'}`}>{s}</span>

// ---------- Draft A: the branded slideshow (now used in the report) ----------
const SAMPLE_A = { app: APP, cases: CASES, theme: null }
function DraftA() {
  return <UseCaseSlideshow data={SAMPLE_A} />
}

// ---------- Draft B: product map (now the shared component used in the report) ----------
const SAMPLE = { app: APP, cases: CASES, theme: null }
function DraftB() {
  return <UseCaseMap data={SAMPLE} />
}

// ---------- Draft C: flow lanes, all use cases at once with travelling pulses ----------
function DraftC() {
  const [open, setOpen] = useState(0)
  return (
    <div className="stage lanes">
      {CASES.map((c, k) => (
        <div key={c.title} className={`lane ${open === k ? 'open' : ''}`} style={{ animationDelay: `${k * 0.12}s` }} onMouseEnter={() => setOpen(k)} onClick={() => setOpen(k)}>
          <div className="lane-row">
            <span className="num">{k + 1}</span>
            <div className="lane-area">{c.area}</div>
            <div className="track"><span className="dot" style={{ animationDelay: `${k * 0.4}s` }} /></div>
            <div className="hub">Integration layer</div>
            <div className="track short"><span className="dot" style={{ animationDelay: `${0.5 + k * 0.4}s` }} /></div>
            <div className="lane-apps">{c.apps.map((a) => <span key={a} className="chip-h">{a}</span>)}</div>
            <Badge s={c.strength} />
          </div>
          <div className="lane-detail"><strong>{c.title}.</strong> {c.gets}</div>
        </div>
      ))}
    </div>
  )
}

const TABS = { 'A · Slideshow': DraftA, 'B · Product map': DraftB, 'C · Flow lanes': DraftC }

export default function Drafts() {
  const [tab, setTab] = useState('A · Slideshow')
  const [theme, setTheme] = useState('Violet')
  const T = THEMES[theme]
  const View = TABS[tab]
  return (
    <main style={{ maxWidth: 940, margin: '0 auto', padding: 24, '--p': T.p, '--a': T.a, '--soft': T.soft }}>
      <h1 style={{ marginTop: 0 }}>Use-case visual: drafts</h1>
      <p style={{ color: '#555' }}>Three draft ideas for the visual that would sit under the use-cases table. Sample data from a Bolna report; the colours are placeholders. Try the colour presets to see how a draft takes on an app’s brand.</p>
      <div className="bar">
        <div>{Object.keys(TABS).map((t) => <button key={t} className={`tab ${t === tab ? 'on' : ''}`} onClick={() => setTab(t)}>{t}</button>)}</div>
        <div>{Object.keys(THEMES).map((t) => <button key={t} className={`sw ${t === theme ? 'on' : ''}`} style={{ background: THEMES[t].p }} onClick={() => setTheme(t)} aria-label={`${t} colours`} title={t} />)}</div>
      </div>
      <View key={tab} />
      <style>{CSS}</style>
    </main>
  )
}

const CSS = `
.bar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:16px 0}
.tab{border:1px solid #d5d8e0;background:#fff;padding:8px 14px;border-radius:999px;margin-right:8px;font:inherit;cursor:pointer}
.tab.on{background:var(--p);color:#fff;border-color:var(--p)}
.sw{width:26px;height:26px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 1px #c9cdd8;margin-left:8px;cursor:pointer}
.sw.on{box-shadow:0 0 0 2px var(--p)}
.stage{position:relative;background:#fff;border-radius:16px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.08);overflow:hidden}
.kicker{font-size:13px;color:#667;display:flex;gap:8px;align-items:center;margin-bottom:6px}
.badge{font-size:12px;padding:2px 8px;border-radius:999px}
.badge.strong{background:var(--soft);color:var(--p)}
.badge.test{background:#fff3e6;color:#b5560f}
h3{margin:4px 0 8px;font-size:22px}
.where{color:#555;margin:0 0 8px}
.slide{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.5fr);gap:20px;align-items:center;animation:in .6s ease both}
@media(max-width:760px){.slide{grid-template-columns:1fr}}
@keyframes in{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}
.diagram{width:100%;height:auto}
.node-soft{fill:var(--soft);stroke:var(--p);stroke-width:2}
.node-main{fill:var(--p)}
.node-accent{fill:var(--a)}
.t-small{font-size:12px;fill:var(--p);font-weight:600}
.t-white{font-size:14px;fill:#fff;font-weight:700}
.t-hub{font-size:11.5px;fill:#fff;font-weight:700}
.t-white-s{font-size:11px;fill:#fff;opacity:.85}
.t-chip{font-size:12px;fill:var(--p);font-weight:600}
.chip{fill:var(--soft);stroke:var(--p);stroke-width:1.5;animation:pop .5s ease both}
@keyframes pop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
.flow{fill:none;stroke:var(--p);stroke-width:2.5;stroke-dasharray:6 8;animation:dash 1.1s linear infinite}
@keyframes dash{to{stroke-dashoffset:-28}}
.ring{fill:none;stroke:var(--a);stroke-width:2;transform-box:fill-box;transform-origin:center;animation:ring 2.4s ease-out infinite}
.ring.r2{animation-delay:1.2s}
@keyframes ring{from{opacity:.7;transform:scale(.85)}to{opacity:0;transform:scale(1.35)}}
.controls{display:flex;justify-content:center;align-items:center;gap:14px;margin-top:14px}
.controls>button{width:34px;height:34px;border-radius:50%;border:1px solid #d5d8e0;background:#fff;font-size:20px;cursor:pointer}
.dots{display:flex;gap:8px}
.dots button{width:10px;height:10px;border-radius:50%;border:0;background:#d5d8e0;cursor:pointer;padding:0}
.dots button.on{background:var(--p);transform:scale(1.3)}
.progress{position:absolute;left:0;bottom:0;height:3px;background:var(--a);animation:prog 5.5s linear both}
@keyframes prog{from{width:0}to{width:100%}}
.chip-h{background:var(--soft);color:var(--p);border:1px solid var(--p);padding:3px 10px;border-radius:999px;font-size:13px;font-weight:600;animation:pop .4s ease both}
.lanes{display:flex;flex-direction:column;gap:10px}
.lane{border:1px solid #e1e4ec;border-radius:12px;padding:12px 14px;cursor:pointer;animation:in .5s ease both;transition:border-color .2s,box-shadow .2s}
.lane.open{border-color:var(--p);box-shadow:0 4px 16px rgba(0,0,0,.08)}
.lane-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.num{width:26px;height:26px;border-radius:50%;background:var(--p);color:#fff;display:grid;place-items:center;font-size:13px;font-weight:700}
.lane-area{min-width:150px;font-weight:600;font-size:14px}
.hub{background:var(--a);color:#fff;border-radius:10px;padding:5px 10px;font-size:13px;font-weight:700}
.track{position:relative;flex:1;min-width:40px;height:2px;background:repeating-linear-gradient(90deg,var(--p) 0 6px,transparent 6px 12px)}
.track.short{flex:.6}
.dot{position:absolute;top:-4px;left:0;width:10px;height:10px;border-radius:50%;background:var(--a);animation:travel 2.2s ease-in-out infinite}
@keyframes travel{0%{left:0;opacity:0}15%{opacity:1}85%{opacity:1}100%{left:calc(100% - 10px);opacity:0}}
.lane-apps{display:flex;gap:6px}
.lane-detail{max-height:0;overflow:hidden;opacity:0;color:#445;font-size:14px;transition:max-height .35s ease,opacity .35s ease,margin .35s ease}
.lane.open .lane-detail{max-height:80px;opacity:1;margin-top:10px}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`

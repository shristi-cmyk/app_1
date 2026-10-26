'use client'
import { useEffect, useState } from 'react'

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

// ---------- Draft A: slideshow, one slide per use case, animated hub diagram ----------
function DraftA() {
  const [hover, setHover] = useState(false)
  const [i, setI] = useCycle(CASES.length, 5500, hover)
  const c = CASES[i]
  const ys = [48, 110, 172]
  return (
    <div className="stage" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="slide" key={i}>
        <div className="slide-text">
          <div className="kicker">Use case {i + 1} of {CASES.length} <Badge s={c.strength} /></div>
          <h3>{c.title}</h3>
          <p className="where">Where: <strong>{c.area}</strong></p>
          <p>{c.gets}</p>
        </div>
        <svg viewBox="0 0 600 220" className="diagram" role="img" aria-label={`${c.title}: users, ${APP}, integration layer, their apps`}>
          <circle cx="50" cy="110" r="26" className="node-soft" />
          <text x="50" y="114" textAnchor="middle" className="t-small">Users</text>
          <line x1="76" y1="110" x2="136" y2="110" className="flow" />
          <rect x="136" y="82" width="140" height="56" rx="14" className="node-main" />
          <text x="206" y="106" textAnchor="middle" className="t-white">{APP}</text>
          <text x="206" y="124" textAnchor="middle" className="t-white-s">{c.menu}</text>
          <line x1="276" y1="110" x2="340" y2="110" className="flow" />
          <circle cx="380" cy="110" r="44" className="ring r1" />
          <circle cx="380" cy="110" r="44" className="ring r2" />
          <circle cx="380" cy="110" r="38" className="node-accent" />
          <text x="380" y="106" textAnchor="middle" className="t-hub">Integration</text>
          <text x="380" y="121" textAnchor="middle" className="t-hub">layer</text>
          {c.apps.map((a, k) => (
            <g key={a}>
              <path d={`M418 110 C 470 110, 470 ${ys[k]}, 500 ${ys[k]}`} className="flow" style={{ animationDelay: `${k * 0.25}s` }} />
              <rect x="500" y={ys[k] - 18} width="86" height="36" rx="18" className="chip" style={{ animationDelay: `${0.3 + k * 0.2}s` }} />
              <text x="543" y={ys[k] + 4} textAnchor="middle" className="t-chip">{a}</text>
            </g>
          ))}
        </svg>
      </div>
      <div className="controls">
        <button onClick={() => setI((i + CASES.length - 1) % CASES.length)} aria-label="Previous">‹</button>
        <div className="dots">{CASES.map((_, k) => <button key={k} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`Use case ${k + 1}`} />)}</div>
        <button onClick={() => setI((i + 1) % CASES.length)} aria-label="Next">›</button>
      </div>
      {!hover && <div className="progress" key={`p${i}`} />}
    </div>
  )
}

// ---------- Draft B: product map, a mock app window whose menu items light up one by one ----------
function DraftB() {
  const [hover, setHover] = useState(false)
  const [i, setI] = useCycle(CASES.length, 4500, hover)
  const c = CASES[i]
  return (
    <div className="stage map" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="win">
        <div className="win-bar"><i /><i /><i /><span>{APP}</span></div>
        <div className="win-body">
          <ul className="side">
            {['Agents', ...CASES.map((x) => x.menu), 'Settings'].map((m) => {
              const k = CASES.findIndex((x) => x.menu === m)
              return (
                <li key={m} className={k === i ? 'lit' : k >= 0 ? 'hot' : ''} onClick={() => k >= 0 && setI(k)}>
                  {m}{k >= 0 && <b className="ping" />}
                </li>
              )
            })}
          </ul>
          <div className="main">
            <div className="skeleton w60" /><div className="skeleton w90" /><div className="skeleton w40" />
            <div className="pop" key={i}>
              <div className="pop-hd"><span className="layer-dot" /> Integration layer</div>
              <div className="pop-apps">{c.apps.map((a, k) => <span key={a} className="chip-h" style={{ animationDelay: `${k * 0.15}s` }}>{a}</span>)}</div>
            </div>
          </div>
        </div>
      </div>
      <div className="detail" key={`d${i}`}>
        <div className="kicker">{c.area} <Badge s={c.strength} /></div>
        <h3>{c.title}</h3>
        <p>{c.gets}</p>
      </div>
    </div>
  )
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
.map{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:24px;align-items:center}
@media(max-width:760px){.map{grid-template-columns:1fr}}
.win{border:1px solid #d5d8e0;border-radius:12px;overflow:hidden;background:#fafbfd}
.win-bar{display:flex;gap:6px;align-items:center;padding:8px 12px;background:#eef0f5;font-size:13px;color:#667}
.win-bar i{width:10px;height:10px;border-radius:50%;background:#c9cdd8}.win-bar span{margin-left:8px;font-weight:600}
.win-body{display:grid;grid-template-columns:150px 1fr;min-height:260px}
.side{list-style:none;margin:0;padding:10px;border-right:1px solid #e6e8ee;background:#fff}
.side li{position:relative;padding:8px 10px;border-radius:8px;font-size:14px;color:#556;cursor:default;margin-bottom:2px;transition:all .3s}
.side li.hot{cursor:pointer;color:#333}
.side li.lit{background:var(--soft);color:var(--p);font-weight:700;box-shadow:inset 3px 0 0 var(--p)}
.ping{position:absolute;right:8px;top:50%;width:8px;height:8px;margin-top:-4px;border-radius:50%;background:var(--a)}
.lit .ping::after{content:'';position:absolute;inset:0;border-radius:50%;border:2px solid var(--a);animation:ring 1.6s ease-out infinite}
.main{padding:16px;position:relative}
.skeleton{height:12px;border-radius:6px;background:#e9ebf1;margin-bottom:12px}.w60{width:60%}.w90{width:90%}.w40{width:40%}
.pop{margin-top:26px;border:2px solid var(--p);border-radius:12px;background:#fff;padding:12px;animation:pop .45s ease both;box-shadow:0 8px 24px rgba(0,0,0,.08)}
.pop-hd{font-weight:700;font-size:14px;color:var(--p);display:flex;align-items:center;gap:8px;margin-bottom:8px}
.layer-dot{width:10px;height:10px;border-radius:50%;background:var(--a)}
.pop-apps{display:flex;gap:8px;flex-wrap:wrap}
.chip-h{background:var(--soft);color:var(--p);border:1px solid var(--p);padding:3px 10px;border-radius:999px;font-size:13px;font-weight:600;animation:pop .4s ease both}
.detail{animation:in .5s ease both}
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

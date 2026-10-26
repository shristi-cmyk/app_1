'use client'
import { useEffect, useRef, useState } from 'react'

const FALLBACK = { p: '#5b3df5', a: '#ff8a4c' }

// Readable text colour on top of the brand colour.
function onColor(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.62 ? '#14161c' : '#ffffff'
}

const ROWS = { 1: [130], 2: [92, 168], 3: [62, 130, 198], 4: [48, 104, 160, 216] }
const initial = (s) => String(s).trim().charAt(0).toUpperCase()
const CAPTION = {
  marketplace: 'Customers connect their own tools inside the product',
  agent: 'The agent acts in the customer’s tools while the conversation is live',
  workflow: 'Any connected app becomes a step in the flow',
  events: 'The product’s events reach each customer’s own tools',
  partner: 'Every client gets their own tools, set up once',
}

// Shared pieces. All diagrams use a 640 x 260 canvas.
const Hub = ({ cx, cy, r = 36 }) => (
  <g>
    <circle cx={cx} cy={cy} r={r} className="ucs-ring r1" /><circle cx={cx} cy={cy} r={r} className="ucs-ring r2" />
    <circle cx={cx} cy={cy} r={r + 11} className="ucs-orbit" />
    <circle cx={cx} cy={cy} r={r} className="ucs-hub" />
    <text x={cx} y={cy - 3} textAnchor="middle" className="ucs-hub-t">Integration</text>
    <text x={cx} y={cy + 11} textAnchor="middle" className="ucs-hub-t">layer</text>
  </g>
)
const Chip = ({ x, y, label, delay = 0, w = 132 }) => (
  <g className="ucs-chip" style={{ animationDelay: `${delay}s` }}>
    <rect x={x} y={y - 18} width={w} height="36" rx="18" className="ucs-chip-bg" />
    <circle cx={x + 19} cy={y} r="11" className="ucs-chip-dot" />
    <text x={x + 19} y={y + 4} textAnchor="middle" className="ucs-chip-i">{initial(label)}</text>
    <text x={x + 38} y={y + 4} className="ucs-chip-t">{label}</text>
  </g>
)
const Flow = ({ id, d, delay = 0, dot = true, dur = 2.2, begin, back }) => (
  <g>
    <path id={id} d={d} className={`ucs-flow ${back ? 'back' : ''}`} style={{ animationDelay: `${delay}s` }} />
    {dot && <circle r="4" className={`ucs-travel ${back ? 'back' : ''}`}><animateMotion dur={`${dur}s`} begin={`${begin ?? delay}s`} repeatCount="indefinite"><mpath href={`#${id}`} /></animateMotion></circle>}
  </g>
)
const Frame = ({ x, y, w, h, title }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx="14" className="ucs-win" />
    <path d={`M${x} ${y + 14}a14 14 0 0 1 14-14h${w - 28}a14 14 0 0 1 14 14v10H${x}z`} className="ucs-win-bar" />
    {[14, 26, 38].map((o) => <circle key={o} cx={x + o} cy={y + 12} r="3" className="ucs-win-dot" />)}
    <text x={x + w - 10} y={y + 16} textAnchor="end" className="ucs-win-name">{title}</text>
  </g>
)
const Users = ({ x = 34 }) => [70, 130, 190].map((y, k) => (
  <g key={y}>
    <path d={`M${x + 16} ${y} C ${x + 38} ${y}, ${x + 44} 130, ${x + 64} 130`} className="ucs-flow" style={{ animationDelay: `${k * 0.2}s` }} />
    <circle cx={x} cy={y} r="17" className="ucs-user" /><circle cx={x} cy={y - 4} r="5" className="ucs-user-ink" />
    <path d={`M${x - 10} ${y + 9} a10 7 0 0 1 20 0`} className="ucs-user-ink" />
  </g>
))
const fanOut = (n, hx, hy, cx, idx, back) => ROWS[n].map((y, k) => (
  <Flow key={k} id={`${back ? 'r' : 'p'}${idx}-${k}`} d={back ? `M${cx} ${y + 6} C ${cx - 44} ${y + 6}, ${hx + 44} ${hy + 6}, ${hx + 4} ${hy + 6}` : `M${hx} ${hy} C ${hx + 44} ${hy}, ${cx - 44} ${y}, ${cx} ${y}`} delay={k * 0.25} begin={k * 0.4 + (back ? 1.1 : 0)} back={back} />
))

// 1. Marketplace: an integrations page where tools get connected one by one.
function Marketplace({ c, app, idx }) {
  const apps = c.apps.slice(0, 4)
  return (
    <>
      <Frame x={24} y={30} w={290} h={200} title={`${app.slice(0, 12)} · Integrations`} />
      {apps.map((a, k) => {
        const x = 40 + (k % 2) * 134, y = 74 + Math.floor(k / 2) * 74
        return (
          <g key={a}>
            <rect x={x} y={y} width="124" height="62" rx="10" className="ucs-tile" />
            <circle cx={x + 20} cy={y + 22} r="12" className="ucs-chip-dot" /><text x={x + 20} y={y + 26} textAnchor="middle" className="ucs-chip-i">{initial(a)}</text>
            <text x={x + 38} y={y + 26} className="ucs-chip-t">{a}</text>
            <rect x={x + 10} y={y + 36} width="104" height="19" rx="9.5" className="ucs-btn" style={{ animationDelay: `${0.6 + k * 0.7}s` }} />
            <text x={x + 62} y={y + 49} textAnchor="middle" className="ucs-btn-t" style={{ animationDelay: `${0.6 + k * 0.7}s` }}>Connect</text>
            <g className="ucs-late" style={{ animationDelay: `${0.9 + k * 0.7}s` }}>
              <rect x={x + 10} y={y + 36} width="104" height="19" rx="9.5" className="ucs-done" />
              <path d={`M${x + 52} ${y + 46} l5 5 l9 -10`} className="ucs-check" style={{ animationDelay: `${1 + k * 0.7}s` }} />
            </g>
            <Flow id={`t${idx}-${k}`} d={`M${x + 124} ${y + 31} C ${x + 190} ${y + 31}, 400 130, 466 130`} delay={k * 0.2} begin={1 + k * 0.7} dur={1.8} />
          </g>
        )
      })}
      <Hub cx={506} cy={130} r={34} />
      <text x="506" y="190" textAnchor="middle" className="ucs-dim">{c.moment || 'Connect your tools'}</text>
    </>
  )
}

// 2. Agent: a conversation where the agent calls tools and the result comes back.
function Agent({ c, app, idx }) {
  const n = Math.min(c.apps.length, 4)
  return (
    <>
      <Frame x={24} y={30} w={250} h={200} title={`${app.slice(0, 12)} agent`} />
      <rect x={96} y={68} width={166} height={30} rx="15" className="ucs-bubble me" />
      <text x={179} y={87} textAnchor="middle" className="ucs-bubble-t me">{c.moment || 'Can you check that?'}</text>
      <g className="ucs-typing" style={{ animationDelay: '0.9s' }}>{[0, 1, 2].map((k) => <circle key={k} cx={52 + k * 11} cy={118} r="3.2" className="ucs-dotty" style={{ animationDelay: `${k * 0.18}s` }} />)}</g>
      <g className="ucs-late" style={{ animationDelay: '1.4s' }}>
        <rect x={38} y={134} width={176} height={30} rx="15" className="ucs-bubble" />
        <text x={126} y={153} textAnchor="middle" className="ucs-bubble-t">Checking {c.apps[0]}…</text>
      </g>
      <g className="ucs-late" style={{ animationDelay: '3s' }}>
        <rect x={38} y={174} width={140} height={30} rx="15" className="ucs-bubble ok" />
        <text x={108} y={193} textAnchor="middle" className="ucs-bubble-t ok">Done ✓</text>
      </g>
      <Flow id={`rq${idx}`} d="M274 120 C 300 120, 310 130, 340 130" begin={0.8} dur={1.6} />
      <Flow id={`rs${idx}`} d="M340 142 C 310 142, 300 156, 274 156" begin={2.2} dur={1.6} back />
      <Hub cx={376} cy={130} r={34} />
      {fanOut(n, 410, 130, 500, idx)}
      {fanOut(n, 410, 130, 500, idx, true)}
      {c.apps.slice(0, n).map((a, k) => <Chip key={a} x={500} y={ROWS[n][k]} label={a} w={128} delay={0.35 + k * 0.18} />)}
    </>
  )
}

// 3. Workflow: a builder canvas where any connected app becomes a step.
function Workflow({ c, app, idx }) {
  const n = Math.min(c.apps.length, 4)
  return (
    <>
      <defs><pattern id={`g${idx}`} width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" className="ucs-gridd" /></pattern></defs>
      <rect x={20} y={26} width={604} height={208} rx="14" className="ucs-win" />
      <rect x={20} y={26} width={604} height={208} rx="14" fill={`url(#g${idx})`} />
      <text x={36} y={46} className="ucs-win-n">{app.slice(0, 14)} · Workflows</text>
      <g className="ucs-chip" style={{ animationDelay: '0.1s' }}>
        <text x={46} y={112} className="ucs-dim-l">TRIGGER</text>
        <rect x={46} y={118} width={132} height={36} rx="10" className="ucs-node" />
        <text x={112} y={141} textAnchor="middle" className="ucs-node-t">⚡ {c.moment || 'Something happens'}</text>
      </g>
      <g className="ucs-chip" style={{ animationDelay: '0.35s' }}>
        <text x={216} y={112} className="ucs-dim-l">CONDITION</text>
        <rect x={216} y={118} width={96} height={36} rx="10" className="ucs-node" />
        <text x={264} y={141} textAnchor="middle" className="ucs-node-t">If matched</text>
      </g>
      <Flow id={`w1${idx}`} d="M178 136 L 216 136" dur={1.2} />
      <Flow id={`w2${idx}`} d="M312 136 L 352 134" dur={1.2} begin={0.4} />
      <Hub cx={390} cy={134} r={32} />
      {fanOut(n, 422, 134, 482, idx)}
      {c.apps.slice(0, n).map((a, k) => <Chip key={a} x={482} y={ROWS[n][k]} label={a} w={126} delay={0.5 + k * 0.18} />)}
    </>
  )
}

// 4. Events: the product's own events travel out and reach each customer's tools.
function Events({ c, app, idx }) {
  const n = Math.min(c.apps.length, 4)
  return (
    <>
      <Frame x={24} y={66} w={170} h={128} title={app.slice(0, 12)} />
      {[100, 122, 144].map((y, k) => <rect key={y} x={38} y={y} width={[96, 120, 70][k]} height="8" rx="4" className="ucs-sk" />)}
      <circle cx={178} cy={96} r="9" className="ucs-badge-dot" /><text x={178} y={100} textAnchor="middle" className="ucs-chip-i">3</text>
      <path id={`ev${idx}`} d="M196 130 L 346 130" className="ucs-flow" />
      {[0].map((b) => {
        const label = String(c.moment || 'New event'); const t = label.length > 11 ? `${label.slice(0, 10)}…` : label
        const w = Math.round(14 + t.length * 5.8)
        return (
          <g key={b}>
            <animateMotion dur="2.8s" begin={`${b}s`} repeatCount="indefinite"><mpath href={`#ev${idx}`} /></animateMotion>
            <rect x={-w / 2} y={-11} width={w} height={22} rx="11" className="ucs-pill" />
            <text x={0} y={4} textAnchor="middle" className="ucs-pill-t">{t}</text>
          </g>
        )
      })}
      <Hub cx={382} cy={130} r={34} />
      {fanOut(n, 416, 130, 500, idx)}
      {c.apps.slice(0, n).map((a, k) => (
        <g key={a}>
          <Chip x={500} y={ROWS[n][k]} label={a} w={128} delay={0.35 + k * 0.18} />
          <g className="ucs-late loop" style={{ animationDelay: `${1.6 + k * 0.3}s` }}><circle cx={620} cy={ROWS[n][k] - 14} r="8" className="ucs-done" /><path d={`M616 ${ROWS[n][k] - 14} l3 3 l5 -6`} className="ucs-check-s" /></g>
        </g>
      ))}
    </>
  )
}

// 5. Partner: every client of a partner gets its own tools through one layer.
function Partner({ c, app, idx }) {
  const rows = [109, 159, 209]
  return (
    <>
      <Frame x={24} y={34} w={196} h={196} title="Partner dashboard" />
      {rows.map((y, k) => (
        <g key={y} className="ucs-chip" style={{ animationDelay: `${0.1 + k * 0.15}s` }}>
          <rect x={36} y={y - 17} width={172} height={34} rx="9" className="ucs-tile" />
          <circle cx={56} cy={y} r="11" className="ucs-user" /><circle cx={56} cy={y - 3} r="3.5" className="ucs-user-ink" /><path d={`M49 ${y + 7} a7 5 0 0 1 14 0`} className="ucs-user-ink" />
          <text x={76} y={y + 4} className="ucs-chip-t">Client {'ABC'[k]}</text>
        </g>
      ))}
      {rows.map((y, k) => (
        <g key={`f${y}`}>
          <Flow id={`pc${idx}-${k}`} d={`M208 ${y} L 332 ${y}`} delay={k * 0.2} begin={k * 0.5} dur={1.6} />
          <Flow id={`pd${idx}-${k}`} d={`M376 ${y} L 476 ${y}`} delay={k * 0.2} begin={0.8 + k * 0.5} dur={1.6} />
        </g>
      ))}
      <rect x={332} y={74} width={44} height={170} rx="22" className="ucs-hub" />
      <rect x={332} y={74} width={44} height={170} rx="22" className="ucs-ring r1" /><rect x={332} y={74} width={44} height={170} rx="22" className="ucs-ring r2" />
      <text x={0} y={0} transform="translate(358 160) rotate(-90)" textAnchor="middle" className="ucs-hub-t">Integration layer</text>
      {rows.map((y, k) => <Chip key={y} x={476} y={y} label={c.apps[k % c.apps.length]} w={132} delay={0.5 + k * 0.18} />)}
    </>
  )
}

const DIAGRAMS = { marketplace: Marketplace, agent: Agent, workflow: Workflow, events: Events, partner: Partner }

function Diagram({ c, app, idx }) {
  const Kind = DIAGRAMS[c.kind] || Marketplace
  return (
    <svg viewBox="0 0 640 260" className="ucs-diagram" role="img" aria-label={`${c.title}: ${CAPTION[c.kind] || CAPTION.marketplace}`}>
      <Kind c={c} app={app} idx={idx} />
      <text x="320" y="254" textAnchor="middle" className="ucs-caption">{CAPTION[c.kind] || CAPTION.marketplace}</text>
    </svg>
  )
}

// A branded slideshow: an intro card, then one slide per use case showing where in the app the integration layer sits.
// Colours, logo and font come from the researched app when its site declares them.
export default function UseCaseSlideshow({ data }) {
  const cases = data?.cases || []
  const total = cases.length + 1 // intro + cases
  const [i, setI] = useState(0)
  const [hover, setHover] = useState(false)
  const dir = useRef(1)
  const [logoOk, setLogoOk] = useState(true)
  const theme = { ...FALLBACK, ...(data?.theme || {}) }
  const app = data?.app || 'The app'

  useEffect(() => {
    if (hover || total < 2) return undefined
    const t = setTimeout(() => { dir.current = 1; setI((x) => (x + 1) % total) }, i === 0 ? 4500 : 6500)
    return () => clearTimeout(t)
  }, [i, hover, total])

  useEffect(() => {
    const f = data?.theme?.font
    if (!f) return
    const id = `ucs-font-${f.replace(/\W/g, '')}`
    if (document.getElementById(id)) return
    const l = document.createElement('link')
    l.id = id; l.rel = 'stylesheet'
    l.href = `https://fonts.googleapis.com/css2?family=${f.trim().replace(/\s+/g, '+')}:wght@400;600;700;800&display=swap`
    document.head.appendChild(l)
  }, [data?.theme?.font])

  if (!cases.length) return null
  const go = (k) => { dir.current = k >= i ? 1 : -1; setI(((k % total) + total) % total) }
  const c = i > 0 ? cases[i - 1] : null
  const style = { '--p': theme.p, '--a': theme.a, '--on': onColor(theme.p), ...(theme.font ? { fontFamily: `'${theme.font}', system-ui, sans-serif` } : {}) }

  return (
    <section className="ucs" style={style} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} aria-label={`Where an integration layer fits inside ${app}`}>
      <span className="ucs-blob b1" /><span className="ucs-blob b2" />
      <header className="ucs-head">
        {data?.theme?.logo && logoOk && <img src={data.theme.logo} alt="" referrerPolicy="no-referrer" onError={() => setLogoOk(false)} />}
        <span>{app}</span>
        <em>{i === 0 ? 'Overview' : `Use case ${i} of ${cases.length}`}</em>
      </header>
      <div className={`ucs-slide ${dir.current >= 0 ? 'fwd' : 'back'}`} key={i}>
        {!c ? (
          <div className="ucs-intro">
            <div>
              {data?.theme?.logo && logoOk && <img className="ucs-big-logo" src={data.theme.logo} alt="" referrerPolicy="no-referrer" onError={() => setLogoOk(false)} />}
              <p className="ucs-eyebrow">Where an integration layer fits</p>
              <h3 className="ucs-hero">{cases.length} places inside <span>{app}</span></h3>
              <p className="ucs-lead">Each spot below is somewhere in the product where customers could connect their own tools.</p>
            </div>
            <ul className="ucs-menu-list">
              {cases.map((x, k) => (
                <li key={x.title} style={{ animationDelay: `${0.15 + k * 0.12}s` }} onClick={() => go(k + 1)}>
                  <b>{String(k + 1).padStart(2, '0')}</b><span>{x.menu}</span><i className={x.strength === 'Strong' ? 'strong' : 'test'}>{x.strength}</i>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="ucs-case">
            <div className="ucs-text">
              <div className="ucs-num">{String(i).padStart(2, '0')}</div>
              <span className={`ucs-badge ${c.strength === 'Strong' ? 'strong' : 'test'}`}>{c.strength}</span>
              <h3>{c.title}</h3>
              <p className="ucs-where"><b>Where</b> {c.area}</p>
              <p className="ucs-gets">{c.gets}</p>
            </div>
            <Diagram c={c} app={app} idx={i} />
          </div>
        )}
      </div>
      <footer className="ucs-foot">
        <button onClick={() => go(i - 1)} aria-label="Previous">‹</button>
        <div className="ucs-dots">{Array.from({ length: total }, (_, k) => <button key={k} className={k === i ? 'on' : ''} onClick={() => go(k)} aria-label={k === 0 ? 'Overview' : `Use case ${k}`} />)}</div>
        <button onClick={() => go(i + 1)} aria-label="Next">›</button>
      </footer>
      {!hover && <div className="ucs-progress" key={`pr${i}`} style={{ animationDuration: i === 0 ? '4.5s' : '6.5s' }} />}
      <style>{CSS}</style>
    </section>
  )
}

const CSS = `
.ucs{--soft:color-mix(in srgb,var(--p) 11%,white);--line:color-mix(in srgb,var(--p) 22%,white);position:relative;overflow:hidden;margin:20px 0 28px;padding:18px 24px 16px;border-radius:20px;border:1px solid var(--line);background:linear-gradient(135deg,color-mix(in srgb,var(--p) 9%,white),#fff 62%);color:#1a1d21;font-family:system-ui,sans-serif}
.ucs-blob{position:absolute;border-radius:50%;filter:blur(40px);opacity:.22;pointer-events:none;animation:ucs-float 9s ease-in-out infinite}
.ucs-blob.b1{width:220px;height:220px;background:var(--p);right:-60px;top:-70px}
.ucs-blob.b2{width:180px;height:180px;background:var(--a);left:-50px;bottom:-60px;animation-delay:-4s}
@keyframes ucs-float{0%,100%{transform:translate(0,0)}50%{transform:translate(18px,14px)}}
.ucs-head{position:relative;display:flex;align-items:center;gap:10px;font-weight:700;font-size:15px;margin-bottom:6px}
.ucs-head img{width:26px;height:26px;border-radius:7px;object-fit:contain;background:#fff;border:1px solid var(--line)}
.ucs-head em{margin-left:auto;font-style:normal;font-weight:600;font-size:12px;color:var(--p);background:var(--soft);padding:3px 10px;border-radius:999px}
.ucs-slide{position:relative;min-height:290px;display:flex;align-items:center}
.ucs-slide.fwd{animation:ucs-in-r .55s cubic-bezier(.2,.8,.2,1) both}.ucs-slide.back{animation:ucs-in-l .55s cubic-bezier(.2,.8,.2,1) both}
@keyframes ucs-in-r{from{opacity:0;transform:translateX(34px)}to{opacity:1;transform:none}}
@keyframes ucs-in-l{from{opacity:0;transform:translateX(-34px)}to{opacity:1;transform:none}}
.ucs-case{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.55fr);gap:18px;align-items:center;width:100%}
@media(max-width:760px){.ucs-case,.ucs-intro{grid-template-columns:1fr!important}}
.ucs-num{font-size:62px;line-height:1;font-weight:800;color:transparent;-webkit-text-stroke:2px var(--p);opacity:.55;letter-spacing:-2px;margin-bottom:4px}
.ucs-badge{display:inline-block;font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;margin-bottom:8px}
.ucs-badge.strong,.ucs-menu-list i.strong{background:var(--p);color:var(--on)}.ucs-badge.test,.ucs-menu-list i.test{background:#fff1df;color:#a24b0a}
.ucs-text h3{margin:0 0 8px;font-size:23px;line-height:1.2}
.ucs-where{margin:0 0 8px;color:#556;font-size:14px}.ucs-where b{color:var(--p);margin-right:4px}
.ucs-gets{margin:0;line-height:1.5;font-size:15px}
.ucs-diagram{width:100%;height:auto;overflow:visible}
.ucs-user{fill:var(--soft);stroke:var(--p);stroke-width:1.6}.ucs-user-ink{fill:none;stroke:var(--p);stroke-width:1.6}
.ucs-win{fill:#fff;stroke:var(--line);stroke-width:1.5;filter:drop-shadow(0 6px 14px rgba(20,22,28,.10))}
.ucs-win-bar{fill:var(--p)}.ucs-win-dot{fill:var(--on);opacity:.75}.ucs-win-name{font-size:10.5px;font-weight:700;fill:var(--on)}
.ucs-sk{fill:#e8eaf0}
.ucs-lit{fill:var(--p);animation:ucs-glow 2.2s ease-in-out infinite}
@keyframes ucs-glow{0%,100%{opacity:1}50%{opacity:.82}}
.ucs-lit-t{font-size:12.5px;font-weight:700;fill:var(--on)}
.ucs-ping-dot{fill:var(--a)}.ucs-ping-ring{fill:none;stroke:var(--a);stroke-width:2;transform-box:fill-box;transform-origin:center;animation:ucs-ring 1.6s ease-out infinite}
.ucs-flow{fill:none;stroke:var(--p);stroke-width:2.4;stroke-dasharray:6 8;animation:ucs-dash 1.1s linear infinite;opacity:.85}
@keyframes ucs-dash{to{stroke-dashoffset:-28}}
.ucs-travel{fill:var(--a)}
.ucs-hub{fill:var(--a)}.ucs-hub-t{font-size:11.5px;font-weight:800;fill:#fff;paint-order:stroke;stroke:rgba(0,0,0,.18);stroke-width:2px}
.ucs-ring{fill:none;stroke:var(--a);stroke-width:2;transform-box:fill-box;transform-origin:center;animation:ucs-ring 2.6s ease-out infinite}.ucs-ring.r2{animation-delay:1.3s}
@keyframes ucs-ring{from{opacity:.7;transform:scale(.85)}to{opacity:0;transform:scale(1.7)}}
.ucs-orbit{fill:none;stroke:var(--p);stroke-width:1.8;stroke-dasharray:3 9;transform-box:fill-box;transform-origin:center;animation:ucs-spin 14s linear infinite}
@keyframes ucs-spin{to{transform:rotate(360deg)}}
.ucs-chip{transform-box:fill-box;transform-origin:left center;animation:ucs-pop .5s cubic-bezier(.2,1.2,.3,1) both}
@keyframes ucs-pop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
.ucs-chip-bg{fill:#fff;stroke:var(--p);stroke-width:1.6;filter:drop-shadow(0 3px 8px rgba(20,22,28,.08))}
.ucs-chip-dot{fill:var(--p)}.ucs-chip-i{font-size:11px;font-weight:800;fill:var(--on)}.ucs-chip-t{font-size:13px;font-weight:700;fill:#1a1d21}
.ucs-intro{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:24px;align-items:center;width:100%}
.ucs-big-logo{width:56px;height:56px;object-fit:contain;border-radius:14px;background:#fff;border:1px solid var(--line);padding:6px;margin-bottom:12px;animation:ucs-pop .6s ease both}
.ucs-eyebrow{margin:0 0 6px;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--p)}
.ucs-hero{margin:0 0 10px;font-size:34px;line-height:1.1;font-weight:800}.ucs-hero span{color:var(--p)}
.ucs-lead{margin:0;color:#445;line-height:1.5}
.ucs-menu-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:9px}
.ucs-menu-list li{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:10px 14px;cursor:pointer;box-shadow:0 3px 10px rgba(20,22,28,.06);animation:ucs-rise .5s ease both;transition:transform .2s,border-color .2s}
.ucs-menu-list li:hover{transform:translateX(4px);border-color:var(--p)}
@keyframes ucs-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.ucs-menu-list b{color:var(--p);font-size:14px}.ucs-menu-list span{font-weight:700;flex:1}
.ucs-menu-list i{font-style:normal;font-size:11px;font-weight:700;padding:2px 9px;border-radius:999px}
.ucs-foot{position:relative;display:flex;justify-content:center;align-items:center;gap:14px;margin-top:6px}
.ucs-foot>button{width:34px;height:34px;border-radius:50%;border:1px solid var(--line);background:#fff;font-size:20px;line-height:1;cursor:pointer;color:var(--p)}
.ucs-dots{display:flex;gap:8px;align-items:center}
.ucs-dots button{width:9px;height:9px;border-radius:50%;border:0;background:var(--line);cursor:pointer;padding:0;transition:all .25s}
.ucs-dots button.on{background:var(--p);width:26px;border-radius:5px}
.ucs-progress{position:absolute;left:0;bottom:0;height:3px;background:var(--a);animation:ucs-prog linear both}
@keyframes ucs-prog{from{width:0}to{width:100%}}
.ucs-flow.back{stroke:var(--a);opacity:.7}.ucs-travel.back{fill:var(--p)}
.ucs-caption{font-size:11.5px;fill:#667;font-style:italic}.ucs-dim{font-size:12px;font-weight:700;fill:var(--p)}
.ucs-dim-l{font-size:9.5px;font-weight:800;letter-spacing:.08em;fill:#889}.ucs-win-n{font-size:11.5px;font-weight:700;fill:var(--p)}
.ucs-tile{fill:#fff;stroke:var(--line);stroke-width:1.4;filter:drop-shadow(0 2px 5px rgba(20,22,28,.07))}
.ucs-btn{fill:var(--p);animation:ucs-gone .35s ease forwards}.ucs-btn-t{font-size:10.5px;font-weight:700;fill:var(--on);animation:ucs-gone .35s ease forwards}
@keyframes ucs-gone{to{opacity:0}}
.ucs-done{fill:#1f9d55}.ucs-check{fill:none;stroke:#fff;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:24;stroke-dashoffset:24;animation:ucs-draw .5s ease forwards}
.ucs-check-s{fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
@keyframes ucs-draw{to{stroke-dashoffset:0}}
.ucs-late{opacity:0;animation:ucs-fade .5s ease forwards}.ucs-late.loop{animation:ucs-fade .5s ease forwards}
@keyframes ucs-fade{to{opacity:1}}
.ucs-bubble{fill:#fff;stroke:var(--line);stroke-width:1.4}.ucs-bubble.me{fill:var(--p);stroke:var(--p)}.ucs-bubble.ok{fill:#e8f6ee;stroke:#1f9d55}
.ucs-bubble-t{font-size:11.5px;font-weight:600;fill:#1a1d21}.ucs-bubble-t.me{fill:var(--on)}.ucs-bubble-t.ok{fill:#1f7a45}
.ucs-typing{opacity:0;animation:ucs-fade .3s ease forwards}.ucs-dotty{fill:var(--p);animation:ucs-bounce 1s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes ucs-bounce{0%,100%{transform:translateY(0);opacity:.5}50%{transform:translateY(-4px);opacity:1}}
.ucs-gridd{fill:var(--line)}.ucs-node{fill:#fff;stroke:var(--p);stroke-width:1.6;filter:drop-shadow(0 3px 7px rgba(20,22,28,.08))}.ucs-node-t{font-size:11.5px;font-weight:700;fill:#1a1d21}
.ucs-pill{fill:var(--a)}.ucs-pill-t{font-size:10.5px;font-weight:800;fill:#fff;paint-order:stroke;stroke:rgba(0,0,0,.15);stroke-width:1.5px}
.ucs-badge-dot{fill:var(--a)}
@media (prefers-reduced-motion:reduce){.ucs *{animation:none!important;transition:none!important}.ucs-travel,.ucs-btn,.ucs-btn-t{display:none}.ucs-late{opacity:1}.ucs-check{stroke-dashoffset:0}}
`

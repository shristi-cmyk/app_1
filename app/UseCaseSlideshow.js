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

function Diagram({ c, app, idx }) {
  const ys = ROWS[Math.min(c.apps.length, 4)]
  return (
    <svg viewBox="0 0 640 260" className="ucs-diagram" role="img" aria-label={`${c.title}: users, ${app}, integration layer, their tools`}>
      {[70, 130, 190].map((y, k) => (
        <g key={y}>
          <path d={`M50 ${y} C 72 ${y}, 78 130, 98 130`} className="ucs-flow" style={{ animationDelay: `${k * 0.2}s` }} />
          <circle cx="34" cy={y} r="17" className="ucs-user" />
          <circle cx="34" cy={y - 4} r="5" className="ucs-user-ink" />
          <path d={`M24 ${y + 9} a10 7 0 0 1 20 0`} className="ucs-user-ink" />
        </g>
      ))}
      <g className="ucs-window">
        <rect x="98" y="66" width="168" height="128" rx="14" className="ucs-win" />
        <path d="M98 80a14 14 0 0 1 14-14h140a14 14 0 0 1 14 14v10H98z" className="ucs-win-bar" />
        <circle cx="114" cy="78" r="3" className="ucs-win-dot" /><circle cx="126" cy="78" r="3" className="ucs-win-dot" /><circle cx="138" cy="78" r="3" className="ucs-win-dot" />
        <text x="258" y="82" textAnchor="end" className="ucs-win-name">{app.slice(0, 14)}</text>
        <rect x="112" y="102" width="70" height="8" rx="4" className="ucs-sk" /><rect x="112" y="152" width="90" height="8" rx="4" className="ucs-sk" /><rect x="112" y="170" width="56" height="8" rx="4" className="ucs-sk" />
        <rect x="108" y="120" width="148" height="26" rx="9" className="ucs-lit" />
        <text x="120" y="137" className="ucs-lit-t">{c.menu}</text>
        <circle cx="244" cy="133" r="4" className="ucs-ping-dot" /><circle cx="244" cy="133" r="4" className="ucs-ping-ring" />
      </g>
      <path id={`m${idx}`} d="M266 130 L 330 130" className="ucs-flow" />
      <circle r="4.5" className="ucs-travel"><animateMotion dur="1.8s" repeatCount="indefinite"><mpath href={`#m${idx}`} /></animateMotion></circle>
      <circle cx="370" cy="130" r="36" className="ucs-ring r1" /><circle cx="370" cy="130" r="36" className="ucs-ring r2" />
      <circle cx="370" cy="130" r="47" className="ucs-orbit" />
      <circle cx="370" cy="130" r="36" className="ucs-hub" />
      <text x="370" y="127" textAnchor="middle" className="ucs-hub-t">Integration</text>
      <text x="370" y="141" textAnchor="middle" className="ucs-hub-t">layer</text>
      {c.apps.map((a, k) => (
        <g key={a}>
          <path id={`p${idx}-${k}`} d={`M406 130 C 450 130, 452 ${ys[k]}, 496 ${ys[k]}`} className="ucs-flow" style={{ animationDelay: `${k * 0.25}s` }} />
          <circle r="4" className="ucs-travel"><animateMotion dur="2.2s" begin={`${k * 0.4}s`} repeatCount="indefinite"><mpath href={`#p${idx}-${k}`} /></animateMotion></circle>
          <g className="ucs-chip" style={{ animationDelay: `${0.35 + k * 0.18}s` }}>
            <rect x="496" y={ys[k] - 18} width="132" height="36" rx="18" className="ucs-chip-bg" />
            <circle cx="515" cy={ys[k]} r="11" className="ucs-chip-dot" />
            <text x="515" y={ys[k] + 4} textAnchor="middle" className="ucs-chip-i">{initial(a)}</text>
            <text x="534" y={ys[k] + 4} className="ucs-chip-t">{a}</text>
          </g>
        </g>
      ))}
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
@media (prefers-reduced-motion:reduce){.ucs *{animation:none!important;transition:none!important}.ucs-travel{display:none}}
`

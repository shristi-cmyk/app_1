'use client'
import { useEffect, useState } from 'react'

const DEFAULT_THEME = { p: '#5b3df5', a: '#ff8a4c' }

// An animated mock of the researched app: each use case is a menu item that lights up in turn, and a pop-up
// shows the integration layer with the tools its users would connect. Colours come from the app's brand when known.
export default function UseCaseMap({ data }) {
  const cases = data?.cases || []
  const [hover, setHover] = useState(false)
  const [i, setI] = useState(0)

  useEffect(() => {
    if (hover || cases.length < 2) return undefined
    const t = setInterval(() => setI((x) => (x + 1) % cases.length), 4500)
    return () => clearInterval(t)
  }, [hover, cases.length])

  if (!cases.length) return null
  const c = cases[Math.min(i, cases.length - 1)]
  const theme = { ...DEFAULT_THEME, ...(data.theme || {}) }
  const menu = ['Home', ...cases.map((x) => x.menu), 'Settings']

  return (
    <section className="ucm" style={{ '--p': theme.p, '--a': theme.a }} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} aria-label="Where the integration layer fits in the product">
      <div className="ucm-win">
        <div className="ucm-bar"><i /><i /><i /><span>{data.app || 'The app'}</span></div>
        <div className="ucm-body">
          <ul className="ucm-side">
            {menu.map((m) => {
              const k = cases.findIndex((x) => x.menu === m)
              return (
                <li key={m} className={k === i ? 'lit' : k >= 0 ? 'hot' : ''} onClick={() => k >= 0 && setI(k)}>
                  {m}{k >= 0 && <b className="ucm-ping" />}
                </li>
              )
            })}
          </ul>
          <div className="ucm-main">
            <div className="ucm-sk w60" /><div className="ucm-sk w90" /><div className="ucm-sk w40" />
            <div className="ucm-pop" key={i}>
              <div className="ucm-pop-hd"><span className="ucm-dot" /> Integration layer</div>
              <div className="ucm-apps">{c.apps.map((a, k) => <span key={a} className="ucm-chip" style={{ animationDelay: `${k * 0.15}s` }}>{a}</span>)}</div>
            </div>
          </div>
        </div>
      </div>
      <div className="ucm-detail" key={`d${i}`}>
        <div className="ucm-kicker">{c.area} <span className={`ucm-badge ${c.strength === 'Strong' ? 'strong' : 'test'}`}>{c.strength}</span></div>
        <h3>{c.title}</h3>
        <p>{c.gets}</p>
        <div className="ucm-dots">{cases.map((_, k) => <button key={k} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`Use case ${k + 1}`} />)}</div>
      </div>
      <style>{CSS}</style>
    </section>
  )
}

const CSS = `
.ucm{--soft:color-mix(in srgb,var(--p) 12%,white);display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:24px;align-items:center;margin:20px 0 28px;padding:20px;border:1px solid #e1e4ec;border-radius:16px;background:#fff}
@media(max-width:760px){.ucm{grid-template-columns:1fr}}
.ucm-win{border:1px solid #d5d8e0;border-radius:12px;overflow:hidden;background:#fafbfd}
.ucm-bar{display:flex;gap:6px;align-items:center;padding:8px 12px;background:#eef0f5;font-size:13px;color:#667}
.ucm-bar i{width:10px;height:10px;border-radius:50%;background:#c9cdd8}.ucm-bar span{margin-left:8px;font-weight:600}
.ucm-body{display:grid;grid-template-columns:150px 1fr;min-height:250px}
@media(max-width:480px){.ucm-body{grid-template-columns:110px 1fr}}
.ucm-side{list-style:none;margin:0;padding:10px;border-right:1px solid #e6e8ee;background:#fff}
.ucm-side li{position:relative;padding:8px 22px 8px 10px;border-radius:8px;font-size:14px;color:#556;margin-bottom:2px;transition:all .3s}
.ucm-side li.hot{cursor:pointer;color:#333}
.ucm-side li.lit{background:var(--soft);color:var(--p);font-weight:700;box-shadow:inset 3px 0 0 var(--p)}
.ucm-ping{position:absolute;right:8px;top:50%;width:8px;height:8px;margin-top:-4px;border-radius:50%;background:var(--a)}
.lit .ucm-ping::after{content:'';position:absolute;inset:0;border-radius:50%;border:2px solid var(--a);animation:ucm-ring 1.6s ease-out infinite}
@keyframes ucm-ring{from{opacity:.7;transform:scale(.85)}to{opacity:0;transform:scale(2.2)}}
.ucm-main{padding:16px}
.ucm-sk{height:12px;border-radius:6px;background:#e9ebf1;margin-bottom:12px}.w60{width:60%}.w90{width:90%}.w40{width:40%}
.ucm-pop{margin-top:26px;border:2px solid var(--p);border-radius:12px;background:#fff;padding:12px;animation:ucm-pop .45s ease both;box-shadow:0 8px 24px rgba(0,0,0,.08)}
@keyframes ucm-pop{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:none}}
.ucm-pop-hd{font-weight:700;font-size:14px;color:var(--p);display:flex;align-items:center;gap:8px;margin-bottom:8px}
.ucm-dot{width:10px;height:10px;border-radius:50%;background:var(--a)}
.ucm-apps{display:flex;gap:8px;flex-wrap:wrap}
.ucm-chip{background:var(--soft);color:var(--p);border:1px solid var(--p);padding:3px 10px;border-radius:999px;font-size:13px;font-weight:600;animation:ucm-pop .4s ease both}
.ucm-detail{animation:ucm-in .5s ease both}
@keyframes ucm-in{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:none}}
.ucm-kicker{font-size:13px;color:#667;display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px}
.ucm-badge{font-size:12px;padding:2px 8px;border-radius:999px}
.ucm-badge.strong{background:var(--soft);color:var(--p)}.ucm-badge.test{background:#fff3e6;color:#b5560f}
.ucm-detail h3{margin:4px 0 8px;font-size:20px}.ucm-detail p{margin:0 0 12px;line-height:1.5}
.ucm-dots{display:flex;gap:8px}
.ucm-dots button{width:10px;height:10px;border-radius:50%;border:0;background:#d5d8e0;cursor:pointer;padding:0}
.ucm-dots button.on{background:var(--p);transform:scale(1.3)}
@media (prefers-reduced-motion:reduce){.ucm *{animation:none!important;transition:none!important}}
`

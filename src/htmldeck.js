import { readFile } from 'node:fs/promises'

// The template is viaSocket_x_AiSensy_final.html with its slides taken out: the CSS, presenter
// script and controls are byte-for-byte the final deck; only partner content is generated here.
const TEMPLATE = readFile(new URL('./final-template.html', import.meta.url), 'utf8')
const MARKS = readFile(new URL('./marks.json', import.meta.url), 'utf8').then(JSON.parse)

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const hex = (c) => c.replace('#', '').toUpperCase()
const rgb = (c) => { const n = parseInt(hex(c), 16); return [n >> 16, (n >> 8) & 255, n & 255] }
const mix = (c, to, t) => '#' + rgb(c).map((v) => Math.round(v + (to - v) * t).toString(16).padStart(2, '0')).join('').toUpperCase()

// The final AiSensy deck as data. Every other partner's brief has exactly this shape.
export const AISENSY_FINAL = {
  partner: { name: 'AiSensy', color: '#07CF65', deep: '#0A5C33', tint: '#E3F8EC', domain: 'aisensy.com' },
  heroLines: ['Give AiSensy and', 'its agents the', 'power to act'],
  subtitle: 'Native integrations and agent tools for 2,300+ apps, inside AiSensy.',
  problem: {
    title: 'Your product and agents can talk. Can they act?',
    asks: [
      ['“Where’s my order?”', 'Needs Shopify / WooCommerce'],
      ['“Book a demo for Friday”', 'Needs Google Calendar'],
      ['“Sign me up for updates”', 'Needs Zoho / HubSpot / Salesforce'],
      ['“I’ve paid, send my invoice”', 'Needs Razorpay / Cashfree']
    ],
    route: ['AiSensy', 'Automation tool', 'customer’s apps'],
    detour: 'A detour outside AiSensy, unusable by your product or agents.'
  },
  engine: ['One Connect button, on Google’s own consent screen', 'Tokens, mapping and events handled', 'Same connection works as a tool for the agent'],
  mock: {
    product: 'Campaign Agent',
    back: 'Untitled Agent',
    steps: ['Goal', 'Audience', 'Journey', 'Review'],
    label: 'CAMPAIGN AGENT · ONLINE',
    question: 'What should we get done [today]?',
    typed: 'Remind customers about tomorrow’s appointments',
    next: 'Next · who gets it',
    askBold: 'To find them I need your Google Calendar.',
    askRest: 'Connect it once and I’ll pull tomorrow’s bookings.',
    button: 'Connect Calendar',
    consentIdle: 'Opens Google’s own consent screen',
    consentDone: 'Pulling tomorrow’s bookings…'
  },
  trigger: {
    heading: 'It works the other way too: payment and order events start WhatsApp messages',
    nodes: [['Razorpay payment', 'Razorpay'], ['viaSocket', 'viasocket'], ['AiSensy template', 'partner'], ['Customer confirmation', 'WhatsApp']]
  },
  objections: [
    { quote: '“We already have a few integrations, like Shopify.”', answer: 'Keep them. viaSocket covers the rest.', body: 'Wherever your customers are, we likely have it. If not, add it as a custom connector or request it.', apps: ['Freshdesk', 'Zendesk', 'Zoho Desk', 'Google Calendar', 'Salesforce', 'Gmail'] },
    { quote: '“Customers can just use an automation tool.”', answer: 'Keep customers inside your product.', body: 'No extra tool or bill for them, and it’s yours to brand and package into your plans. Connected accounts are unlimited on every plan.', apps: [] }
  ],
  banner: ['viaSocket adds to what you have.', 'It doesn’t replace it.'],
  extras: [],
  regions: [],
  notes: [
    'Open with the core idea: AiSensy’s AI Agent Builder can already understand customers. viaSocket lets it take action in the apps those customers already use.',
    'Customers ask the agent for things that live in other apps. Today many AiSensy customers connect those apps through third-party automation tools: they leave AiSensy to set it up, pay for another tool, and neither the product nor the new AI agent can call those apps as tools.',
    'AiSensy’s own Campaign Agent, re-drawn as an illustrative mock. When the agent needs an app the customer hasn’t connected, it asks, and the Connect button runs viaSocket: Google’s consent screen opens, the customer approves, and viaSocket stores and refreshes the token and maps the data. Click to show the reverse direction: a Razorpay payment or a new order triggers an AiSensy template, which drives WhatsApp volume. Where the Connect moment sits is for AiSensy’s product team to shape.',
    'Objection 1: agree, and position viaSocket as the apps their customers ask for next. Lead with the apps shown, not with a catalogue number. Objection 2: that path sends customers out of AiSensy and adds a tool and a bill; with viaSocket, integrations stay inside AiSensy, under its brand, and become something AiSensy can package into higher plans. Keep the tone friendly and avoid naming other tools. If asked about an app that is missing: build it once as a custom connector in the Plug Builder, or request the integration from the viaSocket team.',
    'The setup is one prompt pasted into a coding agent. It asks for credentials, builds the connect flow, tools and triggers, and finishes with a real test call. Time a real run yourself before quoting a duration; rolling it out to customers is a short beta after that.'
  ]
}

/** A neutral brief for any partner, used only when the AI draft is unavailable. */
export function genericBrief({ name, color, domain, description = '' }) {
  return {
    partner: { name, color, domain },
    heroLines: [`Give ${name}’s`, 'users the', 'power to act'],
    subtitle: `Native integrations and agent tools for 2,300+ apps, inside ${name}.`,
    problem: {
      title: 'Your product and agents can talk. Can they act?',
      asks: [
        ['“Sync my new leads”', 'Needs HubSpot / Zoho CRM'],
        ['“Log this in our sheet”', 'Needs Google Sheets'],
        ['“Tell the team on Slack”', 'Needs Slack'],
        ['“Did the payment go through?”', 'Needs Razorpay / Stripe']
      ],
      route: [name, 'Automation tool', 'customer’s apps'],
      detour: `A detour outside ${name}, unusable by your product or agents.`
    },
    engine: ['One Connect button, on the app’s own consent screen', 'Tokens, mapping and events handled', 'Same connection works as a tool for your AI'],
    mock: {
      product: name, back: 'Untitled', steps: ['Goal', 'Apps', 'Rules', 'Review'], label: `${name.toUpperCase()} · ONLINE`,
      question: 'What should we get done [today]?', typed: 'Send every new signup to our CRM', next: 'Next · pick the app',
      askBold: 'To do that I need your HubSpot.', askRest: 'Connect it once and I’ll add each new signup.',
      button: 'Connect HubSpot', consentIdle: 'Opens HubSpot’s own consent screen', consentDone: 'Syncing new signups…'
    },
    trigger: {
      heading: `It works the other way too: events in customers’ apps start actions in ${name}`,
      nodes: [['Stripe payment', 'Stripe'], ['viaSocket', 'viasocket'], [`${name} action`, 'partner'], ['Customer update', 'Gmail']]
    },
    objections: [
      { quote: '“We already have a few integrations.”', answer: 'Keep them. viaSocket covers the rest.', body: 'Wherever your customers are, we likely have it. If not, add it as a custom connector or request it.', apps: ['HubSpot', 'Salesforce', 'Google Sheets', 'Slack', 'Gmail', 'Zendesk'] },
      { quote: '“Customers can just use an automation tool.”', answer: 'Keep customers inside your product.', body: 'No extra tool or bill for them, and it’s yours to brand and package into your plans. Connected accounts are unlimited on every plan.', apps: [] }
    ],
    banner: ['viaSocket adds to what you have.', 'It doesn’t replace it.'],
    extras: [],
    regions: [],
    notes: [
      `Open with the core idea for ${name}. ${description}`.trim(),
      'Customers ask for things that live in other apps; today they leave the product to wire them up.',
      `An illustrative mock of ${name}. When an app isn’t connected yet, the product asks and viaSocket runs the connect flow. Click to show the reverse direction.`,
      'Agree with objection 1 and position viaSocket as the next apps. For objection 2, stress staying inside the product, under its brand. Avoid naming other tools.',
      'One prompt in a coding agent; a real test call at the end, then a short beta.'
    ]
  }
}

function slides(b, a, M, who) {
  const p = esc(b.partner.name)
  const foot = (n) => `  <footer class="foot"><span>viaSocket × ${p}</span><span>${n}</span></footer>`
  const partnerImg = (cls) => (a.partnerLogo ? `<img class="${cls}" src="${a.partnerLogo}" alt="${p}">` : `<span class="${cls}" style="display:grid;place-items:center;background:#fff;font:700 22px Geist;color:var(--ink)">${p}</span>`)
  const vsMark = M.viasocket
  const icon = (key) => {
    if (key === 'viasocket') return `<span class="tn-ic vs"><span class="mark">${vsMark}</span></span>`
    if (key === 'partner') return a.partnerLogo ? `<span class="tn-ic tile"><img src="${a.partnerLogo}" alt=""></span>` : `<span class="tn-ic dot">${p[0]}</span>`
    const svg = a.brands[key] ?? M[key]
    return `<span class="tn-ic dot">${svg ?? esc(String(key ?? '•')[0])}</span>`
  }
  const conn = (i) => `<span class="tconn"><span class="conn-line"></span>${M.conn.replace('<svg', '<svg class="conn-arrow"')}<span class="packet" style="--p:${i}"></span></span>`
  const nodes = b.trigger.nodes.map(([label, key], i) => (i ? conn(i - 1) : '') + `<span class="tn">${icon(key)}<span>${esc(label)}</span></span>`).join('\n      ')
  const question = esc(b.mock.question).replace(/\[(.+?)\]/, '<mark>$1</mark>')
  const regions = cleanRegions(b.regions)
  const [r1, r2, r3] = b.problem.route.map(esc)

  return `
<section class="slide light v3" id="slide-1" data-steps="0" aria-label="Slide 1 of 6: title">
  <div class="lp wide"></div><div class="gp"></div>
  <h1 class="hero-t">${b.heroLines.map((l) => `<span class="ln"><span>${esc(l)}</span></span>`).join('')}</h1>
  <p class="hero-s">${esc(b.subtitle)}</p>
  <div class="logos">
    ${partnerImg('logo-ais')}
    <svg class="link" viewBox="0 0 120 10" aria-hidden="true"><line x1="2" y1="5" x2="118" y2="5"/></svg>
    <span class="logo-vs">${vsMark}</span>
  </div>
  <p class="hero-f">viaSocket × ${p} · Partnership proposal</p>
</section>

<section class="slide light v3" id="slide-2" data-steps="1" aria-label="Slide 2 of 6">
  <div class="lp"></div>
  <h2 class="t">${esc(b.problem.title)}</h2>
  <ul class="v3-asks bstep d1" data-step="0">${b.problem.asks.map(([q, n], k) => `<li class="rowin" style="--k:${k}"><span class="q">${esc(q)}</span><span class="n">${esc(n)}</span></li>`).join('')}</ul>
  <div class="v3-route bstep" data-step="1"><div class="route" aria-label="${r1}, then ${r2}, then ${r3}"><span class="rt-a">${r1}</span><span class="rt-arrow">→</span><span class="rt-b">${r2}</span><span class="rt-arrow">→</span><span class="rt-c">${r3}</span></div><p class="detour">${esc(b.problem.detour)}</p></div>
${foot(2)}
</section>

<section class="slide light v3" id="slide-3" data-steps="1" aria-label="Slide 3 of 6">
  <div class="lp"></div>
  <h2 class="t">Your UI. viaSocket’s engine.</h2>
  <div class="eng on-lp">
    <p class="eng-h">Powered by viaSocket</p>
    <p class="eng-s">Invisible to your customers</p>
    <ul class="eng-l">
${b.engine.map((t) => `      <li class="eng-pt">${M.check}<span>${esc(t)}</span></li>`).join('\n')}
    </ul>
    <p class="eng-c">Illustrative mock of the ${esc(b.mock.product)}</p>
  </div>
  <div class="mockwrap"><div class="mock" role="img" aria-label="Illustrative mock of ${p}’s ${esc(b.mock.product)} connecting an app through viaSocket">
    <div class="mock-bar">
      <span class="mock-back">${M.back} ${esc(b.mock.back)}</span>
      <span class="stepper">${b.mock.steps.map((s, i) => `<span class="st${i ? '' : ' on'}">${i + 1} ${esc(s)}</span>`).join('<i></i>')}</span>
      <button class="replay" type="button" aria-label="Replay the demo">${M.replay}<span>Replay</span></button>
    </div>
    <div class="mock-body">
      <div class="hero">
        <p class="hero-lbl">● ${esc(b.mock.label)}</p>
        <p class="hero-q">${question}</p>
      </div>
      <div class="input">
        <p class="typed"><span class="typed-text"></span><span class="caret"></span></p>
        <span class="next-btn">${esc(b.mock.next)} ${M.next}</span>
      </div>
      <div class="agent">
        <span class="avatar"><i></i><i></i></span>
        <div class="agent-msg">
          <p><b>${esc(b.mock.askBold)}</b><br>${esc(b.mock.askRest)}</p>
          <div class="agent-row">
            <span class="connect"><span class="c-idle">${esc(b.mock.button)}</span><span class="c-done">${M.check} Connected</span></span>
            <span class="consent"><span class="cs-idle">${esc(b.mock.consentIdle)}</span><span class="cs-done">${esc(b.mock.consentDone)}</span></span>
          </div>
        </div>
      </div>
    </div>
  </div></div>
  <div class="trig bstep " data-step="1">
    <p class="trig-l">${esc(b.trigger.heading)}</p>
    <div class="trig-row">
      ${nodes}
    </div>
  </div>
${foot(3)}
</section>

<section class="slide light v3" id="slide-4" data-steps="3" aria-label="Slide 4 of 6">
  <div class="lp"></div>
  <h2 class="t">Don’t we already have this covered?</h2>
  <p class="banner v3-ban bstep" data-step="3">${esc(b.banner[0])} <span><em>${esc(b.banner[1])}</em></span></p>
${b.objections.map((o, i) => `  <div class="v3-obj bstep d3" data-step="${i + 1}" style="top:${i ? (regions.length ? 428 : 372) : (regions.length ? 110 : 118)}px">
    <p class="quote">${esc(o.quote)}</p>
    <h3 class="ans-h">${esc(o.answer)}</h3>
    <p class="ans-p">${esc(o.body)}</p>${i === 0 && regions.length ? `\n    <div class="regions">${regions.map((r) => `<div><b>${esc(r.label)}</b><span>${r.apps.map(esc).join(' · ')}</span></div>`).join('')}</div>` : o.apps?.length ? `\n    <p class="apps-line">${o.apps.map(esc).join(' · ')}</p>` : ''}
  </div>`).join('\n')}
${foot(4)}
</section>

<section class="slide light v3" id="slide-5" data-steps="0" aria-label="Slide 5 of 6">
  <div class="lp"></div>
  <h2 class="t">Live from one prompt</h2>
  <p class="beta">Then a short beta with real customers.</p>
  <ol class="vsteps"><span class="vrail"><span class="vrail-fill"></span></span><li class="vstep" style="--k:0"><span class="num">1</span><div><h3>Paste the prompt</h3><p>Into Cursor, Claude Code or Codex.</p></div></li><li class="vstep" style="--k:1"><span class="num">2</span><div><h3>Add credentials</h3><p>Org ID, project ID and secret, kept in <code>.env</code>.</p></div></li><li class="vstep" style="--k:2"><span class="num">3</span><div><h3>It builds</h3><p>Connect flow, agent tools and triggers.</p></div></li><li class="vstep" style="--k:3"><span class="num">4</span><div><h3>Real test call</h3><p>Against a connected app.</p></div></li></ol>
${foot(5)}
</section>

<section class="slide light v3" id="slide-6" data-steps="0" aria-label="Slide 6 of 6: thank you">
  <div class="lp wide"></div><div class="gp"></div>
  <h1 class="hero-t"><span class="ln"><span>Thank you.</span></span></h1>
  <div class="hero-s ty-ctx">
    <p class="ty-lead">viaSocket is the integration layer behind your product.</p>
    <p>Your customers connect their own apps inside your UI.</p>
    <p>Your product and agents act in those apps, and app events start your flows.</p>${cleanExtras(b.extras).length ? `\n    <p class="ty-also">Also here: ${cleanExtras(b.extras).map((e) => esc(e.label)).join(' · ')}</p>` : ''}
  </div>
  <div class="hero-f sig">
${who.name ? `    <small>Presented by</small>\n    <b>${esc(who.name)}</b>\n` : ''}${who.cal ? `    <a href="${esc(who.cal.url)}" target="_blank" rel="noopener"><span class="k">Book a call</span>${esc(who.cal.label)}</a>\n` : ''}    <a href="https://viasocket.com" target="_blank" rel="noopener"><span class="k">Learn more</span>viasocket.com</a>
  </div>
  <p class="hero-f ty-foot">viaSocket × ${p}</p>
</section>
`
}

const js = (v) => JSON.stringify(v).replace(/</g, '\\u003c')

// Other viaSocket capabilities a deck may mention, only when the partner's use case needs one.
// (Triggers are already the slide's "Listen" row, so they are not repeated as an extra.)
export const EXTRA_CAPABILITIES = ['Browser actions', '50+ AI models', 'Memory', 'Scheduled execution']

/** At most two { label, text } rows, labels from the fixed list above, so the AI cannot invent a feature. */
export function cleanExtras(extras) {
  const seen = new Set()
  return (Array.isArray(extras) ? extras : []).flatMap((e) => {
    const label = EXTRA_CAPABILITIES.find((c) => c.toLowerCase() === String(e?.label ?? '').trim().toLowerCase())
    const text = String(e?.text ?? '').trim()
    if (!label || !text || text.length > 120 || seen.has(label)) return []
    seen.add(label)
    return [{ label, text }]
  }).slice(0, 2)
}

/** At most three { label, apps } region rows: short labels, 2 to 5 apps each, and at least two regions or none. */
export function cleanRegions(regions) {
  const rows = (Array.isArray(regions) ? regions : []).flatMap((r) => {
    const label = String(r?.label ?? '').trim()
    const apps = [...new Set((Array.isArray(r?.apps) ? r.apps : []).map((a) => String(a).trim()).filter((a) => a && a.length <= 28))].slice(0, 5)
    return label && label.length <= 14 && apps.length >= 2 ? [{ label, apps }] : []
  }).slice(0, 3)
  return rows.length >= 2 ? rows : []
}

/** The cal.id link: a full URL, `cal.id/name`, or just the username. */
export function calLink(input) {
  const v = String(input ?? '').trim()
  if (!v) return null
  const user = v.replace(/^https?:\/\//i, '').replace(/^(www\.)?cal\.id\//i, '').replace(/^@/, '').replace(/[?#].*$/, '').replace(/\/+$/, '')
  if (!/^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/.test(user)) return null
  return { url: `https://cal.id/${user}`, label: `cal.id/${user}` }
}

const CLOSING_CSS = `<style>
.v3-ban em{font-style:normal;white-space:nowrap}
.v3-obj .ans-p{max-width:62ch}
.v3 .regions{margin-top:16px;display:grid;gap:7px}
.v3 .regions div{display:grid;grid-template-columns:78px 1fr;gap:14px;align-items:baseline;font-size:16px;color:var(--text-2)}
.v3 .regions b{font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--sec-deep)}
.v3 .hero-s.ty-ctx{top:300px;left:64px;width:600px;font-size:22px;line-height:1.45;color:var(--on-dark-2)}
.v3 .ty-ctx p+p{margin-top:10px}
.v3 .ty-ctx .ty-lead{font-size:30px;line-height:1.2;letter-spacing:-.02em;font-weight:600;color:#fff;margin-bottom:18px}
.v3 .ty-ctx .ty-also{font-size:15px;color:var(--on-dark-3);margin-top:22px}
.v3 .hero-f.ty-foot{left:64px;bottom:34px;font-size:13px;color:var(--on-dark-3)}
.v3 .hero-f.sig{left:auto;right:56px;bottom:52px;width:400px;text-align:right;font-size:13px;color:var(--lit-fg)}
.v3 .sig small{display:block;font-size:14px;opacity:.7;margin-bottom:6px}
.v3 .sig b{display:block;font-size:34px;line-height:1.1;font-weight:600;letter-spacing:-.025em;padding-bottom:20px;margin-bottom:20px;border-bottom:2px solid currentColor}
.v3 .sig a{display:block;margin-top:12px;font-size:21px;font-weight:500;color:inherit;text-decoration:none;overflow-wrap:anywhere}
.v3 .sig a .k{display:block;font-size:13px;font-weight:400;opacity:.7;margin-bottom:2px}
@media print{.v3 .sig a{text-decoration:none}}
</style>
`

export async function renderHtmlDeck(brief, assets = {}, presenter = {}) {
  const c = brief.partner.color
  const sec = { color: c, deep: brief.partner.deep ?? mix(c, 0, 0.55), tint: brief.partner.tint ?? mix(c, 255, 0.88) }
  const a = { partnerLogo: null, brands: {}, ...assets }
  const who = { name: String(presenter.name ?? '').trim(), cal: calLink(presenter.cal) }
  const html = (await TEMPLATE)
    .replace('__TITLE__', () => `viaSocket × ${esc(brief.partner.name)} · Partnership proposal`)
    .replace('__SEC__', sec.color).replace('__SEC_DEEP__', sec.deep).replace('__SEC_TINT__', sec.tint)
    .replaceAll('__SEC_RGB__', rgb(c).join(','))
    .replace('__NOTES__', () => js([...brief.notes, `Thank them, and introduce viaSocket as the layer that connects the partner’s product and agents to their customers’ apps.${who.name ? ` ${who.name} presents and takes questions` : ''}${who.cal ? `; the call link is ${who.cal.label}` : ''}${who.name || who.cal ? '.' : ''}${cleanExtras(brief.extras).map((e) => ` Also relevant: ${e.label}, ${e.text.charAt(0).toLowerCase()}${e.text.slice(1)}`).join('')}`]))
    .replace('__TYPED__', () => js(brief.mock.typed))
  // The final deck puts ink on the partner colour; a dark partner colour needs white instead.
  const lum = rgb(c).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((t, v, i) => t + v * [0.2126, 0.7152, 0.0722][i], 0)
  // Embarko adds a dismissible badge at the bottom left of hosted pages; keep the Back button clear of it.
  const hostFix = '<style>.controls{padding-left:136px}@media print{.controls{display:none}}</style>\n'
  const tileFix = a.partnerTile ? '<style>.logo-ais,.tn-ic.tile img{background:#fff;object-fit:contain;box-sizing:border-box}.logo-ais{padding:18px}.tn-ic.tile img{padding:6px}</style>\n' : ''
  const darkFix = CLOSING_CSS + hostFix + tileFix + (lum < 0.3 ? '<style>.v3{--lit-fg:#fff}.hero-q mark,.connect:not(.done){color:#fff}.mock .hero-lbl{color:var(--sec-tint)}@media print{.num{color:#fff !important}}</style>\n</head>' : '</head>')
  const marks = await MARKS
  return html.replace('</head>', () => darkFix).replace('<!--__SLIDES__-->', () => slides(brief, a, marks, who))
}

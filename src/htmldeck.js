import { readFile } from 'node:fs/promises'

// The template is viaSocket_x_AiSensy_final.html with its slides taken out: the CSS, presenter
// script and controls are byte-for-byte the final deck; only partner content is generated here.
const TEMPLATE = readFile(new URL('./final-template.html', import.meta.url), 'utf8')
const MARKS = readFile(new URL('./marks.json', import.meta.url), 'utf8').then(JSON.parse)

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const hex = (c) => c.replace('#', '').toUpperCase()
const rgb = (c) => { const n = parseInt(hex(c), 16); return [n >> 16, (n >> 8) & 255, n & 255] }
const mix = (c, to, t) => '#' + rgb(c).map((v) => Math.round(v + (to - v) * t).toString(16).padStart(2, '0')).join('').toUpperCase()

/** Wording that is the same for every partner. Nothing the AI drafts can change it. */
export function fixedWording(name, hasAgents = true) {
  return {
    subtitle: hasAgents
      ? 'viaSocket is the integration layer between your product, your agents and 2,300+ apps.'
      : 'viaSocket is the integration layer between your product and 2,300+ apps.',
    lead: 'Your customers keep asking for more apps.',
    say: `Integrate any of them, inside ${name}.`,
    top: hasAgents ? 'Your product and your agents' : 'Your product'
  }
}

// The final AiSensy deck as data. Every other partner's brief has exactly this shape.
export const AISENSY_FINAL = {
  partner: { name: 'AiSensy', color: '#07CF65', deep: '#0A5C33', tint: '#E3F8EC', domain: 'aisensy.com' },
  productType: 'WhatsApp platform',
  hasAgents: true,
  asks: [
    ['“Book the demo in my Google Calendar”', 'Google Calendar'],
    ['“Create a ticket when a customer complains”', 'Freshdesk'],
    ['“Message buyers when a payment lands”', 'Cashfree'],
    ['“Log every new lead in Airtable”', 'Airtable']
  ],
  haveApps: ['Shopify', 'Razorpay', 'HubSpot', 'Google Sheets'],
  demoApp: 'Google Calendar',
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
    nodes: [['Cashfree payment', 'Cashfree'], ['viaSocket', 'viasocket'], ['AiSensy template', 'partner'], ['Customer confirmation', 'WhatsApp']]
  },
  extras: [],
  notes: [
    'Open with the core idea: viaSocket is the integration layer between AiSensy’s product, its agents and the apps its customers use.',
    'AiSensy’s customers keep asking for more apps: booking in their calendar, tickets in their help desk, messages when a payment lands, leads in their database. Click to show where viaSocket sits: between AiSensy and those apps, so each one is integrated inside AiSensy.',
    'AiSensy’s own Campaign Agent, re-drawn as an illustrative mock. When the agent needs an app the customer hasn’t connected, it asks, and the Connect button runs viaSocket: Google’s consent screen opens, the customer approves, and viaSocket stores and refreshes the token and maps the data. Click to show the reverse direction: a payment or a new order triggers an AiSensy template, which drives WhatsApp volume. Where the Connect moment sits is for AiSensy’s product team to shape.',
    'Keep what AiSensy has: its own integrations stay exactly as they are, and viaSocket adds the apps it does not cover. If someone asks why not a separate automation tool: customers would set that up outside AiSensy, where the product and agents cannot reach it; through viaSocket it is set up inside AiSensy, under its brand, and the agents can use it too. If asked about a missing app: build it once as a custom connector in the Plug Builder, or request the integration from the viaSocket team.',
    'The setup is one prompt pasted into a coding agent. It asks for credentials, builds the connect flow, tools and triggers, and finishes with a real test call. Time a real run yourself before quoting a duration; rolling it out to customers is a short beta after that.'
  ]
}

/** Apps to suggest when the AI draft can't (or when it picked apps the partner already names), most recognisable first. */
export const RESERVE = [
  ['Google Calendar', '“Book the demo in my Google Calendar”'],
  ['Freshdesk', '“Create a ticket when a customer complains”'],
  ['Cashfree', '“Message buyers when a payment lands”'],
  ['Airtable', '“Log every new lead in Airtable”'],
  ['Notion', '“Save every meeting note to Notion”'],
  ['Calendly', '“Offer a Calendly slot to every new lead”'],
  ['Mailchimp', '“Add every new customer to Mailchimp”'],
  ['Xero', '“Create a Xero invoice when a deal closes”'],
  ['Zendesk', '“Open a Zendesk ticket from a conversation”'],
  ['Stripe', '“Send a receipt when a Stripe payment lands”'],
  ['Slack', '“Post every new signup to Slack”'],
  ['HubSpot', '“Add every new lead to HubSpot”']
]

/** A neutral brief for any partner, used only when the AI draft is unavailable. The caller fills `asks` from RESERVE. */
export function genericBrief({ name, color, domain, description = '' }) {
  return {
    partner: { name, color, domain },
    productType: 'product',
    hasAgents: false,
    asks: [],
    haveApps: [],
    demoApp: 'Google Calendar',
    engine: ['One Connect button, on Google’s own consent screen', 'Tokens, mapping and events handled', 'Same connection works as a tool for your AI'],
    mock: {
      product: name, back: 'Untitled', steps: ['Goal', 'Apps', 'Rules', 'Review'], label: `${name.toUpperCase()} · ONLINE`,
      question: 'What should we get done [today]?', typed: 'Book a call with every new signup', next: 'Next · pick the app',
      askBold: 'To book it I need your Google Calendar.', askRest: 'Connect it once and I’ll check free times.',
      button: 'Connect Calendar', consentIdle: 'Opens Google’s own consent screen', consentDone: 'Checking free times…'
    },
    trigger: {
      heading: `It works the other way too: events in customers’ apps start actions in ${name}`,
      nodes: [['Cashfree payment', 'Cashfree'], ['viaSocket', 'viasocket'], [`${name} action`, 'partner'], ['Customer update', 'Gmail']]
    },
    extras: [],
    notes: [
      `Open with the core idea for ${name}: viaSocket is the integration layer between its product and the apps its customers use. ${description}`.trim(),
      'Customers keep asking for more apps. Click to show where viaSocket sits: between the product and those apps.',
      `An illustrative mock of ${name}. When an app isn’t connected yet, the product asks and viaSocket runs the connect flow. Click to show the reverse direction.`,
      'Keep what they have; viaSocket adds the apps they do not cover. If asked about a separate automation tool: it is set up outside the product; through viaSocket it is inside, under their brand. If asked about a missing app: a custom connector in the Plug Builder, or request the integration.',
      'One prompt in a coding agent; a real test call at the end, then a short beta.'
    ]
  }
}

function slides(b, a, M, who) {
  const p = esc(b.partner.name)
  const hasAgents = b.hasAgents !== false
  const fx = fixedWording(b.partner.name, hasAgents)
  const foot = (n) => `  <footer class="foot"><span>viaSocket × ${p}</span><span>${n}</span></footer>`
  const partnerImg = (cls) => (a.partnerLogo ? `<img class="${cls}" src="${a.partnerLogo}" alt="${p}">` : `<span class="${cls}" style="display:grid;place-items:center;background:#fff;font:700 22px Geist;color:var(--ink)">${p}</span>`)
  const vsMark = M.viasocket
  const logo = (n) => a.logos?.[n]
  const letter = (n) => esc(String(n ?? '•')[0])
  // Trigger-strip icon: viaSocket and partner marks, then the app's real logo, then a brand mark, then its first letter.
  const icon = (key) => {
    if (key === 'viasocket') return `<span class="tn-ic vs"><span class="mark">${vsMark}</span></span>`
    if (key === 'partner') return a.partnerLogo ? `<span class="tn-ic tile"><img src="${a.partnerLogo}" alt=""></span>` : `<span class="tn-ic dot">${p[0]}</span>`
    if (logo(key)) return `<span class="tn-ic tile"><img src="${logo(key)}" alt="${esc(key)}"></span>`
    const svg = a.brands?.[key] ?? M[key]
    return `<span class="tn-ic dot">${svg ?? `<b style="font-size:18px;font-weight:600">${letter(key)}</b>`}</span>`
  }
  const conn = (i) => `<span class="tconn"><span class="conn-line"></span>${M.conn.replace('<svg', '<svg class="conn-arrow"')}<span class="packet" style="--p:${i}"></span></span>`
  const nodes = b.trigger.nodes.map(([label, key], i) => (i ? conn(i - 1) : '') + `<span class="tn">${icon(key)}<span>${esc(label)}</span></span>`).join('\n      ')
  const question = esc(b.mock.question).replace(/\[(.+?)\]/, '<mark>$1</mark>')
  // Slide 1 headline: "Give <partner> the power to work with any app.", wrapped to the left panel (about 17 characters a line
  // at 76px); a long name steps the size down until it fits in three lines.
  const wrap = (cap) => {
    const lines = []
    for (const w of `Give ${b.partner.name} the power to work with any app.`.split(' ')) { const cur = lines.at(-1); if (cur !== undefined && `${cur} ${w}`.length <= cap) lines[lines.length - 1] = `${cur} ${w}`; else lines.push(w) }
    return lines
  }
  let heroSize = 76
  let heroLines = wrap(17)
  while ((heroLines.length > 3 || Math.max(...heroLines.map((l) => l.length)) > Math.floor(17 * 76 / heroSize)) && heroSize > 40) { heroSize -= 4; heroLines = wrap(Math.floor(17 * 76 / heroSize)) }
  const heroStyle = heroSize < 76 ? ` style="font-size:${heroSize}px"` : ''
  // Slide 2's line under the title shrinks for long names so it stays on one line.
  const sayStyle = fx.say.length > 40 ? ` style="font-size:${Math.max(20, Math.floor(728 / (fx.say.length * 0.52)))}px"` : ''
  // Slide 2 and 4: the apps customers ask for (one app per wish) and the apps the partner already has.
  const asks = (b.asks ?? []).slice(0, 4)
  const added = [...new Set(asks.map(([, app]) => app))].slice(0, 4)
  const have = (b.haveApps ?? []).slice(0, 4)
  const dot2 = (n) => (logo(n) ? `<span class="s2-ic logo"><img src="${logo(n)}" alt="${esc(n)}"></span>` : `<span class="s2-ic dot"><b>${letter(n)}</b></span>`)
  const dot4 = (n) => (logo(n) ? `<span class="s4-ic"><img src="${logo(n)}" alt="${esc(n)}"></span>` : `<span class="s4-ic"><b>${letter(n)}</b></span>`)
  const partnerTile = a.partnerLogo ? `<img src="${a.partnerLogo}" alt="${p}">` : `<span class="pt">${p[0]}</span>`

  return `
<section class="slide light v3" id="slide-1" data-steps="0" aria-label="Slide 1 of 6: title">
  <div class="lp wide"></div><div class="gp"></div>
  <h1 class="hero-t"${heroStyle}>${heroLines.map((l) => `<span class="ln"><span>${esc(l)}</span></span>`).join('')}</h1>
  <p class="hero-s">${esc(fx.subtitle)}</p>
  <div class="logos">
    ${partnerImg('logo-ais')}
    <svg class="link" viewBox="0 0 120 10" aria-hidden="true"><line x1="2" y1="5" x2="118" y2="5"/></svg>
    <span class="logo-vs">${vsMark}</span>
  </div>
  <p class="hero-f">viaSocket × ${p} · Partnership proposal</p>
</section>

<section class="slide light v3" id="slide-2" data-steps="1" aria-label="Slide 2 of 6">
  <div class="lp"></div>
  <h2 class="t">Integration layer for your <span class="hl">${esc(b.productType)}.</span></h2>
  <p class="s2-lead s2-hide">${esc(fx.lead)}</p>
  <ul class="s2-wishes s2-hide bstep" data-step="0">${asks.map(([q, app], k) => `<li class="rowin" style="--k:${k}">${dot2(app)}<span class="w"><span class="q">${esc(q)}</span><span class="n">${esc(app)}</span></span></li>`).join('')}</ul>
  <p class="s2-say bstep" data-step="1"${sayStyle}>${esc(fx.say)}</p>
  <div class="s2-stack bstep" data-step="1">
    <div class="band top">${partnerTile}<span><b>${p}</b><i>${esc(fx.top)}</i></span></div>
    <div class="vline"></div>
    <div class="band mid"><span class="vm">${vsMark}</span><span><b>viaSocket</b><i>The integration layer</i></span><span class="cal">Connect · Act · Listen</span></div>
    <div class="vline"></div>
    <div class="band bot"><span class="lbl">Your customers’ apps</span><span class="aps">${added.map((n) => `<span class="ap">${dot2(n)}<em>${esc(n)}</em></span>`).join('')}<span class="more">+ 2,300 more</span></span></div>
  </div>
${foot(2)}
</section>

<section class="slide light v3" id="slide-3" data-steps="1" aria-label="Slide 3 of 6">
  <div class="lp"></div>
  <h2 class="t">Your UI. viaSocket’s engine.</h2>
  <div class="eng on-lp">
    <p class="eng-h">Powered by viaSocket</p>
    <p class="eng-s">Under your brand</p>
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

<section class="slide light v3" id="slide-4" data-steps="2" aria-label="Slide 4 of 6">
  <div class="lp"></div>
  <h2 class="t">Keep what you have. Add the rest.</h2>
  <div class="s4-cards">
    <div class="s4-card have bstep" data-step="0"><span class="s4-lbl">${have.length >= 2 ? `Already in ${p}` : 'Your integrations today'}</span>${have.length >= 2 ? `<div class="s4-row">${have.map((n) => `<span class="ap">${dot4(n)}<em>${esc(n)}</em></span>`).join('')}</div>` : '<p class="s4-text">Everything you have built stays exactly as it is.</p>'}</div>
    <div class="s4-plus bstep" data-step="1">+</div>
    <div class="s4-card add bstep" data-step="1"><span class="s4-lbl">Added through viaSocket<span class="more">+ 2,300 more</span></span><div class="s4-row">${added.map((n) => `<span class="ap">${dot4(n)}<em>${esc(n)}</em></span>`).join('')}</div></div>
  </div>
  <div class="s4-cmp bstep" data-step="2">
    <div class="col sep"><b>In a separate tool</b><ul><li>Set up outside ${p}</li><li>Another tool for customers to learn</li><li>${hasAgents ? 'Out of reach for your agents' : 'Out of reach for your product'}</li></ul></div>
    <div class="col in"><b>Through viaSocket</b><ul><li>Set up inside ${p}</li><li>Under your brand</li><li>${hasAgents ? 'Your agents use it too' : 'Part of your product'}</li></ul></div>
  </div>
${foot(4)}
</section>

<section class="slide light v3" id="slide-5" data-steps="0" aria-label="Slide 5 of 6">
  <div class="lp"></div>
  <h2 class="t">Live from one prompt</h2>
  <p class="beta">Then a short beta with real customers.</p>
  <ol class="vsteps"><span class="vrail"><span class="vrail-fill"></span></span><li class="vstep" style="--k:0"><span class="num">1</span><div><h3>Paste the prompt</h3><p>Into Cursor, Claude Code or Codex.</p></div></li><li class="vstep" style="--k:1"><span class="num">2</span><div><h3>Add credentials</h3><p>Org ID, project ID and secret, kept in <code>.env</code>.</p></div></li><li class="vstep" style="--k:2"><span class="num">3</span><div><h3>It builds</h3><p>Connect flow, agent tools and triggers.</p></div></li><li class="vstep" style="--k:3"><span class="num">4</span><div><h3>Real test call</h3><p>Against a connected app.</p></div></li></ol>
${foot(5)}
</section>

<section class="slide light v3 end1" id="slide-6" data-steps="0" aria-label="Slide 6 of 6: thank you">
  <div class="logos e1-logos">
    ${partnerImg('logo-ais')}
    <svg class="link" viewBox="0 0 120 10" aria-hidden="true"><line x1="2" y1="5" x2="118" y2="5"/></svg>
    <span class="logo-vs">${vsMark}</span>
  </div>
  <h1 class="hero-t"><span class="ln"><span>Thank you.</span></span></h1>
  <div class="hero-s e1-note"><p class="n1">viaSocket is the integration layer for products and AI agents.</p><p class="n2">You build the product. viaSocket handles the connections and actions.</p></div>
  <div class="hero-f e1-sig">
${who.name ? `    <b>${esc(who.name)}</b>\n` : ''}    <span>${who.cal ? `<a href="${esc(who.cal.url)}" target="_blank" rel="noopener">${esc(who.cal.label)}</a><i>·</i>` : ''}<a href="https://viasocket.com" target="_blank" rel="noopener">viasocket.com</a></span>
  </div>
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

/** The cal.id link: a full URL, `cal.id/name`, or just the username. */
export function calLink(input) {
  const v = String(input ?? '').trim()
  if (!v) return null
  const user = v.replace(/^https?:\/\//i, '').replace(/^(www\.)?cal\.id\//i, '').replace(/^@/, '').replace(/[?#].*$/, '').replace(/\/+$/, '')
  if (!/^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/.test(user)) return null
  return { url: `https://cal.id/${user}`, label: `cal.id/${user}` }
}

const DECK_CSS = `<style>
/* slide 2 */
.v3 .t .hl{color:var(--sec)}
.v3 .s2-lead{position:absolute;left:496px;top:78px;width:700px;font-size:28px;font-weight:600;letter-spacing:-.02em;color:var(--text)}
.v3 .s2-wishes{position:absolute;left:496px;top:140px;width:728px}
.v3 .s2-wishes li{display:flex;align-items:center;gap:20px;padding:11px 0;border-top:1px solid var(--line)}
.v3 .s2-wishes li:last-child{border-bottom:1px solid var(--line)}
.v3 .s2-wishes .q{display:block;font-size:27px;font-weight:600;letter-spacing:-.02em}
.v3 .s2-wishes .n{display:block;margin-top:2px;font-size:14px;color:var(--muted)}
.v3 .s2-ic{width:44px;height:44px;border-radius:50%;background:var(--ink);color:#fff;display:grid;place-items:center;flex:none}
.v3 .s2-ic svg{width:21px;height:21px}.v3 .s2-ic b{font-size:19px;font-weight:600}
.v3 .s2-ic.logo{background:#fff;box-shadow:0 0 0 1px var(--line)}
.v3 .s2-ic.logo img{width:30px;height:30px;object-fit:contain;border-radius:6px}
.slide[data-now="1"] .s2-hide{opacity:0 !important;pointer-events:none}
.v3 .s2-say{position:absolute;left:496px;top:96px;width:728px;font-size:32px;font-weight:700;letter-spacing:-.025em;color:var(--text)}
.v3 .s2-stack{position:absolute;left:496px;top:176px;width:728px}
.v3 .s2-stack .band{display:flex;align-items:center;gap:18px;padding:0 26px;height:100px;border-radius:18px}
.v3 .s2-stack .band b{display:block;font-size:24px;font-weight:700;letter-spacing:-.02em}
.v3 .s2-stack .band i{display:block;margin-top:3px;font-style:normal;font-size:16px}
.v3 .s2-stack .top{background:#fff;border:1.5px solid var(--sec);color:var(--text)}
.v3 .s2-stack .top img,.v3 .s2-stack .top .pt{width:58px;height:58px;border-radius:14px;box-shadow:0 0 0 1px var(--line);background:#fff;object-fit:contain}
.v3 .s2-stack .top .pt{display:grid;place-items:center;font-size:26px;font-weight:700}
.v3 .s2-stack .top i{color:var(--muted)}
.v3 .s2-stack .mid{background:var(--ink);color:#fff;box-shadow:0 14px 34px -18px rgba(0,0,0,.55)}
.v3 .s2-stack .mid i{color:var(--on-dark-3)}
.v3 .s2-stack .vm{width:46px;height:46px;border-radius:12px;background:#18181B;border:1px solid #2C2C30;padding:7px;display:block}
.v3 .s2-stack .vm svg{width:100%;height:100%;display:block}
.v3 .s2-stack .cal{margin-left:auto;font-size:15px;font-weight:600;letter-spacing:.04em;color:var(--sec)}
.v3 .s2-stack .bot{background:var(--stone);border:1px solid var(--line);justify-content:space-between}
.v3 .s2-stack .lbl{font-size:15px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);width:120px;line-height:1.3}
.v3 .s2-stack .aps{display:flex;align-items:center;gap:22px}
.v3 .s2-stack .ap{display:flex;flex-direction:column;align-items:center;gap:6px}
.v3 .s2-stack .ap em{font-style:normal;font-size:12px;color:var(--text-2);white-space:nowrap}
.v3 .s2-stack .ap .s2-ic{width:52px;height:52px}
.v3 .s2-stack .ap .s2-ic.logo img{width:34px;height:34px}
.v3 .s2-stack .more{font-size:14px;font-weight:600;color:var(--sec-deep);background:var(--sec-tint);border-radius:99px;padding:8px 14px;white-space:nowrap}
.v3 .s2-stack .vline{width:2px;height:34px;margin:0 auto;background:repeating-linear-gradient(to bottom,var(--sec) 0 6px,transparent 6px 11px)}
/* slide 4 */
.v3 .s4-cards{position:absolute;left:496px;top:78px;width:728px}
.v3 .s4-card{border-radius:20px;padding:18px 26px 20px}
.v3 .s4-card.have{background:#fff;border:1.5px solid var(--line)}
.v3 .s4-card.add{background:var(--sec-tint);border:1.5px solid var(--sec)}
.v3 .s4-lbl{display:flex;align-items:center;justify-content:space-between;font-size:17px;font-weight:600;letter-spacing:-.005em;color:var(--muted);margin-bottom:12px}
.v3 .s4-card.add .s4-lbl{color:var(--sec-deep)}
.v3 .s4-lbl .more{font-size:14px;font-weight:600;color:var(--sec-deep);background:#fff;border-radius:99px;padding:5px 12px}
.v3 .s4-row{display:flex;align-items:flex-start;gap:30px}
.v3 .s4-row .ap{display:flex;flex-direction:column;align-items:center;gap:6px;width:96px}
.v3 .s4-row .ap em{font-style:normal;font-size:13px;color:var(--text-2);text-align:center;line-height:1.25}
.v3 .s4-ic{width:54px;height:54px;border-radius:50%;background:#fff;box-shadow:0 0 0 1px var(--line);display:grid;place-items:center}
.v3 .s4-ic img{width:34px;height:34px;object-fit:contain;border-radius:8px}
.v3 .s4-ic b{font-size:20px;font-weight:600;color:var(--ink)}
.v3 .s4-text{font-size:20px;line-height:1.4;color:var(--text-2);padding-bottom:6px}
.v3 .s4-plus{width:32px;height:32px;margin:8px auto;border-radius:50%;background:var(--ink);color:#fff;display:grid;place-items:center;font-size:22px;font-weight:300;line-height:1}
.v3 .s4-cmp{position:absolute;left:496px;top:462px;width:728px;display:grid;grid-template-columns:1fr 1fr;gap:20px}
.v3 .s4-cmp .col{border-radius:16px;padding:16px 22px 14px}
.v3 .s4-cmp .col b{display:block;font-size:17px;font-weight:700;margin-bottom:8px}
.v3 .s4-cmp ul{list-style:none;display:grid;gap:5px}
.v3 .s4-cmp li{font-size:16px;line-height:1.3;padding-left:24px;position:relative}
.v3 .s4-cmp .sep{background:var(--stone);color:var(--muted);border:1px solid var(--line)}
.v3 .s4-cmp .sep li::before{content:"–";position:absolute;left:4px;color:var(--muted)}
.v3 .s4-cmp .in{background:#fff;border:1.5px solid var(--sec);color:var(--text)}
.v3 .s4-cmp .in b{color:var(--sec-deep)}
.v3 .s4-cmp .in li::before{content:"✓";position:absolute;left:3px;color:var(--sec-deep);font-weight:700}
/* slide 6: formal closing */
.v3.end1{background:var(--paper)}
.v3.end1 .e1-logos{left:0;right:0;top:100px;bottom:auto;height:76px;justify-content:center;gap:22px}
.v3.end1 .e1-logos .logo-ais{width:76px;height:76px;box-shadow:0 0 0 1px var(--line),0 10px 28px -14px rgba(0,0,0,.35)}
.v3.end1 .e1-logos .logo-vs{width:76px;height:76px}
.v3.end1 .e1-logos .link{width:52px}
.v3.end1 .hero-t{left:0;right:0;width:100%;text-align:center;top:224px;font-size:104px;line-height:1;letter-spacing:-.045em;color:var(--text)}
.v3.end1 .e1-note{left:0;right:0;width:100%;text-align:center;top:358px;color:var(--text)}
.v3.end1 .e1-note .n1{font-size:30px;line-height:1.25;letter-spacing:-.02em;font-weight:600;color:var(--text);margin:0 auto;max-width:860px}
.v3.end1 .e1-note .n2{font-size:23px;line-height:1.4;color:var(--text-2);margin:12px auto 0;max-width:860px}
.v3.end1 .e1-sig{left:0;right:0;width:100%;bottom:104px;text-align:center;color:var(--text)}
.v3.end1 .e1-sig:before{content:"";display:block;width:56px;height:4px;border-radius:2px;background:var(--sec);margin:0 auto 26px}
.v3.end1 .e1-sig b{display:block;font-size:30px;font-weight:600;letter-spacing:-.02em;margin-bottom:10px}
.v3.end1 .e1-sig span{display:block;font-size:22px;color:var(--text-2)}
.v3.end1 .e1-sig a{color:inherit;text-decoration:none}
.v3.end1 .e1-sig i{font-style:normal;margin:0 16px;color:var(--muted)}
</style>
`

export async function renderHtmlDeck(brief, assets = {}, presenter = {}) {
  const c = brief.partner.color
  const sec = { color: c, deep: brief.partner.deep ?? mix(c, 0, 0.55), tint: brief.partner.tint ?? mix(c, 255, 0.88) }
  const a = { partnerLogo: null, brands: {}, logos: {}, ...assets }
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
  // Partner colour used as text: on the black panels a dark colour disappears (use white), on white a light one does (use the deep shade).
  const textFix = `<style>${lum < 0.3 ? '.v3 .t .hl{color:#fff}' : ''}${lum > 0.45 ? '.v3 .s2-stack .cal{color:var(--sec-deep)}' : ''}</style>\n`
  const darkFix = DECK_CSS + hostFix + tileFix + textFix + (lum < 0.3 ? '<style>.v3{--lit-fg:#fff}.hero-q mark,.connect:not(.done){color:#fff}.mock .hero-lbl{color:var(--sec-tint)}@media print{.num{color:#fff !important}}</style>\n</head>' : '</head>')
  const marks = await MARKS
  return html.replace('</head>', () => darkFix).replace('<!--__SLIDES__-->', () => slides(brief, a, marks, who))
}

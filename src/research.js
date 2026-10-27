import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import * as icons from './icons.js'
import { viasocket } from './viasocket.js'
import { AISENSY_FINAL, RESERVE, genericBrief, calLink, cleanExtras, EXTRA_CAPABILITIES } from './htmldeck.js'
import { lookup, listed, namesIn } from './catalog.js'
import { fetchLogos } from './logos.js'

const UA = { 'user-agent': 'Mozilla/5.0 (compatible; PartnershipDeckManager/1.0)' }
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '')
const dataUri = (d) => (d ? (d.startsWith('data:') ? d : `data:${d}`) : null)

async function page(url) {
  const res = await fetch(url, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`${res.status}`)
  if (!/html/i.test(res.headers.get('content-type') ?? 'html')) throw new Error('not html')
  return { url: res.url, html: await res.text() }
}

/**
 * The partner's site. Given: use it. Otherwise try name.com/.ai/.io/.in/.co; when several answer,
 * pick the one that matches viaSocket's catalog description of the app, and ask when none clearly does.
 */
async function open(domain) {
  const bare = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '')
  for (const u of [`https://${bare}`, `https://www.${bare}`, `http://${bare}`]) {
    try { const hit = await page(u); return { domain: new URL(hit.url).host, ...hit } } catch { /* next variant */ }
  }
  return null
}

async function findSite(name, domain, { strict = true } = {}) {
  const clean = (d) => d.replace(/^https?:\/\//, '').replace(/\/+$/, '')
  if (domain) {
    const hit = await open(clean(domain))
    if (hit || strict) return hit
  }
  const tries = ['com', 'ai', 'io', 'in', 'co'].map((tld) => `${slug(name)}.${tld}`)
  const hits = (await Promise.all(tries.map(async (d) => { try { const hit = await page(`https://${d}`); return { domain: new URL(hit.url).host, ...hit } } catch { return null } }))).filter(Boolean)
  const sites = [...new Map(hits.map((h) => [h.domain.replace(/^www\./, ''), h])).values()]
  if (sites.length <= 1) return sites[0] ?? null
  let about = ''
  try { about = (await viasocket().catalog.search(name)).find((a) => slug(a.name) === slug(name))?.description ?? '' } catch { /* catalog unreachable */ }
  const words = new Set(about.toLowerCase().match(/[a-z]{5,}/g) ?? [])
  const ranked = sites.map((site) => {
    const info = readSite(site.html)
    const text = `${info.title ?? ''} ${info.description ?? ''} ${info.text.slice(0, 3000)}`.toLowerCase()
    return { site, score: [...words].filter((w) => text.includes(w)).length }
  }).sort((a, b) => b.score - a.score)
  if (ranked[0].score >= 2 && ranked[0].score >= ranked[1].score * 2) return ranked[0].site
  return { ambiguous: sites.map((x) => x.domain) }
}

const meta = (html, re) => re.exec(html)?.[1]?.trim()
function readSite(html) {
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>|<svg[\s\S]*?<\/svg>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim()
  return {
    title: meta(html, /<title[^>]*>([^<]+)/i),
    description: meta(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i) ?? meta(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i),
    themeColor: meta(html, /<meta[^>]+name=["']theme-color["'][^>]+content=["'](#[0-9a-f]{6})/i),
    text
  }
}

// Which pages of a site say what the product does and what it connects to.
const SKIP = /\.(png|jpe?g|gif|svg|webp|ico|pdf|zip|mp4|css|js|xml|json)(\?|$)|\/(login|log-in|signin|sign-in|signup|sign-up|register|careers|jobs|legal|privacy|terms|cookies?|gdpr|status|tag|category|author|press)(\/|$)|\/blog\/.+/i
const WANT = [[/integrat|connect|apps|marketplace|ecosystem/i, 6], [/product|platform|feature/i, 5], [/solution|use-?case|industr/i, 5], [/agent|\bai\b|automation|workflow|how-it-works/i, 4], [/customer|case-stud|stories|success/i, 3], [/pricing|plans/i, 2], [/about|company/i, 1], [/docs|help|faq/i, 1]]
const score = (url) => WANT.reduce((t, [re, w]) => t + (re.test(new URL(url).pathname) ? w : 0), 0)

function linksOf(html, base) {
  const host = new URL(base).host
  const out = new Set()
  for (const m of html.matchAll(/<a\s[^>]*href=["']([^"'#]+)/gi)) {
    try {
      const u = new URL(m[1], base)
      if (u.host === host && /^https?:$/.test(u.protocol) && !SKIP.test(u.pathname)) out.add(u.origin + u.pathname.replace(/\/+$/, ''))
    } catch { /* not a url */ }
  }
  return [...out]
}

async function sitemapUrls(origin) {
  try {
    let xml = await (await fetch(`${origin}/sitemap.xml`, { headers: UA, signal: AbortSignal.timeout(8000) })).text()
    const child = /<sitemap>\s*<loc>([^<]+)/i.exec(xml)?.[1]
    if (child) xml = await (await fetch(child, { headers: UA, signal: AbortSignal.timeout(8000) })).text()
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1].trim().replace(/\/+$/, '')).filter((u) => !SKIP.test(new URL(u).pathname)).slice(0, 300)
  } catch { return [] }
}

/** Crawl the homepage plus the most relevant pages (product, integrations, use cases…), up to 8. */
export async function crawl(site) {
  const home = { url: site.url, ...readSite(site.html) }
  const origin = new URL(site.url).origin
  const candidates = [...new Set([...linksOf(site.html, site.url), ...(await sitemapUrls(origin))])]
    .filter((u) => u !== site.url.replace(/\/+$/, '') && u !== origin)
    .map((u) => { const segs = new URL(u).pathname.split('/').filter(Boolean); return { u, top: segs[0] ?? '', s: score(u) - (segs.length - 1) * 3 } })
    .filter((c) => score(c.u) > 0).sort((a, b) => b.s - a.s)
  // At most two pages per section, so ten integration subpages can't crowd out product, use-case and pricing pages.
  const perTop = {}
  const picked = candidates.filter((c) => (perTop[c.top] = (perTop[c.top] ?? 0) + 1) <= 2).slice(0, 8)
  const pages = [home]
  await Promise.all(picked.map(async ({ u }) => {
    try { const p = await page(u); pages.push({ url: p.url, ...readSite(p.html) }) } catch { /* skip */ }
  }))
  return pages
}

// Apps a partner's site names: tells the AI what they already integrate with.
const KNOWN_APPS = ['WhatsApp', 'Instagram', 'Facebook', 'Messenger', 'Telegram', 'Shopify', 'WooCommerce', 'Magento', 'BigCommerce', 'Razorpay', 'Stripe', 'PayU', 'PayPal', 'Cashfree', 'HubSpot', 'Salesforce', 'Zoho', 'Pipedrive', 'LeadSquared', 'Freshdesk', 'Freshworks', 'Zendesk', 'Intercom', 'Google Sheets', 'Google Calendar', 'Google Drive', 'Gmail', 'Outlook', 'Microsoft Teams', 'Slack', 'Notion', 'Airtable', 'Calendly', 'Twilio', 'Mailchimp', 'Klaviyo', 'Jira', 'Asana', 'Trello', 'ClickUp', 'monday.com', 'Supabase', 'Postgres', 'Firebase', 'OpenAI', 'Zapier', 'Pabbly', 'n8n']
export const mentions = (text) => KNOWN_APPS.filter((a) => new RegExp(`\\b${a.replace(/ /g, '\\s+')}\\b`, 'i').test(text))

/** The brand colour: given, the site's theme-color, else the logo's dominant non-grey colour. */
export async function brandColor(given, themeColor, logo) {
  const ok = (c) => {
    if (!c) return false
    const n = parseInt(c.slice(1), 16); const r = n >> 16, g = (n >> 8) & 255, b = n & 255
    return Math.max(r, g, b) - Math.min(r, g, b) > 40 // skip white, black and greys
  }
  if (given) return { color: given, source: 'given' }
  if (ok(themeColor)) return { color: themeColor.toUpperCase(), source: 'site theme-color' }
  if (logo) {
    // The most common saturated colour among the logo's visible pixels (white, black, greys and transparency ignored).
    const { data, info } = await sharp(Buffer.from(logo.split(',')[1], 'base64')).resize(64, 64, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const buckets = new Map()
    for (let i = 0; i < data.length; i += info.channels) {
      const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]]
      if (a < 200 || Math.max(r, g, b) - Math.min(r, g, b) < 50 || Math.max(r, g, b) < 40) continue
      const k = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
      const e = buckets.get(k) ?? { n: 0, r: 0, g: 0, b: 0 }
      e.n++; e.r += r; e.g += g; e.b += b; buckets.set(k, e)
    }
    const top = [...buckets.values()].sort((x, y) => y.n - x.n)[0]
    if (top && top.n >= 8) {
      const c = '#' + [top.r, top.g, top.b].map((v) => Math.round(v / top.n).toString(16).padStart(2, '0')).join('').toUpperCase()
      if (ok(c)) return { color: c, source: 'logo' }
    }
  }
  return null
}

// White single-colour brand marks from the open Simple Icons set, inlined like the final deck's.
const brandCache = new Map()
async function brandSvg(name) {
  if (brandCache.has(name)) return brandCache.get(name)
  let svg = null
  try {
    const res = await fetch(`https://cdn.simpleicons.org/${slug(name)}`, { headers: UA, signal: AbortSignal.timeout(8000) })
    const text = res.ok ? await res.text() : ''
    const path = /<path[^>]*\sd="([^"]+)"/.exec(text)?.[1]
    if (path) svg = `<svg fill="currentColor" aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="${path}"/></svg>`
  } catch { /* the deck shows the app's initial instead */ }
  brandCache.set(name, svg)
  return svg
}

const BRIEF_PROMPT = `You write the content of slides 1-5 of a pitch deck for viaSocket's embed partnership: the partner embeds viaSocket so their own customers connect apps inside the partner's product, and the partner's product and AI agents can use those apps as tools. (Slide 6 and all fixed wording are written by the app.)
Return ONLY a JSON object with exactly the keys and nesting of the example, rewritten for the partner from what their site says they do. Leave out "haveApps": the app fills it in.

About viaSocket (from viasocket.com). viaSocket is an integration layer for products and AI agents: "You build the app or agent. viaSocket handles the connections and actions." You may rely on these facts and no others: 2,300+ app integrations; managed authentication (the app's own consent screen, tokens encrypted and refreshed); managed data mapping; triggers and webhooks (events from connected apps, polling and retries handled); multi-tenant (separate connected accounts per customer); custom branding (the partner's logo, colours and domain); AI agents with 50+ AI models, memory, connected apps as tools and multi-step workflows; in-app AI chatbots; browser actions (an agent can browse and act on sites with no API); real-time, background and scheduled execution with retries; execution monitoring, debugging and replay; regional deployment; MCP support; custom integrations and API requests; a missing app can be built once as a custom connector in the Plug Builder, or requested from the viaSocket team. Never state prices, plan limits, "unlimited" anything, timings (such as "15 minutes"), customer counts, or that viaSocket itself builds an integration on request.

Rules:
- productType completes "Integration layer for your ___." It is a short lower-case phrase for what the partner's product is, in the site's own words (for example "WhatsApp platform", "CRM", "support desk", "recruiting platform"). hasAgents is true only if the site shows AI agents, assistants or chatbots in the product.
- asks is three or four things the partner's own customers want, each [wish, App]: the wish is one line in the customer's voice starting with a verb ("Book the demo in my Google Calendar", "Log every new lead in Airtable"), drawn from what the partner's site shows; App is ONE real app. Use only apps viaSocket lists, and NEVER any app in the "Already named on their site" list you are given: the goal is to suggest apps the partner does not integrate yet. Never repeat an app.
- demoApp is the one app the demo on slide 3 connects, and mock, engine and trigger.nodes must match it. The first trigger node is "<App> <event>" for an app that is not in the already-named list, and its key is that app's name. trigger.nodes is four [label, key] pairs: key is an app name, "viasocket" or "partner"; the second is always ["viaSocket","viasocket"], the third ["<partner> <thing>","partner"].
- mock.product must be a screen or feature name that appears on the partner's own site; if none does, use "Workspace". mock.question marks one word in [brackets]; mock.typed is what a customer types there. engine is three short lines; the first names the demo app's own consent screen.
- Never name competing automation tools. Every fact appears once. Keep lines as short as the example.
- extras is [] unless the partner's own site shows a real need for one of these other viaSocket capabilities: ${EXTRA_CAPABILITIES.join(', ')}. Meanings: "Browser actions" = an agent can browse and act on websites that have no API; "50+ AI models" = AI agents on viaSocket can choose from 50+ AI models; "Memory" = agents keep memory; "Scheduled execution" = actions run at set intervals without a user triggering them. At most two, as { "label": <exactly one of those names>, "text": <one short line, under 90 characters> }. Each must rest on something the partner's site actually says; otherwise leave extras empty. They appear only in the speaker notes.
- notes is five speaker-note strings, one per slide 1-5. Leave partner exactly as given.`

// Apps that are automation tools or the partner's own channels: not integrations worth showing as "already in" the product.
const NOT_APPS = new Set(['zapier', 'pabbly', 'pabbly connect', 'make', 'integromat', 'n8n', 'ifttt', 'workato', 'activepieces', 'viasocket', 'microsoft power automate', 'power automate', 'whatsapp', 'whatsapp business', 'instagram', 'facebook', 'messenger', 'telegram'])
const slugOf = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '')
const isNamed = (app, named) => { const k = slugOf(app); return [...named].some((n) => slugOf(n) === k || (k.length >= 5 && (slugOf(n).startsWith(k) || k.startsWith(slugOf(n))) && slugOf(n).length >= 5)) }

/**
 * Make the apps in the brief honest: every suggested app is one viaSocket lists and the partner's site does not
 * already name. Anything dropped is topped up from RESERVE. Returns notes for the "check before sending" list.
 */
async function finalizeApps(brief, named) {
  const notes = []
  const wanted = (brief.asks ?? []).map((a) => String(a?.[1] ?? '').split('·').pop().trim())
  const have = wanted.length ? await listed(wanted) : new Set()
  const seen = new Set()
  const keep = []
  for (const ask of brief.asks ?? []) {
    const app = String(ask?.[1] ?? '').split('·').pop().trim()
    const k = slugOf(app)
    if (!app || seen.has(k)) continue
    if (have && !have.has(app)) { notes.push(`Left out ${app}: viaSocket doesn’t list it.`); continue }
    if (isNamed(app, named)) { notes.push(`Left out ${app}: the partner’s site already names it.`); continue }
    seen.add(k); keep.push([ask[0], app])
  }
  // Top up from the reserve (already verified in viaSocket's table) with apps the partner does not name.
  for (const [app, wish] of RESERVE) {
    if (keep.length >= 4) break
    if (seen.has(slugOf(app)) || isNamed(app, named)) continue
    seen.add(slugOf(app)); keep.push([wish, app])
  }
  brief.asks = keep.slice(0, 4)
  // Trigger strip: its app must not be one the partner names.
  const t0 = brief.trigger?.nodes?.[0]
  if (t0 && (isNamed(t0[1], named) || (have && t0[1] && !(await listed([t0[1]]))?.has(t0[1])))) {
    const swap = brief.asks.find(([, app]) => app !== brief.demoApp)?.[1] ?? brief.asks[0]?.[1]
    notes.push(`The trigger strip started from ${t0[1]}, which the partner’s site names or viaSocket doesn’t list; it now starts from ${swap}.`)
    brief.trigger.nodes[0] = [`${swap} event`, swap]
  }
  if (brief.demoApp && isNamed(brief.demoApp, named)) notes.push(`The slide 3 demo connects ${brief.demoApp}, which the partner’s site already names; consider another app.`)
  return notes
}

/** The product's AI drafts the brief from the partner's site, per run. */
async function draftBrief(uid, partner, pages, apps, context, named) {
  const { haveApps, ...example } = { ...AISENSY_FINAL, partner }
  let budget = 14000
  const site = pages.map((p) => {
    const body = p.text.slice(0, Math.max(0, Math.min(3000, budget)))
    budget -= body.length
    return `## ${p.url}\n${p.title ?? ''}\n${p.description ?? ''}\n${body}`
  }).join('\n\n')
  const reply = await viasocket().user(uid).ai.send({
    threadId: `deck-${slug(partner.name)}-${Date.now()}`,
    message: `Partner: ${partner.name} (${partner.domain})\nWhat the user said about them: ${context || '(nothing)'}\nAlready named on their site (never suggest these): ${[...named].join(', ') || '(none found)'}\n\nTheir website, page by page:\n${site}\n\nExample JSON (AiSensy) to rewrite:\n${JSON.stringify(example)}`,
    prompt: BRIEF_PROMPT,
    responseType: 'json_object'
  })
  const b = reply.content
  const ok = b && typeof b === 'object' && typeof b.productType === 'string' && b.productType.length < 40 && Array.isArray(b.asks) && b.asks.length >= 2 && b.mock?.typed && b.trigger?.nodes?.length === 4 && Array.isArray(b.notes) && b.notes.length === 5
  if (!ok) throw new Error('AI draft incomplete')
  b.hasAgents = b.hasAgents === true
  b.productType = b.productType.trim().replace(/[.]+$/, '')
  return { ...b, partner, extras: cleanExtras(b.extras) }
}

/**
 * Everything a deck needs for one partner. Returns { missing: [...] } listing what to ask the user
 * for (logo, brand colour) instead of guessing; otherwise { brief, assets, sources }.
 */
export async function research({ name, domain, color, context, presenterName, cal, requirePresenter = true, uid = 'anonymous' }) {
  const isAisensy = slug(name) === 'aisensy'
  // Website: the one given, else the one in viaSocket's own app table, else a guess from the name.
  let domainFrom = domain ? 'given' : null
  let catalogApp = null
  if (!domain && !isAisensy) {
    const hit = await lookup(name)
    catalogApp = hit?.app ?? null
    if (hit?.matches.length) {
      return { missing: [{ field: 'domain', name, hint: `viaSocket lists more than one app called ${name}: ${hit.matches.map((m) => m.domain).join(', ')}. Which website is the right one?`, options: hit.matches.map((m) => m.domain) }], found: {} }
    }
    if (hit?.domain) { domain = hit.domain; domainFrom = 'viaSocket catalog' }
  }
  // A website from viaSocket's table that won't open falls back to guessing from the name; a website the user typed does not.
  let found = await findSite(name, domain ?? (isAisensy ? 'aisensy.com' : undefined), { strict: domainFrom !== 'viaSocket catalog' })
  const catalogDomain = domainFrom === 'viaSocket catalog' ? domain : null
  if (found && !found.ambiguous && catalogDomain && found.domain.replace(/^www\./, '') !== catalogDomain) domainFrom = `viaSocket lists ${catalogDomain}; the site that opened is ${found.domain}`
  if (found && !domainFrom) domainFrom = 'guessed from the name'
  if (found?.ambiguous) {
    return { missing: [{ field: 'domain', name, hint: `More than one company uses the name ${name}: ${found.ambiguous.join(', ')}. Which website is the right one?`, options: found.ambiguous }], found: {} }
  }
  const site = found
  const host = site?.domain ?? domain
  // AiSensy's content is fixed by the final deck, so its site is not crawled.
  const pages = site && !isAisensy ? await crawl(site) : site ? [{ url: site.url, ...readSite(site.html) }] : []
  const info = pages[0] ?? {}
  const allText = pages.map((p) => `${p.title ?? ''} ${p.description ?? ''} ${p.text}`).join(' ')
  const apps = mentions(allText)
  // Every app viaSocket lists whose name the partner's own pages contain: these are never suggested.
  const namedAll = (await namesIn(allText)) ?? apps
  // The partner itself can be in the catalog (even as "Powabase.ai"): never treat its own name as an app it integrates.
  const isSelf = (n) => { const a = slugOf(n), b = slugOf(name); return a === b || a.startsWith(b) || (a.length >= 4 && b.startsWith(a)) }
  const named = new Set(namedAll.filter((n) => !NOT_APPS.has(n.toLowerCase()) && !isSelf(n)))
  // "Already in": only recognisable apps spelled the catalog's way in the partner's text, so everyday words don't pass.
  const exactNamed = ((await namesIn(allText, { exact: true, top: 600 })) ?? []).filter((n) => !NOT_APPS.has(n.toLowerCase()) && !isSelf(n) && !/[.]/.test(n))

  // Logo: the bundled preset logo, then crawl the site, then viaSocket's catalog icon for the app.
  let logo = isAisensy ? { data: `image/png;base64,${readFileSync(new URL('./presets/aisensy.png', import.meta.url)).toString('base64')}`, source: 'AiSensy final deck' } : null
  logo ??= await icons.resolve(name, { domain: host, kind: 'logo' })
  if (!logo) {
    try {
      const iconUrl = catalogApp?.iconUrl || (await viasocket().catalog.search(name)).find((a) => slug(a.name) === slug(name))?.iconUrl
      if (iconUrl) { await icons.supplyFromUrl(name, iconUrl); logo = await icons.resolve(name) }
    } catch { /* catalog unreachable */ }
  }
  const brand = await brandColor(color ?? (isAisensy ? AISENSY_FINAL.partner.color : undefined), info.themeColor, logo?.data && dataUri(logo.data))

  const missing = []
  if (!logo) missing.push({ field: 'logo', name, hint: `a logo URL for ${name}` })
  if (!brand) missing.push({ field: 'color', name, hint: `${name}'s brand colour as hex` })
  if (requirePresenter && !String(presenterName ?? '').trim()) missing.push({ field: 'presenter', name, hint: 'Who is presenting this deck? (their name, shown on the last slide)' })
  if (requirePresenter && !calLink(cal)) missing.push({ field: 'cal', name, hint: 'The presenter’s cal.id link or username (e.g. cal.id/yourname or just yourname)' })
  if (!isAisensy && !context && allText.length < 600) {
    missing.push({ field: 'context', name, hint: site ? `${name}'s website has almost no readable text (it is probably built with JavaScript). In a sentence or two: what does ${name} do, and who uses it?` : `I couldn't open ${name}'s website. In a sentence or two: what does ${name} do, and who uses it? (Or give its website.)` })
  }
  if (missing.length) return { missing, found: { domain: host, description: info.description } }

  const partner = { name, color: brand.color, domain: host }
  let brief, briefSource
  if (isAisensy) {
    brief = { ...AISENSY_FINAL, partner: { ...AISENSY_FINAL.partner, domain: host } }
    briefSource = 'AiSensy final preset'
  } else {
    try { brief = await draftBrief(uid, partner, pages, apps, context, named); briefSource = 'viaSocket AI from the partner site' } catch (e) {
      brief = genericBrief({ ...partner, description: info.description }); briefSource = `generic template (AI draft failed: ${e.message})`
    }
    brief.appNotes = await finalizeApps(brief, named)
    // "Already in <partner>": the most-used apps the partner's site names (not automation tools or its own channels).
    brief.haveApps = exactNamed.slice(0, 4)
  }

  const brands = {}
  for (const [, key] of brief.trigger.nodes) {
    if (!key || key === 'partner' || key === 'viasocket' || key === 'Razorpay' || key === 'WhatsApp') continue
    const svg = await brandSvg(key)
    if (svg) brands[key] = svg
  }
  // Real logos from viaSocket's app table for every app on slides 2 to 4.
  const logoApps = [...(brief.asks ?? []).map(([, app]) => app), ...(brief.haveApps ?? []), ...brief.trigger.nodes.map(([, key]) => key).filter((k) => k && k !== 'partner' && k !== 'viasocket' && k !== 'WhatsApp')]
  const logos = await fetchLogos(logoApps)

  // What a person should confirm before sending: things the AI inferred about the partner.
  const check = isAisensy ? [] : [
    `Slide 2: “Integration layer for your ${brief.productType}” and the customer wishes are inferred from ${name}’s site; confirm they fit.`,
    `Slide 3: the mock shows a screen called “${brief.mock?.product}”; confirm it exists in ${name}’s product, or rename it.`,
    ...((brief.haveApps ?? []).length >= 2 ? [`Slide 4: “Already in ${name}” lists apps ${name}’s site names (${brief.haveApps.join(', ')}); a mention is not proof of an integration, so confirm.`] : [`Slide 4: ${name}’s site names too few apps, so it shows a general line instead of logos.`]),
    ...(brief.appNotes ?? []),
    ...((brief.extras ?? []).map((e) => `Speaker notes mention “${e.label}” because the AI read a need for it on ${name}’s site; confirm.`)),
    ...(briefSource.startsWith('generic') ? [`The AI draft failed, so slides 2 to 4 use generic examples, not ${name}’s use case.`] : [])
  ]

  return {
    brief,
    // A transparent logo (a bare mark) sits on a white tile, like the AiSensy logo's own tile.
    assets: { logos, partnerLogo: dataUri(logo.data), partnerTile: !(await sharp(Buffer.from(logo.data.split(',')[1], 'base64')).stats()).isOpaque, brands },
    sources: { site: site?.url ?? null, domainFrom, pagesRead: pages.map((p) => p.url), appsMentioned: apps, logo: logo.source, color: isAisensy && !color ? 'AiSensy preset' : brand.source, brief: briefSource, aiTailored: briefSource.startsWith('viaSocket AI') || isAisensy, check, alreadyNamed: [...named].slice(0, 20), appNotes: brief.appNotes ?? [] }
  }
}

import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import * as icons from './icons.js'
import { viasocket } from './viasocket.js'
import { AISENSY_FINAL, genericBrief, calLink, cleanExtras, cleanRegions, fixedWording, EXTRA_CAPABILITIES } from './htmldeck.js'
import { lookup, listed } from './catalog.js'

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

const BRIEF_PROMPT = `You write the content of slides 1-5 of a pitch deck for viaSocket's embed partnership ("Your UI. viaSocket's engine."): the partner embeds viaSocket so their own customers connect 2,300+ apps inside the partner's product, and the partner's product and AI agents can use those apps as tools. (Slide 6, about viaSocket, is fixed.)
Return ONLY a JSON object with exactly the keys and nesting of the example, rewritten for the partner from what their site says they do.

About viaSocket (from viasocket.com). viaSocket is an integration layer for products and AI agents: "You build the app or agent. viaSocket handles the connections and actions." You may rely on these facts and no others: 2,300+ app integrations; managed authentication (the app's own consent screen, tokens encrypted and refreshed); managed data mapping; triggers and webhooks (events from connected apps, polling and retries handled); multi-tenant (separate connected accounts per customer); custom branding (the partner's logo, colours and domain); AI agents with 50+ AI models, memory, connected apps as tools and multi-step workflows; in-app AI chatbots; browser actions (an agent can browse and act on sites with no API); real-time, background and scheduled execution with retries; execution monitoring, debugging and replay; regional deployment; MCP support; custom integrations and API requests; a missing app can be built once as a custom connector in the Plug Builder, or requested from the viaSocket team. Never state prices, plan limits, "unlimited" anything, timings (such as "15 minutes"), customer counts, or that viaSocket itself builds an integration on request.

Rules:
- Find the partner's real use case: what their customers ask their product for that lives in another app.
- problem.asks is four things the partner's own customers want, each a one-line wish in the customer's voice starting with a verb ("Sync my Shopify orders into <partner>", "Add every new lead to HubSpot"), drawn from what the partner's site shows, with a sub-line "<pattern> · <App>". <pattern> is one of "Sync data in", "Trigger an action", "Update an app", "Agent action", "Cross-app workflow"; <App> is ONE app from: Shopify, WooCommerce, HubSpot, Zoho CRM, Zoho Desk, Freshdesk, Zendesk, Salesforce, Razorpay, Stripe, Cashfree, Google Sheets, Google Calendar, Gmail, Slack, WhatsApp. At most one "Agent action", and only if the partner has agents. The demo and the trigger strip use apps from the same list.
- Fixed wording: copy subtitle, problem.title, problem.route, problem.detour, objections[0].answer, objections[0].body, objections[1].answer and objections[1].body exactly from the example with the partner's name swapped in; they are overwritten anyway. Never name competing automation tools. Every fact appears once. Keep lines as short as the example.
- heroLines is the headline in three short lines: "Give <partner> and its agents the power to act" when the partner has agents, else "Give <partner>’s users the power to act". mock.product must be a screen or feature name that appears on the partner's own site; if none does, use "Workspace". mock.question marks one word in [brackets]; mock.typed is what a customer types there.
- trigger.nodes is four [label, icon] pairs: icon is an app name from the list above, "viasocket" or "partner"; the second is always ["viaSocket","viasocket"].
- objections[0].quote reflects integrations the partner's own site lists (for example "We already have an API and MCP."); if the site lists none, it is "We already have some integrations."
- objections[0].apps lists up to six real apps the partner's own customers would plausibly ask for next (any well-known apps, not only the list above); they are checked against viaSocket's catalog and dropped if absent. Never pad it.
- regions is [] unless the partner's own site clearly shows customers in several countries or regions. Then give 2 or 3 { "label": <country or region, under 14 characters>, "apps": <3 or 4 apps that customers in that region favour over the other regions, any category, checked against viaSocket's catalog> }. Local favourites only (for example India: Razorpay, Zoho CRM, Cashfree; US: Stripe, HubSpot, Salesforce; Europe: Mollie, Pipedrive, Xero). Never list global apps such as Shopify, WooCommerce, Google Sheets, Google Calendar, Gmail, Slack or WhatsApp in a region, and never repeat an app across regions. If you cannot tell the regions apart this way, regions is []. When regions has rows, objections[0].apps may be [].
- extras is [] unless the partner's own site shows a real need for one of these other viaSocket capabilities: ${EXTRA_CAPABILITIES.join(', ')}. Meanings: "Browser actions" = an agent can browse and act on websites that have no API; "50+ AI models" = AI agents on viaSocket can choose from 50+ AI models, so the partner needn't wire up each model; "Memory" = agents keep memory; "Scheduled execution" = actions run at set intervals without a user triggering them. Add at most two, as { "label": <one name from that list, exactly>, "text": <one short line, under 90 characters> }. Each line must rest on something the partner's site actually says it does; if you cannot point to that, leave extras empty. Never add one to fill the slide, and never describe how it works beyond its meaning above. Triggers (app events starting flows) are already the slide's "Listen" row: use them in the trigger strip, never as an extra.
- notes is five speaker-note strings. Leave partner exactly as given.`

/** Keep only apps viaSocket's own table lists; region rows need that check, so without the table they are dropped. */
async function verifyApps(brief) {
  const names = [...new Set([...(brief.objections?.[0]?.apps ?? []), ...(brief.regions ?? []).flatMap((r) => r?.apps ?? [])].map(String))]
  const have = names.length ? await listed(names) : new Set()
  const dropped = []
  // Region rows show local favourites only: no global apps, and no app under two regions.
  const GLOBAL = new Set(['shopify', 'woocommerce', 'googlesheets', 'googlecalendar', 'gmail', 'slack', 'whatsapp', 'googledrive', 'zapier'])
  const used = new Set()
  brief.regions = (brief.regions ?? []).map((r) => ({
    label: r?.label,
    apps: (r?.apps ?? []).filter((a) => {
      const k = String(a).toLowerCase().replace(/[^a-z0-9]/g, '')
      if (GLOBAL.has(k) || used.has(k)) { dropped.push(a); return false }
      used.add(k); return true
    })
  }))
  const keep = (list) => (list ?? []).filter((a) => (have ? (have.has(a) ? true : (dropped.push(a), false)) : true))
  if (brief.objections?.[0]) brief.objections[0].apps = keep(brief.objections[0].apps)
  brief.regions = have ? cleanRegions((brief.regions ?? []).map((r) => ({ label: r?.label, apps: keep(r?.apps) }))) : []
  // Slide 2's four wishes each name one app after the "·"; drop wishes whose app viaSocket doesn't list (if four-minus-drops stays at 3 or more).
  const askApp = (a) => String(a?.[1] ?? '').split('·').pop().trim()
  const askNames = (brief.problem?.asks ?? []).map(askApp).filter(Boolean)
  const haveAsks = askNames.length ? await listed(askNames) : new Set()
  const goodAsks = (brief.problem?.asks ?? []).filter((a) => (haveAsks ? haveAsks.has(askApp(a)) : true))
  if (haveAsks && goodAsks.length >= 3) { for (const a of brief.problem.asks) if (!goodAsks.includes(a)) dropped.push(askApp(a)); brief.problem.asks = goodAsks }
  else if (haveAsks && goodAsks.length < (brief.problem?.asks ?? []).length) brief.unverifiedAsks = (brief.problem.asks).filter((a) => !goodAsks.includes(a)).map(askApp)
  return dropped
}

/** The product's AI drafts the brief from the partner's site, per run. */
async function draftBrief(uid, partner, pages, apps, context) {
  const example = { ...AISENSY_FINAL, partner }
  let budget = 14000
  const site = pages.map((p) => {
    const body = p.text.slice(0, Math.max(0, Math.min(3000, budget)))
    budget -= body.length
    return `## ${p.url}\n${p.title ?? ''}\n${p.description ?? ''}\n${body}`
  }).join('\n\n')
  const reply = await viasocket().user(uid).ai.send({
    threadId: `deck-${slug(partner.name)}-${Date.now()}`,
    message: `Partner: ${partner.name} (${partner.domain})\nWhat the user said about them: ${context || '(nothing)'}\nApps their site mentions: ${apps.join(', ') || '(none found)'}\n\nTheir website, page by page:\n${site}\n\nExample JSON (AiSensy) to rewrite:\n${JSON.stringify(example)}`,
    prompt: BRIEF_PROMPT,
    responseType: 'json_object'
  })
  const b = reply.content
  const ok = b && typeof b === 'object' && b.heroLines?.length && b.problem?.asks?.length && b.problem?.route?.length === 3 && b.mock?.typed && b.trigger?.nodes?.length && b.objections?.length === 2 && b.notes?.length === 5
  if (!ok) throw new Error('AI draft incomplete')
  // Fixed wording is the same for every partner; it is not the AI's to rewrite.
  const fx = fixedWording(partner.name)
  b.subtitle = fx.subtitle
  b.problem.title = fx.title
  b.problem.route = fx.route
  b.problem.detour = fx.detour
  b.objections[0].answer = fx.answers[0]; b.objections[0].body = fx.bodies[0]
  b.objections[1].answer = fx.answers[1]; b.objections[1].body = fx.bodies[1]
  const dropped = await verifyApps(b)
  return { ...b, partner, extras: cleanExtras(b.extras), appsDropped: dropped }
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
    try { brief = await draftBrief(uid, partner, pages, apps, context); briefSource = 'viaSocket AI from the partner site' } catch (e) {
      brief = genericBrief({ ...partner, description: info.description }); briefSource = `generic template (AI draft failed: ${e.message})`
    }
  }

  const brands = {}
  for (const [, key] of brief.trigger.nodes) {
    if (!key || key === 'partner' || key === 'viasocket' || key === 'Razorpay' || key === 'WhatsApp') continue
    const svg = await brandSvg(key)
    if (svg) brands[key] = svg
  }

  // What a person should confirm before sending: things the AI inferred about the partner.
  const check = isAisensy ? [] : [
    `Slide 2: the four customer wishes are inferred from ${name}’s site; confirm they match how its customers work.`,
    `Slide 3: the mock shows a screen called “${brief.mock?.product}”; confirm it exists in ${name}’s product, or rename it.`,
    `Slide 4: the quote ${brief.objections?.[0]?.quote} assumes ${name} already has integrations; confirm.`,
    ...((brief.regions ?? []).length ? [`Slide 4: the region rows (${brief.regions.map((r) => r.label).join(', ')}) are the AI’s judgement of ${name}’s markets.`] : []),
    ...((brief.extras ?? []).map((e) => `Slide 6: “${e.label}” is mentioned because the AI read a need for it on ${name}’s site; confirm.`)),
    ...((brief.appsDropped ?? []).length ? [`Left out because viaSocket doesn’t list them: ${brief.appsDropped.join(', ')}.`] : []),
    ...((brief.unverifiedAsks ?? []).length ? [`Slide 2 names apps viaSocket doesn’t list: ${brief.unverifiedAsks.join(', ')}.`] : []),
    ...(briefSource.startsWith('generic') ? [`The AI draft failed, so slides 2 to 5 use generic examples, not ${name}’s use case.`] : [])
  ]
  return {
    brief,
    // A transparent logo (a bare mark) sits on a white tile, like the AiSensy logo's own tile.
    assets: { partnerLogo: dataUri(logo.data), partnerTile: !(await sharp(Buffer.from(logo.data.split(',')[1], 'base64')).stats()).isOpaque, brands },
    sources: { site: site?.url ?? null, domainFrom, pagesRead: pages.map((p) => p.url), appsMentioned: apps, logo: logo.source, color: isAisensy && !color ? 'AiSensy preset' : brand.source, brief: briefSource, aiTailored: briefSource.startsWith('viaSocket AI') || isAisensy, check, appsDropped: brief.appsDropped ?? [], regionsShown: (brief.regions ?? []).map((r) => r.label) }
  }
}

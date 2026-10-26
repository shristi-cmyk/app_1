import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import * as icons from './icons.js'
import { viasocket } from './viasocket.js'
import { AISENSY_FINAL, genericBrief } from './htmldeck.js'

const UA = { 'user-agent': 'Mozilla/5.0 (compatible; PartnershipDeckManager/1.0)' }
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '')
const dataUri = (d) => (d ? (d.startsWith('data:') ? d : `data:${d}`) : null)

async function page(url) {
  const res = await fetch(url, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`${res.status}`)
  if (!/html/i.test(res.headers.get('content-type') ?? 'html')) throw new Error('not html')
  return { url: res.url, html: await res.text() }
}

/** The partner's site: given, or the first of name.com / .ai / .io / .in / .co that answers. */
async function findSite(name, domain) {
  const tries = domain ? [domain] : ['com', 'ai', 'io', 'in', 'co'].map((tld) => `${slug(name)}.${tld}`)
  for (const d of tries) {
    try {
      const hit = await page(`https://${d.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`)
      return { domain: new URL(hit.url).host, ...hit }
    } catch { /* next */ }
  }
  return null
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
const KNOWN_APPS = ['WhatsApp', 'Instagram', 'Facebook', 'Messenger', 'Telegram', 'Shopify', 'WooCommerce', 'Magento', 'BigCommerce', 'Razorpay', 'Stripe', 'PayU', 'PayPal', 'Cashfree', 'HubSpot', 'Salesforce', 'Zoho', 'Pipedrive', 'LeadSquared', 'Freshdesk', 'Freshworks', 'Zendesk', 'Intercom', 'Google Sheets', 'Google Calendar', 'Google Drive', 'Gmail', 'Outlook', 'Microsoft Teams', 'Slack', 'Notion', 'Airtable', 'Calendly', 'Twilio', 'Mailchimp', 'Klaviyo', 'Jira', 'Asana', 'Trello', 'ClickUp', 'Monday', 'Supabase', 'Postgres', 'Firebase', 'OpenAI', 'Zapier', 'Pabbly', 'n8n']
export const mentions = (text) => KNOWN_APPS.filter((a) => new RegExp(`\\b${a.replace(/ /g, '\\s+')}\\b`, 'i').test(text))

/** The brand colour: given, the site's theme-color, else the logo's dominant non-grey colour. */
async function brandColor(given, themeColor, logo) {
  const ok = (c) => {
    if (!c) return false
    const n = parseInt(c.slice(1), 16); const r = n >> 16, g = (n >> 8) & 255, b = n & 255
    return Math.max(r, g, b) - Math.min(r, g, b) > 40 // skip white, black and greys
  }
  if (given) return { color: given, source: 'given' }
  if (ok(themeColor)) return { color: themeColor.toUpperCase(), source: 'site theme-color' }
  if (logo) {
    const { dominant: { r, g, b } } = await sharp(Buffer.from(logo.split(',')[1], 'base64')).stats()
    const c = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()
    if (ok(c)) return { color: c, source: 'logo' }
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

const BRIEF_PROMPT = `You write a 5-slide pitch deck for viaSocket's embed partnership ("Your UI. viaSocket's engine."): the partner embeds viaSocket so their own customers connect 2,300+ apps inside the partner's product, and the partner's AI/agents can use those apps as tools.
Return ONLY a JSON object with exactly the keys and nesting of the example, rewritten for the partner from what their site says they do. Rules:
- Find the partner's real use case: what their customers ask their product for that lives in another app.
- Name only these apps: Shopify, WooCommerce, HubSpot, Zoho CRM, Zoho Desk, Freshdesk, Zendesk, Salesforce, Razorpay, Stripe, Google Sheets, Google Calendar, Gmail, Slack, WhatsApp.
- problem.route is [partner name, "Automation tool", "customer’s apps"]: never name competitors. Every fact appears once. Keep lines as short as the example.
- heroLines is the headline in three short lines. mock.product is a real screen or feature of the partner's product; mock.question marks one word in [brackets]; mock.typed is what a customer types there.
- trigger.nodes is four [label, icon] pairs: icon is an app name above, "viasocket" or "partner"; the second is always ["viaSocket","viasocket"].
- objections[0].apps lists apps the partner's own customers would plausibly ask for next, from the list above; never pad it with unrelated apps.
- notes is five speaker-note strings. Leave partner exactly as given.`

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
  return { ...b, partner }
}

/**
 * Everything a deck needs for one partner. Returns { missing: [...] } listing what to ask the user
 * for (logo, brand colour) instead of guessing; otherwise { brief, assets, sources }.
 */
export async function research({ name, domain, color, context, uid = 'anonymous' }) {
  const isAisensy = slug(name) === 'aisensy'
  const site = await findSite(name, domain ?? (isAisensy ? 'aisensy.com' : undefined))
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
      const hit = (await viasocket().catalog.search(name)).find((a) => slug(a.name) === slug(name))
      if (hit?.iconUrl) { await icons.supplyFromUrl(name, hit.iconUrl); logo = await icons.resolve(name) }
    } catch { /* catalog unreachable */ }
  }
  const brand = await brandColor(color ?? (isAisensy ? AISENSY_FINAL.partner.color : undefined), info.themeColor, logo?.data && dataUri(logo.data))

  const missing = []
  if (!logo) missing.push({ field: 'logo', name, hint: `a logo URL for ${name}` })
  if (!brand) missing.push({ field: 'color', name, hint: `${name}'s brand colour as hex` })
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

  return {
    brief,
    assets: { partnerLogo: dataUri(logo.data), brands },
    sources: { site: site?.url ?? null, pagesRead: pages.map((p) => p.url), appsMentioned: apps, logo: logo.source, color: isAisensy && !color ? 'AiSensy preset' : brand.source, brief: briefSource, aiTailored: briefSource.startsWith('viaSocket AI') || isAisensy }
  }
}

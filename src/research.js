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
  return { url: res.url, html: await res.text() }
}

/** The partner's site: given, or the first of name.com / .ai / .io / .in / .co that answers. */
async function findSite(name, domain) {
  const tries = domain ? [domain] : ['com', 'ai', 'io', 'in', 'co'].map((tld) => `${slug(name)}.${tld}`)
  for (const d of tries) {
    try {
      const hit = await page(`https://${d.replace(/^https?:\/\//, '')}`)
      return { domain: new URL(hit.url).host, ...hit }
    } catch { /* next */ }
  }
  return null
}

const meta = (html, re) => re.exec(html)?.[1]?.trim()
function readSite(html) {
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim()
  return {
    title: meta(html, /<title[^>]*>([^<]+)/i),
    description: meta(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i) ?? meta(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i),
    themeColor: meta(html, /<meta[^>]+name=["']theme-color["'][^>]+content=["'](#[0-9a-f]{6})/i),
    text: text.slice(0, 5000)
  }
}

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
- notes is five speaker-note strings. Leave partner exactly as given.`

/** The product's AI drafts the brief from the partner's site, per run. */
async function draftBrief(uid, partner, site, context) {
  const example = { ...AISENSY_FINAL, partner }
  const reply = await viasocket().user(uid).ai.send({
    threadId: `deck-${slug(partner.name)}-${Date.now()}`,
    message: `Partner: ${partner.name} (${partner.domain})\nTitle: ${site.title ?? ''}\nDescription: ${site.description ?? ''}\nExtra context: ${context ?? ''}\nSite text:\n${site.text ?? ''}\n\nExample JSON (AiSensy) to rewrite:\n${JSON.stringify(example)}`,
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
  const info = site ? readSite(site.html) : {}
  const host = site?.domain ?? domain

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
  if (missing.length) return { missing, found: { domain: host, description: info.description } }

  const partner = { name, color: brand.color, domain: host }
  let brief, briefSource
  if (isAisensy) {
    brief = { ...AISENSY_FINAL, partner: { ...AISENSY_FINAL.partner, domain: host } }
    briefSource = 'AiSensy final preset'
  } else {
    try { brief = await draftBrief(uid, partner, info, context); briefSource = 'viaSocket AI from the partner site' } catch (e) {
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
    sources: { site: site?.url ?? null, logo: logo.source, color: isAisensy && !color ? 'AiSensy preset' : brand.source, brief: briefSource }
  }
}

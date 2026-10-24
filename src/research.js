import sharp from 'sharp'
import { existsSync } from 'node:fs'
import * as icons from './icons.js'
import { viasocket } from './viasocket.js'
import { AISENSY_V3, genericBrief } from './htmldeck.js'

const UA = { 'user-agent': 'Mozilla/5.0 (compatible; PartnershipDeckManager/1.0)' }
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '')
const dataUri = (d) => (d ? (d.startsWith('data:') ? d : `data:${d}`) : null)

// Screenshots the user supplied after the snapshot failed, keyed by partner.
const suppliedShots = new Map()
export async function supplyScreenshot(name, { url, base64 }) {
  const buf = url ? Buffer.from(await (await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000) })).arrayBuffer()) : Buffer.from(base64, 'base64')
  suppliedShots.set(slug(name), await shrink(buf))
}

async function shrink(buf) {
  const jpg = await sharp(buf).resize({ width: 1400, withoutEnlargement: true }).jpeg({ quality: 70 }).toBuffer()
  return `data:image/jpeg;base64,${jpg.toString('base64')}`
}

async function page(url) {
  const res = await fetch(url, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`${res.status}`)
  return { url: res.url, html: await res.text() }
}

/** The partner's site: given, or the first of name.com / .ai / .io / .in that answers. */
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
    ogImage: meta(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i),
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
  if (given) return given
  if (ok(themeColor)) return themeColor.toUpperCase()
  if (logo) {
    const { dominant: { r, g, b } } = await sharp(Buffer.from(logo.split(',')[1], 'base64')).stats()
    const c = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()
    if (ok(c)) return c
  }
  return null
}

/** A snapshot of the partner's product UI with the preinstalled Chromium, else their og:image. */
async function snapshot(url, ogImage) {
  const executablePath = process.env.CHROMIUM_PATH ?? ['/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync)
  if (executablePath) {
    let browser
    try {
      const { chromium } = await import('playwright-core')
      browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] })
      const p = await browser.newPage({ viewport: { width: 1440, height: 900 } })
      await p.goto(url, { waitUntil: 'networkidle', timeout: 25000 }).catch(() => {})
      return await shrink(await p.screenshot({ type: 'png' }))
    } catch { /* fall back to og:image */ } finally { await browser?.close() }
  }
  if (ogImage) {
    try { return await shrink(Buffer.from(await (await fetch(new URL(ogImage, url), { headers: UA, signal: AbortSignal.timeout(10000) })).arrayBuffer())) } catch { /* none */ }
  }
  return null
}

const BRIEF_PROMPT = `You write a 5-slide pitch deck for viaSocket's embed partnership ("Your UI. viaSocket's engine."): the partner embeds viaSocket so their own customers connect 2,300+ apps inside the partner's product, and the partner's AI/agents can use those apps as tools.
Return ONLY a JSON object with exactly the keys and nesting of the example, rewritten for the partner from what their site says they do. Rules:
- Find the partner's real use case: what their customers ask their product for that lives in another app.
- Use only these apps: Shopify, WooCommerce, HubSpot, Zoho CRM, Zoho Desk, Freshdesk, Zendesk, Salesforce, Razorpay, Stripe, Google Sheets, Google Calendar, Gmail, Slack.
- problem.detour is "a third-party automation tool" (never name competitors). Every fact appears once. Short lines.
- demo.product is the name of a real screen/feature of the partner's product. trigger.nodes is [label, sub, icon] where icon is an app name above, "viasocket" or "partner".
- titleLines is the headline split in two short lines. notes is five speaker-note strings.
- Leave partner exactly as given.`

/** The product's AI drafts the brief from the partner's site, per run. */
async function draftBrief(uid, partner, site, context) {
  const example = { ...AISENSY_V3, partner }
  const reply = await viasocket().user(uid).ai.send({
    threadId: `deck-${slug(partner.name)}-${Date.now()}`,
    message: `Partner: ${partner.name} (${partner.domain})\nTitle: ${site.title ?? ''}\nDescription: ${site.description ?? ''}\nExtra context: ${context ?? ''}\nSite text:\n${site.text}\n\nExample JSON (AiSensy) to rewrite:\n${JSON.stringify(example)}`,
    prompt: BRIEF_PROMPT,
    responseType: 'json_object'
  })
  const b = reply.content
  if (!b || typeof b !== 'object' || !b.problem?.asks || !b.demo?.goal || !b.trigger?.nodes) throw new Error('AI draft incomplete')
  return { ...b, partner }
}

/**
 * Everything a deck needs for one partner. Returns { missing: [...] } listing what to ask the user
 * for (logo, brand colour, snapshot) instead of guessing; otherwise { brief, assets, sources }.
 */
export async function research({ name, domain, color, context, uid = 'anonymous', skipScreenshot = false }) {
  const isAisensy = slug(name) === 'aisensy'
  const site = await findSite(name, domain ?? (isAisensy ? 'aisensy.com' : undefined))
  const info = site ? readSite(site.html) : {}
  const host = site?.domain ?? domain

  // Logo: crawl the site, then viaSocket's catalog icon for the app.
  let logo = await icons.resolve(name, { domain: host, kind: 'logo' })
  if (!logo) {
    try {
      const hit = (await viasocket().catalog.search(name)).find((a) => slug(a.name) === slug(name))
      if (hit?.iconUrl) { await icons.supplyFromUrl(name, hit.iconUrl); logo = await icons.resolve(name) }
    } catch { /* catalog unreachable */ }
  }
  const vs = await icons.resolve('viaSocket', { domain: 'viasocket.com', kind: 'logo' })
  const partnerColor = await brandColor(color ?? (isAisensy ? AISENSY_V3.partner.color : undefined), info.themeColor, logo?.data && dataUri(logo.data))
  const shot = suppliedShots.get(slug(name)) ?? (skipScreenshot || !site ? null : await snapshot(site.url, info.ogImage))

  const missing = []
  if (!logo) missing.push({ field: 'logo', name, hint: `a logo URL for ${name}` })
  if (!vs) missing.push({ field: 'logo', name: 'viaSocket', hint: 'a viaSocket logo URL' })
  if (!partnerColor) missing.push({ field: 'color', name, hint: `${name}'s brand colour as hex` })
  if (!shot && !skipScreenshot) missing.push({ field: 'screenshot', name, hint: `a screenshot URL of ${name}'s product UI (or skip it)` })

  const partner = { name, color: partnerColor, domain: host }
  let brief, briefSource
  if (isAisensy) { brief = { ...AISENSY_V3, partner: { ...AISENSY_V3.partner, domain: host } }; briefSource = 'AiSensy v3 preset' } else {
    try { brief = await draftBrief(uid, partner, info, context); briefSource = 'viaSocket AI from the partner site' } catch (e) {
      brief = genericBrief({ ...partner, description: info.description }); briefSource = `generic template (AI draft failed: ${e.message})`
    }
  }

  // White brand marks for the trigger strip; a missing one shows its initial, it never blocks.
  const brands = {}
  for (const [, , icon] of brief.trigger.nodes) {
    if (!icon || icon === 'partner' || icon === 'viasocket') continue
    const hit = await icons.resolve(icon, { kind: 'brand' })
    if (hit) brands[icon] = dataUri(hit.data)
  }

  if (missing.length) return { missing, found: { domain: host, description: info.description } }
  return {
    brief,
    assets: { partnerLogo: dataUri(logo.data), viasocketLogo: dataUri(vs.data), screenshot: shot, brands },
    sources: { site: site?.url ?? null, logo: logo.source, color: color ? 'given' : isAisensy ? 'AiSensy preset' : info.themeColor ? 'site theme-color' : 'logo', screenshot: shot ? (suppliedShots.has(slug(name)) ? 'user-supplied' : 'snapshot') : 'skipped', brief: briefSource }
  }
}

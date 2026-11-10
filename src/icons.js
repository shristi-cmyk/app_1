import sharp from 'sharp'
import { cleanSvg } from './logos.js'

// Icons the user supplied after the crawler came up empty, keyed by normalised name.
const supplied = new Map()
const cache = new Map()

const key = (name) => String(name).toLowerCase().replace(/[^a-z0-9]/g, '')
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; PartnershipDeckManager/1.0)' }

async function get(url, as = 'buffer') {
  const res = await fetch(url, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return as === 'text' ? res.text() : Buffer.from(await res.arrayBuffer())
}

async function toPng(buf, { white = false } = {}) {
  let img = sharp(cleanSvg(buf), { density: 300 }).resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  if (white) img = img.flatten({ background: '#ffffff' })
  const png = await img.png().toBuffer()
  return `image/png;base64,${png.toString('base64')}`
}

// Brand marks from the open Simple Icons set, as white single-colour marks.
async function fromSimpleIcons(name) {
  const svg = await get(`https://cdn.simpleicons.org/${key(name)}/ffffff`)
  if (!svg.toString().includes('<svg')) throw new Error('not svg')
  return { data: await toPng(svg), source: 'simple-icons' }
}

// Crawl a site for its real logo: JSON-LD logo, then <img> tags that say "logo" (header first), then apple-touch/svg/png icon
// links. The og:image is a social-share banner, so it only counts when it is near-square.
async function fromSite(domain) {
  const base = /^https?:/.test(domain) ? domain : `https://${domain}`
  const html = await get(base, 'text')
  const found = []
  const add = (href, score, strict = false) => { if (href && !/^data:/i.test(href) && !found.some((f) => f.href === href)) found.push({ href, score, strict }) }
  for (const m of html.matchAll(/"logo"\s*:\s*(?:"([^"]+)"|\{[^}]*?"url"\s*:\s*"([^"]+)")/gi)) add((m[1] ?? m[2]).replace(/\\\//g, '/'), 6)
  const head = html.slice(0, html.search(/<\/header>|<\/nav>/i) > 0 ? html.search(/<\/header>|<\/nav>/i) : 6000)
  for (const [tags, bonus] of [[head.match(/<img[^>]+>/gi) ?? [], 2], [html.match(/<img[^>]+>/gi) ?? [], 0]]) {
    for (const tag of tags) {
      if (!/logo|brand/i.test(tag)) continue
      if (/partner|client|customer|trusted|testimonial|sponsor/i.test(tag)) continue // other companies' logos
      const src = /\bsrc=["']([^"']+)/i.exec(tag)?.[1]
      add(src, 4 + bonus + (/\.svg(\?|$)/i.test(src ?? '') ? 1 : 0), true)
    }
  }
  for (const tag of html.match(/<link[^>]+>/gi) ?? []) {
    const rel = /rel=["']([^"']+)/i.exec(tag)?.[1]?.toLowerCase() ?? ''
    const href = /href=["']([^"']+)/i.exec(tag)?.[1]
    if (!href || !rel.includes('icon')) continue
    add(href, rel.includes('apple-touch') ? 3 : /\.svg/i.test(href) ? 3 : 1)
  }
  add(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i.exec(html)?.[1], 0)
  found.sort((x, y) => y.score - x.score)
  for (const { href, score, strict } of found) {
    try {
      const buf = await get(new URL(href, base).href)
      const meta = await sharp(cleanSvg(buf), { density: 300 }).metadata()
      const w = meta.width ?? 0, h = meta.height ?? 0
      const isSvg = meta.format === 'svg'
      if (!isSvg && w < 96 && !(strict && w >= 48)) continue // a 16px favicon would look blurry on a slide
      const ratio = w / Math.max(h, 1)
      if (score === 0 && (ratio > 1.4 || ratio < 0.7)) continue // a wide share banner is not a logo
      if (ratio > 6 || ratio < 0.15) continue
      return { data: await toPng(buf), source: `crawl:${new URL(base).host}` }
    } catch { /* try the next candidate */ }
  }
  throw new Error(`no usable logo on ${domain}`)
}

export function supply(name, base64, mime = 'image/png') {
  supplied.set(key(name), { data: `${mime};base64,${base64}`, source: 'user-supplied' })
}

export async function supplyFromUrl(name, url) {
  const buf = await get(url)
  supplied.set(key(name), { data: await toPng(buf), source: 'user-supplied' })
}

/**
 * Find an icon for `name`. `kind` 'brand' tries the open icon set first (white marks for dark
 * circles); 'logo' crawls `domain` (the open set's marks are white, so they are never a partner's logo). Returns null when nothing was found, so the caller can ask.
 */
export async function resolve(name, { domain, kind = 'logo' } = {}) {
  const k = `${kind}:${key(name)}`
  if (supplied.has(key(name))) return supplied.get(key(name))
  if (cache.has(k)) return cache.get(k)
  const tries = kind === 'brand'
    ? [() => fromSimpleIcons(name), () => domain && fromSite(domain)]
    : [() => domain && fromSite(domain)]
  for (const t of tries) {
    try {
      const hit = await t()
      if (hit) { cache.set(k, hit); return hit }
    } catch { /* fall through to the next source */ }
  }
  return null
}

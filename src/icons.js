import sharp from 'sharp'

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
  let img = sharp(buf, { density: 300 }).resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
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

// Crawl a site for its best logo: apple-touch-icon, then svg/png icon links, then og:image.
async function fromSite(domain) {
  const base = /^https?:/.test(domain) ? domain : `https://${domain}`
  const html = await get(base, 'text')
  const found = []
  for (const tag of html.match(/<link[^>]+>/gi) ?? []) {
    const rel = /rel=["']([^"']+)/i.exec(tag)?.[1]?.toLowerCase() ?? ''
    const href = /href=["']([^"']+)/i.exec(tag)?.[1]
    if (!href || !rel.includes('icon')) continue
    const score = rel.includes('apple-touch') ? 3 : /\.svg/i.test(href) ? 3 : 1
    found.push({ href, score })
  }
  const og = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i.exec(html)?.[1]
  if (og) found.push({ href: og, score: 0 })
  found.sort((a, b) => b.score - a.score)
  for (const { href } of found) {
    try {
      const buf = await get(new URL(href, base).href)
      const meta = await sharp(buf).metadata()
      if ((meta.width ?? 0) < 96) continue // a 16px favicon would look blurry on a slide
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
 * circles); 'logo' crawls `domain`. Returns null when nothing was found, so the caller can ask.
 */
export async function resolve(name, { domain, kind = 'logo' } = {}) {
  const k = `${kind}:${key(name)}`
  if (supplied.has(key(name))) return supplied.get(key(name))
  if (cache.has(k)) return cache.get(k)
  const tries = kind === 'brand'
    ? [() => fromSimpleIcons(name), () => domain && fromSite(domain)]
    : [() => domain && fromSite(domain), () => fromSimpleIcons(name)]
  for (const t of tries) {
    try {
      const hit = await t()
      if (hit) { cache.set(k, hit); return hit }
    } catch { /* fall through to the next source */ }
  }
  return null
}

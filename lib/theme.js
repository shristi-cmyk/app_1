import { fetchText } from './web.js'

// Brand theme for the use-case visual, read from the app's own pages: colours, logo and a Google font.
// Everything is validated before it reaches the browser (hex colours, https/http image URL, plain font name).

const HEX6 = /^#[0-9a-f]{6}$/i
const FONT = /^[A-Za-z0-9 ]{2,40}$/

export function toHex(c) {
  const s = String(c || '').trim().toLowerCase()
  let m = /^#([0-9a-f]{3})$/.exec(s)
  if (m) return `#${[...m[1]].map((x) => x + x).join('')}`
  if (/^#[0-9a-f]{6}$/.test(s)) return s
  m = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/.exec(s)
  if (m && [m[1], m[2], m[3]].every((n) => Number(n) <= 255)) return `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`
  return null
}

export function hsl(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2
  const d = max - min
  if (!d) return { h: 0, s: 0, l }
  const s = d / (1 - Math.abs(2 * l - 1))
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  h = (h * 60 + 360) % 360
  return { h, s, l }
}

export function fromHsl(h, s, l) {
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))))
  return `#${[f(0), f(8), f(4)].map((x) => x.toString(16).padStart(2, '0')).join('')}`
}

// A usable brand colour: clearly coloured, neither washed out nor nearly black.
export const isBrandy = (hex) => { const { s, l } = hsl(hex); return s >= 0.3 && l >= 0.18 && l <= 0.78 }

const hueGap = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d }

// Colours in a piece of CSS or HTML, most frequent first, plus any named brand variables (--primary, --brand ...).
export function colorsIn(text) {
  const counts = new Map()
  for (const m of String(text).matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\(\s*\d{1,3}[\s,]+\d{1,3}[\s,]+\d{1,3}/g)) {
    const hex = toHex(m[0])
    if (hex && isBrandy(hex)) counts.set(hex, (counts.get(hex) || 0) + 1)
  }
  const named = []
  for (const m of String(text).matchAll(/--[\w-]*(?:primary|brand|accent|main)[\w-]*\s*:\s*(#[0-9a-fA-F]{3,6}\b|rgba?\([^)]*\))/gi)) {
    const hex = toHex(m[1])
    if (hex && isBrandy(hex)) named.push(hex)
  }
  return { named, frequent: [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c) }
}

// Chooses primary and accent: declared theme colour, then named brand variables, then the most frequent coloured value.
export function pickColors({ meta, named = [], frequent = [] }) {
  const pool = [...(meta ? [meta] : []), ...named, ...frequent].filter((c, i, all) => all.indexOf(c) === i)
  const p = pool[0] || null
  if (!p) return null
  const hp = hsl(p).h
  const a = pool.find((c) => c !== p && hueGap(hsl(c).h, hp) >= 35) || fromHsl((hp + 150) % 360, 0.85, 0.58)
  return { p, a }
}

export function brandMeta(html) {
  for (const re of [/<meta\b[^>]*name=["']theme-color["'][^>]*>/i, /<meta\b[^>]*name=["']msapplication-TileColor["'][^>]*>/i]) {
    const tag = re.exec(html)?.[0]
    const hex = tag && toHex(/content=["']([^"']+)["']/i.exec(tag)?.[1])
    if (hex && isBrandy(hex)) return hex
  }
  return null
}

function logoUrl(html, base) {
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]).filter((t) => /rel=["'][^"']*icon[^"']*["']/i.test(t))
  const rank = (t) => (/apple-touch-icon/i.test(t) ? 0 : /\.svg|image\/svg/i.test(t) ? 1 : /sizes=["'](\d+)/i.test(t) ? 2 : 3)
  for (const t of links.sort((a, b) => rank(a) - rank(b))) {
    const href = /href=["']([^"']+)["']/i.exec(t)?.[1]
    if (!href) continue
    try {
      const u = new URL(href, base)
      if (/^https?:$/.test(u.protocol)) return u.href
    } catch {}
  }
  try { return new URL('/favicon.ico', base).href } catch { return null }
}

// First Google Fonts family the page loads, if any (fonts.googleapis.com/css2?family=Inter:wght@400 ...).
export function googleFont(html) {
  const m = /fonts\.googleapis\.com\/css2?\?[^"'>\s]*family=([^"'&>\s:;@]+)/i.exec(html)
  if (!m) return null
  const name = decodeURIComponent(m[1].replace(/\+/g, ' ')).trim()
  return FONT.test(name) ? name : null
}

export async function extractTheme(page, { fetch = fetchText } = {}) {
  if (!page) return null
  const html = page.html
  const sheets = [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi)]
    .map((m) => /href=["']([^"']+)["']/i.exec(m[0])?.[1]).filter(Boolean)
    .map((h) => { try { return new URL(h, page.url).href } catch { return null } })
    .filter((u) => u && !/fonts\.googleapis\.com/.test(u)).slice(0, 3)
  const css = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n')
  const fetched = await Promise.allSettled(sheets.map((u) => fetch(u, { accept: 'text/css,*/*', timeout: 8000 })))
  const all = [css, ...fetched.filter((r) => r.status === 'fulfilled').map((r) => r.value.text.slice(0, 400000))].join('\n')
  const { named, frequent } = colorsIn(all)
  const colors = pickColors({ meta: brandMeta(html), named, frequent })
  return { ...(colors || {}), logo: logoUrl(html, page.url), font: googleFont(html) }
}

// Validates a theme from any source before it is sent to the browser.
export function sanitizeTheme(t) {
  if (!t || typeof t !== 'object') return null
  const out = {}
  if (HEX6.test(t.p || '')) out.p = t.p.toLowerCase()
  if (HEX6.test(t.a || '')) out.a = t.a.toLowerCase()
  if (typeof t.logo === 'string' && /^https?:\/\/[^\s"'<>]+$/i.test(t.logo) && t.logo.length < 400) out.logo = t.logo
  if (typeof t.font === 'string' && FONT.test(t.font)) out.font = t.font
  return Object.keys(out).length ? out : null
}

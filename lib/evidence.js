import dns from 'node:dns/promises'
import net from 'node:net'

const PAGE_CHARS = 9000
const MAX_PAGES = 6
const LINK_HINT = /(integrat|api|developer|docs?|webhook|pricing|customer|case-stud|use-case|blog|changelog|zapier)/i

// SSRF guard: the URL is user-supplied on a public app, so refuse private, loopback and link-local targets.
export function isPrivateIp(ip) {
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase()
    if (v.startsWith('::ffff:')) return isPrivateIp(v.slice(7))
    return v === '::1' || v === '::' || /^f[cd]/.test(v) || /^fe[89ab]/.test(v)
  }
  const [a, b] = ip.split('.').map(Number)
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
}

export async function assertPublicUrl(u) {
  const url = new URL(u)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only http(s) URLs are allowed')
  if (url.port && !['80', '443'].includes(url.port)) throw new Error('Unusual ports are not allowed')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true })
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new Error('URL does not resolve to a public address')
  return url
}

export function htmlToText(html) {
  return html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr|section|br)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim()
}

export function extractLinks(html, base) {
  const out = new Set()
  for (const m of html.matchAll(/<a\s[^>]*href=["']([^"'#]+)["']/gi)) {
    try {
      const u = new URL(m[1], base)
      if (u.hostname === new URL(base).hostname && LINK_HINT.test(u.pathname) && !/\.(png|jpe?g|svg|pdf|zip)$/i.test(u.pathname)) out.add(u.origin + u.pathname)
    } catch {}
  }
  return [...out]
}

async function fetchPage(u) {
  let url = await assertPublicUrl(u)
  for (let hop = 0; hop < 4; hop++) {
    const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'ViaSocketResearchBot/1.0', Accept: 'text/html' } })
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = await assertPublicUrl(new URL(res.headers.get('location'), url).href)
      continue
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    if (!/text\/html|text\/plain/.test(res.headers.get('content-type') || '')) throw new Error('not a text page')
    const html = (await res.text()).slice(0, 1_500_000)
    return { url: url.href, html }
  }
  throw new Error('too many redirects')
}

// Fetches the application's own pages directly, so the report has first-hand text to cite.
export async function gatherAppPages(appUrl) {
  const pages = []
  const notes = []
  try {
    const home = await fetchPage(appUrl)
    pages.push({ url: home.url, text: htmlToText(home.html).slice(0, PAGE_CHARS) })
    const links = extractLinks(home.html, home.url).filter((l) => l !== home.url.split('#')[0]).slice(0, MAX_PAGES - 1)
    const rest = await Promise.allSettled(links.map(fetchPage))
    rest.forEach((r, i) => {
      if (r.status === 'fulfilled') pages.push({ url: r.value.url, text: htmlToText(r.value.html).slice(0, PAGE_CHARS) })
      else notes.push(`Could not fetch ${links[i]}: ${r.reason?.message}`)
    })
  } catch (e) {
    notes.push(`Could not fetch ${appUrl}: ${e.message}`)
  }
  return { pages, notes }
}

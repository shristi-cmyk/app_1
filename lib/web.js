import dns from 'node:dns/promises'
import net from 'node:net'

// Honest user agent: sites that block bots are skipped, never worked around.
const UA = 'viaSocketResearchAgent/1.0 (+https://viasocket-research-agent.embarko.app)'

// SSRF guard: URLs come from visitors and search results on a public app, so refuse private, loopback and link-local targets.
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

// GET a public URL, following up to 4 redirects, each one re-checked.
export async function fetchText(u, { accept = 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8', timeout = 15000 } = {}) {
  let url = await assertPublicUrl(u)
  for (let hop = 0; hop < 4; hop++) {
    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(timeout),
      headers: { 'User-Agent': UA, Accept: accept },
    })
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = await assertPublicUrl(new URL(res.headers.get('location'), url).href)
      continue
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const type = res.headers.get('content-type') || ''
    if (!/html|text|json|xml/.test(type)) throw new Error('not a text page')
    return { url: url.href, text: (await res.text()).slice(0, 2_000_000), type }
  }
  throw new Error('too many redirects')
}

export function decodeEntities(s) {
  return s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&#x27;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

export function htmlToText(html) {
  return decodeEntities(html
    .replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article|br)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim()
}

// Registrable-ish domain: "help.aisensy.com" → "aisensy.com" (good enough for same-site checks).
export function rootDomain(host) {
  const parts = host.replace(/^www\./, '').split('.')
  const two = parts.slice(-2).join('.')
  return /^(co|com|org|net|gov|ac)\.[a-z]{2}$/.test(two) ? parts.slice(-3).join('.') : two
}

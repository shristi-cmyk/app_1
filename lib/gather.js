import { fetchText, htmlToText, rootDomain } from './web.js'
import { webSearch } from './search.js'

const TEXT_CAP = 12000

// Known integration platforms and the traces they leave when they power integrations inside another product.
export const PLATFORMS = [
  ['viaSocket', /viasocket\.com|\bviasocket\b/i, /embed\.viasocket\.com|viasocket\.com\/(?:embed|connect)/i],
  ['Zapier', /zapier\.com|\bzapier\b/i, /cdn\.zapier\.com\/packages\/partner-sdk|zapier-(?:full-experience|workflow|zap-templates)|zapier\.com\/partner\/embed/i],
  ['Make', /\bmake\.com\b|integromat/i, /make\.com\/(?:en\/)?(?:embed|white-label)/i],
  ['Integrately', /integrately/i, /integrately\.com\/(?:embed|ap\/|integration-widget)/i],
  ['Pabbly Connect', /pabbly/i, /pabbly\.com\/(?:embed|connect-widget)/i],
  ['n8n', /\bn8n\b/i, /n8n\.io\/embed/i],
  ['Albato', /albato/i, /albato\.com\/(?:embedded|widget)/i],
  ['Paragon', /useparagon|paragon connect/i, /useparagon\.com|@useparagon/i],
  ['Merge', /merge\.dev/i, /merge\.dev|merge-link/i],
  ['Prismatic', /prismatic\.io/i, /prismatic\.io/i],
  ['Tray.io', /tray\.io|tray embedded/i, /embedded\.tray\.io|tray\.io\/embedded/i],
  ['Workato', /workato/i, /workato\.com\/(?:embedded|connect)/i],
  ['Cyclr', /cyclr/i, /cyclr\.com/i],
  ['Pipedream', /pipedream/i, /pipedream\.com\/connect/i],
  ['Nango', /nango\.dev|\bnango\b/i, /nango\.dev/i],
  ['Apideck', /apideck/i, /apideck\.com/i],
  ['Unified.to', /unified\.to/i, /unified\.to/i],
  ['Alloy', /runalloy/i, /runalloy\.com/i],
  ['Celigo', /celigo/i, /celigo\.com/i],
  ['Composio', /composio/i, /composio\.dev/i],
  ['Ampersand', /withampersand/i, /withampersand\.com/i],
  ['Kombo', /kombo\.dev/i, /kombo\.dev/i],
  ['Rutter', /rutter\.com/i, /rutter\.com/i],
  ['Codat', /codat/i, /codat\.io/i],
]

const LINK_SCORE = [
  [/integrat|partner|marketplace|app-?store|\/apps\b|ecosystem|connect/i, 3],
  [/api|developer|docs?|webhook|zapier|automation/i, 2],
  [/pricing|customer|case-stud|use-case|feature|product|solution|industr/i, 1],
]

function scoreLink(path) {
  for (const [re, s] of LINK_SCORE) if (re.test(path)) return s
  return 0
}

// Same-site links (subdomains such as help. or docs. included), best-scored first.
export function siteLinks(html, base) {
  const root = rootDomain(new URL(base).hostname)
  const seen = new Map()
  for (const m of html.matchAll(/<a\s[^>]*href=["']([^"'#]+)["']/gi)) {
    try {
      const u = new URL(decodeURI(m[1]), base)
      if (!/^https?:$/.test(u.protocol) || rootDomain(u.hostname) !== root) continue
      if (/\.(png|jpe?g|gif|svg|pdf|zip|mp4|webp)$/i.test(u.pathname)) continue
      const key = u.origin + u.pathname.replace(/\/$/, '')
      const s = scoreLink(u.hostname + u.pathname)
      if (s > 0 && !seen.has(key)) seen.set(key, s)
    } catch {}
  }
  return [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([u, s]) => ({ url: u, score: s }))
}

// Where a platform shows up in a page: script or iframe inside the product, a link, or a plain mention.
export function scanPlatforms(html, pageUrl, isOwnSite) {
  const hits = []
  const text = htmlToText(html)
  for (const [name, mention, inProduct] of PLATFORMS) {
    const srcs = [...html.matchAll(/<(?:script|iframe)[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1])
    let how = null
    let evidence = ''
    if (srcs.some((s) => inProduct.test(s))) { how = 'loads the platform\'s code in the page'; evidence = srcs.find((s) => inProduct.test(s)) }
    else if (mention.test(text)) {
      const i = text.search(mention)
      evidence = text.slice(Math.max(0, i - 160), i + 160).replace(/\s+/g, ' ')
      how = isOwnSite ? 'named on the app\'s own page' : 'named on a third-party page'
    } else if ([...html.matchAll(/href=["']([^"']+)["']/gi)].some((m) => mention.test(m[1]))) {
      how = isOwnSite ? 'linked from the app\'s own page' : 'linked from a third-party page'
    }
    if (how) hits.push({ platform: name, how, url: pageUrl, evidence })
  }
  return hits
}

async function settle(items, fn, concurrency = 4) {
  const out = new Array(items.length)
  let i = 0
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (i < items.length) {
      const k = i++
      try { out[k] = { ok: true, value: await fn(items[k]) } } catch (e) { out[k] = { ok: false, error: e.message } }
    }
  }))
  return out
}

async function crawlSite(appUrl, notes) {
  const pages = []
  const home = await fetchText(appUrl)
  const root = rootDomain(new URL(home.url).hostname)
  pages.push({ url: home.url, html: home.text })
  let queue = siteLinks(home.text, home.url).filter((l) => l.url !== home.url.replace(/\/$/, '')).slice(0, 9)
  const first = await settle(queue.map((l) => l.url), fetchText)
  first.forEach((r, k) => (r.ok ? pages.push({ url: r.value.url, html: r.value.text }) : notes.push(`Site page ${queue[k].url}: ${r.error}`)))
  // One level deeper from the integrations/partners pages, where platform listings usually sit.
  const have = new Set(pages.map((p) => p.url.replace(/\/$/, '')))
  const deeper = pages.filter((p) => /integrat|partner|marketplace|apps/i.test(p.url))
    .flatMap((p) => siteLinks(p.html, p.url)).filter((l) => l.score === 3 && !have.has(l.url)).slice(0, 4)
  const second = await settle(deeper.map((l) => l.url), fetchText)
  second.forEach((r) => r.ok && pages.push({ url: r.value.url, html: r.value.text }))
  return { root, pages: pages.filter((p, i) => pages.findIndex((q) => q.url === p.url) === i) }
}

const REVIEW_SITES = ['g2.com', 'capterra.com', 'capterra.in', 'getapp.com', 'trustpilot.com', 'trustradius.com', 'softwaresuggest.com', 'producthunt.com', 'apps.shopify.com', 'play.google.com', 'apps.apple.com']
const COMMUNITY_SITES = ['reddit.com', 'quora.com', 'news.ycombinator.com', 'indiehackers.com', 'community.shopify.com']

// Gathers everything the analysis calls read: the app's own site and help docs (fetched directly), web search
// results with page text (through viaSocket's Tavily app), and traces of integration platforms in and around the app.
export async function gatherAll({ name, url }, onStatus = () => {}) {
  const notes = []
  onStatus('Reading the app’s website…')
  let site = { root: rootDomain(new URL(url).hostname), pages: [] }
  try { site = await crawlSite(url, notes) } catch (e) { notes.push(`Could not open ${url}: ${e.message}`) }

  onStatus(`Read ${site.pages.length} page(s) from the app’s site. Searching the web…`)
  const QUERIES = [
    { key: 'reviews', query: `${name} reviews pros cons`, domains: REVIEW_SITES, raw: true },
    { key: 'requests', query: `${name} integration missing wish connect`, domains: [...REVIEW_SITES, ...COMMUNITY_SITES], raw: true },
    { key: 'community', query: `${name}`, domains: COMMUNITY_SITES, raw: true },
    { key: 'integrations', query: `${name} integrations partners` },
    { key: 'platforms', query: `${name} integration Zapier Integrately Pabbly Make viaSocket` },
    { key: 'help', query: `${name} integration help docs`, domains: [site.root], raw: true },
    { key: 'news', query: `${name}`, news: true },
    { key: 'useCases', query: `${name} use cases customers case study` },
  ]
  const found = await settle(QUERIES, (q) => webSearch(q.query, q), 3)
  const searches = QUERIES.map((q, i) => ({ key: q.key, query: q.query, ...(found[i].ok ? found[i].value : { results: [], error: found[i].error }) }))
  const failed = searches.filter((s) => s.error)
  failed.forEach((s) => notes.push(`Search "${s.query}": ${s.error}`))
  const allResults = searches.flatMap((s) => s.results)
  onStatus(failed.length === searches.length
    ? `Web search unavailable: ${failed[0].error}`
    : `Web search: ${searches.length - failed.length}/${searches.length} searches done, ${new Set(allResults.map((r) => r.url)).size} links.`)

  // Review and community text: the page content the search returned (sites that block access simply return none).
  const seen = new Set()
  const reviews = searches.filter((s) => ['reviews', 'requests', 'community'].includes(s.key)).flatMap((s) => s.results)
    .filter((r) => !seen.has(r.url) && seen.add(r.url))
    .map((r) => ({ source: new URL(r.url).hostname.replace(/^www\./, ''), url: r.url, title: r.title, status: r.raw ? 'read' : r.snippet ? 'snippet only' : 'empty', text: (r.raw || r.snippet).slice(0, TEXT_CAP) }))

  // Help docs and integration pages on the app's own domain that search found but the crawl missed.
  const have = new Set(site.pages.map((p) => p.url.replace(/\/$/, '')))
  const helpUrls = [...new Set(searches.filter((s) => ['integrations', 'platforms', 'help'].includes(s.key)).flatMap((s) => s.results.map((r) => r.url)))]
    .filter((u) => rootDomain(new URL(u).hostname) === site.root && !have.has(u.replace(/\/$/, ''))).slice(0, 5)
  const helpRes = await settle(helpUrls, fetchText, 4)
  const helpPages = helpRes.filter((r) => r.ok).map((r) => ({ url: r.value.url, html: r.value.text }))

  onStatus('Checking which integration platforms the app uses…')
  const ownPages = [...site.pages, ...helpPages].filter((p, i, all) => all.findIndex((q) => q.url === p.url) === i)
  const platformHits = ownPages.flatMap((p) => scanPlatforms(p.html, p.url, true))
  // Platforms whose own sites list a connector for the app (from search results).
  const token = new RegExp(name.split(/\s+/)[0].replace(/[^a-z0-9]/gi, ''), 'i')
  for (const r of allResults) {
    const host = new URL(r.url).hostname
    for (const [pname, mention] of PLATFORMS) {
      if (mention.test(host) && token.test(r.title + r.url)) platformHits.push({ platform: pname, how: 'the platform\'s own site lists a connector for the app', url: r.url, evidence: r.title })
    }
  }
  const dedup = new Map()
  for (const h of platformHits) {
    const k = `${h.platform}|${h.how}`
    if (!dedup.has(k)) dedup.set(k, h)
  }

  return {
    site: ownPages.map((p) => ({ url: p.url, text: htmlToText(p.html).slice(0, TEXT_CAP) })),
    searches: searches.map(({ key, query, results, error }) => ({ key, query, error, results: results.map(({ raw, ...r }) => r) })),
    reviews,
    platforms: [...dedup.values()],
    notes,
  }
}

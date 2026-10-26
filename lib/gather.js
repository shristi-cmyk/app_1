import { fetchText, htmlToText, rootDomain } from './web.js'
import { webSearch } from './search.js'
import { CUSTOMER_VOICE } from './config.js'
import { brandColor } from './visual.js'

const TEXT_CAP = 12000

// Third-party integration layers a product can run INSIDE itself, by type, with the traces they leave.
// [name, type, domain, mention, inProduct]: `mention` finds the name in text or links; `inProduct` finds the provider's
// code or its in-product feature (white-label, workflow element, connect portal) in a page.
export const PROVIDERS = [
  // Automation tools: an app-directory listing of these is NOT an in-app layer; only their in-product offerings count.
  ['viaSocket', 'automation tool', 'viasocket.com', /viasocket/i, /embed\.viasocket\.com|viasocket\.com\/(?:embed|connect\.js)/i],
  ['Zapier', 'automation tool', 'zapier.com', /zapier/i, /cdn\.zapier\.com\/packages\/partner-sdk|zapier-elements|<zapier-(?:workflow|full-experience|zap-templates)|zapier\.com\/(?:partner\/embed|workflow-api)|powered by zapier/i],
  ['Make', 'automation tool', 'make.com', /\bmake\.com\b|integromat/i, /make\.com\/[^"'\s]*white-label|powered by make\b/i],
  ['Integrately', 'automation tool', 'integrately.com', /integrately/i, /embed\.integrately|integrately\.com\/(?:embed|white-label)|powered by integrately/i],
  ['Pabbly Connect', 'automation tool', 'pabbly.com', /pabbly/i, /pabbly\.com\/[^"'\s]*(?:embed|white-label)|powered by pabbly/i],
  ['n8n', 'automation tool', 'n8n.io', /\bn8n\b/i, /n8n\.io\/embed|powered by n8n/i],
  ['Albato', 'automation tool', 'albato.com', /albato/i, /albato\.com\/[^"'\s]*embedded|embedded\.albato|powered by albato/i],
  // In-app integration layers.
  ['Paragon', 'in-app integration layer', 'useparagon.com', /useparagon|paragon connect/i, /useparagon\.com|@useparagon|paragon-connect/i],
  ['Prismatic', 'in-app integration layer', 'prismatic.io', /prismatic\.io|prismatic/i, /prismatic\.io/i],
  ['Tray Embedded', 'in-app integration layer', 'tray.io', /tray\.io|tray embedded|tray\.ai/i, /embedded\.tray\.io|tray\.io\/embedded/i],
  ['Workato Embedded', 'in-app integration layer', 'workato.com', /workato/i, /workato\.com\/(?:embedded|connect)|workato-embedded/i],
  ['Cyclr', 'in-app integration layer', 'cyclr.com', /cyclr/i, /cyclr\.com/i],
  ['Pipedream Connect', 'in-app integration layer', 'pipedream.com', /pipedream/i, /pipedream\.com\/connect|@pipedream\/connect/i],
  ['Nango', 'in-app integration layer', 'nango.dev', /nango\.dev|\bnango\b/i, /nango\.dev|@nangohq/i],
  ['Alloy', 'in-app integration layer', 'runalloy.com', /runalloy|alloy automation/i, /runalloy\.com/i],
  ['Ampersand', 'in-app integration layer', 'withampersand.com', /withampersand/i, /withampersand\.com/i],
  ['Cobalt', 'in-app integration layer', 'gocobalt.io', /gocobalt/i, /gocobalt\.io/i],
  ['Integration.app', 'in-app integration layer', 'integration.app', /integration\.app/i, /integration\.app/i],
  ['hotglue', 'in-app integration layer', 'hotglue.com', /hotglue/i, /hotglue\.(?:com|xyz)/i],
  // Unified APIs.
  ['Merge', 'unified API', 'merge.dev', /merge\.dev/i, /merge\.dev|merge-link|@mergeapi/i],
  ['Apideck', 'unified API', 'apideck.com', /apideck/i, /apideck\.com/i],
  ['Unified.to', 'unified API', 'unified.to', /unified\.to/i, /unified\.to/i],
  ['Kombo', 'unified API', 'kombo.dev', /kombo\.dev/i, /kombo\.dev/i],
  ['Finch', 'unified API', 'tryfinch.com', /tryfinch/i, /tryfinch\.com/i],
  ['Rutter', 'unified API', 'rutter.com', /rutter\.com|rutterapi/i, /rutter\.com|rutterapi/i],
  ['Codat', 'unified API', 'codat.io', /codat/i, /codat\.io/i],
  ['Truto', 'unified API', 'truto.one', /truto/i, /truto\.one/i],
  // Tool layers for AI agents.
  ['Composio', 'AI-agent tools', 'composio.dev', /composio/i, /composio\.dev/i],
  ['Arcade', 'AI-agent tools', 'arcade.dev', /arcade\.dev/i, /arcade\.dev/i],
  ['Klavis', 'AI-agent tools', 'klavis.ai', /klavis/i, /klavis\.ai/i],
  ['Toolhouse', 'AI-agent tools', 'toolhouse.ai', /toolhouse/i, /toolhouse\.ai/i],
]

// Provider sites that publish customers and case studies (automation tools are left out: their pages are app directories).
export const LAYER_PROVIDER_DOMAINS = PROVIDERS.filter(([, type]) => type !== 'automation tool').map(([, , d]) => d)

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

// How each provider shows up in one of the app's own pages: its code or in-product feature, or just its name.
export function scanPlatforms(html, pageUrl) {
  const hits = []
  const text = htmlToText(html)
  const srcs = [...html.matchAll(/<(?:script|iframe|link)[^>]+(?:src|href)=["']([^"']+)["']/gi)].map((m) => m[1])
  for (const [name, type, , mention, inProduct] of PROVIDERS) {
    const code = srcs.find((src) => inProduct.test(src))
    if (code) { hits.push({ provider: name, type, signal: 'provider code loaded in the page', url: pageUrl, evidence: code }); continue }
    if (inProduct.test(text) || inProduct.test(html.replace(/<(?:script|iframe|link)[^>]*>/gi, ''))) {
      const i = Math.max(0, text.search(inProduct))
      hits.push({ provider: name, type, signal: 'in-product wording (white-label, powered by, connect portal)', url: pageUrl, evidence: text.slice(Math.max(0, i - 200), i + 200).replace(/\s+/g, ' ') })
      continue
    }
    if (mention.test(text)) {
      const i = text.search(mention)
      hits.push({ provider: name, type, signal: 'name only', url: pageUrl, evidence: text.slice(Math.max(0, i - 160), i + 160).replace(/\s+/g, ' ') })
    }
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
    ...(CUSTOMER_VOICE ? [
      { key: 'reviews', query: `${name} reviews pros cons`, domains: REVIEW_SITES, raw: true },
      { key: 'requests', query: `${name} integration missing wish connect`, domains: [...REVIEW_SITES, ...COMMUNITY_SITES], raw: true },
      { key: 'community', query: `${name}`, domains: COMMUNITY_SITES, raw: true },
    ] : []),
    { key: 'integrations', query: `${name} integrations` },
    { key: 'help', query: `${name} connect integration help docs`, domains: [site.root], raw: true },
    // Is a third-party integration layer running inside the app? Provider customer pages, "powered by" lines, jobs and changelogs.
    { key: 'layerCustomers', query: `${name}`, domains: LAYER_PROVIDER_DOMAINS, raw: true },
    { key: 'poweredBy', query: `${name} integrations "powered by"` },
    { key: 'layerJobs', query: `${name} integrations engineer Paragon Merge Prismatic Workato Tray Cyclr Nango Pipedream Composio` },
    { key: 'changelog', query: `${name} changelog new integrations`, domains: [site.root] },
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
  const helpUrls = [...new Set(searches.filter((s) => ['integrations', 'help', 'changelog'].includes(s.key)).flatMap((s) => s.results.map((r) => r.url)))]
    .filter((u) => rootDomain(new URL(u).hostname) === site.root && !have.has(u.replace(/\/$/, ''))).slice(0, 5)
  const helpRes = await settle(helpUrls, fetchText, 4)
  const helpPages = helpRes.filter((r) => r.ok).map((r) => ({ url: r.value.url, html: r.value.text }))

  onStatus('Checking whether a third-party integration layer runs inside the app…')
  const ownPages = [...site.pages, ...helpPages].filter((p, i, all) => all.findIndex((q) => q.url === p.url) === i)
  const hits = ownPages.flatMap((p) => scanPlatforms(p.html, p.url))
  // Provider sites (not automation directories) that mention the app: possible customer pages, for the model to judge.
  const token = new RegExp(name.split(/\s+/)[0].replace(/[^a-z0-9]/gi, ''), 'i')
  for (const r of searches.find((x) => x.key === 'layerCustomers')?.results || []) {
    const p = PROVIDERS.find(([, , d]) => new URL(r.url).hostname.endsWith(d))
    if (p && token.test(`${r.title} ${r.snippet} ${r.raw}`)) hits.push({ provider: p[0], type: p[1], signal: 'the provider\'s own site mentions the app', url: r.url, evidence: `${r.title} — ${r.snippet}`.slice(0, 400) })
  }
  const rank = { 'provider code loaded in the page': 0, 'in-product wording (white-label, powered by, connect portal)': 1, "the provider's own site mentions the app": 2, 'name only': 3 }
  const best = new Map()
  for (const h of hits.sort((x, y) => rank[x.signal] - rank[y.signal])) {
    const k = `${h.provider}|${h.signal}`
    if (!best.has(k)) best.set(k, h)
  }

  return {
    brand: site.pages[0] ? brandColor(site.pages[0].html) : null,
    site: ownPages.map((p) => ({ url: p.url, text: htmlToText(p.html).slice(0, TEXT_CAP) })),
    searches: searches.map(({ key, query, results, error }) => ({ key, query, error, results: results.map(({ raw, ...r }) => r) })),
    reviews,
    platforms: [...best.values()],
    notes,
  }
}

import test from 'node:test'
import assert from 'node:assert/strict'
import { renderMarkdown, splitAtUseCases } from '../lib/markdown.js'
import { useCasesSection, sanitizeVisual } from '../lib/visual.js'
import { toHex, isBrandy, colorsIn, pickColors, brandMeta, googleFont, extractTheme, sanitizeTheme } from '../lib/theme.js'
import { checkReport, fit, packBlocks, reviewsMessage, noReviews, tidyLandscape, layerChecks, MAX_MESSAGE_CHARS } from '../lib/agent.js'
import { isPrivateIp, htmlToText, assertPublicUrl, rootDomain } from '../lib/web.js'
import { scanPlatforms, siteLinks, LAYER_PROVIDER_DOMAINS } from '../lib/gather.js'
import { SHARED_RULES, REPORT_PROMPT, reportPrompt } from '../lib/prompts.js'
import { acquire, resetLimits } from '../lib/limits.js'
import { markdownToText } from '../lib/plaintext.js'
import { readVisitorId, newVisitor } from '../lib/visitor.js'

test('markdown escapes html and only links http(s)', () => {
  const h = renderMarkdown('<script>x</script> [a](javascript:alert(1)) [b](https://x.io/p)')
  assert.ok(!h.includes('<script>'))
  assert.ok(!h.includes('href="javascript'))
  assert.ok(h.includes('href="https://x.io/p"'))
})

test('markdown renders headings, lists and tables', () => {
  const h = renderMarkdown('## T\n- a\n- b\n\n| h1 | h2 |\n|---|---|\n| 1 | 2 |')
  assert.match(h, /<h2>T<\/h2>/)
  assert.match(h, /<li>b<\/li>/)
  assert.match(h, /<th>h2<\/th>/)
  assert.match(h, /<td>2<\/td>/)
})

test('prompts: no HQ wording, wording rule present, no next-steps section', () => {
  assert.ok(!/\bHQ\b/.test(SHARED_RULES + REPORT_PROMPT))
  assert.match(SHARED_RULES, /Never use the words "embed", "embedded" or "SDK"/)
  assert.match(REPORT_PROMPT, /## Integration layer already in the app/)
  assert.match(REPORT_PROMPT, /Listed automation partners \(outside the product\)/)
  assert.match(REPORT_PROMPT, /One row per use case from the Use cases table/)
  assert.match(REPORT_PROMPT, /Existing integration layer inside the app: Yes/)
  assert.ok(!/^## Next steps/m.test(REPORT_PROMPT))
  assert.match(SHARED_RULES, /NOT an automation recipe/)
  assert.match(REPORT_PROMPT, /Where it fits in the app/)
  assert.ok(!/catalog/i.test(REPORT_PROMPT))
})

test('SSRF guard blocks private and metadata targets', async () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '169.254.169.254', '192.168.0.1', '172.16.5.5', '::1', 'fd00::1', '::ffff:10.0.0.1']) assert.ok(isPrivateIp(ip), ip)
  assert.ok(!isPrivateIp('8.8.8.8'))
  await assert.rejects(assertPublicUrl('http://127.0.0.1/'), /public/)
  await assert.rejects(assertPublicUrl('file:///etc/passwd'), /http/)
  await assert.rejects(assertPublicUrl('http://example.com:8080/'), /ports/)
})

test('html and domain helpers', () => {
  assert.match(htmlToText('<script>evil()</script><p>Hi &amp; bye</p>'), /^Hi & bye/)
  assert.equal(rootDomain('help.aisensy.com'), 'aisensy.com')
  assert.equal(rootDomain('www.shop.co.uk'), 'shop.co.uk')
})

test('provider scan separates code in the page, in-product wording and plain names', () => {
  const html = '<script src="https://connect.useparagon.com/sdk.js"></script><p>Integrations powered by Zapier.</p><p>Also on Integrately.</p>'
  const hits = Object.fromEntries(scanPlatforms(html, 'https://a.io/').map((h) => [h.provider, [h.type, h.signal]]))
  assert.deepEqual(hits.Paragon, ['in-app integration layer', 'provider code loaded in the page'])
  assert.equal(hits.Zapier[1], 'in-product wording (white-label, powered by, connect portal)')
  assert.equal(hits.Integrately[1], 'name only')
  assert.equal(hits.Merge, undefined)
})

test('provider customer search skips automation directories', () => {
  assert.ok(LAYER_PROVIDER_DOMAINS.includes('useparagon.com'))
  assert.ok(LAYER_PROVIDER_DOMAINS.includes('merge.dev'))
  assert.ok(!LAYER_PROVIDER_DOMAINS.includes('zapier.com'))
})

test('site links: same site incl. subdomains, integrations first', () => {
  const html = '<a href="/pricing">p</a><a href="https://help.a.io/zapier">h</a><a href="/integrations">i</a><a href="https://b.io/integrations">x</a>'
  assert.deepEqual(siteLinks(html, 'https://a.io/').map((l) => l.url), ['https://a.io/integrations', 'https://help.a.io/zapier', 'https://a.io/pricing'])
})

test('messages stay under the viaSocket size limit', () => {
  const big = 'x'.repeat(40000)
  assert.ok(fit([big, big]).length <= MAX_MESSAGE_CHARS + 100)
  assert.ok(packBlocks([{ title: 'a', text: big, cap: 9000 }, { title: 'b', text: big, cap: 9000 }], 12000).length <= 12100)
  const ev = { reviews: [{ source: 'g2.com', status: 'read', url: 'u', title: 't', text: big }, { source: 'capterra.com', status: 'empty', url: 'v', title: 't', text: '' }], searches: [] }
  const m = reviewsMessage({ name: 'A', url: 'https://a.io' }, ev)
  assert.ok(m.length <= MAX_MESSAGE_CHARS + 100)
  assert.match(m, /capterra.com: empty/)
})

test('checkReport: wording clean-up and missing-section warning', () => {
  const full = ['Snapshot', 'Use cases', 'Integration layer already in the app', 'Content ideas', 'Sources'].map((h) => `## ${h}\nx`).join('\n')
  assert.equal(checkReport(full), full)
  assert.match(checkReport(`${full}\nviaSocket Embed SDK and embedded integrations`), /viaSocket integration layer and in-app integrations/)
  assert.match(checkReport('## Use cases\nx'), /may be incomplete/)
})

test('limits: per-IP hourly cap and concurrency', () => {
  resetLimits()
  for (let i = 0; i < 3; i++) acquire('1.1.1.1').release()
  assert.equal(acquire('1.1.1.1').ok, false)
  assert.equal(acquire('2.2.2.2').ok, true)
  assert.equal(acquire('3.3.3.3').ok, true)
  assert.equal(acquire('4.4.4.4').ok, false) // 2 concurrent already held
  resetLimits()
})

test('no review text: the reason is stated and no site is named', () => {
  const v = noReviews({ searches: [{ key: 'reviews', error: 'Web search is not connected yet (open /setup).' }] })
  assert.deepEqual(v.sources_checked, [])
  assert.match(v.bottom_line, /not connected/)
})

test('listings never reach the integration-layer table; checks say what ran', () => {
  const t = tidyLandscape({
    integration_layers: [
      { provider: 'viaSocket', type: 'automation tool (in-product offering)', confidence: 'unclear', url: 'u1' },
      { provider: 'Paragon', type: 'in-app integration layer', confidence: 'confirmed', url: 'u2' },
    ],
    listed_automation_partners: [{ name: 'Zapier', url: 'u3' }],
  })
  assert.deepEqual(t.integration_layers.map((l) => l.provider), ['Paragon'])
  assert.deepEqual(t.listed_automation_partners.map((l) => l.name), ['Zapier', 'viaSocket'])
  assert.match(layerChecks({ searches: [{ key: 'poweredBy', error: 'not connected' }] }), /NOT checked/)
})

test('plain text: headings, lists, tables and links read cleanly', () => {
  const t = markdownToText('## Use cases\n\n- **Strong** one\n\n| A | B |\n|---|---|\n| 1 | [x](https://x.io) |\n\n_Italic note_')
  assert.ok(!t.includes('##') && !t.includes('**') && !t.includes('|---'))
  assert.match(t, /Use cases/)
  assert.match(t, /• Strong one/)
  assert.match(t, /1  \|  x \(https:\/\/x\.io\)/)
  assert.match(t, /Italic note/)
})

test('visitor id: random, cookie-bound, httpOnly', () => {
  const req = new Request('http://localhost:3000/api/google')
  const v = newVisitor(req)
  assert.match(v.id, /^[a-f0-9]{32}$/)
  assert.match(v.cookie, /HttpOnly/)
  assert.ok(!/Secure/.test(v.cookie))
  assert.equal(readVisitorId(new Request('http://localhost/', { headers: { cookie: `a=1; rv=${v.id}` } })), v.id)
  assert.equal(readVisitorId(new Request('http://localhost/', { headers: { cookie: 'rv=../../etc' } })), null)
  assert.match(newVisitor(new Request('http://x/', { headers: { 'x-forwarded-proto': 'https' } })).cookie, /Secure/)
})

test('customer voice is off by default and comes back with the switch', () => {
  assert.ok(!/What customers are asking for/.test(REPORT_PROMPT))
  assert.match(reportPrompt(true), /## What customers are asking for/)
  assert.match(checkReport(full5(), true), /Missing section\(s\): What customers are asking for/)
  assert.equal(checkReport(full5(), false), full5())
})
function full5() {
  return ['Snapshot', 'Use cases', 'Integration layer already in the app', 'Content ideas', 'Sources'].map((h) => `## ${h}\nx`).join('\n')
}

const REPORT = '## Snapshot\nx\n\n## Use cases\n| a | b |\n|---|---|\n| 1 | 2 |\n\n## Integration layer already in the app\ny'

test('report splits right after the use cases section', () => {
  const [before, after] = splitAtUseCases(REPORT)
  assert.ok(before.trimEnd().endsWith('| 1 | 2 |'))
  assert.ok(after.startsWith('## Integration layer'))
  assert.deepEqual(splitAtUseCases('no sections'), ['no sections', ''])
  assert.match(useCasesSection(REPORT), /^## Use cases[\s\S]*\| 1 \| 2 \|$/)
})

test('visual data is cleaned and bounded', () => {
  const v = sanitizeVisual({
    app_name: 'Bolna',
    cases: [
      { title: 'T', area: 'A', menu: 'Automations', gets: 'g', apps: ['CRM', 'Sheets', '', 'Slack', 'Email', 'Extra'], strength: 'strong' },
      { title: '', area: 'A', menu: 'x', gets: 'g', apps: ['CRM'], strength: 'Strong' },
      { title: 'No apps', area: 'A', menu: 'x', gets: 'g', apps: [], strength: 'Strong' },
      ...Array.from({ length: 8 }, (_, k) => ({ title: `T${k}`, area: 'A', menu: `M${k}`, gets: 'g', apps: ['CRM'], strength: 'weird' })),
    ],
  }, { p: '#123abc', a: '#ff8800', logo: 'https://x.io/i.png', font: 'Inter' })
  assert.equal(v.cases.length, 5)
  assert.deepEqual(v.cases[0].apps, ['CRM', 'Sheets', 'Slack', 'Email'])
  assert.equal(v.cases[0].strength, 'Strong')
  assert.equal(v.cases[1].strength, 'Worth testing')
  assert.deepEqual(v.theme, { p: '#123abc', a: '#ff8800', logo: 'https://x.io/i.png', font: 'Inter' })
  assert.equal(sanitizeVisual({ cases: [] }), null)
  assert.equal(sanitizeVisual(null), null)
})

test('theme: colours are read, ranked and validated', async () => {
  assert.equal(toHex('rgb(91, 61, 245)'), '#5b3df5')
  assert.equal(toHex('#0af'), '#00aaff')
  assert.ok(isBrandy('#5b3df5') && !isBrandy('#ffffff') && !isBrandy('#222222') && !isBrandy('#9aa0aa'))
  assert.equal(brandMeta('<meta name="theme-color" content="#5B3DF5">'), '#5b3df5')
  assert.equal(brandMeta('<meta name="theme-color" content="#ffffff">'), null)
  const css = ':root{--brand-primary:#0e9f8e;--gray:#888}a{color:#3b82f6}b{color:#3b82f6}i{color:#3b82f6}p{color:#f5a524}'
  const found = colorsIn(css)
  assert.deepEqual(found.named, ['#0e9f8e'])
  assert.equal(found.frequent[0], '#3b82f6')
  const picked = pickColors({ named: found.named, frequent: found.frequent })
  assert.equal(picked.p, '#0e9f8e')
  assert.notEqual(picked.a, picked.p)
  assert.equal(pickColors({}), null)
  assert.equal(googleFont('<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&display=swap">'), 'DM Sans')
  assert.equal(googleFont('<p>none</p>'), null)
  const html = '<link rel="stylesheet" href="/a.css"><link rel="apple-touch-icon" href="/logo.png"><style>.x{color:#e5484d}</style>'
  const t = await extractTheme({ url: 'https://a.io/', html }, { fetch: async () => ({ text: ':root{--primary:#0e9f8e}' }) })
  assert.equal(t.p, '#0e9f8e')
  assert.equal(t.logo, 'https://a.io/logo.png')
  assert.deepEqual(sanitizeTheme({ p: 'red', a: '#FF0000', logo: 'javascript:alert(1)', font: 'Inter;}body{x' }), { a: '#ff0000' })
  assert.equal(sanitizeTheme({ logo: 'x' }), null)
})

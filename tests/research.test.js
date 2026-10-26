import test from 'node:test'
import assert from 'node:assert/strict'
import { renderMarkdown } from '../lib/markdown.js'
import { checkReport, fit, packBlocks, reviewsMessage, noReviews, MAX_MESSAGE_CHARS } from '../lib/agent.js'
import { isPrivateIp, htmlToText, assertPublicUrl, rootDomain } from '../lib/web.js'
import { scanPlatforms, siteLinks, LAYER_PROVIDER_DOMAINS } from '../lib/gather.js'
import { SHARED_RULES, REPORT_PROMPT } from '../lib/prompts.js'
import { acquire, resetLimits } from '../lib/limits.js'

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
  const full = ['Snapshot', 'Use cases', 'What customers are asking for', 'Integration layer already in the app', 'Content ideas', 'Sources'].map((h) => `## ${h}\nx`).join('\n')
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

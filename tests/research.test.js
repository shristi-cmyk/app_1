import test from 'node:test'
import assert from 'node:assert/strict'
import { renderMarkdown } from '../lib/markdown.js'
import { buildUserMessage, checkReport, MAX_MESSAGE_CHARS } from '../lib/agent.js'
import { isPrivateIp, htmlToText, extractLinks, assertPublicUrl } from '../lib/evidence.js'
import { MASTER_PROMPT } from '../lib/master-prompt.js'
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

test('master prompt is embedded and the user message carries the evidence', () => {
  assert.match(MASTER_PROMPT, /Research executive/i)
  assert.ok(!/\bHQ\b/.test(MASTER_PROMPT))
  assert.match(MASTER_PROMPT, /Content to create/)
  const m = buildUserMessage({ name: 'A', url: 'https://a.io', context: '' }, { pages: [{ url: 'https://a.io', text: 'hello' }], notes: [] }, { coverage: 'COV', docs: 'DOCS' })
  assert.match(m, /https:\/\/a\.io/)
  assert.match(m, /COV/)
  assert.match(m, /DOCS/)
})

test('SSRF guard blocks private and metadata targets', async () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '169.254.169.254', '192.168.0.1', '172.16.5.5', '::1', 'fd00::1', '::ffff:10.0.0.1']) assert.ok(isPrivateIp(ip), ip)
  assert.ok(!isPrivateIp('8.8.8.8'))
  await assert.rejects(assertPublicUrl('http://127.0.0.1/'), /public/)
  await assert.rejects(assertPublicUrl('file:///etc/passwd'), /http/)
  await assert.rejects(assertPublicUrl('http://example.com:8080/'), /ports/)
})

test('html helpers strip scripts and pick relevant same-site links', () => {
  const html = '<script>evil()</script><p>Hi &amp; bye</p><a href="/docs/api">d</a><a href="https://other.com/docs">x</a><a href="/about">a</a>'
  assert.match(htmlToText(html), /^Hi & bye/)
  assert.ok(!htmlToText(html).includes('evil'))
  assert.deepEqual(extractLinks(html, 'https://a.io/'), ['https://a.io/docs/api'])
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

test('checkReport warns when sections are missing and passes a full report', () => {
  const full = ['1. Quick summary', '2. Use cases', '3. Content to create', '4. Where to use this content', '5. Next steps', '6. Sources'].map((h) => `## ${h}\nx`).join('\n')
  assert.equal(checkReport(full), full)
  const w = checkReport('## 2. Use cases\nx')
  assert.match(w, /may be incomplete/)
  assert.match(w, /Quick summary/)
})

test('user message stays under the viaSocket size limit', () => {
  const big = 'x'.repeat(30000)
  const m = buildUserMessage({ name: 'A', url: 'https://a.io', context: 'c' }, { pages: [{ url: 'u', text: big }, { url: 'v', text: big }], notes: [] }, { coverage: 'c', docs: big })
  assert.ok(m.length <= MAX_MESSAGE_CHARS + 100)
})

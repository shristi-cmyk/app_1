import test from 'node:test'
import assert from 'node:assert/strict'
import { renderMarkdown } from '../lib/markdown.js'
import { finalReport, buildUserMessage } from '../lib/agent.js'
import { TOOL_DEFS, runTool } from '../lib/viasocket-tools.js'
import { MASTER_PROMPT } from '../lib/master-prompt.js'

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

test('finalReport keeps only text after the last tool block', () => {
  const content = [
    { type: 'text', text: 'Let me search.' },
    { type: 'server_tool_use', name: 'web_search' },
    { type: 'web_search_tool_result' },
    { type: 'thinking', thinking: '' },
    { type: 'text', text: '## Research scope' },
  ]
  assert.equal(finalReport(content), '## Research scope')
})

test('master prompt is embedded and tools are declared', () => {
  assert.match(MASTER_PROMPT, /Research executive/i)
  assert.deepEqual(TOOL_DEFS.map((t) => t.name), ['viasocket_search_apps', 'viasocket_app_capabilities', 'viasocket_product_docs'])
  assert.match(buildUserMessage({ name: 'A', url: 'https://a.io', context: '' }), /https:\/\/a\.io/)
})

test('runTool rejects unknown tools and docs', async () => {
  await assert.rejects(runTool('nope', {}), /Unknown tool/)
  await assert.rejects(runTool('viasocket_product_docs', { doc: '../secret' }), /Unknown doc/)
})

import { acquire, resetLimits } from '../lib/limits.js'
test('limits: per-IP hourly cap and concurrency', () => {
  resetLimits()
  const a = acquire('1.1.1.1'); a.release()
  const b = acquire('1.1.1.1'); b.release()
  const c = acquire('1.1.1.1'); c.release()
  assert.equal(acquire('1.1.1.1').ok, false)
  assert.equal(acquire('2.2.2.2').ok, true)
  assert.equal(acquire('3.3.3.3').ok, true)
  assert.equal(acquire('4.4.4.4').ok, false) // 2 concurrent already held
  resetLimits()
})

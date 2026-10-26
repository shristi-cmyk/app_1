import Anthropic from '@anthropic-ai/sdk'
import { MASTER_PROMPT } from './master-prompt.js'
import { TOOL_DEFS, runTool } from './viasocket-tools.js'

const MODEL = process.env.RESEARCH_MODEL || 'claude-opus-5-5'
const MAX_TURNS = 24

const ADDENDUM = (today) => `

## Runtime environment (this deployment)

Today's date is ${today}.

Tools available to you:
- web_search and web_fetch: public research. web_fetch only opens URLs that appeared in the conversation or search results.
- viasocket_search_apps, viasocket_app_capabilities, viasocket_product_docs: authoritative, read-only viaSocket sources. Use them to verify viaSocket connector coverage and product capabilities before stating them. Anything you cannot verify with them stays "unknown".

There is NO tool for contacting viaSocket HQ agents in this deployment. In "Research scope", state plainly that internal HQ agent input was unavailable and list which roles should be consulted (integration-team agent for the category, Growth/Partnerships counterpart, Product).

You cannot ask the user questions mid-run. If the URL is unavailable or does not match the application name, say so at the top of the report and continue with what can be verified.
Write the final report in Markdown, with the six required sections as "##" headings. Output only the report.`

export function buildUserMessage({ name, url, context }) {
  return [
    `Application name: ${name}`,
    `Application URL: ${url}`,
    context ? `Optional context from the user: ${context}` : 'No optional context provided.',
    '',
    'Run the research procedure and return the report.',
  ].join('\n')
}

// The report is the text after the last tool/search block; earlier text is narration between tool calls.
export function finalReport(content) {
  let start = 0
  content.forEach((b, i) => { if (b.type !== 'text' && b.type !== 'thinking') start = i + 1 })
  return content.slice(start).filter((b) => b.type === 'text').map((b) => b.text).join('')
}

// Runs the research loop. onText streams raw text, onStatus reports progress; resolves to the final report.
export async function runResearch(input, { onText, onStatus, signal }) {
  const client = new Anthropic()
  const system = MASTER_PROMPT + ADDENDUM(new Date().toISOString().slice(0, 10))
  const tools = [
    { type: 'web_search_20260209', name: 'web_search', max_uses: 12 },
    { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 12 },
    ...TOOL_DEFS,
  ]
  const messages = [{ role: 'user', content: buildUserMessage(input) }]

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 64000,
      system,
      tools,
      messages,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    }, { signal })
    stream.on('text', (t) => onText(t))
    stream.on('contentBlock', (b) => {
      if (b.type === 'server_tool_use') onStatus(`${b.name}: ${JSON.stringify(b.input).slice(0, 120)}`)
      if (b.type === 'tool_use') onStatus(`${b.name}: ${JSON.stringify(b.input).slice(0, 120)}`)
    })
    const res = await stream.finalMessage()
    if (res.stop_reason === 'refusal') throw new Error('The model declined this request.')
    if (res.stop_reason === 'max_tokens') throw new Error('Report was cut off (max_tokens).')
    messages.push({ role: 'assistant', content: res.content })

    if (res.stop_reason === 'pause_turn') continue // server tools still running; resume as-is
    if (res.stop_reason !== 'tool_use') return finalReport(res.content)
    const results = []
    for (const block of res.content.filter((b) => b.type === 'tool_use')) {
      try {
        const out = await runTool(block.name, block.input)
        results.push({ type: 'tool_result', tool_use_id: block.id, content: typeof out === 'string' ? out : JSON.stringify(out) })
      } catch (e) {
        results.push({ type: 'tool_result', tool_use_id: block.id, is_error: true, content: String(e.message || e) })
      }
    }
    messages.push({ role: 'user', content: results })
  }
  throw new Error('Research did not finish within the turn limit.')
}

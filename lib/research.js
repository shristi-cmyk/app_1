import fs from 'node:fs'
import path from 'node:path'
import { viasocket } from './vs.js'
import { updateState, readState } from './store.js'
import { UID } from './user.js'

const user = () => viasocket.user(UID)

// Run AI Model (viasocket-utilities, no sign-in) and Slack Send Message: slug, event = action_id, version from each event's page.
const AI = { slug: 'viasocket-utilities', event: 'rowskkqydb6f', version: 'V3' }
const SLACK_SEND = { slug: 'slack', event: 'row1jrbor', version: 'V107' }

const ENVIRONMENT_NOTE = `

## Environment for this run
You run inside the Research Agent app. You can read pages and search the web, but no viaSocket HQ agent tools are connected, so do not claim any agent was consulted: in "Research scope" state that internal HQ input was unavailable. Return the report as Markdown.`

const masterPrompt = () => fs.readFileSync(path.join(process.cwd(), 'lib/master-prompt.md'), 'utf8') + ENVIRONMENT_NOTE

async function versionId({ slug, event, version }) {
  const serviceId = await viasocket.catalog.serviceIdFor(slug)
  return { serviceId, versionId: await viasocket.catalog.versionIdFor(serviceId, event, version) }
}

// Enable once per user and app; reuse the saved script_id, never enable twice.
async function scriptFor(serviceId, authId) {
  const saved = readState().research?.scripts?.[serviceId]
  if (saved) return saved
  const scriptId = (await user().findEnabled(serviceId)) ?? (await user().enable(serviceId, authId)).scriptId
  updateState((s) => {
    s.research = { ...s.research, scripts: { ...s.research?.scripts, [serviceId]: scriptId } }
  })
  return scriptId
}

export async function embedToken(apps) {
  const serviceIds = Object.fromEntries(await Promise.all(apps.map(async (slug) => [slug, await viasocket.catalog.serviceIdFor(slug)])))
  return { token: await user().token(), serviceIds }
}

export const saveSlackConnection = (authId) =>
  updateState((s) => {
    s.research = { ...s.research, slackAuthId: authId }
  })

export async function listChannels(searchText) {
  const authId = readState().research?.slackAuthId
  if (!authId) throw new Error('Connect Slack first')
  const { versionId: v } = await versionId(SLACK_SEND)
  const { options } = await user().listOptions(v, {
    fieldKey: 'destination.channel_id',
    authId,
    existingFields: { destination: { messageto: 'channel' }, ...(searchText ? { _searchText: searchText } : {}) }
  })
  return options
}

export async function runResearch({ appName, appUrl, context }) {
  const { serviceId, versionId: v } = await versionId(AI)
  const scriptId = await scriptFor(serviceId, 'NoAuth')
  const query = [`Application name: ${appName}`, `Application URL: ${appUrl}`, context ? `Optional context: ${context}` : ''].filter(Boolean).join('\n')
  const result = await viasocket.runAction(scriptId, v, { query, prompt: masterPrompt(), reasoning: 'high', response_type: 'text' })
  const report = typeof result === 'string' ? result : result?.content ?? result?.response ?? JSON.stringify(result)
  const run = { id: String(Date.now()), appName, appUrl, context: context || '', report, at: new Date().toISOString(), postedTo: null }
  updateState((s) => {
    s.research = { ...s.research, runs: [run, ...(s.research?.runs || [])].slice(0, 50) }
  })
  return run
}

export async function postToSlack(runId, channelId) {
  const state = readState().research || {}
  const run = state.runs?.find((r) => r.id === runId)
  if (!run) throw new Error('Unknown research run')
  if (!state.slackAuthId) throw new Error('Connect Slack first')
  const { serviceId, versionId: v } = await versionId(SLACK_SEND)
  const scriptId = await scriptFor(serviceId, state.slackAuthId)
  const text = run.report.length > 11000 ? run.report.slice(0, 11000) + '\n\n_…report truncated; full text in the Research Agent app._' : run.report
  await viasocket.runAction(scriptId, v, {
    destination: { messageto: 'channel', channel_id: [channelId] },
    markdown_content: `*Research: ${run.appName}* (${run.appUrl})\n\n${text}`
  })
  updateState((s) => {
    const r = s.research.runs.find((x) => x.id === runId)
    r.postedTo = channelId
  })
}

export function status() {
  const r = readState().research || {}
  return { slackConnected: Boolean(r.slackAuthId), runs: (r.runs || []).map(({ id, appName, appUrl, at, postedTo, report }) => ({ id, appName, appUrl, at, postedTo, report })) }
}

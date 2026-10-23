import { ViaSocket, ViaSocketError } from 'viasocket-apps'

const need = (k) => {
  const v = process.env[k]
  if (!v) throw new Error(`${k} is missing from .env`)
  return v
}

let client
export const viasocket = () =>
  (client ??= new ViaSocket({
    orgId: need('VIASOCKET_ORG_ID'),
    projectId: need('VIASOCKET_PROJECT_ID'),
    secret: need('VIASOCKET_EMBED_SECRET')
  }))

// Who supplies what, for delivering a finished deck through one of the user's apps:
//   user id          -> this code (the session id; one per end user, forever)
//   which app        -> the user, in a picker over catalog.search, then the connect popup
//   which action     -> this code: the app's own "send" action, read from the live catalog
//   deck link/text   -> this code, from the generated deck
//   recipient/channel-> the user (a dropdown from listOptions when the app offers one)
//   brief for a new partner -> the product's AI, per run (draftBrief)

const SEND = [/send.*(e-?mail|mail)/i, /send.*message/i, /^send/i, /post.*message/i]

/** Pick the app's send action from the live catalog; ids are never copied into code. */
export async function pickSendAction(serviceId) {
  const catalog = await viasocket().catalog.versions(serviceId)
  if (!catalog) throw new Error(`Unknown app ${serviceId}`)
  for (const re of SEND) {
    const hit = catalog.actions.find((a) => re.test(a.name))
    if (hit) return { app: catalog.service, action: hit }
  }
  return { app: catalog.service, action: null, available: catalog.actions.map((a) => a.name) }
}

/** Form fields of an action's input schema, tolerant of the two common shapes. */
export function fieldsOf(schema) {
  const props = schema?.properties
  if (props && typeof props === 'object') {
    const req = new Set(schema.required ?? [])
    return Object.entries(props).map(([key, def]) => ({ key, label: def?.title ?? def?.label ?? key, required: req.has(key) || !!def?.required }))
  }
  const list = Array.isArray(schema) ? schema : schema?.fields
  if (Array.isArray(list)) return list.map((f) => ({ key: f.key ?? f.name ?? f.field, label: f.label ?? f.title ?? f.key ?? f.name, required: !!f.required }))
  return []
}

const guess = (key) => {
  const k = key.toLowerCase()
  if (/(^|_)(to|recipient|email)s?(_|$)/.test(k)) return 'recipient'
  if (/subject|title/.test(k)) return 'subject'
  if (/body|message|text|content/.test(k)) return 'body'
  return null
}

/** Work out what to show the user: fields we fill ourselves, and fields the user must supply. */
export async function planDelivery(uid, serviceId, authId) {
  const user = viasocket().user(uid)
  const { app, action, available } = await pickSendAction(serviceId)
  if (!action) return { app, error: 'No send action found in this app', available }
  const fields = []
  for (const f of fieldsOf(action.input_schema)) {
    const g = guess(f.key)
    if (g === 'subject' || g === 'body') { fields.push({ ...f, role: g }); continue }
    let options = null
    if (authId) {
      try {
        const res = await user.listOptions(action.action_version_id, { fieldKey: f.key, authId, existingFields: {} })
        if (res.options.length) options = res.options
      } catch { /* a free-text field has no options */ }
    }
    fields.push({ ...f, role: g ?? 'input', options })
  }
  return { app, action: { name: action.name, versionId: action.action_version_id }, fields }
}

export async function connectedScript(uid, serviceId) {
  return viasocket().user(uid).findEnabled(serviceId)
}

export async function runDelivery(uid, serviceId, versionId, inputData) {
  const scriptId = await connectedScript(uid, serviceId)
  if (!scriptId) throw new Error('App is not enabled for this user yet')
  return viasocket().runAction(scriptId, versionId, inputData)
}

const BRIEF_PROMPT = `You write pitch-deck content for viaSocket's "Your UI. viaSocket's engine." embed partnership.
Return ONLY a JSON object that has exactly the same keys and nesting as the example below, rewritten for the partner.
Rules: two colour roles only (so no colours in the text); body text short; use only these apps: Shopify, WooCommerce,
HubSpot, Zoho CRM, Zoho Desk, Freshdesk, Zendesk, Salesforce, Razorpay, Stripe, Google Sheets, Google Calendar, Gmail, Slack;
never name competing automation tools; keep "Live in about 15 minutes" as the setup claim; keep partner.color and partner.domain unchanged.`

/** The product's AI drafts a brief for a new partner, per run. Falls back to the template on any failure. */
export async function draftBrief(uid, template, context) {
  const reply = await viasocket().user(uid).ai.send({
    threadId: `brief-${Date.now()}`,
    message: `Partner: ${template.partner.name}\nWhat they do / angle: ${context}\n\nExample JSON to rewrite:\n${JSON.stringify(template)}`,
    prompt: BRIEF_PROMPT,
    responseType: 'json_object'
  })
  return reply.content
}

export { ViaSocketError }

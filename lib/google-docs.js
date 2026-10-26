import { getViasocket } from './viasocket.js'
import { findConnection } from './connections.js'

export const DOCS_SLUG = 'google-docs'
export const CREATE_DOC_ACTION_ID = 'rowsxp9oayik' // Google Docs · Create Document From Text
const CREATE_DOC_VERSION = 'V8'
export const MAX_DOC_CHARS = 120000

export async function docsConnect(userId) {
  const viasocket = getViasocket()
  const { serviceId, authId, expired } = await findConnection(userId, DOCS_SLUG)
  return { serviceId, authId, expired, actions: [CREATE_DOC_ACTION_ID], token: await viasocket.user(userId).token() }
}

// Creates one Google Doc in the visitor's own Drive. Where each key of inputData comes from:
//   title   — built per run from the app name and date (the page sends it; length-capped here)
//   content — the finished report as plain text (per run)
//   folder  — left out on purpose: the doc lands in the visitor's Drive root (a folder picker can be added later)
export async function createDoc(userId, { title, content }) {
  const viasocket = getViasocket()
  const { serviceId, authId, expired } = await findConnection(userId, DOCS_SLUG)
  if (!authId) return { error: 'not_connected' }
  if (expired) return { error: 'expired', authId }
  const user = viasocket.user(userId)
  const scriptId = (await user.findEnabled(serviceId)) ?? (await user.enable(serviceId, authId)).scriptId
  const actionVersionId = await viasocket.catalog.versionIdFor(serviceId, CREATE_DOC_ACTION_ID, CREATE_DOC_VERSION)
  const out = await viasocket.runAction(scriptId, actionVersionId, { title, content })
  const body = out?.data ?? out
  if (out?.success === false || body?.error) throw new Error(out?.message || body?.error?.message || String(body?.error || 'Google Docs refused the request'))
  const url = body?.documentUrl || body?.editUrl || (body?.documentId ? `https://docs.google.com/document/d/${body.documentId}/edit` : null)
  if (!url) throw new Error('Google Docs did not return a document link')
  return { url, documentId: body?.documentId || null }
}

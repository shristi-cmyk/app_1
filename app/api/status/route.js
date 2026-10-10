import { readState } from '../../../lib/store.js'

export const dynamic = 'force-dynamic'

// Never returns auth ids or script ids: only what the page needs to draw itself.
export async function GET() {
  const s = readState()
  return Response.json({
    connected: { sheets: !!s.auth.sheets, docs: !!s.auth.docs, gmail: !!s.auth.gmail },
    active: s.subscription ? { ...s.subscription.config, tagOptions: undefined, createdAt: s.subscription.createdAt } : null
  })
}

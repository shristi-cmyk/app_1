import { NextResponse } from 'next/server'
import { postToSlack } from '../../../../lib/research.js'

export async function POST(req) {
  const { runId, channelId } = await req.json()
  if (!runId || !channelId) return NextResponse.json({ error: 'runId and channelId required' }, { status: 400 })
  try {
    await postToSlack(String(runId), String(channelId))
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

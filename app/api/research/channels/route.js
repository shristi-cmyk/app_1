import { NextResponse } from 'next/server'
import { listChannels } from '../../../../lib/research.js'

export const dynamic = 'force-dynamic'

export async function GET(req) {
  try {
    return NextResponse.json(await listChannels(new URL(req.url).searchParams.get('search') || ''))
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

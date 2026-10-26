import { NextResponse } from 'next/server'
import { embedToken } from '../../../../lib/research.js'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json(await embedToken(['slack']))
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

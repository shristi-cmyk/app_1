import { NextResponse } from 'next/server'
import { saveSlackConnection } from '../../../../lib/research.js'

export async function POST(req) {
  const { authId } = await req.json()
  if (!authId || typeof authId !== 'string') return NextResponse.json({ error: 'authId required' }, { status: 400 })
  saveSlackConnection(authId)
  return NextResponse.json({ ok: true })
}

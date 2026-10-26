import { NextResponse } from 'next/server'
import { runResearch } from '../../../../lib/research.js'

export const maxDuration = 300

export async function POST(req) {
  const { appName, appUrl, context } = await req.json()
  if (!appName?.trim() || !/^https?:\/\//i.test(appUrl || '')) return NextResponse.json({ error: 'Application name and a full http(s) URL are required' }, { status: 400 })
  try {
    return NextResponse.json(await runResearch({ appName: appName.trim(), appUrl: appUrl.trim(), context: context?.trim() }))
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

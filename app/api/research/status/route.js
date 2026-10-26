import { NextResponse } from 'next/server'
import { status } from '../../../../lib/research.js'

export const dynamic = 'force-dynamic'

export const GET = () => NextResponse.json(status())

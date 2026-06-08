import { NextResponse } from 'next/server'
import { buildScoreFrictionScopeState } from '@/lib/amv/scopes/scorefriction/scorefrictionStateConnector'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(await buildScoreFrictionScopeState())
}

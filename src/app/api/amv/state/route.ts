import { NextResponse } from 'next/server'
import { buildAllAmvScopeStates, buildAmvScopeState } from '@/lib/amv/core/amvStateBuilder'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const scope = searchParams.get('scope')
  if (!scope) {
    const scopes = await buildAllAmvScopeStates()
    return NextResponse.json({ ok: true, scopes })
  }

  const state = await buildAmvScopeState(scope)
  return NextResponse.json(state, { status: state.ok ? 200 : 404 })
}

import { NextResponse } from 'next/server'
import { runAmvRuntime } from '@/lib/amv/core/amvRuntime'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const payload = body as Record<string, unknown>
  const result = await runAmvRuntime({
    scope: typeof payload.scope === 'string' ? payload.scope : '',
    message: typeof payload.message === 'string' ? payload.message : '',
    selectedContext: payload.selectedContext,
  })

  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}

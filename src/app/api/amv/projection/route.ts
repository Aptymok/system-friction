import { NextResponse } from 'next/server'
import { runAmvProjection } from '@/lib/amv/core/amvProjectionEngine'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const payload = body && typeof body === 'object' ? body as Record<string, unknown> : {}
  return NextResponse.json(runAmvProjection({
    scope: typeof payload.scope === 'string' ? payload.scope : 'root',
    subject: typeof payload.subject === 'string' ? payload.subject : undefined,
    scenario: typeof payload.scenario === 'string' ? payload.scenario : undefined,
  }))
}

import { NextResponse } from 'next/server'
import { publishAmvGraphIntoRuntime } from '@/lib/sfi/cognitive-runtime/amvRuntimeBridge'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))

  const scope =
    typeof body.scope === 'string'
      ? body.scope
      : 'root'

  const subject =
    typeof body.subject === 'string'
      ? body.subject
      : scope

  const logbookId =
    typeof body.logbookId === 'string'
      ? body.logbookId
      : 'root'


  const result =
    await publishAmvGraphIntoRuntime(
      scope,
      subject,
      logbookId
    )


  return NextResponse.json({
    ok: true,
    result,
  })
}
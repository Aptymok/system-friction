import { NextResponse } from 'next/server'
import { sanitizeMophSessionPayload } from '@/lib/moph/session-contract'
import { getMophSession, saveMophSession } from '@/lib/moph/session-store'
import { mophToInstrumentState } from '@/lib/mihm/adapters/mophInstrumentAdapter'

export const dynamic = 'force-dynamic'

function instrumentStateFor(session: {
  sessionKey: string
  metrics: { ihg: number; nti: number; ldi: number; go: number; epsilon: number }
}) {
  return mophToInstrumentState({
    sessionId: session.sessionKey,
    ihg: session.metrics.ihg,
    nti: session.metrics.nti,
    ldi: session.metrics.ldi,
    go: session.metrics.go,
    epsilon: session.metrics.epsilon,
  })
}

export async function POST(request: Request) {
  const payload = sanitizeMophSessionPayload(await request.json().catch(() => ({})))
  if (payload.consentState === 'local_only') {
    return NextResponse.json({ ok: false, error: 'consent_required_for_persistence' }, { status: 400 })
  }

  const session = await saveMophSession(payload)
  return NextResponse.json({ ok: true, session, instrumentState: instrumentStateFor(session) })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sessionKey = searchParams.get('id') ?? searchParams.get('sessionKey')
  if (!sessionKey) return NextResponse.json({ ok: false, error: 'session_key_required' }, { status: 400 })
  const session = await getMophSession(sessionKey)
  return NextResponse.json(
    { ok: Boolean(session), session, instrumentState: session ? instrumentStateFor(session) : null },
    { status: session ? 200 : 404 },
  )
}

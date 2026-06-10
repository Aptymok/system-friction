import { NextResponse } from 'next/server'
import { sanitizeMophSessionPayload } from '@/lib/moph/session-contract'
import { getMophSession, saveMophSession } from '@/lib/moph/session-store'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const payload = sanitizeMophSessionPayload(await request.json().catch(() => ({})))
  if (payload.consentState === 'local_only') {
    return NextResponse.json({ ok: false, error: 'consent_required_for_persistence' }, { status: 400 })
  }

  const session = await saveMophSession(payload)
  return NextResponse.json({ ok: true, session })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sessionKey = searchParams.get('id') ?? searchParams.get('sessionKey')
  if (!sessionKey) return NextResponse.json({ ok: false, error: 'session_key_required' }, { status: 400 })
  const session = await getMophSession(sessionKey)
  return NextResponse.json({ ok: Boolean(session), session }, { status: session ? 200 : 404 })
}

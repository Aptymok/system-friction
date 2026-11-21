import { NextResponse } from 'next/server'
import { AccessDeniedError, requireAuthenticatedUser } from '@/lib/system/access/server'
import { getMophSession } from '@/lib/moph/session-store'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let ownerId: string
  try {
    ownerId = (await requireAuthenticatedUser()).user.id
  } catch (error) {
    if (error instanceof AccessDeniedError) return NextResponse.json({ ok: false, error: error.code }, { status: error.status })
    return NextResponse.json({ ok: false, error: 'authorization_failed' }, { status: 503 })
  }
  const { id } = await params
  if (!id || id.length > 128) return NextResponse.json({ ok: false, error: 'invalid_session_key' }, { status: 400 })
  const session = await getMophSession(id, ownerId)
  return NextResponse.json({ ok: Boolean(session), session }, { status: session ? 200 : 404 })
}

import { NextResponse } from 'next/server'
import { getMophSession } from '@/lib/moph/session-store'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getMophSession(id)
  return NextResponse.json({ ok: Boolean(session), session }, { status: session ? 200 : 404 })
}

import { NextResponse } from 'next/server'
import { buildReadingPersistenceContract } from '@/lib/amv/core/readingPersistenceTypes'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const payload = body && typeof body === 'object' ? body as Record<string, unknown> : {}
  return NextResponse.json(buildReadingPersistenceContract(typeof payload.scope === 'string' ? payload.scope : 'root', false))
}

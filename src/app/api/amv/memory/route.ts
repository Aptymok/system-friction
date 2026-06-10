import { NextResponse } from 'next/server'
import { clearAmvMemory, listAmvMemory } from '@/lib/amv/amv-memory'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const module = searchParams.get('module') ?? undefined
  const sessionId = searchParams.get('sessionId') ?? undefined
  const limit = Number(searchParams.get('limit') ?? 25)
  const memory = listAmvMemory({ module, sessionId, limit: Number.isFinite(limit) ? limit : 25 })
  return NextResponse.json({ ok: true, memory })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const module = searchParams.get('module') ?? undefined
  const sessionId = searchParams.get('sessionId') ?? undefined
  const result = clearAmvMemory({ module, sessionId })
  return NextResponse.json({ ok: true, ...result })
}

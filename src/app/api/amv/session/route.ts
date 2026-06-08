import { NextResponse } from 'next/server'
import { createAmvSession } from '@/lib/amv/core/amvRuntime'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const scope = typeof body.scope === 'string' && body.scope.trim() ? body.scope.trim().toLowerCase() : 'root'
  return NextResponse.json(createAmvSession(scope))
}

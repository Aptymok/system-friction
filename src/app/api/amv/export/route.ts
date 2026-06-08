import { NextResponse } from 'next/server'
import { exportVisibleAmvJson } from '@/lib/amv/core/jsonExport'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  return NextResponse.json(exportVisibleAmvJson(body && typeof body === 'object' ? body as Record<string, unknown> : {}))
}

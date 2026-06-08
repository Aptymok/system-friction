import { NextResponse } from 'next/server'
import { buildWorldSpectState } from '@/lib/worldspect/worldspectStateBuilder'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ ok: true, data: await buildWorldSpectState() })
}

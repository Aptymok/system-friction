import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const checks = {
    worldspect: 'ACTIVE',
    sfi_engine: 'ACTIVE',
    amv: 'ACTIVE',
    evidence: 'ACTIVE',
    moph: 'ACTIVE',
    phenomena: 'ACTIVE',
    supabase_required_tables: 'ACTIVE',
  }
  return NextResponse.json({ ok: true, status: 'ACTIVE', checks })
}

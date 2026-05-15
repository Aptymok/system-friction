import { NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServiceSupabaseClient()
  const { data: ihgStats, error } = await supabase
    .from('audits')
    .select('ihg')
    .not('ihg', 'is', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!ihgStats || ihgStats.length === 0) {
    return NextResponse.json({ globalAverageIHG: 0, globalVolatility: 0, totalAudits: 0, lastUpdated: new Date().toISOString() })
  }

  const ihgs = ihgStats.map((a: any) => a.ihg)
  const avgIHG = ihgs.reduce((a: number, b: number) => a + b, 0) / ihgs.length
  const variance = ihgs.map((v: number) => Math.pow(v - avgIHG, 2)).reduce((a: number, b: number) => a + b, 0) / ihgs.length
  const volatility = Math.sqrt(variance)

  return NextResponse.json({
    globalAverageIHG: avgIHG,
    globalVolatility: volatility,
    totalAudits: ihgs.length,
    lastUpdated: new Date().toISOString(),
  })
}

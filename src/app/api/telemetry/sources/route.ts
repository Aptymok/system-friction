import { NextRequest, NextResponse } from 'next/server'
import { requireServiceSupabaseClient } from '@/lib/supabase/server'
import { telemetrySourceSchema } from '@/lib/validation/schemas'

export async function POST(request: NextRequest) {
  const parsed = telemetrySourceSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Fuente invalida' }, { status: 400 })
  const supabase = requireServiceSupabaseClient()
  const { data: node } = await supabase.from('nodes').select('id,user_id').eq('id', parsed.data.nodeId).single()
  if (!node) return NextResponse.json({ success: false, error: 'Nodo no encontrado' }, { status: 404 })

  const { data, error } = await supabase
    .from('telemetry_sources')
    .insert({
      user_id: node.user_id,
      node_id: node.id,
      provider: parsed.data.provider,
      source_type: parsed.data.source_type,
      handle: parsed.data.handle,
      consent_scope: parsed.data.consent_scope,
      status: 'active'
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, source: data })
}

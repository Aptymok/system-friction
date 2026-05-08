import { NextRequest, NextResponse } from 'next/server'
import { appendEvent } from '@/lib/db/events'
import { requireServiceSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status = 'completed', evidence } = await request.json()
  const supabase = requireServiceSupabaseClient()
  const { data: action, error } = await supabase
    .from('actions')
    .update({
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : null
    })
    .eq('id', id)
    .select('*, nodes(user_id)')
    .single()

  if (error || !action) return NextResponse.json({ success: false, error: 'Accion no encontrada' }, { status: 404 })
  await appendEvent({
    user_id: action.nodes?.user_id,
    node_id: action.node_id,
    event_type: status === 'completed' ? 'action.completed' : 'action.missed',
    payload: { action_id: id, evidence }
  })
  return NextResponse.json({ success: true, action })
}

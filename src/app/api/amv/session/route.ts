import { NextRequest, NextResponse } from 'next/server'
import { buildAMVQuestion } from '@/lib/agents/amv'
import { appendEvent } from '@/lib/db/events'
import { getEntitlements } from '@/lib/licensing/entitlements'
import { requireServiceSupabaseClient } from '@/lib/supabase/server'
import { amvSessionSchema } from '@/lib/validation/schemas'

export async function POST(request: NextRequest) {
  const parsed = amvSessionSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Nodo requerido' }, { status: 400 })

  const supabase = requireServiceSupabaseClient()
  const { nodeId } = parsed.data
  const { data: node } = await supabase.from('nodes').select('*').eq('id', nodeId).single()
  if (!node) return NextResponse.json({ success: false, error: 'Nodo no encontrado' }, { status: 404 })

  const entitlements = await getEntitlements(node.user_id)
  if (!entitlements.observatory_base) return NextResponse.json({ success: false, error: 'instrumento no activado' }, { status: 403 })

  const [{ data: audits }, { data: actions }, { data: memoryFacts }] = await Promise.all([
    supabase.from('audits').select('*').eq('node_id', nodeId).order('created_at', { ascending: false }).limit(10),
    supabase.from('actions').select('*').eq('node_id', nodeId).order('created_at', { ascending: false }).limit(10),
    supabase.from('memory_facts').select('*').eq('node_id', nodeId).order('last_seen_at', { ascending: false }).limit(20)
  ])

  const question = buildAMVQuestion(
    {
      nodeId,
      objective: node.objective,
      audits: audits || [],
      actions: actions || [],
      memoryFacts: memoryFacts || [],
      metrics: {
        ihg: Number(node.current_ihg || 0),
        nti: Number(node.current_nti || 0.5),
        ldi: Number(node.current_ldi || 72),
        loop_score: Number(audits?.[0]?.loop_score || 0),
        divergence: Number(audits?.[0]?.divergence || 0)
      }
    },
    0
  )

  const { data: session } = await supabase
    .from('amv_sessions')
    .insert({ node_id: nodeId, user_id: node.user_id, question_count: 1 })
    .select('*')
    .single()

  if (session) {
    await supabase.from('amv_messages').insert({ session_id: session.id, node_id: nodeId, role: 'assistant', content: question, question_index: 0 })
    await appendEvent({ user_id: node.user_id, node_id: nodeId, event_type: 'amv.question_asked', payload: { session_id: session.id, question_index: 0 } })
  }

  return NextResponse.json({ success: true, session_id: session?.id, question, question_index: 0, max_questions: 3 })
}

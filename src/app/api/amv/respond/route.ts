import { NextRequest, NextResponse } from 'next/server'
import { buildAMVQuestion, finalizeAMV } from '@/lib/agents/amv'
import { appendEvent } from '@/lib/db/events'
import { requireServiceSupabaseClient } from '@/lib/supabase/server'
import { amvRespondSchema } from '@/lib/validation/schemas'

export async function POST(request: NextRequest) {
  const parsed = amvRespondSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Respuesta AMV invalida' }, { status: 400 })

  const supabase = requireServiceSupabaseClient()
  const { nodeId, sessionId, answer, questionIndex } = parsed.data
  const { data: node } = await supabase.from('nodes').select('*').eq('id', nodeId).single()
  if (!node) return NextResponse.json({ success: false, error: 'Nodo no encontrado' }, { status: 404 })

  const [{ data: audits }, { data: actions }, { data: memoryFacts }] = await Promise.all([
    supabase.from('audits').select('*').eq('node_id', nodeId).order('created_at', { ascending: false }).limit(10),
    supabase.from('actions').select('*').eq('node_id', nodeId).order('created_at', { ascending: false }).limit(10),
    supabase.from('memory_facts').select('*').eq('node_id', nodeId).order('last_seen_at', { ascending: false }).limit(20)
  ])

  const context = {
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
  }

  if (sessionId) await supabase.from('amv_messages').insert({ session_id: sessionId, node_id: nodeId, role: 'user', content: answer, question_index: questionIndex })

  if (questionIndex >= 2) {
    const final = finalizeAMV(context, answer)
    if (sessionId) {
      await supabase
        .from('amv_sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString(), final_reading: final, question_count: 3 })
        .eq('id', sessionId)
      await supabase.from('amv_messages').insert({ session_id: sessionId, node_id: nodeId, role: 'assistant', content: JSON.stringify(final), question_index: 2 })
    }
    await supabase.from('actions').insert({
      node_id: nodeId,
      description: final.minimum_action,
      verification_criterion: final.verification_criterion,
      due_at: final.deadline
    })
    await appendEvent({ user_id: node.user_id, node_id: nodeId, event_type: 'amv.session_completed', payload: final })
    await appendEvent({ user_id: node.user_id, node_id: nodeId, event_type: 'action.created', payload: { description: final.minimum_action, due_at: final.deadline } })
    return NextResponse.json({ success: true, completed: true, final })
  }

  const nextIndex = questionIndex + 1
  const question = buildAMVQuestion(context, nextIndex, answer)
  if (sessionId) {
    await supabase.from('amv_sessions').update({ question_count: nextIndex + 1 }).eq('id', sessionId)
    await supabase.from('amv_messages').insert({ session_id: sessionId, node_id: nodeId, role: 'assistant', content: question, question_index: nextIndex })
  }
  await appendEvent({ user_id: node.user_id, node_id: nodeId, event_type: 'amv.question_asked', payload: { session_id: sessionId, question_index: nextIndex } })
  return NextResponse.json({ success: true, completed: false, question, question_index: nextIndex, max_questions: 3 })
}

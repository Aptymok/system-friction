import { NextRequest, NextResponse } from 'next/server'
import { executeAudit } from '@/lib/agents/auditor'
import { appendEvent } from '@/lib/db/events'
import { checkRateLimit, rateLimitKey } from '@/lib/auth/rateLimit'
import { extractMemoryFacts } from '@/lib/memory/facts'
import { storeMemoryVector } from '@/lib/memory/embeddings'
import { requireServiceSupabaseClient } from '@/lib/supabase/server'
import { intakeSchema } from '@/lib/validation/schemas'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'local'
  const limit = checkRateLimit(rateLimitKey('intake', ip), 8, 60_000)
  if (!limit.allowed) return NextResponse.json({ success: false, error: 'Demasiadas activaciones. Espera un ciclo.' }, { status: 429 })

  const parsed = intakeSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Entrada insuficiente para crear nodo.' }, { status: 400 })
  }

  try {
    const supabase = requireServiceSupabaseClient()
    const input = parsed.data
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: input.email,
      email_confirm: false,
      user_metadata: { alias: input.alias }
    })

    if (authError?.message.toLowerCase().includes('already')) {
      return NextResponse.json({ success: false, error: 'Identidad existente. Sincroniza por login para crear continuidad.' }, { status: 409 })
    }

    if (authError) {
      return NextResponse.json({ success: false, error: authError.message }, { status: 400 })
    }

    const userId = authUser.user?.id
    if (!userId) return NextResponse.json({ success: false, error: 'No se pudo crear identidad operacional.' }, { status: 500 })
    const baselineNarrative = `Objetivo: ${input.objective}\nFriccion actual: ${input.current_friction}`
    const auditResult = await executeAudit({ narrative: baselineNarrative })

    await supabase.from('profiles').upsert({
      user_id: userId,
      alias: input.alias,
      email: input.email,
      last_seen_at: new Date().toISOString()
    })

    const { data: node, error: nodeError } = await supabase
      .from('nodes')
      .insert({
        user_id: userId,
        alias: input.alias,
        source: 'web',
        objective: input.objective,
        current_ihg: auditResult.ihg,
        current_nti: auditResult.nti,
        current_ldi: auditResult.ldi,
        current_severity: auditResult.divergence,
        active_pattern: auditResult.pattern,
        last_sync: new Date().toISOString()
      })
      .select('*')
      .single()

    if (nodeError || !node) throw nodeError || new Error('No se pudo crear nodo.')

    const { data: session, error: sessionError } = await supabase
      .from('intake_sessions')
      .insert({
        user_id: userId,
        node_id: node.id,
        alias: input.alias,
        email: input.email,
        objective: input.objective,
        current_friction: input.current_friction,
        initial_ihg: auditResult.ihg,
        initial_nti: auditResult.nti,
        initial_ldi: auditResult.ldi,
        initial_pattern: auditResult.pattern,
        initial_severity: auditResult.divergence
      })
      .select('*')
      .single()

    if (sessionError || !session) throw sessionError || new Error('No se pudo crear sesion de entrada.')

    await supabase.from('intake_responses').insert([
      { intake_session_id: session.id, question_key: 'alias', answer: input.alias },
      { intake_session_id: session.id, question_key: 'email', answer: input.email },
      { intake_session_id: session.id, question_key: 'objective', answer: input.objective },
      { intake_session_id: session.id, question_key: 'current_friction', answer: input.current_friction }
    ])

    const { data: audit } = await supabase
      .from('audits')
      .insert({
        node_id: node.id,
        source: 'web',
        narrative: baselineNarrative,
        ihg: auditResult.ihg,
        nti: auditResult.nti,
        ldi: auditResult.ldi,
        verdict: auditResult.verdict,
        diagnosis: auditResult.diagnosis,
        loop_score: auditResult.loop_score,
        divergence: auditResult.divergence,
        pattern: auditResult.pattern,
        hard_stop: auditResult.hard_stop,
        proposed_action: auditResult.proposed_action
      })
      .select('*')
      .single()

    if (audit) {
      await supabase.from('actions').insert({
        node_id: node.id,
        audit_id: audit.id,
        description: auditResult.proposed_action,
        verification_criterion: 'Debe existir evidencia observable antes del siguiente ciclo.',
        due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })

      const facts = extractMemoryFacts({ node_id: node.id, audit_id: audit.id, narrative: baselineNarrative, result: auditResult })
      if (facts.length) await supabase.from('memory_facts').insert(facts)
      await storeMemoryVector({
        node_id: node.id,
        source_table: 'audits',
        source_id: audit.id,
        content: baselineNarrative,
        metadata: { pattern: auditResult.pattern, intake_session_id: session.id }
      })
    }

    await appendEvent({ user_id: userId, node_id: node.id, event_type: 'node.created', payload: { alias: input.alias } })
    await appendEvent({ user_id: userId, node_id: node.id, event_type: 'intake.completed', payload: { intake_session_id: session.id, pattern: auditResult.pattern } })

    return NextResponse.json({ success: true, user_id: userId, node_id: node.id, intake_session_id: session.id })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: 'Persistencia operacional no disponible.' }, { status: 500 })
  }
}

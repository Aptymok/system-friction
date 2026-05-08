import { NextRequest, NextResponse } from 'next/server'
import { executeAudit } from '@/lib/agents/auditor'
import { LongitudinalEngine } from '@/lib/agents/longitudinal'
import { appendEvent } from '@/lib/db/events'
import { extractMemoryFacts } from '@/lib/memory/facts'
import { storeMemoryVector } from '@/lib/memory/embeddings'
import { createAudit, createNode, getAudits, getNode } from '@/lib/store/runtimeStore'
import { createServiceSupabaseClient } from '@/lib/supabase/server'
import type { AuditRequest } from '@/lib/types'
import { auditSchema } from '@/lib/validation/schemas'

export async function POST(request: NextRequest) {
  try {
    const parsed = auditSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ success: false, error: 'Entrada de auditoria invalida' }, { status: 400 })
    const body = parsed.data as AuditRequest
    const source = body.source || 'web'
    const supabase = createServiceSupabaseClient()

    if (supabase && body.nodeId) {
      const { data: node } = await supabase.from('nodes').select('*').eq('id', body.nodeId).single()
      if (!node) return NextResponse.json({ success: false, error: 'Nodo no encontrado' }, { status: 404 })

      const [{ data: history }, { data: actions }, { data: memoryFacts }] = await Promise.all([
        supabase.from('audits').select('*').eq('node_id', node.id).order('created_at', { ascending: false }).limit(12),
        supabase.from('actions').select('*').eq('node_id', node.id).order('created_at', { ascending: false }).limit(12),
        supabase.from('memory_facts').select('*').eq('node_id', node.id).order('last_seen_at', { ascending: false }).limit(30)
      ])

      const narrative = body.narrative || body.responses?.map((response) => response.answer).join(' | ') || ''
      const baseResult = await executeAudit({
        narrative: body.narrative,
        responses: body.responses,
        history: (history || []).map((audit) => ({
          ihg: Number(audit.ihg || 0),
          nti: Number(audit.nti || 0.5),
          narrative: audit.narrative,
          created_at: audit.created_at
        }))
      })

      const longitudinal = LongitudinalEngine.evaluate({
        currentNarrative: narrative,
        currentMetrics: {
          ihg: baseResult.ihg,
          nti: baseResult.nti,
          ldi: baseResult.ldi,
          loop_score: baseResult.loop_score,
          divergence: baseResult.divergence
        },
        audits: (history || []).map((audit) => ({
          ...audit,
          ihg: Number(audit.ihg || 0),
          nti: Number(audit.nti || 0.5),
          ldi: Number(audit.ldi || 0),
          loop_score: Number(audit.loop_score || 0),
          divergence: Number(audit.divergence || 0)
        })),
        actions: (actions || []).map((action) => ({
          id: action.id,
          description: action.description,
          verification_criterion: action.verification_criterion,
          status: action.status,
          due_at: action.due_at,
          completed_at: action.completed_at
        })),
        memoryFacts: (memoryFacts || []).map((fact) => ({
          fact_type: fact.fact_type,
          label: fact.label,
          value: fact.value,
          confidence: Number(fact.confidence || 0.5),
          recurrence_count: Number(fact.recurrence_count || 1)
        }))
      })

      const result = {
        ...baseResult,
        ...longitudinal.adjustedMetrics,
        pattern: longitudinal.pattern,
        hard_stop: longitudinal.risk === 'hard_stop',
        proposed_action: longitudinal.minimumAction,
        diagnosis: `${baseResult.diagnosis}\n\nMemoria longitudinal: severidad ${longitudinal.severity.toFixed(3)}; riesgo ${longitudinal.risk}; pregunta futura: ${longitudinal.nextQuestion}`
      }

      const { data: audit, error: auditError } = await supabase
        .from('audits')
        .insert({
          node_id: node.id,
          source,
          narrative: narrative || null,
          ihg: result.ihg,
          nti: result.nti,
          ldi: result.ldi,
          verdict: result.verdict,
          diagnosis: result.diagnosis,
          loop_score: result.loop_score,
          divergence: result.divergence,
          pattern: result.pattern,
          hard_stop: result.hard_stop,
          proposed_action: result.proposed_action
        })
        .select('*')
        .single()

      if (auditError || !audit) throw auditError || new Error('No se pudo persistir auditoria.')

      const dueAt = new Date(Date.now() + (longitudinal.risk === 'hard_stop' ? 2 : 24) * 60 * 60 * 1000).toISOString()
      await supabase.from('actions').insert({
        node_id: node.id,
        audit_id: audit.id,
        description: result.proposed_action,
        verification_criterion: longitudinal.verificationCriterion,
        due_at: dueAt
      })

      const facts = extractMemoryFacts({ node_id: node.id, audit_id: audit.id, narrative, result })
      if (facts.length) await supabase.from('memory_facts').insert(facts)

      await storeMemoryVector({
        node_id: node.id,
        source_table: 'audits',
        source_id: audit.id,
        content: narrative || result.diagnosis,
        metadata: { pattern: result.pattern, severity: longitudinal.severity, risk: longitudinal.risk }
      })

      await supabase
        .from('nodes')
        .update({
          current_ihg: result.ihg,
          current_nti: result.nti,
          current_ldi: result.ldi,
          current_severity: longitudinal.severity,
          active_pattern: result.pattern,
          last_sync: new Date().toISOString(),
          last_resolution_at: new Date().toISOString()
        })
        .eq('id', node.id)

      await appendEvent({ user_id: node.user_id, node_id: node.id, event_type: 'audit.created', payload: { audit_id: audit.id, severity: longitudinal.severity } })
      await appendEvent({ user_id: node.user_id, node_id: node.id, event_type: 'pattern.detected', payload: { pattern: result.pattern, risk: longitudinal.risk } })
      await appendEvent({ user_id: node.user_id, node_id: node.id, event_type: 'action.created', payload: { description: result.proposed_action, due_at: dueAt } })
      if (result.hard_stop) await appendEvent({ user_id: node.user_id, node_id: node.id, event_type: 'hard_stop.triggered', payload: { audit_id: audit.id } })

      return NextResponse.json({ success: true, node_id: node.id, audit_id: audit.id, audit, longitudinal, ...result })
    }

    let node = getNode(body.nodeId, body.whatsapp_phone)
    node ||= createNode(source, body.whatsapp_phone)

    const history = getAudits(node.id, 5)
    const result = await executeAudit({
      narrative: body.narrative,
      responses: body.responses,
      history: history.map((audit) => ({
        ihg: audit.ihg,
        nti: audit.nti,
        narrative: audit.narrative,
        created_at: audit.created_at
      }))
    })

    const audit = createAudit({
      node_id: node.id,
      source,
      narrative: body.narrative || body.responses?.map((r) => r.answer).join(' | ') || null,
      ihg: result.ihg,
      nti: result.nti,
      ldi: result.ldi,
      verdict: result.verdict,
      diagnosis: result.diagnosis,
      loop_score: result.loop_score,
      divergence: result.divergence,
      pattern: result.pattern,
      hard_stop: result.hard_stop,
      proposed_action: result.proposed_action
    })

    return NextResponse.json({ success: true, node_id: node.id, audit_id: audit.id, audit, ...result })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: 'Error al procesar auditoria' }, { status: 500 })
  }
}

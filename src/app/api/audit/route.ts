import { NextRequest, NextResponse } from 'next/server'
import { executeAudit } from '@/lib/agents/auditor'
import { createAudit, createNode, getAudits, getNode } from '@/lib/store/runtimeStore'
import type { AuditRequest } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AuditRequest
    const source = body.source || 'web'
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

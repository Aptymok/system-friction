import { NextRequest, NextResponse } from 'next/server'
import { MOPH_QUESTIONS } from '@/lib/agents/systemPrompt'
import { executeAudit } from '@/lib/agents/auditor'
import { createAudit, createLink, createNode, getAudits } from '@/lib/store/runtimeStore'
import { generateToken } from '@/lib/utils/tokens'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const from = body.from as string | undefined
  const responses = body.responses as string[] | undefined
  const node = createNode('whatsapp', from || null)

  if (!responses?.length) {
    return NextResponse.json({
      message: `System Friction · MOP-H\n\n${MOPH_QUESTIONS[0]}`
    })
  }

  if (responses.length < MOPH_QUESTIONS.length) {
    return NextResponse.json({ message: MOPH_QUESTIONS[responses.length] })
  }

  const result = await executeAudit({
    responses: responses.map((answer, index) => ({ question_number: index + 1, answer })),
    history: getAudits(node.id, 5)
  })
  const audit = createAudit({
    node_id: node.id,
    source: 'whatsapp',
    narrative: responses.join(' | '),
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

  const token = generateToken()
  createLink(node.id, token, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return NextResponse.json({
    audit_id: audit.id,
    message:
      `AUDITORIA MOP-H COMPLETADA\n` +
      `IHG: ${result.ihg.toFixed(3)} | NTI: ${result.nti.toFixed(3)} | LDI: ${result.ldi}h\n` +
      `Patron: ${result.pattern}\n` +
      `Veredicto: ${result.verdict}\n` +
      `Terminal: ${baseUrl}/link/${token}`
  })
}

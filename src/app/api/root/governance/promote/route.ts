import { NextResponse } from 'next/server';
import { appendOperationalEvent, recordValue, stringValue } from '@/lib/operational/common';
import { normalizeProposalState } from '@/lib/governance/proposalLifecycle';
import { auditRootAction, requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Row = Record<string, unknown>;
function strings(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : []; }

export async function POST(request: Request) {
  const gate = await requireRootActor('governance.promotion.accept');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const body = await request.json().catch(() => ({})) as Row;
  const proposalId = stringValue(body.proposal_id);
  const identifier = stringValue(body.identifier);
  const version = stringValue(body.version);
  const evidence = strings(body.evidence_refs);
  const tests = strings(body.tests);
  const reproducibility = strings(body.reproducibility);
  const migration = stringValue(body.migration_plan);
  const rollback = stringValue(body.rollback_plan);
  const limitations = strings(body.limitations);
  if (!proposalId || !identifier || !version || !evidence.length || !tests.length || !reproducibility.length || !migration || !rollback) {
    return NextResponse.json({ ok:false,error:'promotion_contract_incomplete',required:['proposal_id','identifier','version','evidence_refs[]','tests[]','reproducibility[]','migration_plan','rollback_plan'] }, { status:400 });
  }

  const current = await gate.ctx.service.from('action_proposals').select('*').eq('id',proposalId).single();
  if (current.error || !current.data) return NextResponse.json({ok:false,error:current.error?.message??'proposal_not_found'},{status:404});
  const state = normalizeProposalState(current.data.status);
  if (state !== 'accepted') return NextResponse.json({ok:false,error:'promotion_requires_accepted_realization',state},{status:409});
  const outcome = recordValue(current.data.outcome);
  const previousPatch = recordValue(outcome.payloadPatch);
  if (previousPatch.outcomeRecorded !== true && recordValue(outcome).outcomeRecorded !== true) {
    return NextResponse.json({ok:false,error:'promotion_requires_recorded_return'},{status:409});
  }

  const occurredAt = new Date().toISOString();
  const receipt = {
    schemaVersion:'SFI-GOVERNANCE-PROMOTION-RECEIPT-1.0',
    proposalId,
    identifier,
    version,
    promotedBy:gate.ctx.user.id,
    promotedAt:occurredAt,
    evidenceRefs:evidence,
    tests,
    reproducibility,
    migrationPlan:migration,
    rollbackPlan:rollback,
    limitations,
    previousStatus:state,
  };
  const event = await appendOperationalEvent({eventName:'governance.promotion.accepted',actorId:gate.ctx.user.id,confidence:1,payload:receipt,lineage:[proposalId]});
  if (!event.ok) return NextResponse.json(event,{status:400});

  const nextOutcome = { ...outcome, promotionReceipt:{...receipt,eventId:event.data.id}, updatedAt:occurredAt };
  const write = await gate.ctx.service.from('action_proposals').update({outcome:nextOutcome,updated_at:occurredAt}).eq('id',proposalId).eq('status',current.data.status).select('*').single();
  if (write.error) return NextResponse.json({ok:false,error:'promotion_receipt_write_failed',details:write.error.message},{status:500});
  const audit = await auditRootAction({actorId:gate.ctx.user.id,action:'governance.promotion.accept',target:`action_proposal:${proposalId}`,payload:{identifier,version,eventId:event.data.id},request});
  if (!audit.ok) return NextResponse.json(audit,{status:500});
  return NextResponse.json({ok:true,receipt:{...receipt,eventId:event.data.id},proposal:write.data,audit});
}

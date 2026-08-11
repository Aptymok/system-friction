import 'server-only';

import { appendOperationalEvent, requireGovernedActor } from '@/lib/operational/common';
import { readInstitutionalReadiness } from './readInstitutionalReadiness';

export type TotalProofStage = {
  id: 'STRUCTURAL' | 'AUTHORITY' | 'OBSERVATION' | 'INTERVENTION' | 'RETURN' | 'LAB' | 'LEARNING' | 'REPORTING';
  pass: boolean;
  evidence: string[];
  missing: string[];
};

function moduleById(readiness: Awaited<ReturnType<typeof readInstitutionalReadiness>>, id: string) {
  return readiness.modules.find(item => item.id === id);
}
function countEvidence(evidence: string[], prefix: string) {
  const raw = evidence.find(item => item.startsWith(`${prefix}:`))?.slice(prefix.length + 1) ?? '';
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function evaluateTotalProof() {
  const readiness = await readInstitutionalReadiness();
  const governance = moduleById(readiness, 'governance');
  const world = moduleById(readiness, 'world');
  const evidence = moduleById(readiness, 'evidence');
  const field = moduleById(readiness, 'field');
  const lab = moduleById(readiness, 'method_lab');
  const twin = moduleById(readiness, 'cognitive_twin');
  const reports = moduleById(readiness, 'reports');
  const fieldCases = countEvidence(field?.evidence ?? [], 'field_cases');
  const fieldInterventions = countEvidence(field?.evidence ?? [], 'field_interventions');
  const fieldReturns = countEvidence(field?.evidence ?? [], 'field_returns');
  const fieldOutcomes = countEvidence(field?.evidence ?? [], 'field_outcomes');
  const twinEpochs = Number((twin?.evidence.find(item => item.startsWith('epochs:')) ?? 'epochs:0').split(':')[1] ?? 0);
  const reportCount = Number((reports?.evidence.find(item => item.startsWith('reports:')) ?? 'reports:0').split(':')[1] ?? 0);
  const labRuns = (lab?.evidence ?? []).reduce((sum, item) => {
    const parts = item.split(':');
    const count = Number(parts.at(-1));
    return sum + (Number.isFinite(count) ? count : 0);
  }, 0);

  const stages: TotalProofStage[] = [
    {id:'STRUCTURAL',pass:readiness.structuralComplete,evidence:[`structuralComplete:${readiness.structuralComplete}`],missing:readiness.structuralComplete?[]:readiness.blockers},
    {id:'AUTHORITY',pass:Boolean(governance && ['OPERATIONAL','READY'].includes(governance.state) && !governance.blockers.length),evidence:governance?.evidence??[],missing:governance?.blockers??['governance_module_missing']},
    {id:'OBSERVATION',pass:Boolean(world?.observed && evidence?.observed && !world.blockers.length && !evidence.blockers.length),evidence:[...(world?.evidence??[]),...(evidence?.evidence??[])],missing:[...(world?.blockers??[]),...(evidence?.blockers??[]),...(world?.observed?[]:['world_not_observed']),...(evidence?.observed?[]:['evidence_not_observed'])]},
    {id:'INTERVENTION',pass:fieldCases>0 && fieldInterventions>0,evidence:[`field_cases:${fieldCases}`,`field_interventions:${fieldInterventions}`],missing:[...(fieldCases>0?[]:['field_case_required']),...(fieldInterventions>0?[]:['field_intervention_required'])]},
    {id:'RETURN',pass:fieldReturns>0 && fieldOutcomes>0,evidence:[`field_returns:${fieldReturns}`,`field_outcomes:${fieldOutcomes}`],missing:[...(fieldReturns>0?[]:['field_return_required']),...(fieldOutcomes>0?[]:['field_outcome_required'])]},
    {id:'LAB',pass:labRuns>0,evidence:[`method_lab_runs:${labRuns}`,...(lab?.evidence??[])],missing:labRuns>0?[]:['method_lab_run_required']},
    {id:'LEARNING',pass:twinEpochs>0,evidence:[`ct_epochs:${twinEpochs}`,...(twin?.evidence??[])],missing:twinEpochs>0?[]:['ct_longitudinal_epoch_required']},
    {id:'REPORTING',pass:reportCount>0,evidence:[`reports:${reportCount}`,...(reports?.evidence??[])],missing:reportCount>0?[]:['institutional_report_required']},
  ];
  const structuralPass = stages.filter(stage => ['STRUCTURAL','AUTHORITY'].includes(stage.id)).every(stage => stage.pass);
  const livePass = stages.filter(stage => ['STRUCTURAL','AUTHORITY','OBSERVATION','INTERVENTION','LAB','LEARNING','REPORTING'].includes(stage.id)).every(stage => stage.pass);
  const longitudinalPass = stages.every(stage => stage.pass);
  return {
    generatedAt:new Date().toISOString(),
    contractVersion:'SFI-TOTAL-PROOF-1.0',
    structuralPass,
    livePass,
    longitudinalPass,
    stages,
    truthBoundary:'LONGITUDINAL PASS requires an observed Field return/outcome. A software build, simulation, proposal or registered fork cannot satisfy that condition.',
    externalGates:readiness.externalGates,
  };
}

export async function recordTotalProofReceipt() {
  const gate = await requireGovernedActor('root.total-proof.record');
  if (!gate.ok) return gate;
  if (!gate.ctx.isRoot) return { ok:false as const, status:403, body:{ok:false,error:'root_required'} };
  const proof = await evaluateTotalProof();
  const event = await appendOperationalEvent({
    eventName:'institutional.total_proof.recorded',
    actorId:gate.ctx.user.id,
    confidence:1,
    payload:{ contractVersion:proof.contractVersion, structuralPass:proof.structuralPass, livePass:proof.livePass, longitudinalPass:proof.longitudinalPass, stages:proof.stages, externalGates:proof.externalGates, truthBoundary:proof.truthBoundary },
  });
  return { ok:true as const, status:200, body:{ok:true,proof,event} };
}

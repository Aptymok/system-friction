import { NextRequest, NextResponse } from 'next/server';
import { appendLogbookEntry } from '@/lib/logbook/query';
import { buildOperationalCycle } from '@/lib/scorefriction/operationalCycle';
import { deriveAdaptiveTrajectoryPlan, evaluateRegimeWatch } from '@/lib/scorefriction/regimeWatch';
import { deriveHypothesisIntakeFromNarrative } from '@/lib/sfi/caseIntakeResolver';
import { createActionProposal, sha256 } from '@/lib/operational/common';
import { auditRootAction, requireRootActor } from '@/lib/root/server';
import { readUniversalCycleHistory } from '@/lib/sfi/universalSignalCycle';
import { hasVerifiedLatestUniversalReturnCalibration } from '@/lib/sfi/universalCalibrationState';
import { readOperationalCase } from '@/lib/sfi/case-platform/repository';

export const dynamic = 'force-dynamic';

async function readWatch(request: NextRequest, body?: Record<string, unknown>) {
  const case_id = String(body?.case_id ?? request.nextUrl.searchParams.get('case_id') ?? 'SFI-OP-LOCAL');
  const state = await buildOperationalCycle({ case_id, scope: 'culture', analysis_modes: ['WSV', 'SCOREFRICTION', 'AMV'] });
  return evaluateRegimeWatch(state);
}

export async function GET(request: NextRequest) {
  return NextResponse.json(await readWatch(request));
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (body?.operation === 'adaptive_plan') {
    // Existing regime-watch reads remain unchanged. Adaptive drafts are ROOT
    // scoped; neither client-supplied evidence nor an LLM grants execution.
    const gate = await requireRootActor('scorefriction.adaptive.plan');
    if (!gate.ok) return NextResponse.json(gate.body,{status:gate.status});
    const caseId = typeof body.case_id === 'string' ? body.case_id.trim() : '';
    const narrative = body.narrative && typeof body.narrative === 'object' && !Array.isArray(body.narrative)
      ? body.narrative as Record<string,unknown> : {};
    const chosenAttractor = typeof narrative.chosenAttractor === 'string'
      ? narrative.chosenAttractor.trim() : '';
    if (!caseId || caseId.length > 160 || !chosenAttractor || chosenAttractor.length > 1800) {
      return NextResponse.json({ok:false,error:'CASE_ID_AND_ELECTED_ATTRACTOR_REQUIRED'},{status:400});
    }
    // The case ID must resolve through the same OAuth subject/tenant as the
    // calling ROOT actor. ScoreFriction's per-case observation store is a
    // *different* ledger: its observations cannot certify Case evidence.
    let caseEnvelope:Awaited<ReturnType<typeof readOperationalCase>>;
    try {
      caseEnvelope=await readOperationalCase(caseId,gate.ctx.user.id);
    } catch {
      return NextResponse.json({ok:false,error:'CASE_NOT_ACCESSIBLE_OR_NOT_FOUND',
        boundary:'No cross-tenant Case lookup or implicit Case creation.'},{status:404});
    }
    const admittedEvidence=caseEnvelope.objects.filter(object=>
      object.kind==='EVIDENCE' && object.epistemicRole==='EVIDENCE' &&
      Boolean(object.canonicalRef.id) &&
      (object.sourceRefs.length>0 || object.recordRefs.length>0)
    );
    const admittedEvidenceRefs=admittedEvidence.map(object=>object.canonicalRef.id);
    const caseIsActive=['OPEN','OBSERVING','ANALYZING'].includes(caseEnvelope.caseRecord.status);
    const hasDeclaredAttractor=caseEnvelope.caseRecord.attractorRefs.length>0;
    const hypothesis = deriveHypothesisIntakeFromNarrative(narrative);
    const state = await buildOperationalCycle({
      case_id:caseId,scope:'project',
      objective:chosenAttractor,
      evaluated_object:body.evaluated_object,
      analysis_modes:['MIHM','PSI','WORLDSPECT','SCOREFRICTION','AMV'],
      run_contrast:true,
    });
    // Keep cultural/ScoreFriction readings for analysis but never upgrade them
    // to admitted Case EVIDENCE. The eligibility check consumes only canonical
    // evidence objects admitted under the caller's Case tenant.
    const scoreFrictionObservationCount=state.evidence.length;
    state.evidence=admittedEvidence.map(object=>({
      id:object.canonicalRef.id,
      kind:object.kind,
      epistemicRole:object.epistemicRole,
      caseId,
      sourceRefIds:object.sourceRefs.map(ref=>ref.id),
      recordRefIds:object.recordRefs.map(ref=>ref.id),
    }));
    const priorCycleId=typeof body.priorUniversalCycleId==='string' ? body.priorUniversalCycleId.trim() : '';
    let verifiedPreviousReturn:null|{
      classification:'CONFIRMED'|'PARTIAL'|'CONTRADICTED';
      eventId:string;evidenceRefs:string[];
    }=null;
    if (priorCycleId) {
      const history=await readUniversalCycleHistory(priorCycleId);
      if (!history.ok) return NextResponse.json({ok:false,error:'PRIOR_CYCLE_READ_FAILED',
        details:history.error??null},{status:503});
      const opening=history.opened?.payload && typeof history.opened.payload==='object'
        ? history.opened.payload as Record<string,unknown>:{};
      if (opening.objectKey!==caseId || opening.tenantId!=='sfi') {
        return NextResponse.json({ok:false,error:'PRIOR_CYCLE_CASE_OR_TENANT_MISMATCH'},{status:409});
      }
      if (hasVerifiedLatestUniversalReturnCalibration(history.events)) {
        const latest=history.returnContrasts?.at(-1);
        const payload=latest?.payload && typeof latest.payload==='object'
          ? latest.payload as Record<string,unknown>:{};
        const classification=String(payload.classification??'');
        const evidenceRefs=Array.isArray(payload.returnEvidenceRefs)
          ? payload.returnEvidenceRefs.filter((id):id is string=>typeof id==='string'&&Boolean(id.trim())) : [];
        if (['CONFIRMED','PARTIAL','CONTRADICTED'].includes(classification) &&
          typeof latest?.event_id==='string' && evidenceRefs.length) {
          verifiedPreviousReturn={
            classification:classification as 'CONFIRMED'|'PARTIAL'|'CONTRADICTED',
            eventId:latest.event_id,evidenceRefs,
          };
        }
      }
    }
    const plan = deriveAdaptiveTrajectoryPlan({
      state,electedAttractor:chosenAttractor,
      hypothesisPrimary:hypothesis.proposedHypothesis,
      hypothesisRival:hypothesis.proposedRival,
      verifiedPreviousReturn,
      casePreconditions:{
        lifecycleEligible:caseIsActive,
        declaredAttractorPresent:hasDeclaredAttractor,
      },
    });
    const sourceSnapshot = state.world_vector && typeof state.world_vector === 'object'
      ? state.world_vector as Record<string,unknown> : {};
    const snapshotRef = typeof sourceSnapshot.id === 'string' ? sourceSnapshot.id
      : typeof sourceSnapshot.created_at === 'string' ? sourceSnapshot.created_at : null;
    const planHash = sha256({
      contract:plan.contract,caseId,attractor:chosenAttractor,
      chosenRoute:plan.selectedRouteId,sourceSnapshot:snapshotRef,
      primary:hypothesis.proposedHypothesis,rival:hypothesis.proposedRival,
      observation:plan.observation.watch,
      route:plan.routes.find(route=>route.id===plan.selectedRouteId),
      previouslyVerifiedReturn:verifiedPreviousReturn?.eventId??null,
      weakSignals:plan.observation.weakSignalCount,
      caseEvidenceRefs:state.evidence.map(value=>{
        const entry=value && typeof value==='object' ? value as Record<string,unknown> : {};
        return typeof entry.id==='string' ? entry.id : null;
      }).filter(Boolean),
    });
    const selected=plan.routes.find(route=>route.id===plan.selectedRouteId)!;
    if (body.commitDraft !== true) return NextResponse.json({
      ok:true,mode:'READ_ONLY_PLAN',plan,planHash,
      hypothesis:{status:hypothesis.status,missing:hypothesis.missing,
        proposedTestContract:hypothesis.proposedTestContract},
      caseReadiness:{
        caseStatus:caseEnvelope.caseRecord.status,
        presentSourceTypes:caseEnvelope.readiness.presentSourceTypes,
        missingSources:caseEnvelope.readiness.missingSources,
        admittedEvidenceCount:admittedEvidenceRefs.length,
        nonAdmittedScoreFrictionObservationCount:scoreFrictionObservationCount,
        hasDeclaredAttractor,
        objectKinds:caseEnvelope.objects.map(object=>object.kind),
      },
      next:'To register a governed, non-executing draft, explicitly request commitDraft=true.',
    },{headers:{'Cache-Control':'no-store'}});
    if (!plan.canCreateDraftProposal || !hypothesis.proposedTestContract || !snapshotRef) {
      return NextResponse.json({ok:false,error:'ADAPTIVE_PROPOSAL_NOT_EVIDENCE_READY',
        plan,planHash,required:'Persisted case evidence, valid world snapshot, supported bounded experiment, H1/H2, and governance review.'},{status:409});
    }
    const prior = await gate.ctx.service.from('action_proposals')
      .select('id,status,expected_field_delta')
      .eq('proposal_type','trajectory_reconfiguration')
      .order('created_at',{ascending:false}).limit(80);
    if (prior.error) return NextResponse.json({ok:false,error:'TRAJECTORY_DEDUP_READ_FAILED',
      details:prior.error.message},{status:503});
    const repeated=(prior.data??[]).find(row=>{
      const delta=row.expected_field_delta && typeof row.expected_field_delta==='object'
        ? row.expected_field_delta as Record<string,unknown>:{};
      return delta.contentHash===planHash && !['rejected','superseded','frozen'].includes(String(row.status));
    });
    if (repeated) return NextResponse.json({
      ok:true,reused:true,proposalId:repeated.id,planHash,plan,
      status:repeated.status,externalActionPerformed:false,
    });
    const created=await createActionProposal({
      proposalType:'trajectory_reconfiguration',actorId:gate.ctx.user.id,
      title:'SFI adaptive route · '+caseId.slice(0,70),
      objective:'Reconfigure a bounded prospective test toward the elected attractor while preserving its declared direction.',
      status:'draft',approvalRequired:true,contentHash:planHash,
      worldspectSnapshotId:snapshotRef,
      payload:{
        contract:plan.contract,caseId,planHash,
        electedAttractor:chosenAttractor,
        selectedRoute:selected,hypothesisPrimary:hypothesis.proposedHypothesis,
        hypothesisRival:hypothesis.proposedRival,
        testContract:hypothesis.proposedTestContract,
        trigger:plan.observation.watch,
        evidenceBeforeRefs:state.evidence.map(value=>{
          const evidence=value && typeof value==='object' ? value as Record<string,unknown> : {};
          return typeof evidence.id==='string' ? evidence.id : null;
        }).filter(Boolean),
        worldSnapshotRef:snapshotRef,
        priorVerifiedReturn:verifiedPreviousReturn,
        authorization:'GOVERNED_DRAFT_ONLY',externalExecutionAllowed:false,
        requiresIndependentWorldReturn:true,
      },
    });
    if (!created.ok) return NextResponse.json({ok:false,error:created.error,
      details:created.details,plan},{status:503});
    const audit=await auditRootAction({
      actorId:gate.ctx.user.id,action:'scorefriction.adaptive.draft',
      target:'action_proposals:'+String(created.data.id),
      payload:{caseId,planHash,selectedRouteId:plan.selectedRouteId,executionAuthorized:false},request,
    });
    if (!audit.ok) return NextResponse.json({ok:false,error:'TRAJECTORY_DRAFT_AUDIT_FAILED',
      proposalId:created.data.id,details:audit},{status:500});
    return NextResponse.json({
      ok:true,mode:'GOVERNED_DRAFT_CREATED',plan,planHash,
      proposalId:created.data.id,proposalStatus:created.data.status,
      executionAuthorized:false,worldReturnVerified:false,learningPromoted:false,
    },{status:201});
  }
  const watch = await readWatch(request, body);
  if (watch.severity === 'warning' || watch.severity === 'critical') {
    await appendLogbookEntry({
      scope: 'scorefriction',
      visibility: 'root',
      case_id: typeof body.case_id === 'string' ? body.case_id : null,
      event_type: 'regime_watch_alert',
      title: 'Regime Watch alert',
      summary: `${watch.severity}: ${watch.minimal_action ?? 'requiere observacion'}`,
      payload: watch,
    });
  }
  return NextResponse.json(watch);
}


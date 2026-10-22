import { NextResponse } from 'next/server';
import { deriveHypothesisIntakeFromNarrative } from '@/lib/sfi/caseIntakeResolver';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { persistMethodLabUiPreregistration } from '@/lib/method-lab/uiProjection';
import { readOwnedMethodLabExperimentPreregistration } from '@/lib/method-lab/experimentPersistence';
import { AccessDeniedError, requireUserProfile } from '@/lib/system/access/server';
import {
  createPersonalCase,
  persistPersonalEvidence,
  readPersonalCognitiveWorkspace,
  runPersonalCognitive,
  runPersonalLab,
} from '@/lib/sfi/personal/cognitiveWorkspace';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type Row = Record<string, unknown>;

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function statusForError(error: unknown) {
  if (error instanceof AccessDeniedError) return error.status;
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('NOT_FOUND')) return 404;
  if (message.includes('REQUIRED') || message.includes('NOT_SUPPORTED')) return 400;
  return 500;
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return NextResponse.json({ ok: false, error: message }, { status: statusForError(error) });
}

export async function GET() {
  try {
    const context = await requireUserProfile();
    const workspace = await readPersonalCognitiveWorkspace(context.user.id);
    return NextResponse.json({
      ok: workspace.ok,
      principal: {
        subjectId: context.user.id,
        alias: context.profile.alias ?? null,
        workspace: 'personal',
      },
      workspace,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const context = await requireUserProfile();
    const body = await req.json().catch(() => ({})) as Row;
    const operation = String(body.operation || 'state');

    if (operation === 'preregister_generated_conditions') {
      const caseId = typeof body.caseId === 'string' ? body.caseId.trim() : '';
      if (!caseId) return NextResponse.json({ok:false,error:'CASE_ID_REQUIRED'}, {status:400});
      const plan = deriveHypothesisIntakeFromNarrative(record(body.narrative));
      if (!plan.proposedHypothesis || !plan.proposedTestContract || !plan.proposedRival) {
        return NextResponse.json({ok:false,error:'NARRATIVE_CONTEXT_INSUFFICIENT',missing:plan.missing}, {status:409});
      }
      const db = createServiceSupabaseClient();
      const caseRead = await db.from('field_cases').select('id,owner_id,created_at')
        .eq('id',caseId).eq('owner_id',context.user.id).is('deleted_at',null).maybeSingle();
      if (caseRead.error) throw new Error('CASE_BASELINE_READ_FAILED:'+caseRead.error.message);
      if (!caseRead.data) return NextResponse.json({ok:false,error:'CASE_OWNER_SCOPE_REQUIRED'},{status:404});
      const baselineRead=await db.from('field_case_evidence').select('id,created_at')
        .eq('case_id',caseId).eq('owner_id',context.user.id)
        .order('created_at',{ascending:true}).limit(250);
      if (baselineRead.error) throw new Error('BASELINE_READ_FAILED:'+baselineRead.error.message);
      const marks=(baselineRead.data??[]).filter(item=>typeof item.created_at==='string' && Number.isFinite(Date.parse(item.created_at)));
      const first=marks[0],baselineT0=first?Date.parse(first.created_at):null;
      const daySegments=new Set<number>();
      if (baselineT0!==null) for (const mark of marks) {
        const delta=Date.parse(String(mark.created_at))-baselineT0;
        const day=Math.floor(delta/86400000);
        if (delta>=0 && day>=0 && day<3) daySegments.add(day);
      }
      const windowMature=baselineT0!==null && Date.now()-baselineT0>=72*3600000;
      if (!windowMature || daySegments.size<3) return NextResponse.json({
        ok:false,error:'SERVER_OBSERVED_72H_BASELINE_REQUIRED',daySegments:daySegments.size,
        hoursElapsed:baselineT0===null?null:Math.max(0,(Date.now()-baselineT0)/3600000),
        boundary:'Only server-created timestamps on owner-scoped baseline records count. Client-submitted observation times alone cannot close the window.'
      },{status:409});

      // A preregistration may freeze a candidate before any intervention; it grants
      // neither permission to act nor evidence/RETURN status to participant notes.
      const experimentId='sfi-generated-'+caseId+'-'+String(first?.id);
      try {
        const existing=await readOwnedMethodLabExperimentPreregistration({ownerId:context.user.id,experimentId});
        return NextResponse.json({ok:true,operation,alreadyPreregistered:true,
          preregistrationRef:existing.preregistrationRef,definitionHash:existing.definitionHash,
          boundary:'Immutable original registration reused; repeated calls do not rewrite T0.'});
      } catch(error) {
        if (!(error instanceof Error) || !error.message.includes('OWNER_SCOPE_REQUIRED')) throw error;
      }
      const now=Date.now();
      const periodStart=new Date(now);
      const periodEnd=new Date(now+72*3600000);
      const contract=plan.proposedTestContract;
      const definition={
        experimentId,experimentType:'OBSERVATIONAL' as const,caseRef:caseId,evidenceRefs:[] as string[],
        twinStateRef:null,hypothesis:plan.proposedHypothesis,nullHypothesis:plan.proposedRival,
        t0Cutoff:periodStart.toISOString(),timezone:'UTC',
        methodDescription:'SFI-authored bounded prospective test from qualitative intake; primary method '+plan.primaryMethod+
          '. Baseline record IDs '+marks.filter(x=>Date.parse(String(x.created_at))<(baselineT0??0)+72*3600000).map(x=>x.id).join(','),
        controlDescription:'Existing 72-hour participant-record baseline; retained as DECLARED records, not automatically admitted evidence.',
        variantDescriptions:['Proposed bounded action: '+String(plan.scene.action),'Baseline/no-action rival condition'],
        expectedSignal:contract.expectedCriteria.map(x=>x.signal).join(' | '),
        expectedMeasures:contract.expectedCriteria.map(x=>x.id),
        falsificationCondition:contract.contradictionCriteria.map(x=>x.signal).join(' | '),
        stoppingCondition:'Stop after first governed 72-hour prospective interval. Repreregister if the horizon proves insufficient.',
        maxExecutions:1,
        returnWindow:{opensAt:periodStart.toISOString(),closesAt:periodEnd.toISOString(),required:true},
      };
      const persisted=await persistMethodLabUiPreregistration({ownerId:context.user.id,definition});
      return NextResponse.json({ok:true,operation,alreadyPreregistered:false,
        preregistrationRef:persisted.preregistrationRef,definitionHash:persisted.definitionHash,
        baseline:{daySegments:daySegments.size,windowMature},
        boundary:'SFI constructed and sealed the scientific conditions, not the participant. Observational registration grants no external execution, causal proof, evidence admission or autonomous learning.'},{status:201});
    }

    if (operation === 'hypothesis_intake_preview') {
      const plan = deriveHypothesisIntakeFromNarrative(record(body.narrative));
      return NextResponse.json({ ok:true, operation, plan,
        boundary:'Owner-authenticated preflight only. No Case write, preregistration, RETURN, evidence admission or project execution.' });
    }

    if (operation === 'state') {
      const workspace = await readPersonalCognitiveWorkspace(context.user.id);
      return NextResponse.json({ ok: workspace.ok, operation, workspace });
    }

    if (operation === 'create_case') {
      const created = await createPersonalCase({
        ownerId: context.user.id,
        title: String(body.title || ''),
        domain: typeof body.domain === 'string' ? body.domain : undefined,
        objective: String(body.objective || ''),
        baseline: typeof body.baseline === 'string' ? body.baseline : undefined,
        verificationWindow: body.verificationWindow === '72h' || body.verificationWindow === '30d' ? body.verificationWindow : '7d',
      });
      return NextResponse.json({ ok: true, operation, case: created }, { status: 201 });
    }

    if (operation === 'persist') {
      const evidence = await persistPersonalEvidence({
        ownerId: context.user.id,
        caseId: String(body.caseId || ''),
        label: String(body.label || body.title || ''),
        content: String(body.content || ''),
        source: typeof body.source === 'string' ? body.source : undefined,
        reliability: typeof body.reliability === 'number' ? body.reliability : 1,
        evidenceType: typeof body.evidenceType === 'string' ? body.evidenceType : undefined,
        uri: typeof body.uri === 'string' ? body.uri : null,
        observedAt: typeof body.observedAt === 'string' ? body.observedAt : null,
      });
      return NextResponse.json({ ok: true, operation, evidence }, { status: 201 });
    }

    if (operation === 'cognitive') {
      const result = await runPersonalCognitive({
        ownerId: context.user.id,
        objective: String(body.objective || body.question || ''),
        caseId: typeof body.caseId === 'string' && body.caseId.trim() ? body.caseId.trim() : null,
        evidenceIds: strings(body.evidenceIds),
        requestedAutomations: strings(body.requestedAutomations),
        cognitiveIntents: strings(body.cognitiveIntents),
      });
      return NextResponse.json({ ...result, operation }, { status: result.ok ? 201 : 207 });
    }

    if (operation === 'lab') {
      const protocolId = body.protocolId === 'economic_simulation' ? 'economic_simulation' : body.protocolId === 'sociotechnical_simulation' ? 'sociotechnical_simulation' : null;
      if (!protocolId) return NextResponse.json({ ok: false, error: 'PERSONAL_LAB_PROTOCOL_NOT_SUPPORTED' }, { status: 400 });
      const result = await runPersonalLab({
        ownerId: context.user.id,
        protocolId,
        caseId: String(body.caseId || ''),
        evidenceIds: strings(body.evidenceIds),
        objective: typeof body.objective === 'string' ? body.objective : undefined,
        parameters: record(body.parameters),
      });
      return NextResponse.json({ ...result, operation }, { status: result.ok ? 201 : 207 });
    }

    return NextResponse.json({
      ok: false,
      error: 'unsupported_personal_workspace_operation',
      allowed: ['state', 'create_case', 'persist', 'cognitive', 'lab'],
    }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}

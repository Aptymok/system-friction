import { NextRequest, NextResponse } from 'next/server';
import { getLlmProviderStatus } from '@/lib/ai/providerRouter';
import { assessWorldRepeatRetryGuard } from '@/lib/world-observatory/hypothesisRetryGuard';
import { runWorldCalibrationCycle } from '@/lib/world-observatory/hypothesisCalibration';
import { runWorldHypothesisCycle } from '@/lib/world-observatory/hypothesisCycle';
import { runWorldInstrumentSweep } from '@/lib/world-observatory/instrumentSweep';
import { executeWorldSignalObserverAgent } from '@/lib/world-observatory/worldSignalObserverAgent';
import { scheduledEgressGuardResponse } from '@/lib/continuity/scheduledEgressGuard';
import { persistWorldHypothesisClosureReport } from '@/lib/reports/worldHypothesisClosureReport';
import { runJrFieldCycle } from '@/lib/mihm/jrFieldCycle';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { SFI_SUPABASE_READ_BUDGET } from '@/lib/supabase/readBudget';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function secret() {
  return process.env.SFI_CRON_SECRET
    || process.env.WORLDSPECT_INGEST_SECRET
    || process.env.CRON_SECRET
    || '';
}

function authorized(request: NextRequest) {
  const configured = secret();
  if (!configured && process.env.NODE_ENV !== 'production') return true;
  if (!configured) return false;
  return request.headers.get('authorization') === `Bearer ${configured}`;
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const manualReadjudication = request.headers.get('x-sfi-world-readjudication') === 'authorized';
  const egressGuard = scheduledEgressGuardResponse({ authorizedManualOverride: manualReadjudication, lane: 'WORLD_OBSERVATION' });
  if (egressGuard) return egressGuard;

  const startedAt = new Date().toISOString();

  if (manualReadjudication) {
    const body = await request.json().catch(() => ({})) as { hypothesisIds?: unknown };
    const hypothesisIds = Array.isArray(body.hypothesisIds)
      ? [...new Set(body.hypothesisIds.filter((id): id is string => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)))].slice(0, 20)
      : [];
    if (!hypothesisIds.length) {
      return NextResponse.json({ ok: false, error: 'historical_readjudication_target_required' }, { status: 400 });
    }
    const calibration = await runWorldCalibrationCycle({
      hypothesisIds,
      allowHistoricalReevaluation: true,
    });
    const manualClosureReport = calibration.calibratedIds.length
      ? await persistWorldHypothesisClosureReport({ hypothesisIds: calibration.calibratedIds })
          .then((result)=>({
            ok:true,
            persisted:result.persisted,
            skipped:result.skipped,
            reportRunId:result.reportRunId,
            taskId:result.taskId,
            fingerprint:result.fingerprint,
          }))
          .catch((error)=>({
            ok:false,
            persisted:false,
            skipped:false,
            reportRunId:null,
            taskId:null,
            fingerprint:null,
            error:error instanceof Error?error.message:String(error),
          }))
      : null;
    const providers = getLlmProviderStatus().map((item) => ({
      id: item.id,
      configured: item.configured,
      state: item.state,
      canaryOk: item.canaryOk,
      lastErrorClass: item.lastErrorClass,
      circuitOpen: item.circuitOpen,
    }));
    const calibratedSet = new Set(calibration.calibratedIds);
    const completed = calibration.ok
      && calibration.calibratedIds.length === hypothesisIds.length
      && calibration.calibratedIds.every((id) => hypothesisIds.includes(id))
      && hypothesisIds.every((id) => calibratedSet.has(id));
    return NextResponse.json({
      ok: completed,
      status: completed ? 'READJUDICATION_EXECUTED' : 'READJUDICATION_BLOCKED',
      contract: 'SFI-WORLD-HISTORICAL-READJUDICATION-1.1',
      startedAt,
      completedAt: new Date().toISOString(),
      calibration,
      closureReport: manualClosureReport,
      providers,
      writesPerformed: calibration.calibrated > 0 || calibration.reopened > 0,
      targetCoverage: {
        requested: hypothesisIds,
        matched: calibration.matchedIds,
        calibrated: calibration.calibratedIds,
        complete: completed,
      },
      boundary: 'Authorized manual readjudication executes only the existing World calibration owner. Unavailable or incomplete model assessment leaves targeted historical hypotheses AWAITING_OUTCOME; it does not fabricate INCONCLUSIVE. Closure-report generation is downstream narrative projection only and cannot change classification. It does not collect observations, generate hypotheses, run institutional cycles, or enable scheduled egress globally.',
    }, { status: 200 });
  }

  // Keep the scheduled route coherent with the user-bound World gateway:
  // a prior partial cycle is not permission to recollect already valid sources.
  // Respect the same persisted receipt family and persistent provider backoff.
  const db=createServiceSupabaseClient();
  const [partial,complete,resume,latestObservation]=await Promise.all([
    db.from('epistemic_events').select('event_id,event_name,occurred_at')
      .eq('event_name','external.world.daily_cycle.partial')
      .order('occurred_at',{ascending:false}).limit(1).maybeSingle(),
    db.from('epistemic_events').select('event_id,event_name,occurred_at')
      .eq('event_name','external.world.daily_cycle.completed')
      .order('occurred_at',{ascending:false}).limit(1).maybeSingle(),
    db.from('epistemic_events').select('event_id,event_name,occurred_at')
      .in('event_name',['external.world.hypothesis_resume.partial','external.world.hypothesis_resume.completed'])
      .order('occurred_at',{ascending:false}).limit(1).maybeSingle(),
    db.from('world_source_observations').select('fetched_at')
      .order('fetched_at',{ascending:false}).limit(1).maybeSingle(),
  ]);
  if(partial.error||complete.error||resume.error||latestObservation.error)
    return NextResponse.json({ok:false,status:'WORLD_PREVIOUS_RECEIPT_READ_UNAVAILABLE',
      writesPerformed:false,boundary:'Fail closed when the chronology needed for safe retry is unavailable.'},{status:503});
  const receiptTime=(t:unknown)=>{
    const parsed=typeof t==='string'?Date.parse(t):Number.NaN;
    return Number.isFinite(parsed)?parsed:0;
  };
  const partialAt=receiptTime(partial.data?.occurred_at);
  const completedAt=receiptTime(complete.data?.occurred_at);
  const resumedAt=receiptTime(resume.data?.occurred_at);
  const newestAt=Math.max(partialAt,completedAt,resumedAt);
  const priorRetryFailed=resume.data?.event_name==='external.world.hypothesis_resume.partial' &&
    resumedAt>=Math.max(partialAt,completedAt) && resumedAt>0;
  const cooldownMs=SFI_SUPABASE_READ_BUDGET.worldRunCooldownMinutes*60_000*
    (priorRetryFailed?4:1);
  if(newestAt>0 && Date.now()-newestAt<cooldownMs) return NextResponse.json({
    ok:true,status:'COOLDOWN_SKIPPED',writesPerformed:false,
    lastAttemptReceiptAt:new Date(newestAt).toISOString(),
    retryAfterSeconds:Math.max(1,Math.ceil((cooldownMs-(Date.now()-newestAt))/1000)),
    boundary:'Cron follows persisted full/partial/retry receipts and does not recollect sources during provider cooldown.',
  });
  const observationAt=receiptTime(latestObservation.data?.fetched_at);
  const sourcesLive=observationAt>0 && Date.now()-observationAt<24*60*60*1000;
  const resumeAlreadyCompleted=resume.data?.event_name==='external.world.hypothesis_resume.completed' &&
    resumedAt>=partialAt;
  const resumeOnly=partialAt>completedAt && sourcesLive && !resumeAlreadyCompleted;
  if(resumeOnly){
    const providerStatus=getLlmProviderStatus();
    const {data:retryReceipts,error:retryReceiptError}=await db
      .from('epistemic_events').select('event_name,occurred_at,payload')
      .eq('event_name','external.world.hypothesis_resume.partial')
      .gte('occurred_at',String(partial.data?.occurred_at??''))
      .order('occurred_at',{ascending:false}).limit(30);
    if(retryReceiptError) return NextResponse.json({
      ok:false,status:'RETRY_RECEIPT_READ_UNAVAILABLE',writesPerformed:false,
      error:retryReceiptError.message,
      boundary:'Fail closed if the cron cannot establish the provenance of recent failed World inference.',
    },{status:503});
    const retryGate=assessWorldRepeatRetryGuard({
      sourcePartialEventId:String(partial.data?.event_id??''),
      retryReceipts:(retryReceipts??[]).map(entry=>({
        event_name:String(entry.event_name??''),occurred_at:String(entry.occurred_at??''),
        payload:entry.payload,
      })),
      latestObservationFetchedAt:typeof latestObservation.data?.fetched_at==='string'
        ? latestObservation.data.fetched_at:null,
      providerStatuses:providerStatus,
    });
    if(retryGate.suspended) return NextResponse.json({
      ok:false,status:'HYPOTHESIS_RETRY_SUSPENDED_UNCHANGED_OBSERVATIONS',
      retryOnly:true,writesPerformed:false,retryGate,
      boundary:'The automatic World cron stops repeated source-identical inference until new observation or verifiable provider recovery. It cannot mint synthetic hypotheses or reopen a frozen T0.',
    },{status:409});
    const availableProviders=providerStatus.filter(p=>p.available &&
      !p.circuitOpen && p.state!=='UNCONFIGURED' && p.state!=='BLOCKED');
    if(!availableProviders.length) return NextResponse.json({
      ok:false,status:'PROVIDERS_UNAVAILABLE',retryOnly:true,writesPerformed:false,
      boundary:'No synthetic hypotheses and no repeated source collection when all governed model routes are blocked.',
    },{status:503});
    const hypothesis=await runWorldHypothesisCycle();
    const calibration=hypothesis.ok?await runWorldCalibrationCycle():null;
    const resumed=hypothesis.ok && (!calibration || calibration.ok);
    const receipt=await appendEpistemicEvent({
      returnMode:'receipt',
      eventName:resumed?'external.world.hypothesis_resume.completed':'external.world.hypothesis_resume.partial',
      epistemicClass:'derived',confidence:resumed?1:0.5,
      occurredAt:new Date().toISOString(),
      source:{sourceId:'SYSTEM_FRICTION_INSTITUTE',sourceType:'operational_runtime'},
      logbookId:'WORLD',lineage:[],
      payload:{
        contract:'SFI-WORLD-HYPOTHESIS-RESUME-1.0',
        actorId:'sfi:cron:world-observatory',trigger:'SCHEDULED_WORLD_OBSERVATION',
        sourcePartialEventId:partial.data?.event_id??null,
        hypothesis,calibration,
        boundary:'Reuse existing observations and evaluate hypotheses only. No new collection, JR, instrument sweep, material act, canon mutation, synthetic fallback or historical T0 rewrite.',
      },
    });
    return NextResponse.json({
      ok:resumed&&receipt.ok,retryOnly:true,
      status:resumed&&receipt.ok?'HYPOTHESIS_STAGE_RESUMED':'HYPOTHESIS_STAGE_STILL_PARTIAL',
      hypothesis,calibration,
      receipt:receipt.ok?receipt.data:receipt,
      writesPerformed:receipt.ok||(hypothesis.created??0)>0||(calibration?.calibrated??0)>0,
      boundary:'A scheduled hypothesis-stage recovery cannot retroactively mint a complete World daily-cycle receipt or establish empirical truth.',
    },{status:resumed&&receipt.ok?200:207});
  }

  const worldSignalObserver = await executeWorldSignalObserverAgent();
  const observation = worldSignalObserver.observation;
  const hypothesis = await runWorldHypothesisCycle();
  const calibration = await runWorldCalibrationCycle();
  const closureReport = calibration.calibratedIds.length
    ? await persistWorldHypothesisClosureReport({ hypothesisIds: calibration.calibratedIds })
        .then((result)=>({
          ok:true,
          persisted:result.persisted,
          skipped:result.skipped,
          reportRunId:result.reportRunId,
          taskId:result.taskId,
          fingerprint:result.fingerprint,
        }))
        .catch((error)=>({
          ok:false,
          persisted:false,
          skipped:false,
          reportRunId:null,
          taskId:null,
          fingerprint:null,
          error:error instanceof Error?error.message:String(error),
        }))
    : null;
  const instrumentSweep = await runWorldInstrumentSweep({
    observedAt: startedAt,
    worldSignalObserver,
    hypothesis,
    calibration,
  }).catch((error) => ({
    ok: false as const,
    contract: 'SFI-WORLD-INSTRUMENT-SWEEP-1.0',
    generatedAt: new Date().toISOString(),
    signalVane: null,
    clusterAtlas: null,
    predictiveHealth: null,
    warnings: [error instanceof Error ? error.message : String(error)],
    writesPerformed: false,
    boundary: 'Instrument sweep degraded without changing World observation/hypothesis/calibration authority.',
  }));
  const jrFieldCycle = await runJrFieldCycle({
    actorId: 'sfi:cron:world-observatory',
    trigger: 'WORLD_OBSERVATORY_CRON',
    maxMethodRuns: 1,
  }).catch((error) => ({
    ok: false as const,
    status: 'DEGRADED' as const,
    contract: 'SFI-JR-FIELD-CYCLE-1.0',
    writesPerformed: false,
    error: error instanceof Error ? error.message : String(error),
  }));
  const ok = observation.ok && hypothesis.ok && calibration.ok && jrFieldCycle.ok !== false;

  return NextResponse.json({
    ok,
    startedAt,
    completedAt: new Date().toISOString(),
    worldSignalObserver,
    observation,
    hypothesis,
    calibration,
    closureReport,
    instrumentSweep,
    jrFieldCycle,
    freshness: {
      observed: observation.observed,
      persisted: observation.persisted,
      collectorFailures: observation.failures.length,
    },
    executionRule: 'World observation, hypothesis generation and deterministic calibration remain authoritative for this cron. Hypothesis closure reports are downstream narrative projections of classifications already persisted by calibration and cannot change them. Signal Vane, Cluster Atlas and Predictive health are a read-only daily instrumentation sweep. Jr may append derived field epochs/configurations and bounded SIMULATED Method Lab receipts from persisted evidence, but cannot execute material perturbations, make governance decisions, promote canon or fabricate RETURN.',
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}

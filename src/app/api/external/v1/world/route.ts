import { NextResponse } from 'next/server';
import { authorizeExternalRequest, externalActor, externalAuthError } from '@/lib/sfi/externalAuth';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { executeWorldSignalObserverAgent } from '@/lib/world-observatory/worldSignalObserverAgent';
import { runWorldHypothesisCycle } from '@/lib/world-observatory/hypothesisCycle';
import { runWorldCalibrationCycle } from '@/lib/world-observatory/hypothesisCalibration';
import { runWorldInstrumentSweep } from '@/lib/world-observatory/instrumentSweep';
import { persistWorldHypothesisClosureReport } from '@/lib/reports/worldHypothesisClosureReport';
import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { runJrFieldCycle } from '@/lib/mihm/jrFieldCycle';
import { SFI_SUPABASE_READ_BUDGET } from '@/lib/supabase/readBudget';
import { regenerateWorldVectorRetrospective } from '@/lib/world-vector/retrospective';
import { runWorldSpectAdapters } from '@/lib/worldspect/runAdapters';
import { recoverWorldSpectHistoricalDays } from '@/lib/worldspect/historicalRecovery';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

type WorldOperation = 'state' | 'run' | 'measure_worldspect' | 'recover_worldspect_history' | 'regenerate_world_vector';

function requiredScope(operation: WorldOperation) {
  return operation === 'run' || operation === 'measure_worldspect' || operation === 'recover_worldspect_history' || operation === 'regenerate_world_vector' ? 'world:run' : 'world:read';
}

async function readWorldState() {
  const db = createServiceSupabaseClient();
  const [observation, reading, hypothesis, receipt] = await Promise.all([
    db.from('world_source_observations').select('id,source_id,fetched_at').order('fetched_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('world_friction_readings').select('id,created_at,systemic_friction,interaction_density,systemic_coherence').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('world_hypotheses').select('id,status,created_at,cutoff_at,validation_ends_at,current_confidence').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('epistemic_events').select('event_id,event_name,occurred_at').eq('event_name', 'external.world.daily_cycle.completed').order('occurred_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  const warnings = [observation.error?.message, reading.error?.message, hypothesis.error?.message, receipt.error?.message].filter(Boolean);
  const latestObservationAt = observation.data?.fetched_at ?? null;
  const ageHours = latestObservationAt ? Math.max(0, (Date.now() - Date.parse(String(latestObservationAt))) / 3_600_000) : null;
  return {
    ok: warnings.length === 0,
    latestObservation: observation.data ?? null,
    latestReading: reading.data ?? null,
    latestHypothesis: hypothesis.data ?? null,
    latestDailyCycleReceipt: receipt.data ?? null,
    freshness: ageHours === null ? 'ABSENT' : ageHours < 24 ? 'LIVE' : ageHours <= 48 ? 'AGING' : 'STALE',
    ageHours,
    warnings,
  };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const operation = String(body.operation || 'state') as WorldOperation;
  if (!['state', 'run', 'measure_worldspect', 'recover_worldspect_history', 'regenerate_world_vector'].includes(operation)) {
    return NextResponse.json({ ok: false, error: 'unsupported_world_operation', supported: ['state', 'run', 'measure_worldspect', 'recover_worldspect_history', 'regenerate_world_vector'] }, { status: 400 });
  }

  const scope = requiredScope(operation);
  const auth = authorizeExternalRequest(req, scope);
  if (!auth.credential) return NextResponse.json(externalAuthError(auth, scope), { status: 401 });
  if (auth.credential.authMethod !== 'oauth' || !auth.credential.subjectId || auth.credential.tenantId !== 'sfi') {
    return NextResponse.json({ ok: false, error: 'institutional_user_bound_oauth_required' }, { status: 403 });
  }
  const actorId = externalActor(auth.credential);

  if (operation === 'state') {
    return NextResponse.json({ ...(await readWorldState()), operation, actor: actorId });
  }

  if (operation === 'measure_worldspect') {
    const measurement = await runWorldSpectAdapters('manual');
    const receipt = await appendEpistemicEvent({
      returnMode: 'receipt',
      eventName: 'external.worldspect.measurement.completed',
      epistemicClass: 'derived',
      confidence: measurement.ok ? 1 : 0.5,
      occurredAt: new Date().toISOString(),
      source: { sourceId: 'SYSTEM_FRICTION_INSTITUTE', sourceType: 'operational_runtime' },
      logbookId: 'WORLDSPECT',
      lineage: measurement.persistence.ok && measurement.persistence.data?.id
        ? [String(measurement.persistence.data.id)]
        : [],
      payload: {
        contract: 'SFI-WORLDSPECT-MANUAL-MEASUREMENT-1.0',
        actorId,
        snapshotId: measurement.persistence.ok ? String(measurement.persistence.data?.id ?? '') : null,
        degradedSources: measurement.degraded_sources,
        sourceCount: measurement.sources.length,
        authorityBoundary: {
          scope: 'world:run',
          observationOnly: true,
          rootAuthorityInherited: false,
          governanceDecisionAuthorityInherited: false,
          canonicalPromotionAllowed: false,
          publicationAllowed: false,
        },
      },
    });
    return NextResponse.json({
      ok: measurement.ok && receipt.ok,
      operation,
      actor: actorId,
      contract: 'SFI-WORLDSPECT-MANUAL-MEASUREMENT-1.0',
      snapshot: measurement.snapshot,
      persistence: measurement.persistence,
      degraded_sources: measurement.degraded_sources,
      sourceHealth: measurement.sourceHealth,
      receipt: receipt.ok ? receipt.data : receipt,
      writesPerformed: measurement.persistence.ok || receipt.ok,
      boundary: 'Manual WorldSpect measurement reuses the canonical public adapters and snapshot store. It records present observation only; it cannot backdate missing historical snapshots, promote canon, publish, or grant governance authority.',
    }, { status: measurement.ok && receipt.ok ? 200 : 207 });
  }

  if (operation === 'recover_worldspect_history') {
    const rawDays = Array.isArray(body.days) ? body.days.map(String) : undefined;
    const persist = body.persist === true;
    const recovery = await recoverWorldSpectHistoricalDays({ days: rawDays, persist });
    let receipt: Awaited<ReturnType<typeof appendEpistemicEvent>> | null = null;
    if (persist) {
      receipt = await appendEpistemicEvent({
        returnMode: 'receipt',
        eventName: 'external.worldspect.historical_recovery.completed',
        epistemicClass: 'derived',
        confidence: recovery.ok ? 1 : 0.5,
        occurredAt: new Date().toISOString(),
        source: { sourceId: 'SYSTEM_FRICTION_INSTITUTE', sourceType: 'operational_runtime' },
        logbookId: 'WORLDSPECT',
        lineage: [],
        payload: {
          contract: recovery.contract,
          actorId,
          mode: recovery.mode,
          counts: recovery.counts,
          requestedDays: recovery.requestedDays,
          reconstructionBoundary: recovery.reconstructionBoundary,
          authorityBoundary: {
            scope: 'world:run',
            historicalCronExecutionClaimed: false,
            rootAuthorityInherited: false,
            governanceDecisionAuthorityInherited: false,
            cognitiveSpineReentryPerformed: false,
            canonicalPromotionAllowed: false,
            publicationAllowed: false,
          },
        },
      });
    }
    return NextResponse.json({
      ok: recovery.ok && (!persist || receipt?.ok === true),
      operation,
      actor: actorId,
      contract: recovery.contract,
      recovery,
      receipt: receipt ? (receipt.ok ? receipt.data : receipt) : null,
      writesPerformed: persist && (recovery.counts.persisted > 0 || receipt?.ok === true),
      boundary: 'Historical source recovery is evidence-bounded. Official archives and explicitly labeled as-of proxies may reconstruct a missing WorldSpect day; non-versioned live-index sources remain missing. No original cron execution, Cognitive Spine reentry, governance decision, publication or canon promotion is fabricated.',
    }, { status: recovery.ok && (!persist || receipt?.ok === true) ? 200 : 207 });
  }

  if (operation === 'regenerate_world_vector') {
    const startedAt = new Date().toISOString();
    const days = typeof body.days === 'number' ? body.days : Number(body.days ?? 3650);
    const maxSnapshots = typeof body.maxSnapshots === 'number' ? body.maxSnapshots : Number(body.maxSnapshots ?? 5000);
    const overwrite = body.overwrite !== false;
    const regeneration = await regenerateWorldVectorRetrospective({ days, maxSnapshots, overwrite });
    const receipt = await appendEpistemicEvent({
      returnMode: 'receipt',
      eventName: 'external.world_vector.retrospective_regenerated',
      epistemicClass: 'derived',
      confidence: regeneration.ok ? 1 : 0.5,
      occurredAt: new Date().toISOString(),
      source: { sourceId: 'SYSTEM_FRICTION_INSTITUTE', sourceType: 'operational_runtime' },
      logbookId: 'WORLD_VECTOR',
      lineage: [],
      payload: {
        contract: regeneration.contract,
        actorId,
        startedAt,
        completedAt: new Date().toISOString(),
        regeneration: {
          requested: regeneration.requested,
          sourceIndex: regeneration.sourceIndex,
          range: regeneration.range,
          counts: regeneration.counts,
        },
        authorityBoundary: {
          scope: 'world:run',
          rewritesWorldSpectT0: false,
          futureSnapshotBackdatingAllowed: false,
          rootAuthorityInherited: false,
          governanceDecisionAuthorityInherited: false,
          canonicalPromotionAllowed: false,
          publicationAllowed: false,
        },
      },
    });
    return NextResponse.json({
      ok: regeneration.ok && receipt.ok,
      operation,
      actor: actorId,
      contract: regeneration.contract,
      regeneration,
      receipt: receipt.ok ? receipt.data : receipt,
      writesPerformed: regeneration.counts.persisted > 0 || receipt.ok,
      boundary: regeneration.boundary,
    }, { status: regeneration.ok && receipt.ok ? 200 : 207 });
  }

  const preflight=await readWorldState();
  const lastReceiptAt=typeof preflight.latestDailyCycleReceipt?.occurred_at==='string'
    ? Date.parse(preflight.latestDailyCycleReceipt.occurred_at)
    : Number.NaN;
  const cooldownMs=SFI_SUPABASE_READ_BUDGET.worldRunCooldownMinutes*60_000;
  if(Number.isFinite(lastReceiptAt) && Date.now()-lastReceiptAt<cooldownMs){
    return NextResponse.json({
      ok:true,
      operation,
      actor:actorId,
      status:'COOLDOWN_SKIPPED',
      cooldownMinutes:SFI_SUPABASE_READ_BUDGET.worldRunCooldownMinutes,
      retryAfterSeconds:Math.max(1,Math.ceil((cooldownMs-(Date.now()-lastReceiptAt))/1000)),
      verification:preflight,
      writesPerformed:false,
      boundary:'A recent governed World cycle already exists. Repeated world:run calls inside the cooldown window are skipped to contain primary egress and duplicate institutional work.',
    });
  }

  const startedAt = new Date().toISOString();
  const worldSignalObserver = await executeWorldSignalObserverAgent();
  const observation = worldSignalObserver.observation;
  const hypothesis = await runWorldHypothesisCycle();
  const calibration = await runWorldCalibrationCycle();
  const closureReport = calibration.calibratedIds?.length
    ? await persistWorldHypothesisClosureReport({ hypothesisIds: calibration.calibratedIds })
        .then((result) => ({ ok: true, ...result }))
        .catch((error) => ({ ok: false, error: error instanceof Error ? error.message : String(error) }))
    : null;
  const instrumentSweep = await runWorldInstrumentSweep({ observedAt: startedAt, worldSignalObserver, hypothesis, calibration })
    .catch((error) => ({ ok: false, contract: 'SFI-WORLD-INSTRUMENT-SWEEP-1.0', warnings: [error instanceof Error ? error.message : String(error)], writesPerformed: false }));
  const jrFieldCycle = await runJrFieldCycle({
    actorId,
    trigger: 'EXTERNAL_WORLD_RUN',
    maxMethodRuns: SFI_SUPABASE_READ_BUDGET.jrMethodRuns,
  }).catch((error) => ({
    ok: false as const,
    status: 'DEGRADED' as const,
    contract: 'SFI-JR-FIELD-CYCLE-1.0',
    writesPerformed: false,
    error: error instanceof Error ? error.message : String(error),
  }));

  const receipt = await appendEpistemicEvent({
    returnMode:'receipt',
    eventName: 'external.world.daily_cycle.completed',
    epistemicClass: 'derived',
    confidence: 1,
    occurredAt: new Date().toISOString(),
    source: { sourceId: 'SYSTEM_FRICTION_INSTITUTE', sourceType: 'operational_runtime' },
    logbookId: 'WORLD',
    lineage: [],
    payload: {
      contract: 'SFI-WORLD-DAILY-CYCLE-1.0',
      actorId,
      startedAt,
      completedAt: new Date().toISOString(),
      worldSignalObserver,
      hypothesis,
      calibration,
      closureReport,
      instrumentSweep,
      jrFieldCycle,
      authorityBoundary: {
        scope: 'world:run',
        rootAuthorityInherited: false,
        governanceDecisionAuthorityInherited: false,
        canonicalPromotionAllowed: false,
        publicationAllowed: false,
      },
    },
  });

  const reread = await readWorldState();
  const ok = observation.ok && hypothesis.ok && calibration.ok && receipt.ok && jrFieldCycle.ok !== false && reread.freshness === 'LIVE';
  return NextResponse.json({
    ok,
    operation,
    actor: actorId,
    contract: 'SFI-WORLD-DAILY-CYCLE-1.0',
    worldSignalObserver,
    hypothesis,
    calibration,
    closureReport,
    instrumentSweep,
    jrFieldCycle,
    receipt: receipt.ok ? receipt.data : receipt,
    verification: reread,
    writesPerformed: observation.persisted > 0 || (hypothesis.created ?? 0) > 0 || (calibration.calibrated ?? 0) > 0 || jrFieldCycle.writesPerformed === true || receipt.ok,
    boundary: 'This operation reuses canonical World observation, hypothesis, calibration, instrument and Jr field-cycle owners. Jr may append derived temporal/configuration receipts and execute bounded SIMULATED Method Lab runs from persisted evidence, but it does not grant ROOT/governance authority, execute material perturbations, publish, promote canon or fabricate RETURN.',
  }, { status: ok ? 200 : 207 });
}

export async function GET(req: Request) {
  const auth = authorizeExternalRequest(req, 'world:read');
  if (!auth.credential) return NextResponse.json(externalAuthError(auth, 'world:read'), { status: 401 });
  if (auth.credential.authMethod !== 'oauth' || !auth.credential.subjectId || auth.credential.tenantId !== 'sfi') {
    return NextResponse.json({ ok: false, error: 'institutional_user_bound_oauth_required' }, { status: 403 });
  }
  return NextResponse.json({ ...(await readWorldState()), operation: 'state', actor: externalActor(auth.credential) });
}

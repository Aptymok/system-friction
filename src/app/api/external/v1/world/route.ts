import { NextResponse } from 'next/server';
import { authorizeExternalRequest, externalActor, externalAuthError } from '@/lib/sfi/externalAuth';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { executeWorldSignalObserverAgent } from '@/lib/world-observatory/worldSignalObserverAgent';
import { runWorldHypothesisCycle } from '@/lib/world-observatory/hypothesisCycle';
import { runWorldCalibrationCycle } from '@/lib/world-observatory/hypothesisCalibration';
import { runWorldInstrumentSweep } from '@/lib/world-observatory/instrumentSweep';
import { persistWorldHypothesisClosureReport } from '@/lib/reports/worldHypothesisClosureReport';
import { appendEpistemicEvent } from '@/lib/events/eventStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

type WorldOperation = 'state' | 'run';

function requiredScope(operation: WorldOperation) {
  return operation === 'run' ? 'world:run' : 'world:read';
}

async function readWorldState() {
  const db = createServiceSupabaseClient();
  const [observation, reading, hypothesis, receipt] = await Promise.all([
    db.from('world_source_observations').select('id,source_id,fetched_at').order('fetched_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('world_friction_readings').select('id,created_at,systemic_friction,interaction_density,systemic_coherence').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('world_hypotheses').select('id,status,created_at,cutoff_at,validation_ends_at,current_confidence').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('epistemic_events').select('event_id,event_name,occurred_at,payload').eq('event_name', 'external.world.daily_cycle.completed').order('occurred_at', { ascending: false }).limit(1).maybeSingle(),
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
  if (!['state', 'run'].includes(operation)) {
    return NextResponse.json({ ok: false, error: 'unsupported_world_operation', supported: ['state', 'run'] }, { status: 400 });
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

  const receipt = await appendEpistemicEvent({
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
  const ok = observation.ok && hypothesis.ok && calibration.ok && receipt.ok && reread.freshness === 'LIVE';
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
    receipt: receipt.ok ? receipt.data : receipt,
    verification: reread,
    writesPerformed: observation.persisted > 0 || (hypothesis.created ?? 0) > 0 || (calibration.calibrated ?? 0) > 0 || receipt.ok,
    boundary: 'This operation reuses canonical World observation, hypothesis, calibration and instrument owners. It does not grant ROOT/governance authority, publish, promote canon or fabricate RETURN.',
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

import { NextRequest, NextResponse } from 'next/server';
import { getLlmProviderStatus } from '@/lib/ai/providerRouter';
import { runWorldCalibrationCycle } from '@/lib/world-observatory/hypothesisCalibration';
import { runWorldHypothesisCycle } from '@/lib/world-observatory/hypothesisCycle';
import { runWorldInstrumentSweep } from '@/lib/world-observatory/instrumentSweep';
import { executeWorldSignalObserverAgent } from '@/lib/world-observatory/worldSignalObserverAgent';
import { scheduledEgressGuardResponse } from '@/lib/continuity/scheduledEgressGuard';

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
  const egressGuard = scheduledEgressGuardResponse({ authorizedManualOverride: manualReadjudication });
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
      providers,
      writesPerformed: calibration.calibrated > 0 || calibration.reopened > 0,
      targetCoverage: {
        requested: hypothesisIds,
        matched: calibration.matchedIds,
        calibrated: calibration.calibratedIds,
        complete: completed,
      },
      boundary: 'Authorized manual readjudication executes only the existing World calibration owner. Unavailable or incomplete model assessment leaves targeted historical hypotheses AWAITING_OUTCOME; it does not fabricate INCONCLUSIVE. It does not collect observations, generate hypotheses, run institutional cycles, or enable scheduled egress globally.',
    }, { status: 200 });
  }
  const worldSignalObserver = await executeWorldSignalObserverAgent();
  const observation = worldSignalObserver.observation;
  const hypothesis = await runWorldHypothesisCycle();
  const calibration = await runWorldCalibrationCycle();
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
  const ok = observation.ok && hypothesis.ok && calibration.ok;

  return NextResponse.json({
    ok,
    startedAt,
    completedAt: new Date().toISOString(),
    worldSignalObserver,
    observation,
    hypothesis,
    calibration,
    instrumentSweep,
    freshness: {
      observed: observation.observed,
      persisted: observation.persisted,
      collectorFailures: observation.failures.length,
    },
    executionRule: 'World observation, hypothesis generation and deterministic calibration remain authoritative for this cron. Signal Vane, Cluster Atlas and Predictive health are a read-only daily instrumentation sweep; their failure does not fabricate evidence or block the observed World cycle.',
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}

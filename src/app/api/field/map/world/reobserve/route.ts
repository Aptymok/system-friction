import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/runtime/supabase/server';
import { runWorldObservationCycle, runWorldCalibrationCycle } from '@/lib/world-observatory/worldCycle';
import { runWorldHypothesisCycle } from '@/lib/world-observatory/hypothesisCycle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function projectRef() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  try {
    return new URL(raw).hostname.split('.')[0] || 'unknown';
  } catch {
    return 'invalid_supabase_url';
  }
}

async function execute() {
  const sessionClient = await createServerSupabaseClient();
  const { data: auth, error: authError } = await sessionClient.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const ref = projectRef();
  let service;
  try {
    service = createServiceSupabaseClient();
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'world_service_client_unavailable',
      details: error instanceof Error ? error.message : String(error),
      supabaseProjectRef: ref,
    }, { status: 503 });
  }

  const probe = await service
    .from('world_source_observations')
    .select('id', { count: 'exact', head: true });

  if (probe.error) {
    return NextResponse.json({
      ok: false,
      error: 'world_schema_probe_failed',
      details: probe.error.message,
      code: probe.error.code,
      hint: probe.error.hint,
      supabaseProjectRef: ref,
      requiredMigration: 'supabase/migrations/20260802214000_world_observatory_learning.sql',
      nextSql: "NOTIFY pgrst, 'reload schema';",
    }, { status: 503 });
  }

  const observation = await runWorldObservationCycle();
  const hypothesis = await runWorldHypothesisCycle();
  const calibration = await runWorldCalibrationCycle();

  const [{ count: observations }, { count: readings }, { count: hypotheses }, { count: outcomes }, { count: learning }] = await Promise.all([
    service.from('world_source_observations').select('id', { count: 'exact', head: true }),
    service.from('world_friction_readings').select('id', { count: 'exact', head: true }),
    service.from('world_hypotheses').select('id', { count: 'exact', head: true }),
    service.from('world_hypothesis_outcomes').select('id', { count: 'exact', head: true }),
    service.from('world_learning_events').select('id', { count: 'exact', head: true }),
  ]);

  return NextResponse.json({
    ok: observation.ok,
    sourceState: observation.persisted > 0 ? 'OBSERVED_WORLD' : 'NO_NEW_WORLD_OBSERVATIONS',
    supabaseProjectRef: ref,
    observation,
    hypothesis,
    calibration,
    persisted: {
      observations: observations ?? 0,
      readings: readings ?? 0,
      hypotheses: hypotheses ?? 0,
      outcomes: outcomes ?? 0,
      learning: learning ?? 0,
    },
    generatedAt: new Date().toISOString(),
  }, { status: observation.ok ? 200 : 502 });
}

export async function POST() {
  return execute();
}

export async function GET() {
  return execute();
}

import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/runtime/supabase/server';
import { runWorldCalibrationCycle } from '@/lib/world-observatory/hypothesisCalibration';
import { runWorldHypothesisCycle } from '@/lib/world-observatory/hypothesisCycle';
import { executeWorldSignalObserverAgent } from '@/lib/world-observatory/worldSignalObserverAgent';

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

  const worldSignalObserver = await executeWorldSignalObserverAgent();
  const observation = worldSignalObserver.observation;
  const hypothesis = await runWorldHypothesisCycle();
  const calibration = await runWorldCalibrationCycle();

  return NextResponse.json({
    ok: observation.ok,
    sourceState: worldSignalObserver.state,
    supabaseProjectRef: ref,
    worldSignalObserver,
    observation,
    hypothesis,
    calibration,
    persisted: {
      observation: observation.ok,
      hypothesis: Boolean(hypothesis),
      calibration: Boolean(calibration),
      accounting: 'operation_receipts_not_full_table_counts',
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

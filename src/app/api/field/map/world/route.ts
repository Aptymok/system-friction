import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/runtime/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isMissingWorldSchema(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes('schema cache')
    || normalized.includes('world_source_observations')
    || normalized.includes('world_friction_readings')
    || normalized.includes('world_hypotheses')
    || normalized.includes('world_hypothesis_outcomes')
    || normalized.includes('world_learning_events');
}

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const observationsQuery = await supabase
    .from('world_source_observations')
    .select('*')
    .gte('observed_at', since)
    .order('observed_at', { ascending: false })
    .limit(500);

  if (observationsQuery.error) {
    if (isMissingWorldSchema(observationsQuery.error.message)) {
      return NextResponse.json({
        ok: true,
        generatedAt: new Date().toISOString(),
        sourceState: 'WORLD_SCHEMA_PENDING',
        nodes: [],
        hypotheses: [],
        outcomes: [],
        learning: [],
        sourceFamilies: [],
        setupRequired: {
          migration: 'supabase/migrations/20260802214000_world_observatory_learning.sql',
          reason: 'The WORLD observatory schema has not been applied to Supabase yet.',
        },
        limits: [
          'The WORLD schema is pending; the observatory remains readable instead of failing.',
          'No fallback observations, provider scores or simulated nodes are generated.',
          'Apply the WORLD observatory migration before starting ingestion and calibration.',
        ],
      });
    }

    return NextResponse.json({
      ok: false,
      error: 'world_observations_query_failed',
      details: observationsQuery.error.message,
    }, { status: 503 });
  }

  const [{ data: readings, error: readingsError }, { data: hypotheses, error: hypothesesError }, { data: outcomes, error: outcomesError }, { data: learning, error: learningError }] = await Promise.all([
    supabase.from('world_friction_readings').select('*').order('created_at', { ascending: false }).limit(500),
    supabase.from('world_hypotheses').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('world_hypothesis_outcomes').select('*').order('evaluated_at', { ascending: false }).limit(100),
    supabase.from('world_learning_events').select('*').order('created_at', { ascending: false }).limit(100),
  ]);

  const secondaryError = readingsError ?? hypothesesError ?? outcomesError ?? learningError;
  if (secondaryError) {
    if (isMissingWorldSchema(secondaryError.message)) {
      return NextResponse.json({
        ok: true,
        generatedAt: new Date().toISOString(),
        sourceState: 'WORLD_SCHEMA_PARTIAL',
        nodes: [],
        hypotheses: [],
        outcomes: [],
        learning: [],
        sourceFamilies: [],
        setupRequired: {
          migration: 'supabase/migrations/20260802214000_world_observatory_learning.sql',
          reason: 'The WORLD observatory schema is only partially available.',
        },
        limits: [
          'The WORLD schema is partial; no incomplete analytical state is presented as valid.',
          'No fallback observations, provider scores or simulated nodes are generated.',
        ],
      });
    }

    return NextResponse.json({
      ok: false,
      error: 'world_observatory_query_failed',
      details: secondaryError.message,
    }, { status: 503 });
  }

  const readingByObservation = new Map((readings ?? []).map((item) => [item.observation_id, item]));
  const nodes = (observationsQuery.data ?? []).map((item) => ({
    id: item.id,
    kind: 'observed',
    sourceFamily: item.source_family,
    publisher: item.publisher,
    title: item.title,
    summary: item.summary,
    observedAt: item.observed_at,
    lat: item.latitude,
    lng: item.longitude,
    affectedSystems: item.affected_systems,
    actors: item.actors,
    confidence: Number(item.confidence ?? 0),
    reading: readingByObservation.get(item.id) ?? null,
  }));

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    sourceState: nodes.length ? 'OBSERVED_WORLD' : 'NO_WORLD_OBSERVATIONS',
    nodes,
    hypotheses: hypotheses ?? [],
    outcomes: outcomes ?? [],
    learning: learning ?? [],
    sourceFamilies: [...new Set(nodes.map((node) => node.sourceFamily))],
    limits: [
      'External source scores are not imported.',
      'Every node is a real observation with publisher and time.',
      'Missing or failed sources remain missing; no simulated values are generated.',
      'SFI readings use the canonical Φ and F_s implementation.',
    ],
  });
}

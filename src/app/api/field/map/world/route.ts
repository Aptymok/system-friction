import { NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServiceSupabaseClient,
} from '@/runtime/supabase/server';
import { bootstrapWorldObservatory } from './bootstrap';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isMissingWorldSchema(error: { code?: string | null; message?: string | null }) {
  const code = String(error.code ?? '').toUpperCase();
  const message = String(error.message ?? '').toLowerCase();
  return code === 'PGRST205'
    || code === '42P01'
    || message.includes('could not find the table')
    || message.includes('relation "public.world_');
}

function pendingSchemaResponse(error: { code?: string | null; message?: string | null }) {
  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    sourceState: 'WORLD_SCHEMA_PENDING',
    nodes: [],
    hypotheses: [],
    outcomes: [],
    learning: [],
    sourceFamilies: [],
    diagnostic: {
      code: error.code ?? null,
      message: error.message ?? null,
      readPath: 'service_role_after_authenticated_user_gate',
    },
    limits: [
      'The active production database still reports the WORLD relation as missing.',
      'No fallback observations, provider scores or simulated nodes are generated.',
    ],
  });
}

export async function GET() {
  const authClient = await createServerSupabaseClient();
  const { data: auth, error: authError } = await authClient.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // Authentication is enforced with the user's session. All WORLD reads then use
  // the server-only service client so RLS/grant drift cannot hide persisted data.
  const db = createServiceSupabaseClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  let observationsQuery = await db
    .from('world_source_observations')
    .select('*')
    .gte('observed_at', since)
    .order('observed_at', { ascending: false })
    .limit(500);

  if (observationsQuery.error) {
    if (isMissingWorldSchema(observationsQuery.error)) {
      return pendingSchemaResponse(observationsQuery.error);
    }
    return NextResponse.json({
      ok: false,
      error: 'world_observations_query_failed',
      code: observationsQuery.error.code ?? null,
      details: observationsQuery.error.message,
    }, { status: 503 });
  }

  let bootstrap: Awaited<ReturnType<typeof bootstrapWorldObservatory>> | null = null;
  if ((observationsQuery.data ?? []).length === 0) {
    bootstrap = await bootstrapWorldObservatory();
    observationsQuery = await db
      .from('world_source_observations')
      .select('*')
      .gte('observed_at', since)
      .order('observed_at', { ascending: false })
      .limit(500);
  }

  const [readingsQuery, hypothesesQuery, outcomesQuery, learningQuery] = await Promise.all([
    db.from('world_friction_readings').select('*').order('created_at', { ascending: false }).limit(500),
    db.from('world_hypotheses').select('*').order('created_at', { ascending: false }).limit(100),
    db.from('world_hypothesis_outcomes').select('*').order('evaluated_at', { ascending: false }).limit(100),
    db.from('world_learning_events').select('*').order('created_at', { ascending: false }).limit(100),
  ]);

  const secondaryError = observationsQuery.error
    ?? readingsQuery.error
    ?? hypothesesQuery.error
    ?? outcomesQuery.error
    ?? learningQuery.error;

  if (secondaryError) {
    if (isMissingWorldSchema(secondaryError)) return pendingSchemaResponse(secondaryError);
    return NextResponse.json({
      ok: false,
      error: 'world_observatory_query_failed',
      code: secondaryError.code ?? null,
      details: secondaryError.message,
      bootstrap,
    }, { status: 503 });
  }

  const readings = readingsQuery.data ?? [];
  const hypotheses = hypothesesQuery.data ?? [];
  const outcomes = outcomesQuery.data ?? [];
  const learning = learningQuery.data ?? [];
  const readingByObservation = new Map(readings.map((item) => [item.observation_id, item]));

  const nodes = (observationsQuery.data ?? []).map((item) => ({
    id: item.id,
    kind: 'observed' as const,
    sourceFamily: item.source_family,
    publisher: item.publisher,
    title: item.title,
    summary: item.summary,
    observedAt: item.observed_at,
    lat: item.latitude === null ? null : Number(item.latitude),
    lng: item.longitude === null ? null : Number(item.longitude),
    affectedSystems: Array.isArray(item.affected_systems) ? item.affected_systems : [],
    actors: Array.isArray(item.actors) ? item.actors : [],
    confidence: Number(item.confidence ?? 0),
    reading: readingByObservation.get(item.id) ?? null,
  }));

  const locatedCount = nodes.filter((node) => Number.isFinite(node.lat) && Number.isFinite(node.lng)).length;

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    sourceState: nodes.length ? 'OBSERVED_WORLD' : 'NO_WORLD_OBSERVATIONS',
    nodes,
    hypotheses,
    outcomes,
    learning,
    sourceFamilies: [...new Set(nodes.map((node) => node.sourceFamily))],
    bootstrap,
    diagnostic: {
      readPath: 'service_role_after_authenticated_user_gate',
      observations: nodes.length,
      located: locatedCount,
      readings: readings.length,
      hypotheses: hypotheses.length,
      outcomes: outcomes.length,
      learning: learning.length,
    },
    limits: [
      'External source scores are not imported.',
      'Every node is a real observation with publisher and time.',
      'Missing or failed sources remain missing; no simulated values are generated.',
      'SFI readings use the canonical Φ and F_s implementation.',
    ],
  });
}

import { NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServiceSupabaseClient,
} from '@/runtime/supabase/server';
import { bootstrapWorldObservatory } from './bootstrap';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const WORLD_HORIZON_DAYS = 30;
const PAGE_SIZE = 500;

type DbError = { code?: string | null; message?: string | null };
type Row = Record<string, unknown>;
type ServiceDb = ReturnType<typeof createServiceSupabaseClient>;

function isMissingWorldSchema(error: DbError) {
  const code = String(error.code ?? '').toUpperCase();
  const message = String(error.message ?? '').toLowerCase();
  return code === 'PGRST205'
    || code === '42P01'
    || message.includes('could not find the table')
    || message.includes('relation "public.world_');
}

function pendingSchemaResponse(error: DbError) {
  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    sourceState: 'WORLD_SCHEMA_PENDING',
    horizonDays: WORLD_HORIZON_DAYS,
    nodes: [],
    hypotheses: [],
    outcomes: [],
    learning: [],
    cognitiveRuns: [],
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

async function readPagedRows(db: ServiceDb, table: string, timeColumn: string, since: string, ascending = false) {
  const rows: Row[] = [];
  let from = 0;

  for (;;) {
    const result = await db
      .from(table)
      .select('*')
      .gte(timeColumn, since)
      .order(timeColumn, { ascending })
      .range(from, from + PAGE_SIZE - 1);

    if (result.error) return { data: rows, error: result.error };
    const page = Array.isArray(result.data) ? result.data as Row[] : [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return { data: rows, error: null };
}

async function readOwnerCognitiveRuns(db: ServiceDb, since: string, ownerId: string) {
  const rows: Row[] = [];
  let from = 0;

  for (;;) {
    const result = await db.from('sfi_cognitive_twin_runs')
      .select('id,task_id,role,status,provider,model,objective,input_snapshot,output_envelope,evidence_refs,limitations,started_at,finished_at,created_at')
      .eq('role', 'world_field_frame_analysis')
      .contains('input_snapshot', { requestedBy: ownerId })
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (result.error) return { data: rows, error: result.error };
    const page = Array.isArray(result.data) ? result.data as Row[] : [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return { data: rows, error: null };
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
  const since = new Date(Date.now() - WORLD_HORIZON_DAYS * 24 * 60 * 60 * 1000).toISOString();

  let observationsQuery = await readPagedRows(db, 'world_source_observations', 'observed_at', since, false);

  if (observationsQuery.error) {
    if (isMissingWorldSchema(observationsQuery.error)) return pendingSchemaResponse(observationsQuery.error);
    return NextResponse.json({
      ok: false,
      error: 'world_observations_query_failed',
      code: observationsQuery.error.code ?? null,
      details: observationsQuery.error.message,
    }, { status: 503 });
  }

  let bootstrap: Awaited<ReturnType<typeof bootstrapWorldObservatory>> | null = null;
  if (observationsQuery.data.length === 0) {
    bootstrap = await bootstrapWorldObservatory();
    observationsQuery = await readPagedRows(db, 'world_source_observations', 'observed_at', since, false);
  }

  const [readingsQuery, hypothesesQuery, outcomesQuery, learningQuery, cognitiveRunsQuery] = await Promise.all([
    readPagedRows(db, 'world_friction_readings', 'created_at', since, false),
    readPagedRows(db, 'world_hypotheses', 'cutoff_at', since, true),
    readPagedRows(db, 'world_hypothesis_outcomes', 'evaluated_at', since, true),
    readPagedRows(db, 'world_learning_events', 'created_at', since, true),
    readOwnerCognitiveRuns(db, since, auth.user.id),
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

  const readings = readingsQuery.data;
  const hypotheses = hypothesesQuery.data;
  const outcomes = outcomesQuery.data;
  const learning = learningQuery.data;
  const cognitiveRuns = cognitiveRunsQuery.data;
  const readingByObservation = new Map(readings.map((item) => [String(item.observation_id), item]));

  const nodes = observationsQuery.data.map((item) => ({
    id: String(item.id),
    kind: 'observed' as const,
    sourceFamily: String(item.source_family ?? 'unknown'),
    publisher: String(item.publisher ?? 'unknown'),
    title: String(item.title ?? 'Untitled observation'),
    summary: typeof item.summary === 'string' ? item.summary : null,
    observedAt: String(item.observed_at ?? item.created_at ?? ''),
    lat: item.latitude === null || typeof item.latitude === 'undefined' ? null : Number(item.latitude),
    lng: item.longitude === null || typeof item.longitude === 'undefined' ? null : Number(item.longitude),
    affectedSystems: Array.isArray(item.affected_systems) ? item.affected_systems : [],
    actors: Array.isArray(item.actors) ? item.actors : [],
    confidence: Number(item.confidence ?? 0),
    reading: readingByObservation.get(String(item.id)) ?? null,
  }));

  const locatedCount = nodes.filter((node) => Number.isFinite(node.lat) && Number.isFinite(node.lng)).length;
  const timestamps = [
    ...nodes.map((node) => node.observedAt),
    ...hypotheses.map((row) => String(row.cutoff_at ?? '')),
    ...outcomes.map((row) => String(row.evaluated_at ?? '')),
    ...learning.map((row) => String(row.created_at ?? '')),
    ...cognitiveRuns.map((row) => String(row.finished_at ?? row.created_at ?? '')),
  ].filter(Boolean).sort();

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    sourceState: nodes.length ? 'OBSERVED_WORLD' : 'NO_WORLD_OBSERVATIONS',
    horizonDays: WORLD_HORIZON_DAYS,
    temporalBounds: {
      firstAt: timestamps[0] ?? null,
      lastAt: timestamps.at(-1) ?? null,
    },
    nodes,
    hypotheses,
    outcomes,
    learning,
    cognitiveRuns,
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
      cognitiveRuns: cognitiveRuns.length,
      cognitiveRunReadWarning: cognitiveRunsQuery.error?.message ?? null,
      paginated: true,
      pageSize: PAGE_SIZE,
      horizonDays: WORLD_HORIZON_DAYS,
    },
    limits: [
      'External source scores are not imported.',
      'Every node is a real observation with publisher and time.',
      'Missing or failed sources remain missing; no simulated values are generated.',
      'SFI readings use the canonical Φ and F_s implementation.',
      'Map geometry is geographic presentation. Temporal filtering changes which persisted observations are visible; it does not create graph relations.',
      'Cognitive frame runs are owner-scoped interpretations. They are not WORLD observations and are never shared across member accounts by this route.',
    ],
  });
}
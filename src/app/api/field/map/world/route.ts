import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/runtime/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: observations, error: observationsError }, { data: readings }, { data: hypotheses }, { data: outcomes }, { data: learning }] = await Promise.all([
    supabase.from('world_source_observations').select('*').gte('observed_at', since).order('observed_at', { ascending: false }).limit(500),
    supabase.from('world_friction_readings').select('*').order('created_at', { ascending: false }).limit(500),
    supabase.from('world_hypotheses').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('world_hypothesis_outcomes').select('*').order('evaluated_at', { ascending: false }).limit(100),
    supabase.from('world_learning_events').select('*').order('created_at', { ascending: false }).limit(100),
  ]);

  if (observationsError) return NextResponse.json({ ok: false, error: 'world_schema_unavailable', details: observationsError.message }, { status: 503 });
  const readingByObservation = new Map((readings ?? []).map((item) => [item.observation_id, item]));
  const nodes = (observations ?? []).map((item) => ({
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

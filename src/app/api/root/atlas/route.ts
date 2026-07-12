import { NextResponse } from 'next/server';

import { auditRootAction, requireRootActor } from '@/lib/root/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ATLAS_EVIDENCE_SOURCES = ['studio_object_context_synthesis_v1', 'studio_field_projection_v2'];

type StudioObjectRow = {
  id: string;
  title: string | null;
  object_type: string | null;
  metadata: unknown;
  created_at: string | null;
  updated_at: string | null;
};

type PredictiveRunRow = {
  id: string;
  subject_id: string;
  status: string;
  prediction: number | null;
  lower_bound: number | null;
  upper_bound: number | null;
  confidence: number | null;
  calibration_status: string | null;
  model_version: number | null;
  due_at: string | null;
  input_snapshot: unknown;
  created_at: string;
  updated_at: string | null;
};

type EvidenceTraceRow = {
  id: string;
  object_id: string;
  source: string | null;
  created_at: string | null;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function themesFromMetadata(value: unknown) {
  const metadata = record(value);
  const raw = Array.isArray(metadata.atlasThemes) ? metadata.atlasThemes : [];
  return [...new Set(raw
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean))].slice(0, 20);
}

function normalizedThemes(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean))].slice(0, 20);
}

export async function GET(request: Request) {
  const gate = await requireRootActor('root.atlas.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const service = createServiceSupabaseClient();
  const theme = new URL(request.url).searchParams.get('theme')?.trim().toLowerCase() || null;
  const [runsResult, atlasEvidenceResult] = await Promise.all([
    service
      .from('sfi_predictive_runs')
      .select('id,subject_id,status,prediction,lower_bound,upper_bound,confidence,calibration_status,model_version,due_at,input_snapshot,created_at,updated_at')
      .eq('scope', 'studio')
      .eq('subject_type', 'studio_object')
      .order('created_at', { ascending: false })
      .limit(240),
    service
      .from('studio_evidence_traces')
      .select('id,object_id,source,created_at')
      .in('source', ATLAS_EVIDENCE_SOURCES)
      .order('created_at', { ascending: false })
      .limit(240),
  ]);

  if (runsResult.error && atlasEvidenceResult.error) {
    return NextResponse.json({
      ok: false,
      error: 'atlas_sources_query_failed',
      details: `${runsResult.error.message} | ${atlasEvidenceResult.error.message}`,
    }, { status: 400 });
  }

  const runs = (runsResult.data ?? []) as PredictiveRunRow[];
  const atlasEvidence = (atlasEvidenceResult.data ?? []) as EvidenceTraceRow[];
  const objectIds = [...new Set([
    ...runs.map((run) => run.subject_id),
    ...atlasEvidence.map((item) => item.object_id),
  ].filter(Boolean))];
  const sourceWarnings = [
    runsResult.error ? `sfi_predictive_runs:${runsResult.error.message}` : null,
    atlasEvidenceResult.error ? `studio_evidence_traces:${atlasEvidenceResult.error.message}` : null,
  ].filter((item): item is string => Boolean(item));

  if (!objectIds.length) return NextResponse.json({ ok: true, cases: [], allThemes: [], warnings: sourceWarnings });

  const [objectsResult, evidenceResult] = await Promise.all([
    service.from('studio_objects').select('id,title,object_type,metadata,created_at,updated_at').in('id', objectIds),
    service.from('studio_evidence_traces').select('id,object_id,source,created_at').in('object_id', objectIds),
  ]);

  const warnings = [
    ...sourceWarnings,
    objectsResult.error ? `studio_objects:${objectsResult.error.message}` : null,
    evidenceResult.error ? `studio_evidence_traces:${evidenceResult.error.message}` : null,
  ].filter((item): item is string => Boolean(item));

  const objects = (objectsResult.data ?? []) as StudioObjectRow[];
  const evidence = (evidenceResult.data ?? atlasEvidence) as EvidenceTraceRow[];
  const objectById = new Map(objects.map((item) => [item.id, item]));
  const evidenceByObject = new Map<string, EvidenceTraceRow[]>();
  for (const item of evidence) evidenceByObject.set(item.object_id, [...(evidenceByObject.get(item.object_id) ?? []), item]);

  const runsByObject = new Map<string, PredictiveRunRow[]>();
  for (const run of runs) runsByObject.set(run.subject_id, [...(runsByObject.get(run.subject_id) ?? []), run]);
  for (const list of runsByObject.values()) list.sort((a, b) => a.created_at.localeCompare(b.created_at));

  const allThemes = [...new Set(objects.flatMap((item) => themesFromMetadata(item.metadata)))].sort();
  const cases = objectIds.map((objectId) => {
    const object = objectById.get(objectId);
    const objectRuns = runsByObject.get(objectId) ?? [];
    const objectEvidence = evidenceByObject.get(objectId) ?? [];
    const themes = themesFromMetadata(object?.metadata);
    const trajectory = objectRuns.map((run) => ({
      runId: run.id,
      generatedAt: run.created_at,
      prediction: run.prediction,
      lowerBound: run.lower_bound,
      upperBound: run.upper_bound,
      confidence: run.confidence,
      state: run.status,
      modelVersion: run.model_version,
      calibrationStatus: run.calibration_status,
      dueAt: run.due_at,
    }));
    const latest = trajectory.length ? trajectory[trajectory.length - 1] : null;
    const firstEvidenceAt = objectEvidence
      .map((item) => item.created_at)
      .filter((value): value is string => Boolean(value))
      .sort()[0] ?? null;
    return {
      caseId: `studio:${objectId}`,
      caseCode: `STUDIO-${objectId.slice(0, 8).toUpperCase()}`,
      objectId,
      objectTitle: object?.title ?? 'SIN TÍTULO',
      objectClass: object?.object_type ?? null,
      openedAt: trajectory[0]?.generatedAt ?? firstEvidenceAt ?? object?.created_at ?? null,
      closedAt: null,
      themes,
      evidenceCount: objectEvidence.length,
      evidenceSources: [...new Set(objectEvidence.map((item) => item.source).filter((item): item is string => Boolean(item)))],
      trajectory,
      latestPrediction: latest?.prediction ?? null,
      latestConfidence: latest?.confidence ?? null,
      latestState: latest?.state ?? null,
      latestRunAt: latest?.generatedAt ?? null,
    };
  }).filter((item) => !theme || item.themes.includes(theme));

  cases.sort((a, b) => String(b.latestRunAt ?? b.openedAt ?? '').localeCompare(String(a.latestRunAt ?? a.openedAt ?? '')));
  return NextResponse.json({ ok: true, cases, allThemes, warnings });
}

export async function POST(request: Request) {
  const gate = await requireRootActor('root.atlas.themes.update');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const objectId = typeof body.objectId === 'string' ? body.objectId.trim() : '';
  const themes = normalizedThemes(body.themes);
  if (!objectId) return NextResponse.json({ ok: false, error: 'objectId_required' }, { status: 400 });

  const service = createServiceSupabaseClient();
  const current = await service.from('studio_objects').select('id,title,metadata').eq('id', objectId).maybeSingle();
  if (current.error || !current.data) {
    return NextResponse.json({ ok: false, error: 'studio_object_not_found', details: current.error?.message ?? objectId }, { status: 404 });
  }

  const metadata = { ...record(current.data.metadata), atlasThemes: themes };
  const updatedAt = new Date().toISOString();
  const update = await service.from('studio_objects').update({ metadata, updated_at: updatedAt }).eq('id', objectId);
  if (update.error) return NextResponse.json({ ok: false, error: 'atlas_themes_update_failed', details: update.error.message }, { status: 400 });

  const audit = await auditRootAction({
    actorId: gate.ctx.user.id,
    action: 'root.atlas.themes.update',
    target: objectId,
    payload: { objectId, themes },
    request,
  });
  if (!audit.ok) return NextResponse.json(audit, { status: 500 });

  return NextResponse.json({ ok: true, objectId, objectTitle: current.data.title ?? null, themes, updatedAt, audit });
}

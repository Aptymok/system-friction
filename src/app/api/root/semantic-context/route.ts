import { NextResponse } from 'next/server';
import { requireRootViewer } from '@/lib/root/server';
import { getCurrentWorldVectorCycleDay } from '@/lib/world-vector/sectorCycle';
import { deriveWorldVectorObservation } from '@/lib/world-vector/deriveObservation';
import { getLatestWorldSpectSnapshot, getWorldSpectSnapshotAtOrBefore } from '@/lib/worldspect/snapshotStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Row = Record<string, unknown>;
function text(value: unknown, fallback = '') { return typeof value === 'string' && value.trim() ? value.trim() : fallback; }
function rec(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
function strings(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())) : []; }

async function worldContext(at: string | null) {
  const [historical, current] = await Promise.all([
    at ? getWorldSpectSnapshotAtOrBefore(at) : Promise.resolve(null),
    getLatestWorldSpectSnapshot(),
  ]);
  const historicalObservation = historical && at
    ? deriveWorldVectorObservation(historical, getCurrentWorldVectorCycleDay(new Date(at)), { recentSampleCount: 0 })
    : null;
  const currentObservation = current
    ? deriveWorldVectorObservation(current, getCurrentWorldVectorCycleDay(new Date()), { recentSampleCount: 0 })
    : null;
  return { historicalSnapshot: historical, historicalObservation, currentSnapshot: current, currentObservation };
}

async function predictionContext(service: any, id: string) {
  let run = await service.from('sfi_predictive_runs').select('*').eq('id', id).maybeSingle();
  let outcome: any = null;
  let legacy: any = null;
  if (!run.data) {
    const byOutcome = await service.from('sfi_predictive_outcomes').select('*').eq('id', id).maybeSingle();
    if (byOutcome.data?.run_id) {
      outcome = byOutcome.data;
      run = await service.from('sfi_predictive_runs').select('*').eq('id', byOutcome.data.run_id).maybeSingle();
    }
  }
  if (!run.data) {
    const byLegacy = await service.from('sfi_prediction_entries').select('*').eq('id', id).maybeSingle();
    legacy = byLegacy.data ?? null;
  }

  const runId = text(run.data?.id);
  const legacyId = text(legacy?.id);
  const hypothesisId = text(legacy?.hypothesis_id);
  const at = text(run.data?.created_at ?? legacy?.prediction_registered_at ?? legacy?.created_at, '') || null;
  const [outcomes, requests, learning, verification, attractors, world] = await Promise.all([
    runId ? service.from('sfi_predictive_outcomes').select('*').eq('run_id', runId).order('observed_at', { ascending: true }) : Promise.resolve({ data: outcome ? [outcome] : [] }),
    runId ? service.from('sfi_predictive_evidence_requests').select('*').eq('run_id', runId).order('created_at', { ascending: true }) : Promise.resolve({ data: [] }),
    runId ? service.from('sfi_predictive_learning_events').select('*').eq('run_id', runId).order('created_at', { ascending: true }) : Promise.resolve({ data: [] }),
    legacyId ? service.from('sfi_prediction_verifications').select('*').or(`prediction_entry_id.eq.${legacyId}${hypothesisId ? `,hypothesis_id.eq.${hypothesisId}` : ''}`).order('created_at', { ascending: true }) : Promise.resolve({ data: [] }),
    service.from('sfi_attractors').select('*').eq('owner_node_key', `prediction:${runId || legacyId}`).order('updated_at', { ascending: false }),
    worldContext(at),
  ]);

  const prediction = run.data ? text(run.data.prediction) : text(legacy?.prediccion_explicita);
  const rawConfidence = run.data?.confidence ?? legacy?.probabilidad_estimativa;
  const confidence = typeof rawConfidence === 'number' ? (rawConfidence > 1 ? rawConfidence / 100 : rawConfidence) : Number(rawConfidence || 0);
  const origin = rec(attractors.data?.[0]?.vector).origin ?? (legacy ? 'LEGACY_REGISTRY' : 'UNKNOWN');
  return {
    kind: 'prediction_case',
    prediction,
    confidence: Number.isFinite(confidence) ? confidence : null,
    status: text(run.data?.status ?? legacy?.estado_observacion ?? legacy?.evidence_state, 'MISSING'),
    createdAt: at,
    dueAt: run.data?.due_at ?? null,
    interpretation: run.data?.interpretation ?? null,
    verificationRule: run.data?.verification_rule ?? verification.data?.[0]?.verification_rule ?? null,
    evidenceRefs: strings(run.data?.evidence_refs),
    missingEvidence: strings(run.data?.missing_evidence),
    origin,
    run: run.data ?? null,
    legacy,
    outcomes: outcomes.data ?? [],
    evidenceRequests: requests.data ?? [],
    learningEvents: learning.data ?? [],
    verifications: verification.data ?? [],
    attractors: attractors.data ?? [],
    world,
  };
}

async function evidenceContext(service: any, id: string) {
  const root = await service.from('root_evidence_entries').select('*').eq('id', id).maybeSingle();
  const ledger = root.data ? { data: null } : await service.from('sfi_evidence_ledger').select('*').eq('id', id).maybeSingle();
  const row = root.data ?? ledger.data;
  if (!row) return { kind: 'evidence_context', missing: true };
  const hash = text(row.evidence_hash);
  const nodeCandidates = hash ? [`root_evidence:${hash.slice(0,24)}`, `ledger_evidence:${hash.slice(0,24)}`] : [];
  const nodes = nodeCandidates.length ? await service.from('graph_nodes').select('*').in('node_id', nodeCandidates) : { data: [] };
  const nodeIds = (nodes.data ?? []).map((node: any) => node.node_id).filter(Boolean);
  const edges = nodeIds.length ? await service.from('graph_edges').select('*').or(nodeIds.map((nodeId: string) => `source_node_id.eq.${nodeId},target_node_id.eq.${nodeId}`).join(',')) : { data: [] };
  const relatedIds = Array.from(new Set((edges.data ?? []).flatMap((edge: any) => [edge.source_node_id, edge.target_node_id]).filter((nodeId: string) => nodeId && !nodeIds.includes(nodeId))));
  const relatedNodes = relatedIds.length ? await service.from('graph_nodes').select('*').in('node_id', relatedIds) : { data: [] };
  const attractors = await service.from('sfi_attractors').select('*').order('updated_at', { ascending: false }).limit(100);
  const linkedAttractors = (attractors.data ?? []).filter((attractor: any) => {
    const vector = rec(attractor.vector);
    return strings(vector.evidenceRefs).some((ref) => ref === id || ref === hash) || text(vector.caseId) === text(rec(row.payload).metadata && rec(rec(row.payload).metadata).caseId);
  });
  return { kind: 'evidence_context', missing: false, record: row, graphNodes: nodes.data ?? [], graphEdges: edges.data ?? [], relatedNodes: relatedNodes.data ?? [], attractors: linkedAttractors };
}

async function attractorContext(service: any, id: string) {
  let attractor = await service.from('sfi_attractors').select('*').eq('id', id).maybeSingle();
  if (!attractor.data) attractor = await service.from('sfi_attractors').select('*').eq('attractor_key', id).maybeSingle();
  const row = attractor.data;
  if (!row) return { kind: 'attractor_context', missing: true };
  const vector = rec(row.vector);
  const refs = strings(vector.evidenceRefs);
  const evidence = refs.length ? await service.from('root_evidence_entries').select('*').in('evidence_hash', refs) : { data: [] };
  const ledger = refs.length ? await service.from('sfi_evidence_ledger').select('*').in('evidence_hash', refs) : { data: [] };
  const predictionRunId = text(vector.predictionRunId);
  const prediction = predictionRunId ? await service.from('sfi_predictive_runs').select('*').eq('id', predictionRunId).maybeSingle() : { data: null };
  return { kind: 'attractor_context', missing: false, attractor: row, vector, evidence: [...(evidence.data ?? []), ...(ledger.data ?? [])], prediction: prediction.data ?? null };
}

export async function GET(request: Request) {
  const gate = await requireRootViewer('root.semantic_context.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const url = new URL(request.url);
  const kind = text(url.searchParams.get('kind'));
  const id = text(url.searchParams.get('id'));
  if (!kind || !id) return NextResponse.json({ ok: false, error: 'kind_and_id_required' }, { status: 400 });
  const normalized = kind.toLowerCase();
  const context = normalized.includes('hypothesis') || normalized.includes('prediction') || normalized === 'outcome'
    ? await predictionContext(gate.ctx.service, id)
    : normalized.includes('evidence') || normalized.includes('ledger')
      ? await evidenceContext(gate.ctx.service, id)
      : normalized.includes('attractor')
        ? await attractorContext(gate.ctx.service, id)
        : null;
  return NextResponse.json({ ok: true, context }, { headers: { 'Cache-Control': 'no-store' } });
}

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
function uniqueRows(items: any[], key: string) {
  const unique = new Map<string, any>();
  let anonymous = 0;
  for (const item of items.filter(Boolean)) {
    const stableKey = text(item?.[key]);
    // Never stringify an arbitrary persisted payload just to obtain a map key.
    // Legacy rows can contain unusually large or malformed nested structures;
    // they must not be able to crash the whole semantic context route.
    const resolvedKey = stableKey || `anonymous:${anonymous++}`;
    if (!unique.has(resolvedKey)) unique.set(resolvedKey, item);
  }
  return [...unique.values()];
}
function connectedNodeIds(edges: any[], excluded: string[]) {
  return Array.from(new Set<string>(edges.flatMap((edge) => [text(edge?.source_node_id), text(edge?.target_node_id)]).filter((nodeId): nodeId is string => Boolean(nodeId) && !excluded.includes(nodeId))));
}
function edgeFilterFor(nodeIds: string[]) {
  return nodeIds.flatMap((nodeId) => [`source_node_id.eq.${nodeId}`, `target_node_id.eq.${nodeId}`]).join(',');
}

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
  const parsedConfidence = rawConfidence === null || rawConfidence === undefined || rawConfidence === '' ? null : Number(rawConfidence);
  const confidence = typeof rawConfidence === 'number'
    ? (rawConfidence > 1 ? rawConfidence / 100 : rawConfidence)
    : parsedConfidence !== null && Number.isFinite(parsedConfidence)
      ? (parsedConfidence > 1 ? parsedConfidence / 100 : parsedConfidence)
      : null;
  const origin = rec(attractors.data?.[0]?.vector).origin ?? (legacy ? 'LEGACY_REGISTRY' : 'UNKNOWN');
  return {
    kind: 'prediction_case', prediction, confidence,
    status: text(run.data?.status ?? legacy?.estado_observacion ?? legacy?.evidence_state, 'MISSING'),
    createdAt: at, dueAt: run.data?.due_at ?? null, interpretation: run.data?.interpretation ?? null,
    verificationRule: run.data?.verification_rule ?? verification.data?.[0]?.verification_rule ?? null,
    evidenceRefs: strings(run.data?.evidence_refs), missingEvidence: strings(run.data?.missing_evidence), origin,
    run: run.data ?? null, legacy, outcomes: outcomes.data ?? [], evidenceRequests: requests.data ?? [], learningEvents: learning.data ?? [], verifications: verification.data ?? [], attractors: attractors.data ?? [], world,
  };
}

async function resolveEvidence(service: any, id: string) {
  if (id.startsWith('root_evidence:') || id.startsWith('ledger_evidence:')) {
    const node = await service.from('graph_nodes').select('*').eq('node_id', id).maybeSingle();
    const payload = rec(node.data?.payload ?? node.data?.attributes);
    const rootEvidenceId = text(payload.rootEvidenceId);
    const ledgerEvidenceId = text(payload.ledgerEvidenceId);
    if (rootEvidenceId) {
      const row = await service.from('root_evidence_entries').select('*').eq('id', rootEvidenceId).maybeSingle();
      return { row: row.data ?? null, node: node.data ?? null };
    }
    if (ledgerEvidenceId) {
      const row = await service.from('sfi_evidence_ledger').select('*').eq('id', ledgerEvidenceId).maybeSingle();
      return { row: row.data ?? null, node: node.data ?? null };
    }
  }
  const root = await service.from('root_evidence_entries').select('*').eq('id', id).maybeSingle();
  if (root.data) return { row: root.data, node: null };
  const ledger = await service.from('sfi_evidence_ledger').select('*').eq('id', id).maybeSingle();
  return { row: ledger.data ?? null, node: null };
}

async function evidenceContext(service: any, id: string) {
  const resolved = await resolveEvidence(service, id);
  const row = resolved.row;
  if (!row) return { kind: 'evidence_context', missing: true };
  const hash = text(row.evidence_hash);
  const rowPayload = rec(row.payload);
  const metadata = rec(rowPayload.metadata);
  const summary = rec(row.public_summary);
  const evidenceKey = text(metadata.evidenceKey ?? summary.evidenceKey);
  const caseId = text(metadata.caseId ?? row.case_id);
  const nodeCandidates = Array.from(new Set<string>([
    text(resolved.node?.node_id), hash ? `root_evidence:${hash.slice(0, 24)}` : '', hash ? `ledger_evidence:${hash.slice(0, 24)}` : '',
  ].filter((value): value is string => Boolean(value))));
  const nodes = nodeCandidates.length ? await service.from('graph_nodes').select('*').in('node_id', nodeCandidates) : { data: [] };
  const nodeIds = (nodes.data ?? []).map((node: any) => text(node?.node_id)).filter((nodeId: string): nodeId is string => Boolean(nodeId));
  const directEdges = nodeIds.length ? await service.from('graph_edges').select('*').or(edgeFilterFor(nodeIds)) : { data: [] };
  const firstHopIds = connectedNodeIds(directEdges.data ?? [], nodeIds);
  const secondEdges = firstHopIds.length ? await service.from('graph_edges').select('*').or(edgeFilterFor(firstHopIds)) : { data: [] };
  const allEdges = uniqueRows([...(directEdges.data ?? []), ...(secondEdges.data ?? [])], 'edge_id');
  const relatedIds = connectedNodeIds(allEdges, nodeIds);
  const relatedNodes = relatedIds.length ? await service.from('graph_nodes').select('*').in('node_id', relatedIds) : { data: [] };
  const attractors = await service.from('sfi_attractors').select('*').order('updated_at', { ascending: false }).limit(250);
  const linkedAttractors = (attractors.data ?? []).filter((attractor: any) => {
    const vector = rec(attractor.vector); const refs = strings(vector.evidenceRefs);
    return refs.some((ref) => [id, hash, evidenceKey].filter(Boolean).includes(ref)) || (caseId && text(vector.caseId) === caseId);
  });
  return { kind: 'evidence_context', missing: false, record: row, graphNodes: nodes.data ?? [], graphEdges: allEdges, relatedNodes: relatedNodes.data ?? [], attractors: linkedAttractors };
}

async function attractorContext(service: any, id: string) {
  let attractor = await service.from('sfi_attractors').select('*').eq('id', id).maybeSingle();
  if (!attractor.data) attractor = await service.from('sfi_attractors').select('*').eq('attractor_key', id.replace(/^attractor:/, '')).maybeSingle();
  const row = attractor.data;
  if (!row) return { kind: 'attractor_context', missing: true };
  const vector = rec(row.vector); const refs = strings(vector.evidenceRefs); let evidence: any[] = [];
  if (refs.length) {
    const [rootByHash, ledgerByHash, rootById, ledgerById] = await Promise.all([
      service.from('root_evidence_entries').select('*').in('evidence_hash', refs), service.from('sfi_evidence_ledger').select('*').in('evidence_hash', refs), service.from('root_evidence_entries').select('*').in('id', refs), service.from('sfi_evidence_ledger').select('*').in('id', refs),
    ]);
    evidence = uniqueRows([...(rootByHash.data ?? []), ...(ledgerByHash.data ?? []), ...(rootById.data ?? []), ...(ledgerById.data ?? [])], 'id');
  }
  const predictionRunId = text(vector.predictionRunId);
  const prediction = predictionRunId ? await service.from('sfi_predictive_runs').select('*').eq('id', predictionRunId).maybeSingle() : { data: null };
  return { kind: 'attractor_context', missing: false, attractor: row, vector, evidence, prediction: prediction.data ?? null };
}

export async function GET(request: Request) {
  const gate = await requireRootViewer('root.semantic_context.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const url = new URL(request.url); const kind = text(url.searchParams.get('kind')); const id = text(url.searchParams.get('id'));
  if (!kind || !id) return NextResponse.json({ ok: false, error: 'kind_and_id_required' }, { status: 400 });
  const normalized = kind.toLowerCase();
  try {
    const context = normalized.includes('hypothesis') || normalized.includes('prediction') || normalized === 'outcome'
      ? await predictionContext(gate.ctx.service, id)
      : normalized.includes('evidence') || normalized.includes('ledger')
        ? await evidenceContext(gate.ctx.service, id)
        : normalized.includes('attractor') ? await attractorContext(gate.ctx.service, id) : null;
    return NextResponse.json({ ok: true, context }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : 'malformed_or_unresolvable_record';
    return NextResponse.json({ ok: false, error: 'semantic_context_record_quarantined', details: detail }, { status: 422, headers: { 'Cache-Control': 'no-store' } });
  }
}

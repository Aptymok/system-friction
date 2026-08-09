import 'server-only';

import { createHash } from 'node:crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { isEpistemicClass, type EpistemicClass } from '../../../packages/events/src/schema';

type Row = Record<string, unknown>;
type FetchResult = { data: Row[]; error: string | null };
type EvidenceDescriptor = {
  id: string;
  hash: string | null;
  nodeId: string;
  label: string;
  caseId: string | null;
  module: string | null;
  evidenceKey: string | null;
  sourceUrl: string | null;
};

const PAGE_SIZE = 500;

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}
function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())) : [];
}
function number01(value: unknown, fallback = 1) {
  if (value === null || typeof value === 'undefined' || value === '') return fallback;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(1, parsed));
}
function normalizeEpistemicClass(value: unknown, fallback: EpistemicClass): EpistemicClass {
  const raw = text(value)?.toLowerCase();
  if (!raw) return fallback;
  if (isEpistemicClass(raw)) return raw as EpistemicClass;
  if (raw === 'imported_provenance' || raw === 'persisted_reference' || raw === 'provenance_observed') return 'imported';
  return fallback;
}
function sourceEpistemicClass(value: unknown) { return text(value) ?? null; }
function shortHash(value: string) { return createHash('sha256').update(value).digest('hex').slice(0, 24); }
function urlLabel(value: string) {
  try {
    const url = new URL(value);
    return `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`.slice(0, 140);
  } catch {
    return value.slice(0, 140);
  }
}

export async function reconcilePersistedEvidenceGraph() {
  const db = createServiceSupabaseClient();

  async function fetchAllRows(table: 'root_evidence_entries' | 'sfi_evidence_ledger', select: string): Promise<FetchResult> {
    const collected: Row[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const page = await db.from(table).select(select).order('created_at', { ascending: true }).order('id', { ascending: true }).range(offset, offset + PAGE_SIZE - 1);
      if (page.error) return { data: [], error: page.error.message };
      const pageRows = rows(page.data);
      collected.push(...pageRows);
      if (pageRows.length < PAGE_SIZE) return { data: collected, error: null };
    }
  }

  const [rootEvidence, ledger] = await Promise.all([
    fetchAllRows('root_evidence_entries', 'id,evidence_hash,title,evidence_type,target_node_id,payload,epistemic_event_id,created_at'),
    fetchAllRows('sfi_evidence_ledger', 'id,case_id,module,evidence_kind,source_name,source_url,private_ref,evidence_hash,public_summary,trust_level,trust_score,observed_at,created_at'),
  ]);

  const warnings = [rootEvidence.error, ledger.error].filter((value): value is string => Boolean(value));
  let nodesCreated = 0;
  let nodesUpdated = 0;
  let edgesCreated = 0;
  const descriptors: EvidenceDescriptor[] = [];

  async function upsertEdge(input: {
    from: string;
    to: string;
    relation: string;
    relationType: string;
    confidence: number;
    weight?: number;
    evidenceIds?: string[];
    attributes?: Row;
  }) {
    if (!input.from || !input.to || input.from === input.to) return;
    const edgeId = `${input.from}->${input.to}:${input.relation}`;
    const existing = await db.from('graph_edges').select('id').eq('edge_id', edgeId).maybeSingle();
    const attributes = {
      epistemicClass: 'DECLARED',
      relationStrength: input.weight && input.weight > 0 ? 'WEIGHTED' : 'UNMEASURED',
      declaredRelation: input.relation,
      reconstructedFromPersistedEvidence: true,
      ...(input.attributes ?? {}),
    };
    const edge = await db.from('graph_edges').upsert({
      edge_id: edgeId,
      source_node_id: input.from,
      target_node_id: input.to,
      source_node_key: input.from,
      target_node_key: input.to,
      relation: input.relation,
      relation_type: input.relationType,
      weight: input.weight ?? 0,
      w_ij: input.weight ?? 0,
      confidence: input.confidence,
      lineage: input.evidenceIds ?? [],
      evidence_ids: input.evidenceIds ?? [],
      payload: attributes,
      attributes,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'edge_id' });
    if (edge.error) warnings.push(`evidence_edge:${edgeId}:${edge.error.message}`);
    else if (!existing.data) edgesCreated += 1;
  }

  for (const item of rootEvidence.data) {
    const id = text(item.id);
    const hash = text(item.evidence_hash);
    if (!id || !hash) continue;
    const nodeId = `root_evidence:${hash.slice(0, 24)}`;
    const existing = await db.from('graph_nodes').select('id').eq('node_id', nodeId).maybeSingle();
    const eventId = text(item.epistemic_event_id);
    const payload = record(item.payload);
    const metadata = record(payload.metadata);
    const declaredEpistemicClass = metadata.epistemicClass ?? payload.epistemicClass;
    const epistemicClass = normalizeEpistemicClass(declaredEpistemicClass, 'observed');
    const observedObject = epistemicClass === 'imported' ? 'imported_evidence_record_existence_and_provenance' : 'evidence_record_existence_and_provenance';
    const nodePayload = {
      evidenceHash: hash,
      evidenceType: text(item.evidence_type) ?? 'root_evidence',
      rootEvidenceId: id,
      targetNodeId: text(item.target_node_id),
      epistemicClass: epistemicClass.toUpperCase(),
      sourceEpistemicClass: sourceEpistemicClass(declaredEpistemicClass),
      observedObject,
      sourcePayloadMetadata: metadata,
    };
    const upsert = await db.from('graph_nodes').upsert({
      node_id: nodeId, node_key: nodeId, label: text(item.title) ?? `Evidence ${id.slice(0, 8)}`, node_type: 'INF', ontology_type: 'evidence', origin: 'root_evidence', epistemic_class: epistemicClass, confidence: 1, payload: nodePayload, lineage: eventId ? [eventId] : [], attributes: nodePayload, updated_at: new Date().toISOString(),
    }, { onConflict: 'node_id' });
    if (upsert.error) { warnings.push(`root_evidence_graph:${id}:${upsert.error.message}`); continue; }
    if (existing.data) nodesUpdated += 1; else nodesCreated += 1;

    descriptors.push({
      id,
      hash,
      nodeId,
      label: text(item.title) ?? `Evidence ${id.slice(0, 8)}`,
      caseId: text(metadata.caseId),
      module: text(metadata.module),
      evidenceKey: text(metadata.evidenceKey),
      sourceUrl: text(metadata.sourceUrl ?? payload.sourceUrl),
    });

    const targetNodeId = text(item.target_node_id);
    if (targetNodeId) {
      const target = await db.from('graph_nodes').select('node_id,node_key').or(`node_id.eq.${targetNodeId},node_key.eq.${targetNodeId}`).maybeSingle();
      const resolvedTarget = target.data && !target.error ? text(target.data.node_id ?? target.data.node_key) : null;
      if (resolvedTarget) {
        await upsertEdge({
          from: nodeId,
          to: resolvedTarget,
          relation: text(payload.relationType) ?? 'contextualizes',
          relationType: 'structural_declared',
          confidence: 1,
          evidenceIds: eventId ? [eventId] : [],
          attributes: { evidenceHash: hash, verified: false, explicitTargetNode: true },
        });
      }
    }
  }

  for (const item of ledger.data) {
    const id = text(item.id);
    if (!id) continue;
    const hash = text(item.evidence_hash);
    const nodeId = `ledger_evidence:${hash ? hash.slice(0, 24) : id}`;
    const existing = await db.from('graph_nodes').select('id').eq('node_id', nodeId).maybeSingle();
    const publicSummary = record(item.public_summary);
    const declaredEpistemicClass = publicSummary.epistemicClass ?? item.trust_level;
    const epistemicClass = normalizeEpistemicClass(declaredEpistemicClass, 'imported');
    const confidence = number01(item.trust_score, 1);
    const nodePayload = {
      evidenceHash: hash,
      ledgerEvidenceId: id,
      caseId: text(item.case_id),
      module: text(item.module),
      evidenceKind: text(item.evidence_kind),
      sourceUrl: text(item.source_url),
      privateRef: text(item.private_ref),
      epistemicClass: epistemicClass.toUpperCase(),
      sourceEpistemicClass: sourceEpistemicClass(declaredEpistemicClass),
      observedObject: epistemicClass === 'imported' ? 'imported_ledger_record_existence_and_provenance' : 'ledger_record_existence_and_provenance',
    };
    const upsert = await db.from('graph_nodes').upsert({
      node_id: nodeId, node_key: nodeId, label: text(publicSummary.title) ?? text(item.source_name) ?? text(item.evidence_kind) ?? `Ledger evidence ${id.slice(0, 8)}`, node_type: 'INF', ontology_type: 'evidence', origin: 'evidence_ledger', epistemic_class: epistemicClass, confidence, payload: nodePayload, lineage: [], attributes: nodePayload, updated_at: new Date().toISOString(),
    }, { onConflict: 'node_id' });
    if (upsert.error) warnings.push(`ledger_evidence_graph:${id}:${upsert.error.message}`);
    else if (existing.data) nodesUpdated += 1; else nodesCreated += 1;

    descriptors.push({
      id,
      hash,
      nodeId,
      label: text(publicSummary.title) ?? text(item.source_name) ?? text(item.evidence_kind) ?? `Ledger evidence ${id.slice(0, 8)}`,
      caseId: text(item.case_id),
      module: text(item.module),
      evidenceKey: text(publicSummary.evidenceKey),
      sourceUrl: text(item.source_url),
    });
  }

  // Same hash means two persistence surfaces refer to the same evidence object.
  const byHash = new Map<string, EvidenceDescriptor[]>();
  descriptors.forEach((item) => { if (item.hash) byHash.set(item.hash, [...(byHash.get(item.hash) ?? []), item]); });
  for (const [hash, items] of byHash.entries()) {
    if (items.length < 2) continue;
    const [first, ...rest] = items;
    for (const other of rest) {
      await upsertEdge({ from: first.nodeId, to: other.nodeId, relation: 'same_evidence_object', relationType: 'identity_reference', confidence: 1, attributes: { evidenceHash: hash } });
    }
  }

  // Shared case/module is contextual linkage, not proof that one artifact validates another.
  async function linkShared(field: 'caseId' | 'module', relation: string) {
    const groups = new Map<string, EvidenceDescriptor[]>();
    descriptors.forEach((item) => {
      const value = item[field];
      if (!value) return;
      groups.set(value, [...(groups.get(value) ?? []), item]);
    });
    for (const [value, items] of groups.entries()) {
      const unique = Array.from(new Map(items.map((item) => [item.hash ?? item.id, item])).values());
      if (unique.length < 2) continue;
      for (let index = 1; index < unique.length; index += 1) {
        await upsertEdge({
          from: unique[0].nodeId,
          to: unique[index].nodeId,
          relation,
          relationType: 'contextual_declared',
          confidence: 1,
          attributes: { sharedField: field, sharedValue: value, doesNotImplyValidation: true },
        });
      }
    }
  }
  await linkShared('caseId', 'same_case_context');
  await linkShared('module', 'same_module_context');

  // A declared URL becomes a source-surface node. This records the provenance link, not live availability.
  for (const descriptor of descriptors) {
    if (!descriptor.sourceUrl) continue;
    const sourceNodeId = `source_surface:${shortHash(descriptor.sourceUrl)}`;
    const existing = await db.from('graph_nodes').select('id').eq('node_id', sourceNodeId).maybeSingle();
    const surfacePayload = { url: descriptor.sourceUrl, observedObject: 'declared_source_surface_reference', claimBoundary: 'The URL is persisted as provenance. Its current availability/content is not asserted by this graph node.' };
    const surface = await db.from('graph_nodes').upsert({
      node_id: sourceNodeId, node_key: sourceNodeId, label: urlLabel(descriptor.sourceUrl), node_type: 'SRC', ontology_type: 'source_surface', origin: 'evidence_provenance', epistemic_class: 'imported', confidence: 1, payload: surfacePayload, attributes: surfacePayload, lineage: [], updated_at: new Date().toISOString(),
    }, { onConflict: 'node_id' });
    if (surface.error) warnings.push(`source_surface:${descriptor.sourceUrl}:${surface.error.message}`);
    else if (existing.data) nodesUpdated += 1; else nodesCreated += 1;
    await upsertEdge({ from: descriptor.nodeId, to: sourceNodeId, relation: 'declares_source_surface', relationType: 'provenance_declared', confidence: 1, attributes: { sourceUrl: descriptor.sourceUrl } });
  }

  // Materialize attractors into the evidence graph and connect only explicit evidence references.
  const attractorRead = await db.from('sfi_attractors').select('id,attractor_key,label,module,owner_node_key,attractor_type,confidence,persistence,trust,weight,evidence_count,status,vector,first_seen,last_seen,created_at,updated_at').order('updated_at', { ascending: false }).limit(250);
  if (attractorRead.error) warnings.push(`attractor_graph:${attractorRead.error.message}`);
  for (const attractor of rows(attractorRead.data)) {
    const attractorKey = text(attractor.attractor_key);
    if (!attractorKey) continue;
    const attractorNodeId = `attractor:${attractorKey}`;
    const vector = record(attractor.vector);
    const existing = await db.from('graph_nodes').select('id').eq('node_id', attractorNodeId).maybeSingle();
    const attractorPayload = { ...attractor, observedObject: 'declared_attractor', claimBoundary: 'An attractor records a declared direction. It does not prove convergence or outcome.' };
    const upsert = await db.from('graph_nodes').upsert({
      node_id: attractorNodeId, node_key: attractorNodeId, label: text(attractor.label) ?? attractorKey, node_type: 'ATR', ontology_type: 'attractor', origin: 'sfi_attractors', epistemic_class: 'declared', confidence: number01(attractor.confidence, 0), payload: attractorPayload, attributes: attractorPayload, lineage: [], updated_at: new Date().toISOString(),
    }, { onConflict: 'node_id' });
    if (upsert.error) warnings.push(`attractor_node:${attractorKey}:${upsert.error.message}`);
    else if (existing.data) nodesUpdated += 1; else nodesCreated += 1;

    const refs = strings(vector.evidenceRefs);
    for (const ref of refs) {
      const evidence = descriptors.find((item) => item.id === ref || item.hash === ref || item.evidenceKey === ref);
      if (!evidence) continue;
      await upsertEdge({
        from: evidence.nodeId,
        to: attractorNodeId,
        relation: 'supports_attractor',
        relationType: 'evidence_declared',
        confidence: number01(attractor.trust ?? attractor.confidence, 0),
        weight: number01(attractor.weight, 0),
        evidenceIds: evidence.hash ? [evidence.hash] : [],
        attributes: { attractorKey, explicitEvidenceReference: ref },
      });
    }
  }

  return {
    ok: warnings.length === 0,
    rootEvidenceRows: rootEvidence.data.length,
    ledgerRows: ledger.data.length,
    evidenceDescriptors: descriptors.length,
    nodesCreated,
    nodesUpdated,
    edgesCreated,
    warnings: [...new Set(warnings)],
  };
}

import 'server-only';

import { createHash } from 'node:crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { canonicalizeEvidenceRows, type CanonicalEvidenceObject, type EvidenceRow } from './canonicalEvidence';

type Row = Record<string, unknown>;
type FetchResult = { data: EvidenceRow[]; error: string | null };

const PAGE_SIZE = 500;
const LEGACY_NODE_STORAGE_TYPE = 'INF';
const LEGACY_EDGE_STORAGE_TYPE = 'structural_inferred';
const EDGE_CONFLICT = 'source_node_key,target_node_key,relation_type';
const PROJECTION_VERSION = 'canonical-evidence-v2';
const MANAGED_NODE_ORIGINS = [
  'root_evidence',
  'evidence_ledger',
  'evidence_provenance',
  'sfi_attractors',
  'evidence_canonical',
  'evidence_context',
  'evidence_context_attractor',
];

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

function uniqueStrings(...groups: Array<Array<string | null | undefined>>) {
  return [...new Set(groups.flat().filter((item): item is string => Boolean(item && item.trim())))];
}

function number01(value: unknown, fallback = 1) {
  if (value === null || typeof value === 'undefined' || value === '') return fallback;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(1, parsed));
}

function shortHash(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 24);
}

function laterDate(a: string | null, b: string | null) {
  const left = a ? Date.parse(a) : Number.NaN;
  const right = b ? Date.parse(b) : Number.NaN;
  if (Number.isFinite(left) && Number.isFinite(right)) return left >= right ? a : b;
  return Number.isFinite(left) ? a : Number.isFinite(right) ? b : null;
}

function compactWarnings(input: string[]) {
  const unique = [...new Set(input.filter(Boolean))];
  const buckets = new Map<string, { count: number; sample: string }>();
  for (const warning of unique) {
    const constraint = warning.match(/(?:violates|unique constraint) "([^"]+)"/)?.[1];
    const family = warning.startsWith('evidence_edge:') ? 'graph_edges'
      : warning.startsWith('evidence_node:') || warning.startsWith('context_node:') || warning.startsWith('attractor_node:') ? 'graph_nodes'
        : warning.split(':', 1)[0] || 'graph';
    const key = constraint ? `${family}:${constraint}` : warning;
    const current = buckets.get(key);
    buckets.set(key, { count: (current?.count ?? 0) + 1, sample: current?.sample ?? warning });
  }
  return [...buckets.entries()].map(([key, value]) => value.count > 1 ? `${key} · ${value.count} reconciliaciones rechazadas` : value.sample);
}

function chunks<T>(items: T[], size = 180) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

export async function reconcilePersistedEvidenceGraph() {
  const db = createServiceSupabaseClient();

  async function fetchAllRows(table: 'root_evidence_entries' | 'sfi_evidence_ledger', select: string): Promise<FetchResult> {
    const collected: EvidenceRow[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const page = await db.from(table).select(select).order('created_at', { ascending: true }).order('id', { ascending: true }).range(offset, offset + PAGE_SIZE - 1);
      if (page.error) return { data: [], error: page.error.message };
      const pageRows = rows(page.data) as EvidenceRow[];
      collected.push(...pageRows);
      if (pageRows.length < PAGE_SIZE) return { data: collected, error: null };
    }
  }

  const [rootEvidence, ledger] = await Promise.all([
    fetchAllRows('root_evidence_entries', 'id,evidence_hash,title,evidence_type,target_node_id,payload,epistemic_event_id,created_at'),
    fetchAllRows('sfi_evidence_ledger', 'id,case_id,module,evidence_kind,source_name,source_url,private_ref,evidence_hash,public_summary,trust_level,trust_score,observed_at,created_at'),
  ]);

  const warnings = [rootEvidence.error, ledger.error].filter((value): value is string => Boolean(value));
  const canonicalObjects = canonicalizeEvidenceRows(rootEvidence.data, ledger.data);
  let nodesCreated = 0;
  let nodesUpdated = 0;
  let edgesCreated = 0;
  let nodesRemoved = 0;
  let edgesRemoved = 0;
  const writtenNodes = new Set<string>();

  async function pruneManagedProjection() {
    const managed = await db.from('graph_nodes').select('node_id').in('origin', MANAGED_NODE_ORIGINS).limit(5000);
    if (managed.error) {
      warnings.push(`projection_prune_nodes:${managed.error.message}`);
      return;
    }
    const nodeIds = rows(managed.data).map((row) => text(row.node_id)).filter((value): value is string => Boolean(value));
    for (const batch of chunks(nodeIds)) {
      const outgoing = await db.from('graph_edges').delete().in('source_node_id', batch).select('id');
      if (outgoing.error) warnings.push(`projection_prune_edges_source:${outgoing.error.message}`);
      else edgesRemoved += rows(outgoing.data).length;

      const incoming = await db.from('graph_edges').delete().in('target_node_id', batch).select('id');
      if (incoming.error) warnings.push(`projection_prune_edges_target:${incoming.error.message}`);
      else edgesRemoved += rows(incoming.data).length;

      const removed = await db.from('graph_nodes').delete().in('node_id', batch).select('id');
      if (removed.error) warnings.push(`projection_prune_nodes_delete:${removed.error.message}`);
      else nodesRemoved += rows(removed.data).length;
    }
  }

  await pruneManagedProjection();

  async function upsertNode(nodeId: string, value: Row, warningPrefix: string) {
    const alreadyWritten = writtenNodes.has(nodeId);
    const existing = alreadyWritten ? { data: { id: nodeId }, error: null } : await db.from('graph_nodes').select('id').eq('node_id', nodeId).maybeSingle();
    if (existing.error) warnings.push(`${warningPrefix}:lookup:${existing.error.message}`);
    const write = await db.from('graph_nodes').upsert(value, { onConflict: 'node_id' });
    if (write.error) {
      warnings.push(`${warningPrefix}:${write.error.message}`);
      return false;
    }
    writtenNodes.add(nodeId);
    if (existing.data) nodesUpdated += 1;
    else nodesCreated += 1;
    return true;
  }

  async function upsertEdge(input: {
    from: string;
    to: string;
    relation: string;
    relationType: string;
    confidence: number;
    observedAt?: string | null;
    weight?: number;
    evidenceIds?: string[];
    attributes?: Row;
  }) {
    if (!input.from || !input.to || input.from === input.to) return;

    const existing = await db.from('graph_edges')
      .select('id,edge_id,relation,attributes,payload,lineage,weight,w_ij,confidence')
      .eq('source_node_key', input.from)
      .eq('target_node_key', input.to)
      .eq('relation_type', LEGACY_EDGE_STORAGE_TYPE)
      .maybeSingle();
    if (existing.error) warnings.push(`evidence_edge:${input.from}->${input.to}:lookup:${existing.error.message}`);

    const prior = record(existing.data?.attributes ?? existing.data?.payload);
    const declaredRelations = uniqueStrings(
      strings(prior.declaredRelations),
      [text(prior.declaredRelation), text(existing.data?.relation), input.relation],
    );
    const semanticRelationTypes = uniqueStrings(
      strings(prior.semanticRelationTypes),
      [text(prior.semanticRelationType), input.relationType],
    );
    const lineage = uniqueStrings(strings(existing.data?.lineage), input.evidenceIds ?? []);
    const observedAt = laterDate(text(prior.observedAt), input.observedAt ?? null);
    const weight = Math.max(number01(existing.data?.weight ?? existing.data?.w_ij, 0), number01(input.weight, 0));
    const confidence = Math.max(number01(existing.data?.confidence, 0), number01(input.confidence, 0));
    const edgeId = `${input.from}->${input.to}:${LEGACY_EDGE_STORAGE_TYPE}`;
    const attributes = {
      ...prior,
      ...(input.attributes ?? {}),
      managedBy: 'canonical_evidence_reconciler',
      projectionVersion: PROJECTION_VERSION,
      epistemicClass: 'DECLARED',
      relationStrength: weight > 0 ? 'WEIGHTED' : 'UNMEASURED',
      declaredRelation: input.relation,
      declaredRelations,
      semanticRelationType: input.relationType,
      semanticRelationTypes,
      storageRelationType: LEGACY_EDGE_STORAGE_TYPE,
      observedAt,
      reconstructedFromPersistedEvidence: true,
    };

    const edge = await db.from('graph_edges').upsert({
      edge_id: edgeId,
      source_node_id: input.from,
      target_node_id: input.to,
      source_node_key: input.from,
      target_node_key: input.to,
      relation: declaredRelations[0] ?? input.relation,
      relation_type: LEGACY_EDGE_STORAGE_TYPE,
      weight,
      w_ij: weight,
      confidence,
      lineage,
      payload: attributes,
      attributes,
      updated_at: new Date().toISOString(),
    }, { onConflict: EDGE_CONFLICT });
    if (edge.error) warnings.push(`evidence_edge:${edgeId}:${edge.error.message}`);
    else if (!existing.data) edgesCreated += 1;
  }

  async function ensureContextNode(kind: 'module' | 'case', value: string, observedAt: string | null) {
    const nodeId = `context:${kind}:${shortHash(value.toLowerCase())}`;
    const payload = {
      managedBy: 'canonical_evidence_reconciler',
      projectionVersion: PROJECTION_VERSION,
      contextKind: kind,
      contextValue: value,
      sourceObservedAt: observedAt,
      observedObject: `${kind}_classification_context`,
      storageNodeType: LEGACY_NODE_STORAGE_TYPE,
      claimBoundary: `This node groups canonical evidence by declared ${kind}; it does not assert causal relation.`,
    };
    const ok = await upsertNode(nodeId, {
      node_id: nodeId,
      node_key: nodeId,
      label: kind === 'module' ? value.toUpperCase() : value,
      node_type: LEGACY_NODE_STORAGE_TYPE,
      ontology_type: kind,
      origin: 'evidence_context',
      epistemic_class: 'declared',
      confidence: 1,
      payload,
      attributes: payload,
      lineage: [],
      updated_at: new Date().toISOString(),
    }, `context_node:${kind}:${value}`);
    return ok ? nodeId : null;
  }

  const byReference = new Map<string, CanonicalEvidenceObject>();

  for (const object of canonicalObjects) {
    const nodePayload = {
      managedBy: 'canonical_evidence_reconciler',
      projectionVersion: PROJECTION_VERSION,
      canonicalEvidenceObject: true,
      evidenceHash: object.evidenceHash,
      evidenceKind: object.evidenceKind,
      evidenceType: object.evidenceType,
      evidenceKey: object.evidenceKey,
      caseId: object.caseId,
      module: object.module,
      sourceUrls: object.sourceUrls,
      privateRefs: object.privateRefs,
      rootEvidenceIds: object.rootEvidenceIds,
      ledgerEvidenceIds: object.ledgerEvidenceIds,
      provenance: object.provenance,
      sourceObservedAt: object.observedAt,
      epistemicClass: object.epistemicClass.toUpperCase(),
      sourcePayloadMetadata: object.metadata,
      observedObject: 'canonical_evidence_object_existence_and_provenance',
      storageNodeType: LEGACY_NODE_STORAGE_TYPE,
      claimBoundary: 'One graph node represents one evidence object. Multiple persistence records are provenance, not additional evidence objects.',
    };

    const ok = await upsertNode(object.nodeId, {
      node_id: object.nodeId,
      node_key: object.nodeId,
      label: object.label,
      node_type: LEGACY_NODE_STORAGE_TYPE,
      ontology_type: 'evidence',
      origin: 'evidence_canonical',
      epistemic_class: object.epistemicClass,
      confidence: object.confidence,
      payload: nodePayload,
      lineage: object.epistemicEventIds,
      attributes: nodePayload,
      updated_at: new Date().toISOString(),
    }, `evidence_node:${object.nodeId}`);
    if (!ok) continue;

    const refs = uniqueStrings(
      [object.nodeId, object.evidenceHash, object.evidenceKey],
      object.rootEvidenceIds,
      object.ledgerEvidenceIds,
    );
    refs.forEach((ref) => byReference.set(ref, object));

    if (object.module) {
      const moduleNodeId = await ensureContextNode('module', object.module, object.observedAt);
      if (moduleNodeId) await upsertEdge({
        from: object.nodeId,
        to: moduleNodeId,
        relation: 'classified_in_module',
        relationType: 'taxonomy_declared',
        confidence: 1,
        observedAt: object.observedAt,
        evidenceIds: object.evidenceHash ? [object.evidenceHash] : [],
        attributes: { module: object.module, doesNotImplyValidation: true },
      });
    }

    if (object.caseId) {
      const caseNodeId = await ensureContextNode('case', object.caseId, object.observedAt);
      if (caseNodeId) await upsertEdge({
        from: object.nodeId,
        to: caseNodeId,
        relation: 'belongs_to_case',
        relationType: 'case_membership_declared',
        confidence: 1,
        observedAt: object.observedAt,
        evidenceIds: object.evidenceHash ? [object.evidenceHash] : [],
        attributes: { caseId: object.caseId, doesNotImplyValidation: true },
      });
    }
  }

  for (const object of canonicalObjects) {
    for (const targetNodeId of object.targetNodeIds) {
      const canonicalTarget = byReference.get(targetNodeId)?.nodeId;
      let resolvedTarget = canonicalTarget ?? null;
      if (!resolvedTarget) {
        const target = await db.from('graph_nodes').select('node_id,node_key').or(`node_id.eq.${targetNodeId},node_key.eq.${targetNodeId}`).maybeSingle();
        resolvedTarget = target.data && !target.error ? text(target.data.node_id ?? target.data.node_key) : null;
      }
      if (!resolvedTarget || resolvedTarget === object.nodeId) continue;
      await upsertEdge({
        from: object.nodeId,
        to: resolvedTarget,
        relation: 'contextualizes',
        relationType: 'structural_declared',
        confidence: 1,
        observedAt: object.observedAt,
        evidenceIds: object.epistemicEventIds,
        attributes: { evidenceHash: object.evidenceHash, explicitTargetNode: true },
      });
    }
  }

  const attractorRead = await db.from('sfi_attractors').select('id,attractor_key,label,module,owner_node_key,attractor_type,confidence,persistence,trust,weight,evidence_count,status,vector,first_seen,last_seen,created_at,updated_at').order('updated_at', { ascending: false }).limit(250);
  if (attractorRead.error) warnings.push(`attractor_graph:${attractorRead.error.message}`);
  for (const attractor of rows(attractorRead.data)) {
    const attractorKey = text(attractor.attractor_key);
    if (!attractorKey) continue;
    const attractorNodeId = `attractor:${attractorKey}`;
    const vector = record(attractor.vector);
    const observedAt = text(attractor.first_seen ?? attractor.created_at);
    const attractorPayload = {
      ...attractor,
      managedBy: 'canonical_evidence_reconciler',
      projectionVersion: PROJECTION_VERSION,
      sourceObservedAt: observedAt,
      observedObject: 'declared_attractor',
      storageNodeType: LEGACY_NODE_STORAGE_TYPE,
      claimBoundary: 'An attractor records a declared direction. It does not prove convergence or outcome.',
    };
    const ok = await upsertNode(attractorNodeId, {
      node_id: attractorNodeId,
      node_key: attractorNodeId,
      label: text(attractor.label) ?? attractorKey,
      node_type: LEGACY_NODE_STORAGE_TYPE,
      ontology_type: 'attractor',
      origin: 'evidence_context_attractor',
      epistemic_class: 'declared',
      confidence: number01(attractor.confidence, 0),
      payload: attractorPayload,
      attributes: attractorPayload,
      lineage: [],
      updated_at: new Date().toISOString(),
    }, `attractor_node:${attractorKey}`);
    if (!ok) continue;

    for (const ref of strings(vector.evidenceRefs)) {
      const evidence = byReference.get(ref);
      if (!evidence) continue;
      await upsertEdge({
        from: evidence.nodeId,
        to: attractorNodeId,
        relation: 'supports_attractor',
        relationType: 'evidence_declared',
        confidence: number01(attractor.trust ?? attractor.confidence, 0),
        observedAt: laterDate(evidence.observedAt, observedAt),
        weight: number01(attractor.weight, 0),
        evidenceIds: evidence.evidenceHash ? [evidence.evidenceHash] : [],
        attributes: { attractorKey, explicitEvidenceReference: ref },
      });
    }
  }

  return {
    ok: warnings.length === 0,
    projectionVersion: PROJECTION_VERSION,
    rootEvidenceRows: rootEvidence.data.length,
    ledgerRows: ledger.data.length,
    canonicalEvidenceObjects: canonicalObjects.length,
    evidenceDescriptors: canonicalObjects.length,
    nodesRemoved,
    edgesRemoved,
    nodesCreated,
    nodesUpdated,
    edgesCreated,
    warnings: compactWarnings(warnings),
  };
}

import 'server-only';

import { COGNITIVE_TWIN_CONTRACT_VERSION } from '@/core/cognitive-twin/contract';
import type { StudioTwinContext } from '@/core/cognitive-twin/studioContext';
import type {
  AssessedEpistemicClass,
  CognitiveDebtType,
  CognitiveSpineSourceRecord,
} from '@/core/cognitive-spine/contracts/snapshot';
import { RUNTIME_GENERAL_CONTEXT_PROFILE, runtimeGeneralAllowsKind } from '@/core/cognitive-spine/profiles/runtimeGeneral';
import {
  projectCognitiveState,
  sealCognitiveSnapshot,
  semanticSnapshotHash,
} from '@/core/cognitive-spine/projector/cognitiveStateProjector';
import { buildRuntimeCognitiveSpineProjection } from '@/core/cognitive-spine/runtime/kernelProjection';
import { canonicalSha256, normalizeTimestamp, sortedUnique } from '@/core/cognitive-spine/serialization/canonicalSerialize';
import { buildCognitiveContextConsumptionTrace } from '@/core/cognitive-spine/trace/consumptionTrace';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { readAdditionalInstitutionalCognitiveSpineSources } from './cognitiveSpineAdditionalSources';

const PROJECTOR_VERSION = 'SFI-CT-PROJECTOR-1.0';
const POLICY_VERSION = 'SFI-CT-INVARIANTS-1.0';
const CANONICAL_MEMORY_MODULE = 'institutionalEventPipeline';
const MEMORY_PAGE_SIZE = 128;
const MAX_MEMORY_ROWS = 48;
const MAX_DECISION_ROWS = 24;
const MAX_EVIDENCE_ROWS = 64;
const CONSUMABLE_MEMORY_STATUSES = new Set(['CANDIDATE', 'VERIFIED', 'CANONICAL']);

type Row = Record<string, unknown>;

type MaterializedMemory = StudioTwinContext['memory'][number] & {
  id: string;
  createdAt: string;
};

type MaterializedDecision = StudioTwinContext['decisions'][number] & {
  approvedAt: string;
};

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function memoryStatus(content: Row) {
  const lifecycle = text(content.lifecycleStatus);
  if (lifecycle === 'REJECTED' || lifecycle === 'OBSOLETE' || lifecycle === 'FOUNDER_RESERVED') return lifecycle;
  if (lifecycle === 'INSTITUTIONALIZED') return 'CANONICAL';
  if (lifecycle === 'REPRODUCIBLE') return 'VERIFIED';

  const declared = text(content.memoryStatus) ?? text(content.status);
  if (declared && ['CANDIDATE', 'VERIFIED', 'CANONICAL', 'REJECTED', 'OBSOLETE', 'FOUNDER_RESERVED'].includes(declared)) {
    return declared;
  }
  return 'CANDIDATE';
}

function assessedClass(value: unknown): AssessedEpistemicClass | null {
  const normalized = text(value)?.toLowerCase() ?? null;
  if (normalized === 'observed') return 'OBSERVED';
  if (normalized === 'declared') return 'DECLARED';
  if (normalized === 'derived') return 'DERIVED';
  if (normalized === 'inferred') return 'INFERRED';
  if (normalized === 'simulated') return 'SIMULATED';
  if (normalized === 'projected') return 'PROJECTED';
  if (normalized === 'verified_contrast') return 'VERIFIED_CONTRAST';
  return null;
}

async function readCanonicalMemoryAtCutoff(sourceCutoff: string): Promise<{
  rows: MaterializedMemory[];
  warnings: string[];
}> {
  const db = createServiceSupabaseClient();
  const latestByKey = new Map<string, MaterializedMemory>();
  const seenKeys = new Set<string>();
  const warnings: string[] = [];
  let offset = 0;

  while (latestByKey.size < MAX_MEMORY_ROWS) {
    const page = await db.from('sfi_amv_memory')
      .select('id,module,memory_delta,created_at')
      .eq('module', CANONICAL_MEMORY_MODULE)
      .not('memory_delta->raw->>memoryKey', 'is', null)
      .lte('created_at', sourceCutoff)
      .order('created_at', { ascending: false })
      .range(offset, offset + MEMORY_PAGE_SIZE - 1);

    if (page.error) {
      warnings.push(`cognitive_spine_memory_unavailable:${page.error.message}`);
      break;
    }

    const pageRows = page.data ?? [];
    for (const item of pageRows) {
      const row = record(item);
      const delta = record(row.memory_delta);
      const raw = record(delta.raw);
      const key = text(raw.memoryKey);
      const type = text(raw.memoryType);
      const id = text(row.id);
      const createdAt = text(row.created_at);
      if (!key || !type || !id || !createdAt || seenKeys.has(key)) continue;

      seenKeys.add(key);
      const content = record(raw.content);
      const status = memoryStatus(content);
      if (!CONSUMABLE_MEMORY_STATUSES.has(status)) continue;

      latestByKey.set(key, {
        id,
        key,
        type,
        status,
        content: raw.content ?? null,
        evidenceRefs: sortedUnique(strings(raw.evidenceRefs)),
        version: text(content.cognitiveTwinExperienceContract) ?? 'SFI-CT-EXPERIENCE-2.0',
        createdAt: normalizeTimestamp(createdAt),
      });
      if (latestByKey.size >= MAX_MEMORY_ROWS) break;
    }

    if (pageRows.length < MEMORY_PAGE_SIZE) break;
    offset += MEMORY_PAGE_SIZE;
  }

  return { rows: [...latestByKey.values()], warnings };
}

async function readApprovedDecisionsAtCutoff(sourceCutoff: string): Promise<{
  rows: MaterializedDecision[];
  warnings: string[];
}> {
  const db = createServiceSupabaseClient();
  const result = await db.from('sfi_cognitive_twin_decisions')
    .select('decision_id,situation,correct_state,general_rule,required_evidence,evidence_refs,approved_at,status')
    .eq('status', 'APPROVED')
    .lte('approved_at', sourceCutoff)
    .order('approved_at', { ascending: false })
    .limit(MAX_DECISION_ROWS);

  if (result.error) {
    return { rows: [], warnings: [`cognitive_spine_decisions_unavailable:${result.error.message}`] };
  }

  const rowsOut: MaterializedDecision[] = [];
  for (const item of result.data ?? []) {
    const row = record(item);
    const id = text(row.decision_id);
    const approvedAt = text(row.approved_at);
    if (!id || !approvedAt) continue;
    rowsOut.push({
      id,
      situation: text(row.situation) ?? '',
      correctState: text(row.correct_state),
      generalRule: text(row.general_rule) ?? '',
      requiredEvidence: sortedUnique(strings(row.required_evidence)),
      evidenceRefs: sortedUnique(strings(row.evidence_refs)),
      approvedAt: normalizeTimestamp(approvedAt),
    });
  }

  return { rows: rowsOut, warnings: [] };
}

async function readAssessedEvidenceAtCutoff(sourceCutoff: string): Promise<{
  records: CognitiveSpineSourceRecord[];
  warnings: string[];
}> {
  const db = createServiceSupabaseClient();
  const evidenceResult = await db.from('root_evidence_entries')
    .select('id,title,content,evidence_type,payload,epistemic_event_id,created_at')
    .lte('created_at', sourceCutoff)
    .order('created_at', { ascending: false })
    .limit(MAX_EVIDENCE_ROWS);

  if (evidenceResult.error) {
    return { records: [], warnings: [`cognitive_spine_root_evidence_unavailable:${evidenceResult.error.message}`] };
  }

  const evidenceRows = (evidenceResult.data ?? []).map(record);
  const eventIds = sortedUnique(evidenceRows
    .map((row) => text(row.epistemic_event_id))
    .filter((value): value is string => Boolean(value)));
  const eventResult = eventIds.length
    ? await db.from('epistemic_events')
        .select('event_id,epistemic_class,occurred_at,hash_self,lineage,schema_version')
        .in('event_id', eventIds)
    : { data: [], error: null };

  const warnings: string[] = [];
  if (eventResult.error) warnings.push(`cognitive_spine_epistemic_events_unavailable:${eventResult.error.message}`);
  const events = new Map((eventResult.data ?? []).map((item) => {
    const row = record(item);
    return [text(row.event_id) ?? '', row] as const;
  }).filter(([id]) => Boolean(id)));

  const recordsOut: CognitiveSpineSourceRecord[] = [];
  for (const row of evidenceRows) {
    const id = text(row.id);
    const eventId = text(row.epistemic_event_id);
    const createdAt = text(row.created_at);
    if (!id || !eventId || !createdAt) continue;
    const event = events.get(eventId);
    if (!event) {
      warnings.push(`cognitive_spine_evidence_assessment_missing:${id}`);
      continue;
    }
    const epistemicClass = assessedClass(event.epistemic_class);
    if (!epistemicClass) {
      warnings.push(`cognitive_spine_evidence_class_not_admissible:${id}:${text(event.epistemic_class) ?? 'missing'}`);
      continue;
    }

    const occurredAt = text(event.occurred_at) ?? createdAt;
    const lineage = sortedUnique(strings(event.lineage));
    const debtType: CognitiveDebtType | undefined = lineage.length === 0 ? 'PROVENANCE' : undefined;
    const sourceHash = canonicalSha256({
      store: 'root_evidence_entries',
      id,
      title: text(row.title),
      content: text(row.content),
      evidenceType: text(row.evidence_type),
      payload: row.payload ?? null,
      createdAt: normalizeTimestamp(createdAt),
      epistemicEvent: {
        eventId,
        class: epistemicClass,
        hashSelf: text(event.hash_self),
        occurredAt: normalizeTimestamp(occurredAt),
      },
    });

    recordsOut.push({
      ref: `root_evidence_entries:${id}`,
      kind: 'EVIDENCE',
      recordedAt: normalizeTimestamp(occurredAt),
      sourceHash,
      sourceVersion: text(event.schema_version) ?? undefined,
      epistemicAssessmentRef: eventId,
      epistemicClass,
      ancestryRoots: lineage,
      visibilityProfiles: ['*'],
      debtType,
    });
  }

  return { records: recordsOut, warnings };
}

function memorySourceRecord(memory: MaterializedMemory): CognitiveSpineSourceRecord {
  return {
    ref: `sfi_amv_memory:${memory.id}`,
    kind: 'MEMORY',
    recordedAt: memory.createdAt,
    sourceHash: canonicalSha256({
      store: 'sfi_amv_memory',
      id: memory.id,
      key: memory.key,
      type: memory.type,
      status: memory.status,
      content: memory.content,
      evidenceRefs: memory.evidenceRefs,
      version: memory.version,
      createdAt: memory.createdAt,
    }),
    sourceVersion: memory.version,
    visibilityProfiles: ['*'],
    ...(memory.status === 'CANDIDATE' ? { debtType: 'VERIFICATION' as const } : {}),
  };
}

function decisionSourceRecord(decision: MaterializedDecision): CognitiveSpineSourceRecord {
  return {
    ref: `sfi_cognitive_twin_decisions:${decision.id}`,
    kind: 'DECISION',
    recordedAt: decision.approvedAt,
    sourceHash: canonicalSha256({
      store: 'sfi_cognitive_twin_decisions',
      decisionId: decision.id,
      situation: decision.situation,
      correctState: decision.correctState,
      generalRule: decision.generalRule,
      requiredEvidence: decision.requiredEvidence,
      evidenceRefs: decision.evidenceRefs,
      approvedAt: decision.approvedAt,
      status: 'APPROVED',
    }),
    visibilityProfiles: ['*'],
  };
}

export async function materializeInstitutionalRuntimeCognitiveSpine(input: {
  sourceCutoff: string;
  executionId: string;
  createdAt: string;
  consume: boolean;
}) {
  const sourceCutoff = normalizeTimestamp(input.sourceCutoff);
  const [evidence, memory, decisions, additionalSources] = await Promise.all([
    readAssessedEvidenceAtCutoff(sourceCutoff),
    readCanonicalMemoryAtCutoff(sourceCutoff),
    readApprovedDecisionsAtCutoff(sourceCutoff),
    readAdditionalInstitutionalCognitiveSpineSources(sourceCutoff),
  ]);

  const warnings = sortedUnique([
    ...evidence.warnings,
    ...memory.warnings,
    ...decisions.warnings,
    ...additionalSources.warnings,
  ]);

  const cognitiveTwinContext: StudioTwinContext = {
    contractVersion: COGNITIVE_TWIN_CONTRACT_VERSION,
    memory: memory.rows.map(({ id: _id, createdAt: _createdAt, ...item }) => item),
    decisions: decisions.rows.map(({ approvedAt: _approvedAt, ...item }) => item),
    warnings,
  };

  const records = [
    ...evidence.records,
    ...memory.rows.map(memorySourceRecord),
    ...decisions.rows.map(decisionSourceRecord),
    ...additionalSources.records,
  ].filter((item) => runtimeGeneralAllowsKind(item.kind));

  const semanticPayload = projectCognitiveState({
    sourceCutoff,
    projectorVersion: PROJECTOR_VERSION,
    policyVersion: POLICY_VERSION,
    projectionProfile: RUNTIME_GENERAL_CONTEXT_PROFILE.profileId,
    records,
  });
  const snapshotHash = semanticSnapshotHash(semanticPayload);
  const snapshot = sealCognitiveSnapshot(semanticPayload, {
    snapshotId: `CT-${snapshotHash.slice(0, 16)}`,
    createdAt: normalizeTimestamp(input.createdAt),
    runtimeMetadata: { runner: 'institutional-runtime-materializer' },
  });

  const trace = buildCognitiveContextConsumptionTrace({
    executionId: input.executionId,
    ctSnapshotAvailable: snapshot.snapshotId,
    ctSnapshotHashAvailable: snapshot.snapshotHash,
    ctSnapshotConsumed: input.consume,
    ...(input.consume ? {
      consumedSnapshotId: snapshot.snapshotId,
      consumedSnapshotHash: snapshot.snapshotHash,
      projectionProfile: RUNTIME_GENERAL_CONTEXT_PROFILE.profileId,
      profileVersion: RUNTIME_GENERAL_CONTEXT_PROFILE.version,
      consumptionReason: 'bounded shared institutional runtime context',
    } : {}),
    recordedAt: normalizeTimestamp(input.createdAt),
  });

  const runtimeProjection = buildRuntimeCognitiveSpineProjection({
    snapshot,
    trace,
    cognitiveTwinContext,
  });

  return {
    snapshot,
    trace,
    runtimeProjection,
    cognitiveTwinContext,
    warnings,
    sourcePlane: {
      rootEvidence: evidence.records.length,
      canonicalMemory: memory.rows.length,
      approvedTwinDecisions: decisions.rows.length,
      ...additionalSources.summary,
    },
  };
}

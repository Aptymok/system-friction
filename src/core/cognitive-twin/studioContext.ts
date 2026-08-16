import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { COGNITIVE_TWIN_CONTRACT_VERSION } from './contract';
import { readCanonicalCognitiveTwinMemory } from './canonicalMemoryView';
import { recordCognitiveTwinExperience } from './experience';

const MEMORY_STATUSES = ['CANDIDATE', 'VERIFIED', 'CANONICAL'] as const;
const STUDIO_LEARNING_VERSION = 'studio-learning-v1';
const MAX_MEMORY_ROWS = 64;
const MAX_DECISION_ROWS = 32;

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

function stableStudioLearningKey(value: string) {
  return value.replace(/:\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/, '');
}

export type StudioTwinContext = {
  contractVersion: string;
  memory: Array<{
    key: string;
    type: string;
    status: string;
    content: unknown;
    evidenceRefs: string[];
    version: string;
  }>;
  decisions: Array<{
    id: string;
    situation: string;
    correctState: string | null;
    generalRule: string;
    requiredEvidence: string[];
    evidenceRefs: string[];
  }>;
  warnings: string[];
};

export async function readStudioTwinContext(): Promise<StudioTwinContext> {
  const db = createServiceSupabaseClient();
  const warnings: string[] = [];

  const [canonicalMemory, legacyMemoryResult, decisionsResult] = await Promise.all([
    readCanonicalCognitiveTwinMemory(MAX_MEMORY_ROWS),
    db.from('sfi_cognitive_twin_memory')
      .select('memory_key,memory_type,status,content,evidence_refs,version,updated_at')
      .in('status', [...MEMORY_STATUSES])
      .order('updated_at', { ascending: false })
      .limit(MAX_MEMORY_ROWS),
    db.from('sfi_cognitive_twin_decisions')
      .select('decision_id,situation,correct_state,general_rule,required_evidence,evidence_refs,approved_at')
      .eq('status', 'APPROVED')
      .order('approved_at', { ascending: false })
      .limit(MAX_DECISION_ROWS),
  ]);

  if (canonicalMemory.error) warnings.push(`twin_canonical_memory_unavailable:${canonicalMemory.error}`);
  if (legacyMemoryResult.error) warnings.push(`twin_legacy_memory_unavailable:${legacyMemoryResult.error.message}`);
  if (decisionsResult.error) warnings.push(`twin_decisions_unavailable:${decisionsResult.error.message}`);

  const memoryByKey = new Map<string, StudioTwinContext['memory'][number]>();
  for (const item of canonicalMemory.rows) {
    memoryByKey.set(item.memory_key, {
      key: item.memory_key,
      type: item.memory_type,
      status: item.status,
      content: item.content,
      evidenceRefs: item.evidence_refs,
      version: item.version,
    });
  }
  for (const item of legacyMemoryResult.data ?? []) {
    const row = record(item);
    const key = text(row.memory_key);
    if (!key || memoryByKey.has(key)) continue;
    memoryByKey.set(key, {
      key,
      type: text(row.memory_type) ?? 'UNKNOWN',
      status: text(row.status) ?? 'UNKNOWN',
      content: row.content ?? null,
      evidenceRefs: strings(row.evidence_refs),
      version: text(row.version) ?? 'legacy',
    });
    if (memoryByKey.size >= MAX_MEMORY_ROWS) break;
  }

  return {
    contractVersion: COGNITIVE_TWIN_CONTRACT_VERSION,
    memory: [...memoryByKey.values()].slice(0, MAX_MEMORY_ROWS),
    decisions: (decisionsResult.data ?? []).map((item) => {
      const row = record(item);
      return {
        id: text(row.decision_id) ?? 'unknown',
        situation: text(row.situation) ?? '',
        correctState: text(row.correct_state),
        generalRule: text(row.general_rule) ?? '',
        requiredEvidence: strings(row.required_evidence),
        evidenceRefs: strings(row.evidence_refs),
      };
    }),
    warnings,
  };
}

export async function registerStudioTwinRun(input: {
  taskId: string;
  role: string;
  objective: string;
  provider: string | null;
  model: string | null;
  status: 'REGISTERED' | 'READY' | 'PLANNING' | 'POLICY_CHECK' | 'EXECUTING' | 'EVIDENCE_PENDING' | 'VERIFYING' | 'APPROVED' | 'RELEASED' | 'BLOCKED' | 'REJECTED' | 'ESCALATED' | 'CLOSED';
  inputSnapshot: Record<string, unknown>;
  outputEnvelope?: Record<string, unknown> | null;
  evidenceRefs: string[];
  limitations?: string[];
  startedAt?: string | null;
  finishedAt?: string | null;
}) {
  const db = createServiceSupabaseClient();
  const result = await db.from('sfi_cognitive_twin_runs').insert({
    task_id: input.taskId,
    contract_version: COGNITIVE_TWIN_CONTRACT_VERSION,
    provider: input.provider,
    model: input.model,
    role: input.role,
    status: input.status,
    objective: input.objective,
    input_snapshot: input.inputSnapshot,
    output_envelope: input.outputEnvelope ?? null,
    evidence_refs: [...new Set(input.evidenceRefs)],
    limitations: [...new Set(input.limitations ?? [])],
    started_at: input.startedAt ?? null,
    finished_at: input.finishedAt ?? null,
  }).select('id').single();

  if (result.error) return { ok: false as const, error: result.error.message, id: null };

  if (input.provider && input.model) {
    const observedAt = new Date().toISOString();
    const existing = await db.from('sfi_cognitive_twin_model_registry')
      .select('id,status')
      .eq('provider', input.provider)
      .eq('model', input.model)
      .maybeSingle();
    if (!existing.error) {
      if (existing.data?.id) {
        await db.from('sfi_cognitive_twin_model_registry')
          .update({ last_observed_at: observedAt })
          .eq('id', existing.data.id);
      } else {
        await db.from('sfi_cognitive_twin_model_registry').insert({
          provider: input.provider,
          model: input.model,
          status: 'UNVERIFIED',
          authorized_roles: [],
          prohibited_roles: [],
          eval_summary: { firstSeenBy: 'studio_cognitive_runtime' },
          evidence_refs: [...new Set(input.evidenceRefs)],
          first_observed_at: observedAt,
          last_observed_at: observedAt,
        });
      }
    }
  }

  return { ok: true as const, error: null, id: String(result.data.id) };
}

export async function persistStudioLearningCandidate(input: {
  memoryKey: string;
  memoryType: 'EVIDENCE' | 'STATE' | 'DECISION' | 'METHOD' | 'ERROR' | 'EXCEPTION';
  content: Record<string, unknown>;
  evidenceRefs: string[];
  sourceRef: string;
  createdBy: string;
}) {
  const memoryKey = stableStudioLearningKey(input.memoryKey);
  const persisted = await recordCognitiveTwinExperience({
    memoryKey,
    memoryType: input.memoryType,
    content: input.content,
    evidenceRefs: input.evidenceRefs,
    sourceKind: 'STUDIO_OBSERVED_RETURN',
    sourceRef: input.sourceRef,
    createdBy: input.createdBy,
    version: STUDIO_LEARNING_VERSION,
  });

  if (!persisted.ok) {
    return { ok: false as const, blocked: persisted.blocked, reason: persisted.reason };
  }
  return {
    ok: true as const,
    blocked: false,
    id: String(persisted.memory?.id ?? persisted.event.id),
    status: 'CANDIDATE' as const,
    version: STUDIO_LEARNING_VERSION,
    memoryKey,
  };
}

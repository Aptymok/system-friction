import 'server-only';

import { createHash } from 'node:crypto';
import { z } from 'zod';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { canonicalJson } from './decisionCommitment';
import {
  decisionTransferArmSchema,
  parseBlindDecisionRunInput,
  type BlindDecisionRunInput,
  type DecisionTransferArm,
} from './blindDecisionReconstruction';

const providerSchema = z.enum(['openai', 'anthropic', 'gemini', 'groq', 'ollama', 'huggingface']);
const dispositionValues = new Set(['PROPOSE', 'REQUEST_EVIDENCE', 'ESCALATE', 'WITHHOLD', 'ARCHIVE_ONLY']);
const traceClassValues = new Set(['OBSERVED', 'VERIFIED_CONTRAST', 'DERIVED', 'INFERRED', 'SIMULATED']);
const terminalMemoryStatuses = new Set(['REJECTED', 'OBSOLETE', 'FOUNDER_RESERVED']);
const verifiedMemoryStatuses = new Set(['VERIFIED', 'CANONICAL']);
const patternMaturities = new Set(['RECURRENT', 'CROSS_DOMAIN', 'CONTRASTED', 'STABLE_PATTERN', 'RULE_CANDIDATE']);
const PAGE_SIZE = 128;

const currentCaseRequestSchema = z.object({
  situation: z.string().trim().min(5).max(16000),
  priorState: z.string().trim().max(12000).optional(),
  evidenceRefs: z.array(z.string().uuid()).min(1).max(120),
  constraints: z.array(z.string().trim().min(1).max(1200)).max(120).default([]),
}).strict();

export const materializedBlindDecisionRequestSchema = z.object({
  contextSource: z.literal('CANONICAL_MATERIALIZED'),
  experimentId: z.string().trim().min(1).max(240),
  targetTraceId: z.string().trim().min(1).max(240),
  targetDomain: z.string().trim().min(1).max(160),
  targetCommitmentSha256: z.string().regex(/^[0-9a-f]{64}$/i),
  arm: decisionTransferArmSchema,
  cutoffAt: z.string().datetime({ offset: true }),
  currentCase: currentCaseRequestSchema,
  preferredProvider: providerSchema.optional(),
  strictProvider: z.boolean().default(true),
  maxTokens: z.number().int().min(200).max(2500).default(1000),
}).strict();

export type MaterializedBlindDecisionRequest = z.infer<typeof materializedBlindDecisionRequestSchema>;
type Row = Record<string, unknown>;
type NormalizedTrace = {
  traceId: string;
  domain: string;
  disposition: string;
  operations: string[];
  relevantVariables: string[];
  rejectedConditions: string[];
  whatWouldChangeDecision: string[];
  evidenceRefs: string[];
  epistemicClass: string;
};

type LayerSelection = {
  rawHistory: boolean;
  memory: boolean;
  decisionTraces: boolean;
  patterns: boolean;
  rules: boolean;
  operatingMode: boolean;
};

function layersForArm(arm: DecisionTransferArm): LayerSelection {
  return {
    rawHistory: arm !== 'B0_BASE',
    memory: ['B2_MEMORY', 'B3_CDT', 'B4_PATTERNS', 'B5_RULE_STRUCTURE', 'CT_FULL'].includes(arm),
    decisionTraces: ['B3_CDT', 'B4_PATTERNS', 'B5_RULE_STRUCTURE', 'CT_FULL'].includes(arm),
    patterns: ['B4_PATTERNS', 'B5_RULE_STRUCTURE', 'CT_FULL'].includes(arm),
    rules: ['B5_RULE_STRUCTURE', 'CT_FULL'].includes(arm),
    operatingMode: arm === 'CT_FULL',
  };
}

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}
function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}
function containsTarget(value: unknown, targetTraceId: string) {
  try { return canonicalJson(value).includes(targetTraceId); } catch { return false; }
}
function memoryStatus(content: Row) {
  const lifecycle = text(content.lifecycleStatus);
  if (lifecycle === 'REJECTED' || lifecycle === 'OBSOLETE' || lifecycle === 'FOUNDER_RESERVED') return lifecycle;
  if (lifecycle === 'INSTITUTIONALIZED') return 'CANONICAL';
  if (lifecycle === 'REPRODUCIBLE') return 'VERIFIED';
  const declared = text(content.memoryStatus) ?? text(content.status);
  if (declared && ['CANDIDATE', 'VERIFIED', 'CANONICAL', 'REJECTED', 'OBSOLETE', 'FOUNDER_RESERVED'].includes(declared)) return declared;
  return 'CANDIDATE';
}
function safeEpistemicClass(value: unknown) {
  const normalized = text(value)?.toUpperCase();
  if (normalized === 'OBSERVED') return 'OBSERVED' as const;
  if (normalized === 'SIMULATED') return 'SIMULATED' as const;
  if (normalized === 'INFERRED') return 'INFERRED' as const;
  if (normalized === 'VERIFIED_CONTRAST') return 'VERIFIED_CONTRAST' as const;
  return 'DERIVED' as const;
}
function normalizeTrace(value: unknown): NormalizedTrace | null {
  const item = record(value);
  const traceId = text(item.traceId);
  const domain = text(item.domain);
  const disposition = text(item.disposition);
  const epistemicClass = text(item.epistemicClass);
  if (!traceId || !domain || !disposition || !epistemicClass) return null;
  if (!dispositionValues.has(disposition) || !traceClassValues.has(epistemicClass)) return null;
  return {
    traceId,
    domain,
    disposition,
    operations: strings(item.operations),
    relevantVariables: strings(item.relevantVariables),
    rejectedConditions: strings(item.rejectedConditions),
    whatWouldChangeDecision: strings(item.whatWouldChangeDecision),
    evidenceRefs: strings(item.evidenceRefs),
    epistemicClass,
  };
}

async function loadCurrentCase(input: MaterializedBlindDecisionRequest, cutoffIso: string) {
  const db = createServiceSupabaseClient();
  const evidence = await db.from('root_evidence_entries')
    .select('id,title,content,evidence_type,payload,epistemic_event_id,created_at')
    .in('id', input.currentCase.evidenceRefs);
  if (evidence.error) throw new Error(`DT_CONTEXT_CURRENT_EVIDENCE_READ_FAILED:${evidence.error.message}`);
  const rows = (evidence.data ?? []) as Row[];
  const byId = new Map(rows.map((item) => [String(item.id), item]));
  const missing = input.currentCase.evidenceRefs.filter((id) => !byId.has(id));
  if (missing.length) throw new Error(`DT_CONTEXT_CURRENT_EVIDENCE_MISSING:${missing.join(',')}`);
  for (const item of rows) {
    const createdAt = text(item.created_at);
    if (!createdAt || createdAt > cutoffIso) throw new Error(`DT_CONTEXT_CURRENT_EVIDENCE_AFTER_CUTOFF:${String(item.id)}`);
    if (containsTarget(item, input.targetTraceId)) throw new Error(`DT_CONTEXT_TARGET_ID_IN_CURRENT_EVIDENCE:${String(item.id)}`);
  }

  const eventIds = rows.map((item) => text(item.epistemic_event_id)).filter((value): value is string => Boolean(value));
  const events = eventIds.length
    ? await db.from('epistemic_events').select('event_id,epistemic_class,occurred_at').in('event_id', eventIds)
    : { data: [], error: null };
  if (events.error) throw new Error(`DT_CONTEXT_EPISTEMIC_EVENT_READ_FAILED:${events.error.message}`);
  const eventMap = new Map(((events.data ?? []) as Row[]).map((item) => [String(item.event_id), item]));

  return {
    situation: input.currentCase.situation,
    ...(input.currentCase.priorState ? { priorState: input.currentCase.priorState } : {}),
    evidence: input.currentCase.evidenceRefs.map((id) => {
      const item = byId.get(id)!;
      const event = eventMap.get(String(item.epistemic_event_id ?? ''));
      const observedAt = text(event?.occurred_at);
      if (observedAt && observedAt > cutoffIso) throw new Error(`DT_CONTEXT_EPISTEMIC_EVENT_AFTER_CUTOFF:${id}`);
      return {
        ref: `root_evidence_entries:${id}`,
        summary: [text(item.title), text(item.content)].filter(Boolean).join(' — ').slice(0, 8000),
        epistemicClass: safeEpistemicClass(event?.epistemic_class),
      };
    }),
    constraints: input.currentCase.constraints,
  };
}

async function loadRawHistory(targetTraceId: string, cutoffIso: string) {
  const db = createServiceSupabaseClient();
  const result = await db.from('sfi_cognitive_lab_events')
    .select('id,session_id,event_kind,provenance,actor_key,relation_from,relation_to,payload,evidence_refs,source_ref,occurred_at,created_at')
    .lte('occurred_at', cutoffIso)
    .order('occurred_at', { ascending: false })
    .limit(120);
  if (result.error) throw new Error(`DT_CONTEXT_RAW_HISTORY_READ_FAILED:${result.error.message}`);
  let excluded = 0;
  const history = ((result.data ?? []) as Row[]).flatMap((item) => {
    if (containsTarget(item, targetTraceId)) { excluded += 1; return []; }
    const id = String(item.id);
    return [{
      ref: `cognitive-lab-event:${id}`,
      content: canonicalJson({
        eventKind: item.event_kind,
        provenance: item.provenance,
        actorKey: item.actor_key,
        relationFrom: item.relation_from,
        relationTo: item.relation_to,
        payload: item.payload,
        sourceRef: item.source_ref,
        occurredAt: item.occurred_at,
      }).slice(0, 12000),
      evidenceRefs: strings(item.evidence_refs),
    }];
  }).reverse();
  return { rows: history, excluded };
}

async function loadVerifiedMemory(targetTraceId: string, cutoffIso: string) {
  const db = createServiceSupabaseClient();
  const latestByKey = new Map<string, { key: string; content: unknown; status: string; evidenceRefs: string[] }>();
  const seenKeys = new Set<string>();
  let offset = 0;
  let excluded = 0;
  while (latestByKey.size < 120) {
    const page = await db.from('sfi_amv_memory')
      .select('id,module,memory_delta,created_at')
      .eq('module', 'institutionalEventPipeline')
      .not('memory_delta->raw->>memoryKey', 'is', null)
      .lte('created_at', cutoffIso)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    if (page.error) throw new Error(`DT_CONTEXT_MEMORY_READ_FAILED:${page.error.message}`);
    const rows = (page.data ?? []) as Row[];
    for (const item of rows) {
      const delta = record(item.memory_delta);
      const raw = record(delta.raw);
      const key = text(raw.memoryKey);
      if (!key || seenKeys.has(key)) continue;
      seenKeys.add(key);
      const content = record(raw.content);
      const status = memoryStatus(content);
      if (terminalMemoryStatuses.has(status) || !verifiedMemoryStatuses.has(status)) continue;
      if (containsTarget(raw, targetTraceId)) { excluded += 1; continue; }
      latestByKey.set(key, {
        key,
        content: raw.content ?? null,
        status,
        evidenceRefs: strings(raw.evidenceRefs),
      });
      if (latestByKey.size >= 120) break;
    }
    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return { rows: [...latestByKey.values()], excluded };
}

async function loadDecisionTransferHistory(targetTraceId: string, cutoffIso: string) {
  const db = createServiceSupabaseClient();
  const result = await db.from('sfi_cognitive_twin_runs')
    .select('id,input_snapshot,output_envelope,evidence_refs,created_at')
    .eq('role', 'DECISION_TRANSFER_EVALUATOR')
    .lte('created_at', cutoffIso)
    .order('created_at', { ascending: false })
    .limit(120);
  if (result.error) throw new Error(`DT_CONTEXT_DECISION_HISTORY_READ_FAILED:${result.error.message}`);
  const traces = new Map<string, NormalizedTrace>();
  const patterns = new Map<string, { key: string; maturity: string; operations: string[]; domains: string[]; evidenceRefs: string[] }>();
  let excluded = 0;
  for (const run of (result.data ?? []) as Row[]) {
    const snapshot = record(run.input_snapshot);
    const expected = Array.isArray(snapshot.expected) ? snapshot.expected : [];
    for (const rawTrace of expected) {
      const trace = normalizeTrace(rawTrace);
      if (!trace) continue;
      if (trace.traceId === targetTraceId || containsTarget(trace, targetTraceId)) { excluded += 1; continue; }
      if (!['OBSERVED', 'VERIFIED_CONTRAST'].includes(trace.epistemicClass)) continue;
      if (!traces.has(trace.traceId)) traces.set(trace.traceId, trace);
    }
    const output = record(run.output_envelope);
    const evaluation = record(output.evaluation);
    const promotion = record(evaluation.promotion);
    const key = text(promotion.operationKey) ?? text(output.operationKey);
    const maturity = text(promotion.maturity);
    if (!key || !maturity || !patternMaturities.has(maturity) || patterns.has(key)) continue;
    if (containsTarget(promotion, targetTraceId)) { excluded += 1; continue; }
    patterns.set(key, {
      key,
      maturity,
      operations: [key],
      domains: strings(promotion.qualifyingDomains),
      evidenceRefs: strings(promotion.evidenceRefs),
    });
  }
  return { traces: [...traces.values()].slice(0, 120), patterns: [...patterns.values()].slice(0, 120), excluded };
}

async function loadApprovedRules(targetTraceId: string, cutoffIso: string) {
  const db = createServiceSupabaseClient();
  const result = await db.from('sfi_cognitive_twin_decisions')
    .select('decision_id,situation,rejected_condition,correct_state,general_rule,required_evidence,evidence_refs,status,approved_at,created_at')
    .eq('status', 'APPROVED')
    .not('approved_at', 'is', null)
    .lte('approved_at', cutoffIso)
    .order('approved_at', { ascending: false })
    .limit(120);
  if (result.error) throw new Error(`DT_CONTEXT_RULES_READ_FAILED:${result.error.message}`);
  let excluded = 0;
  const rules = ((result.data ?? []) as Row[]).flatMap((item) => {
    if (containsTarget(item, targetTraceId)) { excluded += 1; return []; }
    const key = text(item.decision_id);
    const statement = text(item.general_rule);
    if (!key || !statement) return [];
    const constraints = [...strings(item.required_evidence)];
    const correctState = text(item.correct_state);
    if (correctState) constraints.push(`correct_state:${correctState}`);
    const rejected = text(item.rejected_condition);
    return [{
      key,
      statement,
      constraints,
      exceptions: rejected ? [rejected] : [],
      evidenceRefs: strings(item.evidence_refs),
    }];
  });
  return { rows: rules, excluded };
}

async function loadOperatingMode(cutoffIso: string) {
  const db = createServiceSupabaseClient();
  const result = await db.from('sfi_cognitive_twin_runs')
    .select('role,status,created_at')
    .lte('created_at', cutoffIso)
    .order('created_at', { ascending: false })
    .limit(500);
  if (result.error) throw new Error(`DT_CONTEXT_OPERATING_MODE_READ_FAILED:${result.error.message}`);
  const byRole: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  for (const item of (result.data ?? []) as Row[]) {
    const role = text(item.role) ?? 'unknown';
    const status = text(item.status) ?? 'unknown';
    byRole[role] = (byRole[role] ?? 0) + 1;
    byStatus[status] = (byStatus[status] ?? 0) + 1;
  }
  return { total: result.data?.length ?? 0, byRole, byStatus, cutoffAt: cutoffIso, sourceState: result.data?.length ? 'OBSERVED' : 'READY_EMPTY' };
}

export function parseMaterializedBlindDecisionRequest(value: unknown): MaterializedBlindDecisionRequest {
  const parsed = materializedBlindDecisionRequestSchema.parse(value);
  const cutoff = new Date(parsed.cutoffAt);
  if (!Number.isFinite(cutoff.getTime())) throw new Error('DT_CONTEXT_CUTOFF_INVALID');
  if (cutoff.getTime() > Date.now() + 60_000) throw new Error('DT_CONTEXT_CUTOFF_IN_FUTURE');
  if (containsTarget(parsed.currentCase, parsed.targetTraceId)) throw new Error('DT_CONTEXT_TARGET_ID_IN_CURRENT_CASE');
  return parsed;
}

export async function materializeDecisionTransferContext(input: MaterializedBlindDecisionRequest) {
  const cutoffIso = new Date(input.cutoffAt).toISOString();
  const layers = layersForArm(input.arm);
  const emptyRows = { rows: [] as never[], excluded: 0 };
  const emptyDecisionHistory = { traces: [] as NormalizedTrace[], patterns: [] as Array<{ key: string; maturity: string; operations: string[]; domains: string[]; evidenceRefs: string[] }>, excluded: 0 };
  const emptyOperatingMode = { total: 0, byRole: {} as Record<string, number>, byStatus: {} as Record<string, number>, cutoffAt: cutoffIso, sourceState: 'NOT_SELECTED' };

  const [currentCase, rawHistory, memory, decisionHistory, rules, operatingMode] = await Promise.all([
    loadCurrentCase(input, cutoffIso),
    layers.rawHistory ? loadRawHistory(input.targetTraceId, cutoffIso) : Promise.resolve(emptyRows),
    layers.memory ? loadVerifiedMemory(input.targetTraceId, cutoffIso) : Promise.resolve(emptyRows),
    layers.decisionTraces || layers.patterns ? loadDecisionTransferHistory(input.targetTraceId, cutoffIso) : Promise.resolve(emptyDecisionHistory),
    layers.rules ? loadApprovedRules(input.targetTraceId, cutoffIso) : Promise.resolve(emptyRows),
    layers.operatingMode ? loadOperatingMode(cutoffIso) : Promise.resolve(emptyOperatingMode),
  ]);

  const contextPool = {
    currentCase,
    rawHistory: rawHistory.rows,
    memory: memory.rows,
    decisionTraces: layers.decisionTraces ? decisionHistory.traces : [],
    patterns: layers.patterns ? decisionHistory.patterns : [],
    rules: rules.rows,
    ...(layers.operatingMode ? { operatingMode } : {}),
  };
  if (containsTarget(contextPool, input.targetTraceId)) throw new Error('DT_CONTEXT_TARGET_ID_LEAK_AFTER_MATERIALIZATION');
  const contextPoolHash = sha256(canonicalJson(contextPool));
  const sourceTables = [
    'root_evidence_entries',
    'epistemic_events',
    ...(layers.rawHistory ? ['sfi_cognitive_lab_events'] : []),
    ...(layers.memory ? ['sfi_amv_memory'] : []),
    ...(layers.decisionTraces || layers.patterns || layers.operatingMode ? ['sfi_cognitive_twin_runs'] : []),
    ...(layers.rules ? ['sfi_cognitive_twin_decisions'] : []),
  ];
  const receiptBase = {
    protocol: 'SFI-DT-CONTEXT-MATERIALIZATION-1.0' as const,
    source: 'CANONICAL_MATERIALIZED' as const,
    cutoffAt: cutoffIso,
    targetTraceId: input.targetTraceId,
    arm: input.arm,
    selectedLayers: layers,
    contextPoolHash,
    sourceCounts: {
      currentEvidence: currentCase.evidence.length,
      rawHistory: rawHistory.rows.length,
      verifiedMemory: memory.rows.length,
      decisionTraces: layers.decisionTraces ? decisionHistory.traces.length : 0,
      patterns: layers.patterns ? decisionHistory.patterns.length : 0,
      approvedRules: rules.rows.length,
      operatingModeRuns: layers.operatingMode ? operatingMode.total : 0,
    },
    excludedExactTargetMatches: rawHistory.excluded + memory.excluded + decisionHistory.excluded + rules.excluded,
    sourceTables,
    boundaries: [
      'Every persisted historical query is bounded at or before cutoffAt.',
      'Only context layers selected by the treatment arm are queried; lower-information arms do not depend on higher-information stores.',
      'Canonical memory uses the newest state per memory key as of cutoffAt and only VERIFIED/CANONICAL states are exposed.',
      'Decision traces are recovered only from prior Decision Transfer evaluator inputs and only OBSERVED/VERIFIED_CONTRAST traces are exposed.',
      'Patterns come only from prior persisted promotion reports with maturity RECURRENT or stronger; they are not promoted by materialization.',
      'Rules come only from APPROVED Cognitive Twin decisions whose approved_at is at or before cutoffAt.',
      'Exact target trace identifiers are excluded from every queried historical source. Semantic contamination still requires audit of the frozen context.',
      'cutoffAt is a ROOT-declared pre-decision boundary; this materializer does not by itself prove the revealed target occurred after the cutoff.',
    ],
  };
  const receipt = { ...receiptBase, receiptHash: sha256(canonicalJson(receiptBase)) };
  const blindInput: BlindDecisionRunInput = parseBlindDecisionRunInput({
    experimentId: input.experimentId,
    targetTraceId: input.targetTraceId,
    targetDomain: input.targetDomain,
    targetCommitmentSha256: input.targetCommitmentSha256,
    arm: input.arm,
    contextPool,
    ...(input.preferredProvider ? { preferredProvider: input.preferredProvider } : {}),
    strictProvider: input.strictProvider,
    maxTokens: input.maxTokens,
  });
  return { blindInput, contextPool, receipt };
}

export async function bindDecisionTransferContextReceipt(runId: string, receipt: Record<string, unknown>) {
  const db = createServiceSupabaseClient();
  const read = await db.from('sfi_cognitive_twin_runs')
    .select('id,role,status,input_snapshot')
    .eq('id', runId)
    .maybeSingle();
  if (read.error || !read.data) throw new Error(`DT_CONTEXT_BIND_RUN_NOT_FOUND:${read.error?.message ?? runId}`);
  if (read.data.role !== 'DECISION_TRANSFER_BLIND_RECONSTRUCTOR' || read.data.status !== 'EVIDENCE_PENDING') {
    throw new Error(`DT_CONTEXT_BIND_RUN_STATE_INVALID:${read.data.role}:${read.data.status}`);
  }
  const snapshot = record(read.data.input_snapshot);
  const update = await db.from('sfi_cognitive_twin_runs').update({
    input_snapshot: { ...snapshot, contextMaterialization: receipt },
  }).eq('id', runId).eq('status', 'EVIDENCE_PENDING');
  if (update.error) {
    await db.from('sfi_cognitive_twin_runs').delete().eq('id', runId).eq('status', 'EVIDENCE_PENDING');
    throw new Error(`DT_CONTEXT_BIND_FAILED:${update.error.message}`);
  }
  return { ok: true as const };
}

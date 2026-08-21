import 'server-only';

import { createHash } from 'node:crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { COGNITIVE_TWIN_CONTRACT_VERSION } from '../contract';
import type { CognitiveTwinDevelopmentalEvent, CognitiveTwinLineageHealth, CognitiveTwinSalience } from './types';

const SUBJECT_ID = 'CT-A01';
const LINEAGE_ID = 'SFI-CT-A01';
const ROLE = 'cognitive_twin_developmental_heartbeat';
const GENESIS_TASK_ID = 'ct-a01-genesis-2026-08-11';
const CANONICAL_MEMORY_MODULE = 'institutionalEventPipeline';

type Row = Record<string, unknown>;

function record(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const row = value as Row;
  return `{${Object.keys(row).sort().map((key) => `${JSON.stringify(key)}:${canonical(row[key])}`).join(',')}}`;
}
function hash(value: unknown) { return createHash('sha256').update(canonical(value)).digest('hex'); }
function dayKey(date: Date) { return date.toISOString().slice(0, 10); }

function eventFromRun(row: Row): CognitiveTwinDevelopmentalEvent | null {
  const envelope = record(row.output_envelope);
  const result = record(envelope.result);
  const event = record(result.developmentalEvent);
  if (event.schemaVersion !== 'SFI-CT-DEVELOPMENTAL-EVENT-1.0') return null;
  return event as unknown as CognitiveTwinDevelopmentalEvent;
}

async function countTable(table: string, configure?: (query: any) => any) {
  const db = createServiceSupabaseClient();
  let query: any = db.from(table).select('*', { count: 'exact', head: true });
  if (configure) query = configure(query);
  const result = await query;
  return result.error ? { count: null as number | null, error: result.error.message } : { count: result.count ?? 0, error: null as string | null };
}

async function readRecentDevelopmentalRuns(limit = 400) {
  const db = createServiceSupabaseClient();
  const result = await db.from('sfi_cognitive_twin_runs').select('*').eq('role', ROLE).order('created_at', { ascending: true }).limit(limit);
  if (result.error) throw new Error(`CT_REENTRY_RUN_READ_FAILED:${result.error.message}`);
  return (result.data ?? []) as Row[];
}

function calculateSalience(input: {
  evidenceCount: number | null;
  memoryCount: number | null;
  decisionCount: number | null;
  evaluationCount: number | null;
  recentRunCount: number | null;
  previous: CognitiveTwinDevelopmentalEvent | null;
}): CognitiveTwinSalience {
  if (!input.previous) return { evidence: 0, contradiction: 0, novelty: 0, temporal: 0, worldChange: 0, total: 0 };
  const prior = input.previous.observedContext;
  const changed = (current: number | null, before: number | null) => current !== null && before !== null && current !== before ? 1 : 0;
  const evidence = changed(input.evidenceCount, prior.evidenceCount);
  const memory = changed(input.memoryCount, prior.memoryCount);
  const decisions = changed(input.decisionCount, prior.decisionCount);
  const evaluations = changed(input.evaluationCount, prior.evaluationCount);
  const runs = changed(input.recentRunCount, prior.recentRunCount);
  const novelty = Math.max(memory, decisions, evaluations);
  const worldChange = Math.max(evidence, runs);
  const contradiction = 0;
  const temporal = 0;
  const total = (evidence + memory + decisions + evaluations + runs) / 5;
  return { evidence, contradiction, novelty, temporal, worldChange, total };
}

export async function ensureCognitiveTwinGenesis() {
  const db = createServiceSupabaseClient();
  const existing = await db.from('sfi_cognitive_twin_runs').select('*').eq('task_id', GENESIS_TASK_ID).limit(1);
  if (existing.error) throw new Error(`CT_GENESIS_READ_FAILED:${existing.error.message}`);
  if ((existing.data ?? []).length) return { created: false, taskId: GENESIS_TASK_ID };

  const createdAt = new Date().toISOString();
  const genesisPayload = {
    schemaVersion: 'SFI-CT-GENESIS-1.0', subjectId: SUBJECT_ID, lineageId: LINEAGE_ID, ancestor: 'CT-ANCESTOR-2026-05',
    cognitiveTwinContractVersion: COGNITIVE_TWIN_CONTRACT_VERSION, authority: 'ROOT/FOUNDER', modelIndependentSubject: true,
    individuationClaim: 'NOT_DEMONSTRATED', createdAt,
  };
  const genesisHash = hash(genesisPayload);
  const insert = await db.from('sfi_cognitive_twin_runs').insert({
    task_id: GENESIS_TASK_ID, contract_version: COGNITIVE_TWIN_CONTRACT_VERSION, provider: null, model: null, role: ROLE, status: 'READY',
    objective: 'Commit CT-A01 genesis as a longitudinal experimental subject without claiming individuation.', input_snapshot: genesisPayload,
    output_envelope: {
      status: 'EXECUTED', result: { genesis: genesisPayload, genesisHash, executionMode: 'DETERMINISTIC_LEDGER_COMMIT' },
      claims: [{ statement: 'CT-A01 genesis was committed to the institutional ledger.', epistemicClass: 'OBSERVED', evidenceRefs: [] }],
      limitations: ['Repository/DB commit establishes institutional provenance, not third-party timestamp authority.', 'Individuation is not demonstrated by genesis.'],
    },
    evidence_refs: [], limitations: ['Individuation is not demonstrated by genesis.'], started_at: createdAt, finished_at: createdAt,
  });
  if (insert.error) throw new Error(`CT_GENESIS_WRITE_FAILED:${insert.error.message}`);
  return { created: true, taskId: GENESIS_TASK_ID, genesisHash };
}

export async function runCognitiveTwinDevelopmentalHeartbeat(now = new Date()) {
  await ensureCognitiveTwinGenesis();
  const db = createServiceSupabaseClient();
  const epochKey = dayKey(now);
  const taskId = `ct-a01-heartbeat-${epochKey}`;
  const existing = await db.from('sfi_cognitive_twin_runs').select('*').eq('task_id', taskId).limit(1);
  if (existing.error) throw new Error(`CT_HEARTBEAT_READ_FAILED:${existing.error.message}`);
  if ((existing.data ?? []).length) return { ok: true, skipped: true, taskId, reason: 'epoch_already_committed' };

  const [evidence, memory, decisions, evaluations, runs, history] = await Promise.all([
    countTable('root_evidence_entries'),
    countTable('sfi_amv_memory', (query) => query.eq('module', CANONICAL_MEMORY_MODULE).not('memory_delta->raw->>memoryKey', 'is', null)),
    countTable('sfi_cognitive_twin_decisions'),
    countTable('sfi_cognitive_twin_evaluations'),
    countTable('sfi_cognitive_twin_runs'),
    readRecentDevelopmentalRuns(),
  ]);
  const previousEvents = history.map(eventFromRun).filter((value): value is CognitiveTwinDevelopmentalEvent => Boolean(value));
  const previous = previousEvents.at(-1) ?? null;
  const salience = calculateSalience({ evidenceCount: evidence.count, memoryCount: memory.count, decisionCount: decisions.count, evaluationCount: evaluations.count, recentRunCount: runs.count, previous });
  const missing = [evidence, memory, decisions, evaluations, runs].filter((item) => item.error).map((item) => item.error as string);
  const materialDevelopment = Boolean(previous) && salience.total > 0;
  const disposition = missing.length ? 'REQUEST_EVIDENCE' as const : materialDevelopment ? 'SURFACE' as const : 'ARCHIVE_ONLY' as const;
  const createdAt = now.toISOString();
  const parentEventHash = previous?.eventHash ?? null;
  const eventWithoutHash = {
    schemaVersion: 'SFI-CT-DEVELOPMENTAL-EVENT-1.0' as const, subjectId: SUBJECT_ID, lineageId: LINEAGE_ID, epochKey, trigger: 'DAILY_HEARTBEAT' as const,
    observedContext: { evidenceCount: evidence.count, memoryCount: memory.count, decisionCount: decisions.count, evaluationCount: evaluations.count, recentRunCount: runs.count },
    salience, materialDevelopment, disposition,
    dispositionReason: missing.length
      ? 'One or more institutional sources were unavailable; the Twin requests evidence instead of fabricating continuity.'
      : !previous
        ? 'First measured epoch establishes a baseline only; no developmental change is inferred.'
        : materialDevelopment
          ? 'At least one persisted institutional count changed since the preceding measured epoch.'
          : 'No persisted institutional count changed since the preceding measured epoch.',
    selfReport: missing.length
      ? 'No puedo tratar este epoch como completo porque faltan fuentes institucionales observables.'
      : !previous
        ? 'Registré la línea base del epoch; no infiero desarrollo sin un corte previo comparable.'
        : materialDevelopment
          ? 'Registré cambios en el estado institucional persistido desde el corte previo.'
          : 'No registré cambios en los conteos institucionales observados desde el corte previo.',
    whatWouldChangeDecision: missing.length ? missing : ['a persisted source count changes', 'a source becomes unavailable or returns'],
    mutation: { considered: false, status: 'NOT_CONSIDERED' as const, proposalId: null }, evidenceRefs: [], parentEventHash,
    rootVisibility: 'ALWAYS_VISIBLE' as const, createdAt,
  };
  const eventHash = hash({ parentEventHash, event: eventWithoutHash });
  const developmentalEvent: CognitiveTwinDevelopmentalEvent = { ...eventWithoutHash, eventHash };

  const insert = await db.from('sfi_cognitive_twin_runs').insert({
    task_id: taskId, contract_version: COGNITIVE_TWIN_CONTRACT_VERSION, provider: null, model: null, role: ROLE,
    status: missing.length ? 'EVIDENCE_PENDING' : 'READY',
    objective: 'Record one auditable CT-A01 developmental epoch from persisted institutional deltas.',
    input_snapshot: { subjectId: SUBJECT_ID, lineageId: LINEAGE_ID, epochKey, parentEventHash },
    output_envelope: {
      status: missing.length ? 'ESCALATED' : 'EXECUTED', result: { developmentalEvent, executionMode: 'DETERMINISTIC_EVIDENCE_DELTA' },
      claims: [{ statement: materialDevelopment ? 'One or more persisted institutional counts changed.' : 'No persisted institutional count change is established for this epoch.', epistemicClass: 'DERIVED', evidenceRefs: [] }],
      limitations: ['This is an auditable computational report, not a phenomenal or human subjective report.', 'Count change records structural delta only; it does not demonstrate causality or individuation.'],
    },
    evidence_refs: [], limitations: ['No chain-of-thought persisted.', 'No individuation claim is promoted by this heartbeat.', ...missing], started_at: createdAt, finished_at: createdAt,
  });
  if (insert.error) throw new Error(`CT_HEARTBEAT_WRITE_FAILED:${insert.error.message}`);
  return { ok: true, skipped: false, taskId, developmentalEvent };
}

export async function readCognitiveTwinLineageHealth(): Promise<CognitiveTwinLineageHealth> {
  const db = createServiceSupabaseClient();
  const [genesis, history] = await Promise.all([
    db.from('sfi_cognitive_twin_runs').select('*').eq('task_id', GENESIS_TASK_ID).limit(1),
    readRecentDevelopmentalRuns(),
  ]);
  if (genesis.error) throw new Error(`CT_LINEAGE_GENESIS_READ_FAILED:${genesis.error.message}`);
  const events = history.map(eventFromRun).filter((value): value is CognitiveTwinDevelopmentalEvent => Boolean(value));
  let chainIntegrity: CognitiveTwinLineageHealth['chainIntegrity'] = events.length ? 'PASS' : 'EMPTY';
  let previousHash: string | null = null;
  for (const event of events) {
    if (event.parentEventHash !== previousHash) { chainIntegrity = 'BROKEN'; break; }
    const { eventHash, ...withoutHash } = event;
    const expected = hash({ parentEventHash: event.parentEventHash, event: withoutHash });
    if (expected !== eventHash) { chainIntegrity = 'BROKEN'; break; }
    previousHash = event.eventHash;
  }
  const latest = events.at(-1) ?? null;
  return {
    subjectId: SUBJECT_ID, lineageId: LINEAGE_ID, genesisPresent: (genesis.data ?? []).length > 0, chainIntegrity,
    eventCount: events.length, materialEventCount: events.filter((event) => event.materialDevelopment).length,
    lastEpochAt: latest?.createdAt ?? null, headHash: latest?.eventHash ?? null, lastDisposition: latest?.disposition ?? null,
    unresolvedMutationProposals: 0, prospectiveValidation: events.length >= 2 ? 'AVAILABLE' : 'NOT_YET_POSSIBLE', individuationDemonstrated: false,
    limitations: ['A valid lineage chain demonstrates provenance continuity, not artificial individuation.', 'External timestamp anchoring is not yet implemented.', 'Self-mutation remains proposal/evaluation work; no autonomous authority expansion is permitted.'],
  };
}

export const COGNITIVE_TWIN_REENTRY = {
  subjectId: SUBJECT_ID, lineageId: LINEAGE_ID, role: ROLE, genesisTaskId: GENESIS_TASK_ID,
  rule: 'The Cognitive Twin remains the institutional apparatus; CT-A01 is the longitudinal experimental subject. Model, subject and institution are not interchangeable.',
} as const;

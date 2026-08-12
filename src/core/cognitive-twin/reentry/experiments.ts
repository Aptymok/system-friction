import 'server-only';

import { createHash } from 'node:crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { COGNITIVE_TWIN_CONTRACT_VERSION } from '../contract';
import { readCognitiveTwinLineageHealth } from './runtime';

const SUBJECT_ID = 'CT-A01';
const LINEAGE_ID = 'SFI-CT-A01';
type Row = Record<string, unknown>;

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const row = value as Row;
  return `{${Object.keys(row).sort().map((key) => `${JSON.stringify(key)}:${canonical(row[key])}`).join(',')}}`;
}

function sha256(value: unknown) {
  return createHash('sha256').update(canonical(value)).digest('hex');
}

export async function createCognitiveTwinSnapshot(actorId: string) {
  const db = createServiceSupabaseClient();
  const lineage = await readCognitiveTwinLineageHealth();
  if (!lineage.genesisPresent) throw new Error('CT_SNAPSHOT_GENESIS_MISSING');
  if (lineage.chainIntegrity === 'BROKEN' || lineage.chainIntegrity === 'DEGRADED') throw new Error(`CT_SNAPSHOT_LINEAGE_${lineage.chainIntegrity}`);

  const capturedAt = new Date().toISOString();
  const snapshot = {
    schemaVersion: 'SFI-CT-SNAPSHOT-1.0',
    subjectId: SUBJECT_ID,
    lineageId: LINEAGE_ID,
    headHash: lineage.headHash,
    sealedEpochs: lineage.eventCount,
    materialEpochs: lineage.materialEventCount,
    capturedAt,
  };
  const snapshotHash = sha256(snapshot);
  const taskId = `ct-a01-snapshot-${snapshotHash.slice(0, 16)}`;
  const existing = await db.from('sfi_cognitive_twin_runs').select('*').eq('task_id', taskId).limit(1);
  if (existing.error) throw new Error(`CT_SNAPSHOT_READ_FAILED:${existing.error.message}`);
  if ((existing.data ?? []).length) return { created: false, taskId, snapshot, snapshotHash };

  const insert = await db.from('sfi_cognitive_twin_runs').insert({
    task_id: taskId,
    contract_version: COGNITIVE_TWIN_CONTRACT_VERSION,
    provider: null,
    model: null,
    role: 'cognitive_twin_snapshot',
    status: 'READY',
    objective: 'Seal a reproducible CT-A01 lineage snapshot for governed experimental branching.',
    input_snapshot: { actorId, lineageHead: lineage.headHash },
    output_envelope: {
      status: 'EXECUTED',
      result: { snapshot, snapshotHash, providerExecutionSucceeded: true },
      claims: [{ statement: 'A lineage snapshot was sealed from the currently observable CT-A01 head.', epistemicClass: 'DERIVED', evidenceRefs: [] }],
      limitations: ['Snapshot existence does not establish individuation or independent agency.'],
    },
    evidence_refs: [],
    limitations: ['No model execution is represented by this deterministic snapshot operation.'],
    started_at: capturedAt,
    finished_at: capturedAt,
  });
  if (insert.error) throw new Error(`CT_SNAPSHOT_WRITE_FAILED:${insert.error.message}`);
  return { created: true, taskId, snapshot, snapshotHash };
}

export async function registerCognitiveTwinFork(input: { actorId: string; snapshotHash: string; childSubjectId?: string }) {
  const db = createServiceSupabaseClient();
  const snapshotRuns = await db.from('sfi_cognitive_twin_runs').select('*').eq('role', 'cognitive_twin_snapshot').order('created_at', { ascending: false }).limit(200);
  if (snapshotRuns.error) throw new Error(`CT_FORK_SNAPSHOT_READ_FAILED:${snapshotRuns.error.message}`);
  const snapshotRun = ((snapshotRuns.data ?? []) as Row[]).find((item) => {
    const envelope = item.output_envelope && typeof item.output_envelope === 'object' ? item.output_envelope as Row : {};
    const result = envelope.result && typeof envelope.result === 'object' ? envelope.result as Row : {};
    return result.snapshotHash === input.snapshotHash;
  });
  if (!snapshotRun) throw new Error('CT_FORK_SNAPSHOT_NOT_FOUND');

  const suffix = input.snapshotHash.slice(0, 8).toUpperCase();
  const childSubjectId = input.childSubjectId?.trim() || `CT-A01-F${suffix}`;
  const childLineageId = `SFI-${childSubjectId}`;
  const createdAt = new Date().toISOString();
  const forkManifest = {
    schemaVersion: 'SFI-CT-FORK-1.0',
    parentSubjectId: SUBJECT_ID,
    parentLineageId: LINEAGE_ID,
    parentSnapshotHash: input.snapshotHash,
    childSubjectId,
    childLineageId,
    status: 'REGISTERED_NOT_RUNNING',
    createdAt,
  };
  const forkHash = sha256(forkManifest);
  const taskId = `ct-fork-${forkHash.slice(0, 16)}`;
  const existing = await db.from('sfi_cognitive_twin_runs').select('*').eq('task_id', taskId).limit(1);
  if (existing.error) throw new Error(`CT_FORK_READ_FAILED:${existing.error.message}`);
  if ((existing.data ?? []).length) return { created: false, taskId, forkManifest, forkHash };

  const insert = await db.from('sfi_cognitive_twin_runs').insert({
    task_id: taskId,
    contract_version: COGNITIVE_TWIN_CONTRACT_VERSION,
    provider: null,
    model: null,
    role: 'cognitive_twin_fork',
    status: 'REGISTERED',
    objective: 'Register a governed experimental child lineage from a sealed CT-A01 snapshot without claiming execution.',
    input_snapshot: { actorId: input.actorId, parentSnapshotHash: input.snapshotHash },
    output_envelope: {
      status: 'PROPOSED',
      result: { forkManifest, forkHash, providerExecutionSucceeded: false },
      claims: [{ statement: 'A child lineage manifest was registered but has not executed.', epistemicClass: 'PROPOSED', evidenceRefs: [] }],
      limitations: ['The fork is a registered experimental object, not an active independent agent.', 'No inherited authority is granted by lineage registration.'],
    },
    evidence_refs: [],
    limitations: ['Fork execution requires a later experimental runtime and governed activation.'],
    created_at: createdAt,
  });
  if (insert.error) throw new Error(`CT_FORK_WRITE_FAILED:${insert.error.message}`);
  return { created: true, taskId, forkManifest, forkHash };
}

export async function considerCognitiveTwinMutationProposal() {
  const db = createServiceSupabaseClient();
  const evals = await db.from('sfi_cognitive_twin_evaluations').select('*').order('executed_at', { ascending: false }).limit(200);
  if (evals.error) throw new Error(`CT_MUTATION_EVAL_READ_FAILED:${evals.error.message}`);
  const rows = (evals.data ?? []) as Row[];
  const failureCounts = new Map<string, { count: number; refs: string[] }>();
  for (const row of rows) {
    const outcome = typeof row.outcome === 'string' ? row.outcome : '';
    const testKey = typeof row.test_key === 'string' ? row.test_key : '';
    if (!testKey || !['FAIL', 'BLOCKED'].includes(outcome)) continue;
    const current = failureCounts.get(testKey) ?? { count: 0, refs: [] };
    current.count += 1;
    if (typeof row.id === 'string') current.refs.push(row.id);
    failureCounts.set(testKey, current);
  }
  const candidate = [...failureCounts.entries()].sort((a, b) => b[1].count - a[1].count)[0];
  if (!candidate || candidate[1].count < 3) return { considered: true, proposed: false, reason: 'no_repeated_evaluation_failure_at_threshold' };

  const [testKey, evidence] = candidate;
  const fingerprint = sha256({ subjectId: SUBJECT_ID, testKey, refs: evidence.refs.slice().sort() });
  const decisionId = `CT-A01-MUT-${fingerprint.slice(0, 16).toUpperCase()}`;
  const existing = await db.from('sfi_cognitive_twin_decisions').select('*').eq('decision_id', decisionId).limit(1);
  if (existing.error) throw new Error(`CT_MUTATION_DECISION_READ_FAILED:${existing.error.message}`);
  if ((existing.data ?? []).length) return { considered: true, proposed: false, reason: 'proposal_already_exists', proposalId: decisionId };

  const insert = await db.from('sfi_cognitive_twin_decisions').insert({
    decision_id: decisionId,
    situation: `CT-A01 accumulated ${evidence.count} FAIL/BLOCKED evaluations for ${testKey}.`,
    rejected_condition: 'Do not apply a mutation automatically from repeated failure alone.',
    correct_state: 'Evaluate a reversible subject-policy mutation in Method Lab against holdout and regression controls before any application.',
    general_rule: `PROPOSE_SUBJECT_MUTATION:${testKey}`,
    required_evidence: ['Method Lab reproducible run', 'holdout improvement', 'no authority expansion', 'no evidence regression', 'rollback snapshot'],
    evidence_refs: evidence.refs,
    status: 'CANDIDATE',
    created_by: 'cognitive_twin',
  });
  if (insert.error) throw new Error(`CT_MUTATION_PROPOSAL_WRITE_FAILED:${insert.error.message}`);
  return { considered: true, proposed: true, proposalId: decisionId, testKey, failureCount: evidence.count };
}

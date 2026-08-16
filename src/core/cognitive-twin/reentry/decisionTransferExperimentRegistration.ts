import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { canonicalJson } from './decisionCommitment';
import {
  SFI_DT_INSTRUMENT_SOURCE_HASH,
  SFI_DT_PROTOCOL_VERSION,
  assertDecisionTransferInstrumentRevision,
} from './decisionTransferExperimentFreeze';

type Row = Record<string, unknown>;

export const SFI_DT_EXPERIMENT_ID = 'EXP-001' as const;
export const SFI_DT_EXPERIMENT_REGISTRATION_PROTOCOL = 'SFI-DT-EXPERIMENT-REGISTRATION-1.0' as const;
export const SFI_DT_CONFIRMATORY_ARMS = [
  'B0_BASE',
  'B1_RAW_HISTORY',
  'B2_MEMORY',
  'B3_CDT',
  'B4_PATTERNS',
  'B5_RULE_STRUCTURE',
  'CT_FULL',
] as const;

const armSchema = z.enum(SFI_DT_CONFIRMATORY_ARMS);
const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/i);

export const decisionTransferExperimentRegistrationInputSchema = z.object({
  experimentId: z.literal(SFI_DT_EXPERIMENT_ID),
  targetTraceId: z.string().trim().min(1).max(240),
  targetDomain: z.string().trim().min(1).max(160),
  targetCommitmentSha256: sha256Schema,
  cutoffAt: z.string().trim().min(1).max(80),
}).strict().superRefine((value, ctx) => {
  const cutoff = Date.parse(value.cutoffAt);
  if (!Number.isFinite(cutoff)) {
    ctx.addIssue({ code: 'custom', path: ['cutoffAt'], message: 'cutoffAt must be an ISO timestamp' });
    return;
  }
  if (cutoff > Date.now()) {
    ctx.addIssue({ code: 'custom', path: ['cutoffAt'], message: 'cutoffAt cannot be in the future at registration time' });
  }
});

export type DecisionTransferExperimentRegistrationInput = z.infer<typeof decisionTransferExperimentRegistrationInputSchema>;

export type DecisionTransferExperimentRegistrationReceipt = {
  protocol: typeof SFI_DT_EXPERIMENT_REGISTRATION_PROTOCOL;
  protocolVersion: typeof SFI_DT_PROTOCOL_VERSION;
  experimentId: typeof SFI_DT_EXPERIMENT_ID;
  targetTraceId: string;
  targetDomain: string;
  targetCommitmentSha256: string;
  cutoffAt: string;
  arms: readonly string[];
  instrumentSourceHash: string;
  registeredAt: string;
  registrationHash: string;
};

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function normalizeInput(input: DecisionTransferExperimentRegistrationInput) {
  return {
    ...input,
    targetCommitmentSha256: input.targetCommitmentSha256.toLowerCase(),
    cutoffAt: new Date(input.cutoffAt).toISOString(),
  };
}

function receiptIntegrity(value: unknown): DecisionTransferExperimentRegistrationReceipt | null {
  const receipt = record(value) as DecisionTransferExperimentRegistrationReceipt;
  if (receipt.protocol !== SFI_DT_EXPERIMENT_REGISTRATION_PROTOCOL) return null;
  if (receipt.protocolVersion !== SFI_DT_PROTOCOL_VERSION) return null;
  if (receipt.experimentId !== SFI_DT_EXPERIMENT_ID) return null;
  if (receipt.instrumentSourceHash !== SFI_DT_INSTRUMENT_SOURCE_HASH) return null;
  if (!Array.isArray(receipt.arms) || canonicalJson(receipt.arms) !== canonicalJson(SFI_DT_CONFIRMATORY_ARMS)) return null;
  const { registrationHash: _registrationHash, ...base } = receipt;
  return sha256(canonicalJson(base)) === receipt.registrationHash ? receipt : null;
}

export function parseDecisionTransferExperimentRegistrationInput(value: unknown) {
  return decisionTransferExperimentRegistrationInputSchema.parse(value);
}

async function findRegistrations() {
  const db = createServiceSupabaseClient();
  const read = await db.from('sfi_cognitive_twin_runs')
    .select('id,input_snapshot,output_envelope,created_at')
    .eq('role', 'DECISION_TRANSFER_EXPERIMENT_REGISTRATION')
    .eq('status', 'CLOSED')
    .order('created_at', { ascending: true })
    .limit(20);
  if (read.error) throw new Error(`DT_REGISTRATION_READ_FAILED:${read.error.message}`);
  return (read.data ?? []) as Row[];
}

export async function registerDecisionTransferExperiment(input: DecisionTransferExperimentRegistrationInput, actorId: string) {
  const instrumentRevision = assertDecisionTransferInstrumentRevision();
  const normalized = normalizeInput(input);
  const existingRows = await findRegistrations();
  for (const row of existingRows) {
    const output = record(row.output_envelope);
    const receipt = receiptIntegrity(output.receipt);
    if (!receipt) throw new Error(`DT_REGISTRATION_EXISTING_RECEIPT_INVALID:${String(row.id)}`);
    if (receipt.experimentId !== normalized.experimentId) continue;
    const same = receipt.targetTraceId === normalized.targetTraceId
      && receipt.targetDomain === normalized.targetDomain
      && receipt.targetCommitmentSha256 === normalized.targetCommitmentSha256
      && receipt.cutoffAt === normalized.cutoffAt
      && receipt.instrumentSourceHash === instrumentRevision.instrumentSourceHash;
    if (!same) throw new Error('DT_REGISTRATION_CONFLICT:EXP-001_ALREADY_FROZEN');
    return { registrationRunId: String(row.id), receipt, reused: true as const };
  }

  const registeredAt = new Date().toISOString();
  const receiptBase = {
    protocol: SFI_DT_EXPERIMENT_REGISTRATION_PROTOCOL,
    protocolVersion: SFI_DT_PROTOCOL_VERSION,
    experimentId: normalized.experimentId,
    targetTraceId: normalized.targetTraceId,
    targetDomain: normalized.targetDomain,
    targetCommitmentSha256: normalized.targetCommitmentSha256,
    cutoffAt: normalized.cutoffAt,
    arms: SFI_DT_CONFIRMATORY_ARMS,
    instrumentSourceHash: instrumentRevision.instrumentSourceHash,
    registeredAt,
  };
  const receipt: DecisionTransferExperimentRegistrationReceipt = {
    ...receiptBase,
    registrationHash: sha256(canonicalJson(receiptBase)),
  };
  const db = createServiceSupabaseClient();
  const insert = await db.from('sfi_cognitive_twin_runs').insert({
    task_id: `DT-REGISTER-${randomUUID()}`,
    contract_version: SFI_DT_EXPERIMENT_REGISTRATION_PROTOCOL,
    provider: 'internal',
    model: 'none',
    role: 'DECISION_TRANSFER_EXPERIMENT_REGISTRATION',
    status: 'CLOSED',
    objective: 'Freeze EXP-001 target identity, target commitment, cutoff, arm matrix and instrument revision before confirmatory execution.',
    input_snapshot: {
      experimentId: normalized.experimentId,
      targetTraceId: normalized.targetTraceId,
      targetDomain: normalized.targetDomain,
      targetCommitmentSha256: normalized.targetCommitmentSha256,
      cutoffAt: normalized.cutoffAt,
      instrumentSourceHash: instrumentRevision.instrumentSourceHash,
      runtimeCommitAtRegistration: instrumentRevision.runtimeCommit,
      actorId,
    },
    output_envelope: { receipt },
    evidence_refs: [],
    limitations: [
      'Registration freezes experiment identity and commitment metadata; it does not reveal or validate the target decision.',
      'The target decision must still resolve to post-cutoff OBSERVED evidence at governed reveal.',
      'One confirmatory blind prediction is permitted per frozen arm.',
    ],
    started_at: registeredAt,
    finished_at: registeredAt,
  }).select('id').single();
  if (insert.error || !insert.data?.id) throw new Error(`DT_REGISTRATION_PERSIST_FAILED:${insert.error?.message ?? 'unknown'}`);
  return { registrationRunId: String(insert.data.id), receipt, reused: false as const };
}

export async function requireDecisionTransferExperimentRegistration(input: {
  experimentId: string;
  targetTraceId: string;
  targetDomain: string;
  targetCommitmentSha256: string;
  cutoffAt: string;
  arm: string;
}) {
  const instrumentRevision = assertDecisionTransferInstrumentRevision();
  if (input.experimentId !== SFI_DT_EXPERIMENT_ID) throw new Error(`DT_REGISTRATION_EXPERIMENT_MISMATCH:${input.experimentId}`);
  const parsedArm = armSchema.safeParse(input.arm);
  if (!parsedArm.success) throw new Error(`DT_REGISTRATION_ARM_INVALID:${input.arm}`);
  const cutoffAt = new Date(input.cutoffAt).toISOString();
  const commitment = input.targetCommitmentSha256.toLowerCase();

  const rows = await findRegistrations();
  const matches = rows.map((row) => ({ row, receipt: receiptIntegrity(record(row.output_envelope).receipt) }))
    .filter((item): item is { row: Row; receipt: DecisionTransferExperimentRegistrationReceipt } => Boolean(item.receipt))
    .filter((item) => item.receipt.experimentId === SFI_DT_EXPERIMENT_ID);
  if (matches.length !== 1) throw new Error(`DT_REGISTRATION_REQUIRED:${matches.length}`);
  const match = matches[0];
  const receipt = match.receipt;
  if (receipt.instrumentSourceHash !== instrumentRevision.instrumentSourceHash) throw new Error('DT_REGISTRATION_INSTRUMENT_REVISION_MISMATCH');
  if (receipt.targetTraceId !== input.targetTraceId) throw new Error('DT_REGISTRATION_TARGET_TRACE_MISMATCH');
  if (receipt.targetDomain !== input.targetDomain) throw new Error('DT_REGISTRATION_TARGET_DOMAIN_MISMATCH');
  if (receipt.targetCommitmentSha256 !== commitment) throw new Error('DT_REGISTRATION_TARGET_COMMITMENT_MISMATCH');
  if (receipt.cutoffAt !== cutoffAt) throw new Error('DT_REGISTRATION_CUTOFF_MISMATCH');
  if (!receipt.arms.includes(parsedArm.data)) throw new Error('DT_REGISTRATION_ARM_NOT_FROZEN');

  const db = createServiceSupabaseClient();
  const attemptsRead = await db.from('sfi_cognitive_twin_runs')
    .select('id,status,input_snapshot,output_envelope,created_at')
    .eq('role', 'DECISION_TRANSFER_BLIND_RECONSTRUCTOR')
    .in('status', ['EVIDENCE_PENDING', 'VERIFYING', 'CLOSED'])
    .contains('input_snapshot', { experimentId: SFI_DT_EXPERIMENT_ID, arm: parsedArm.data })
    .order('created_at', { ascending: true })
    .limit(20);
  if (attemptsRead.error) throw new Error(`DT_REGISTRATION_ARM_ATTEMPT_READ_FAILED:${attemptsRead.error.message}`);
  for (const row of (attemptsRead.data ?? []) as Row[]) {
    const snapshot = record(row.input_snapshot);
    const freeze = record(snapshot.experimentalFreeze);
    const registration = record(snapshot.experimentRegistration);
    if (text(freeze.protocolVersion) !== SFI_DT_PROTOCOL_VERSION) continue;
    if (text(registration.registrationHash) !== receipt.registrationHash) continue;
    throw new Error(`DT_REGISTRATION_ARM_ALREADY_ATTEMPTED:${parsedArm.data}:${String(row.id)}:${String(row.status)}`);
  }

  return { registrationRunId: String(match.row.id), receipt };
}

export async function bindDecisionTransferExperimentRegistration(input: {
  blindRunId: string;
  registrationRunId: string;
  receipt: DecisionTransferExperimentRegistrationReceipt;
}) {
  const db = createServiceSupabaseClient();
  const read = await db.from('sfi_cognitive_twin_runs')
    .select('id,role,status,input_snapshot')
    .eq('id', input.blindRunId)
    .maybeSingle();
  if (read.error || !read.data) throw new Error(`DT_REGISTRATION_BIND_RUN_NOT_FOUND:${read.error?.message ?? input.blindRunId}`);
  if (read.data.role !== 'DECISION_TRANSFER_BLIND_RECONSTRUCTOR' || read.data.status !== 'EVIDENCE_PENDING') {
    throw new Error(`DT_REGISTRATION_BIND_RUN_STATE_INVALID:${read.data.role}:${read.data.status}`);
  }
  const snapshot = record(read.data.input_snapshot);
  const update = await db.from('sfi_cognitive_twin_runs').update({
    input_snapshot: {
      ...snapshot,
      experimentRegistration: {
        protocol: input.receipt.protocol,
        registrationRunId: input.registrationRunId,
        registrationHash: input.receipt.registrationHash,
        instrumentSourceHash: input.receipt.instrumentSourceHash,
      },
    },
  }).eq('id', input.blindRunId).eq('status', 'EVIDENCE_PENDING');
  if (update.error) {
    await db.from('sfi_cognitive_twin_runs').delete().eq('id', input.blindRunId).eq('status', 'EVIDENCE_PENDING');
    throw new Error(`DT_REGISTRATION_BIND_FAILED:${update.error.message}`);
  }
  return {
    registrationRunId: input.registrationRunId,
    registrationHash: input.receipt.registrationHash,
  };
}

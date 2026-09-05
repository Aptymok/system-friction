import 'server-only';

import { createHash } from 'node:crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import {
  METHOD_LAB_EXPERIMENT_CONTRACT_VERSION,
  assertMethodLabExperimentPreregistration,
  assertMethodLabExperimentRun,
  type MethodLabExperimentPreregistration,
  type MethodLabExperimentRun,
} from './experimentContract';

function hash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function methodLabPreregistrationId(experimentId: string) {
  return `method-lab:prereg:${experimentId}`;
}

export function methodLabRunId(runId: string) {
  return `method-lab:run:${runId}`;
}

export function hashMethodLabPreregistration(value: MethodLabExperimentPreregistration) {
  return hash(assertMethodLabExperimentPreregistration(value));
}

export async function persistMethodLabExperimentPreregistration(input: {
  preregistration: MethodLabExperimentPreregistration;
  ownerId?: string | null;
}) {
  const preregistration = assertMethodLabExperimentPreregistration(input.preregistration);
  const definitionHash = hashMethodLabPreregistration(preregistration);
  const analysisId = methodLabPreregistrationId(preregistration.experimentId);
  const db = createServiceSupabaseClient();
  const persisted = await db.from('sfi_lab_analyses').insert({
    id: analysisId,
    owner_id: input.ownerId ?? null,
    mode: 'experiment_preregistration',
    source: METHOD_LAB_EXPERIMENT_CONTRACT_VERSION,
    data_mode: 'DECLARED',
    systems: [preregistration.POPULATION_SYSTEM.ref],
    variables: preregistration.EXPECTED_SIGNAL.measures,
    recommendations: [],
    limitations: ['Internal SFI preregistration only. No OSF or other external registration receipt is claimed by this slice.'],
    raw_analysis: {
      phase: 'PREREGISTERED',
      contractVersion: METHOD_LAB_EXPERIMENT_CONTRACT_VERSION,
      definitionHash,
      preregistration,
      canonicalMutation: false,
      rule: 'Preregistration rows are insert-only. A conflicting id must fail instead of silently rewriting T0, hypothesis, method or stopping terms.',
    },
  }).select('id,created_at').single();
  if (persisted.error || !persisted.data?.id) throw new Error(`METHOD_LAB_PREREGISTRATION_PERSIST_FAILED:${persisted.error?.message ?? 'unknown'}`);
  return {
    ok: true as const,
    analysisId: String(persisted.data.id),
    definitionHash,
    createdAt: String(persisted.data.created_at ?? preregistration.preregisteredAt),
  };
}

export async function persistMethodLabExperimentRun(input: {
  preregistration: MethodLabExperimentPreregistration;
  run: MethodLabExperimentRun;
  ownerId?: string | null;
}) {
  const preregistration = assertMethodLabExperimentPreregistration(input.preregistration);
  const run = assertMethodLabExperimentRun(preregistration, input.run);
  const expectedHash = hashMethodLabPreregistration(preregistration);
  const preregistrationRef = methodLabPreregistrationId(preregistration.experimentId);
  if (run.artifacts.PREREGISTERED.preregistrationRef !== preregistrationRef) throw new Error('METHOD_LAB_PREREGISTRATION_REF_MISMATCH');
  if (run.artifacts.PREREGISTERED.preregistrationHash !== expectedHash) throw new Error('METHOD_LAB_PREREGISTRATION_HASH_MISMATCH');

  const db = createServiceSupabaseClient();
  const existing = await db.from('sfi_lab_analyses').select('id,raw_analysis').eq('id', preregistrationRef).maybeSingle();
  if (existing.error) throw new Error(`METHOD_LAB_PREREGISTRATION_READ_FAILED:${existing.error.message}`);
  if (!existing.data) throw new Error('METHOD_LAB_PREREGISTRATION_REQUIRED');
  const raw = record(existing.data.raw_analysis);
  if (raw.contractVersion !== METHOD_LAB_EXPERIMENT_CONTRACT_VERSION || raw.definitionHash !== expectedHash) {
    throw new Error('METHOD_LAB_PREREGISTRATION_IMMUTABILITY_CHECK_FAILED');
  }

  const analysisId = methodLabRunId(run.artifacts.EXECUTED.runId);
  const persisted = await db.from('sfi_lab_analyses').insert({
    id: analysisId,
    owner_id: input.ownerId ?? null,
    mode: `experiment_run:${preregistration.experimentType.toLowerCase()}`,
    source: preregistrationRef,
    data_mode: run.artifacts.RESULT.epistemicClass,
    systems: [preregistration.POPULATION_SYSTEM.ref],
    variables: preregistration.EXPECTED_SIGNAL.measures,
    recommendations: [],
    limitations: run.artifacts.LIMITATIONS,
    raw_analysis: {
      phase: 'EXECUTED',
      contractVersion: METHOD_LAB_EXPERIMENT_CONTRACT_VERSION,
      preregistrationRef,
      preregistrationHash: expectedHash,
      run,
      canonicalMutation: false,
      simulationObservationBoundary: 'SIMULATION != OBSERVATION',
      returnBoundary: 'RETURN comes from observable reality and is represented only by CONTRAST.realityReturn.source = REALITY.',
    },
  }).select('id,created_at').single();
  if (persisted.error || !persisted.data?.id) throw new Error(`METHOD_LAB_EXPERIMENT_RUN_PERSIST_FAILED:${persisted.error?.message ?? 'unknown'}`);
  return {
    ok: true as const,
    analysisId: String(persisted.data.id),
    preregistrationRef,
    preregistrationHash: expectedHash,
    resultHash: run.artifacts.RESULT.resultHash,
    createdAt: String(persisted.data.created_at ?? run.artifacts.EXECUTED.finishedAt),
  };
}

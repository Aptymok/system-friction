import 'server-only';

import { hash as cryptoHash } from 'node:crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import {
  METHOD_LAB_EXPERIMENT_CONTRACT_VERSION,
  assertMethodLabExperimentPreregistration,
  assertMethodLabExperimentRun,
  type MethodLabExperimentPreregistration,
  type MethodLabExperimentRun,
} from './experimentContract';
import { recordUniversalLearningCandidate } from '@/lib/sfi/universalLearningQuarantine';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const row = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(row).sort().map((key) => [key, canonicalize(row[key])]));
  }
  return value;
}

function hash(value: unknown) {
  return cryptoHash('sha256', JSON.stringify(canonicalize(value)), 'hex');
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function deterministicAnalysisId(kind: 'preregistration'|'run'|'return', logicalId: string) {
  const hex = cryptoHash('sha256', `method-lab:${kind}:${logicalId.trim()}`, 'hex').slice(0, 32).split('');
  hex[12] = '5';
  hex[16] = 'a';
  const value = hex.join('');
  return `${value.slice(0,8)}-${value.slice(8,12)}-${value.slice(12,16)}-${value.slice(16,20)}-${value.slice(20,32)}`;
}

export function methodLabPreregistrationId(experimentId: string) {
  return deterministicAnalysisId('preregistration', experimentId);
}

export function methodLabRunId(runId: string) {
  return deterministicAnalysisId('run', runId);
}

export function hashMethodLabPreregistration(value: MethodLabExperimentPreregistration) {
  return hash(assertMethodLabExperimentPreregistration(value));
}

export async function readOwnedMethodLabExperimentPreregistration(input: {
  experimentId: string;
  ownerId: string;
}) {
  const experimentId = input.experimentId.trim();
  const ownerId = input.ownerId.trim();
  if (!experimentId || !ownerId) throw new Error('METHOD_LAB_PREREGISTRATION_OWNER_AND_EXPERIMENT_REQUIRED');

  const preregistrationRef = methodLabPreregistrationId(experimentId);
  const db = createServiceSupabaseClient();
  const existing = await db.from('sfi_lab_analyses')
    .select('id,owner_id,raw_analysis,created_at')
    .eq('id', preregistrationRef)
    .eq('owner_id', ownerId)
    .maybeSingle();
  if (existing.error) throw new Error(`METHOD_LAB_PREREGISTRATION_READ_FAILED:${existing.error.message}`);
  if (!existing.data) throw new Error('METHOD_LAB_PREREGISTRATION_OWNER_SCOPE_REQUIRED');

  const raw = record(existing.data.raw_analysis);
  if (raw.phase !== 'PREREGISTERED' || raw.contractVersion !== METHOD_LAB_EXPERIMENT_CONTRACT_VERSION) {
    throw new Error('METHOD_LAB_PREREGISTRATION_PERSISTED_CONTRACT_INVALID');
  }
  const preregistration = assertMethodLabExperimentPreregistration(raw.preregistration as MethodLabExperimentPreregistration);
  if (preregistration.experimentId !== experimentId) throw new Error('METHOD_LAB_PREREGISTRATION_EXPERIMENT_ID_MISMATCH');
  const definitionHash = hashMethodLabPreregistration(preregistration);
  if (raw.definitionHash !== definitionHash) throw new Error('METHOD_LAB_PREREGISTRATION_IMMUTABILITY_CHECK_FAILED');

  return {
    preregistrationRef,
    definitionHash,
    preregistration,
    createdAt: String(existing.data.created_at ?? preregistration.preregisteredAt),
  };
}

export async function readInstitutionalMethodLabExperimentPreregistration(experimentIdInput: string) {
  const experimentId = experimentIdInput.trim();
  if (!experimentId) throw new Error('METHOD_LAB_PREREGISTRATION_EXPERIMENT_REQUIRED');
  const preregistrationRef = methodLabPreregistrationId(experimentId);
  const db = createServiceSupabaseClient();
  const existing = await db.from('sfi_lab_analyses')
    .select('id,owner_id,raw_analysis,created_at')
    .eq('id', preregistrationRef)
    .is('owner_id', null)
    .maybeSingle();
  if (existing.error) throw new Error(`METHOD_LAB_PREREGISTRATION_READ_FAILED:${existing.error.message}`);
  if (!existing.data) return null;
  const raw = record(existing.data.raw_analysis);
  if (raw.phase !== 'PREREGISTERED' || raw.contractVersion !== METHOD_LAB_EXPERIMENT_CONTRACT_VERSION) {
    throw new Error('METHOD_LAB_PREREGISTRATION_PERSISTED_CONTRACT_INVALID');
  }
  const preregistration = assertMethodLabExperimentPreregistration(raw.preregistration as MethodLabExperimentPreregistration);
  if (preregistration.experimentId !== experimentId) throw new Error('METHOD_LAB_PREREGISTRATION_EXPERIMENT_ID_MISMATCH');
  const definitionHash = hashMethodLabPreregistration(preregistration);
  if (raw.definitionHash !== definitionHash) throw new Error('METHOD_LAB_PREREGISTRATION_IMMUTABILITY_CHECK_FAILED');
  return {
    preregistrationRef,
    definitionHash,
    preregistration,
    createdAt: String(existing.data.created_at ?? preregistration.preregisteredAt),
  };
}

export async function readInstitutionalMethodLabExperimentRun(runIdInput: string) {
  const runId = runIdInput.trim();
  if (!runId) throw new Error('METHOD_LAB_RUN_ID_REQUIRED');
  const runRef = methodLabRunId(runId);
  const db = createServiceSupabaseClient();
  const found = await db.from('sfi_lab_analyses')
    .select('id,owner_id,source,raw_analysis,created_at')
    .eq('id', runRef)
    .is('owner_id', null)
    .maybeSingle();
  if (found.error) throw new Error(`METHOD_LAB_RUN_READ_FAILED:${found.error.message}`);
  if (!found.data) return null;
  const raw = record(found.data.raw_analysis);
  return { runRef, raw, createdAt: String(found.data.created_at ?? '') };
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

export function methodLabReturnId(runId: string) {
  return deterministicAnalysisId('return', runId);
}

export async function persistMethodLabRealityReturn(input: {
  experimentId: string;
  runId: string;
  ownerId: string;
  realityReturn: NonNullable<MethodLabExperimentRun['artifacts']['CONTRAST']['realityReturn']>;
  contrastPayload: Record<string, unknown>;
}) {
  const ownerId = input.ownerId.trim();
  if (!ownerId) throw new Error('METHOD_LAB_RETURN_OWNER_REQUIRED');
  const prereg = await readOwnedMethodLabExperimentPreregistration({ experimentId: input.experimentId, ownerId });
  const runRef = methodLabRunId(input.runId.trim());
  const db = createServiceSupabaseClient();
  const found = await db.from('sfi_lab_analyses').select('id,owner_id,source,raw_analysis').eq('id', runRef).eq('owner_id', ownerId).maybeSingle();
  if (found.error) throw new Error(`METHOD_LAB_RETURN_RUN_READ_FAILED:${found.error.message}`);
  if (!found.data) throw new Error('METHOD_LAB_RETURN_RUN_OWNER_SCOPE_REQUIRED');
  if (String(found.data.source ?? '') !== prereg.preregistrationRef) throw new Error('METHOD_LAB_RETURN_PREREGISTRATION_REF_MISMATCH');
  const raw = record(found.data.raw_analysis);
  const original = assertMethodLabExperimentRun(prereg.preregistration, record(raw.run) as MethodLabExperimentRun);
  if (original.artifacts.EXECUTED.runId !== input.runId) throw new Error('METHOD_LAB_RETURN_RUN_ID_MISMATCH');
  if (original.artifacts.CONTRAST.status !== 'PENDING_RETURN') throw new Error('METHOD_LAB_RETURN_RUN_NOT_PENDING');
  const contrasted: MethodLabExperimentRun = {
    ...original,
    artifacts: {
      ...original.artifacts,
      CONTRAST: { status: 'AVAILABLE', payload: input.contrastPayload, realityReturn: input.realityReturn },
    },
  };
  const checked = assertMethodLabExperimentRun(prereg.preregistration, contrasted);
  const analysisId = methodLabReturnId(input.runId);
  const persisted = await db.from('sfi_lab_analyses').insert({
    id: analysisId,
    owner_id: ownerId,
    mode: 'experiment_return_contrast',
    source: runRef,
    data_mode: 'OBSERVED',
    systems: [prereg.preregistration.POPULATION_SYSTEM.ref],
    variables: prereg.preregistration.EXPECTED_SIGNAL.measures,
    recommendations: [],
    limitations: checked.artifacts.LIMITATIONS,
    raw_analysis: {
      phase: 'CONTRAST_AVAILABLE',
      contractVersion: METHOD_LAB_EXPERIMENT_CONTRACT_VERSION,
      preregistrationRef: prereg.preregistrationRef,
      sourceRunRef: runRef,
      sourceResultHash: original.artifacts.RESULT.resultHash,
      run: checked,
      canonicalMutation: false,
      returnBoundary: 'OBSERVED RETURN is appended as a new immutable contrast record; the executed run is never rewritten.',
    },
  }).select('id,created_at').single();
  if (persisted.error || !persisted.data?.id) throw new Error(`METHOD_LAB_RETURN_PERSIST_FAILED:${persisted.error?.message ?? 'unknown'}`);
  return { ok: true as const, analysisId: String(persisted.data.id), runId: input.runId, sourceRunRef: runRef, resultHash: original.artifacts.RESULT.resultHash, createdAt: String(persisted.data.created_at ?? input.realityReturn.observedAt) };
}

export async function persistInstitutionalMethodLabRealityReturn(input: {
  experimentId: string;
  runId: string;
  realityReturn: NonNullable<MethodLabExperimentRun['artifacts']['CONTRAST']['realityReturn']>;
  contrastPayload: Record<string, unknown>;
}) {
  const prereg = await readInstitutionalMethodLabExperimentPreregistration(input.experimentId);
  if (!prereg) throw new Error('METHOD_LAB_INSTITUTIONAL_PREREGISTRATION_REQUIRED');
  const runRef = methodLabRunId(input.runId.trim());
  const contrastRef = methodLabReturnId(input.runId.trim());
  const db = createServiceSupabaseClient();
  const prior = await db.from('sfi_lab_analyses')
    .select('id,raw_analysis,created_at')
    .eq('id', contrastRef)
    .is('owner_id', null)
    .maybeSingle();
  if (prior.error) throw new Error(`METHOD_LAB_INSTITUTIONAL_RETURN_READ_FAILED:${prior.error.message}`);
  if (prior.data) {
    return { ok:true as const, analysisId:String(prior.data.id), runId:input.runId, sourceRunRef:runRef, alreadyPersisted:true as const, createdAt:String(prior.data.created_at ?? input.realityReturn.observedAt) };
  }

  const found = await db.from('sfi_lab_analyses')
    .select('id,owner_id,source,raw_analysis')
    .eq('id', runRef)
    .is('owner_id', null)
    .maybeSingle();
  if (found.error) throw new Error(`METHOD_LAB_INSTITUTIONAL_RETURN_RUN_READ_FAILED:${found.error.message}`);
  if (!found.data) throw new Error('METHOD_LAB_INSTITUTIONAL_RETURN_RUN_REQUIRED');
  if (String(found.data.source ?? '') !== prereg.preregistrationRef) throw new Error('METHOD_LAB_INSTITUTIONAL_RETURN_PREREGISTRATION_REF_MISMATCH');
  const raw = record(found.data.raw_analysis);
  const original = assertMethodLabExperimentRun(prereg.preregistration, record(raw.run) as MethodLabExperimentRun);
  if (original.artifacts.EXECUTED.runId !== input.runId) throw new Error('METHOD_LAB_INSTITUTIONAL_RETURN_RUN_ID_MISMATCH');
  if (original.artifacts.CONTRAST.status !== 'PENDING_RETURN') throw new Error('METHOD_LAB_INSTITUTIONAL_RETURN_RUN_NOT_PENDING');

  const contrasted: MethodLabExperimentRun = {
    ...original,
    artifacts: {
      ...original.artifacts,
      CONTRAST: { status:'AVAILABLE', payload:input.contrastPayload, realityReturn:input.realityReturn },
    },
  };
  const checked = assertMethodLabExperimentRun(prereg.preregistration, contrasted);
  const persisted = await db.from('sfi_lab_analyses').insert({
    id: contrastRef,
    owner_id: null,
    mode: 'experiment_return_contrast',
    source: runRef,
    data_mode: 'OBSERVED',
    systems: [prereg.preregistration.POPULATION_SYSTEM.ref],
    variables: prereg.preregistration.EXPECTED_SIGNAL.measures,
    recommendations: [],
    limitations: checked.artifacts.LIMITATIONS,
    raw_analysis: {
      phase:'CONTRAST_AVAILABLE',
      contractVersion:METHOD_LAB_EXPERIMENT_CONTRACT_VERSION,
      preregistrationRef:prereg.preregistrationRef,
      sourceRunRef:runRef,
      sourceResultHash:original.artifacts.RESULT.resultHash,
      run:checked,
      canonicalMutation:false,
      returnBoundary:'OBSERVED RETURN is appended from evidence-linked post-T0 reality. The preregistration and simulation run remain immutable.',
    },
  }).select('id,created_at').single();
  if (persisted.error || !persisted.data?.id) throw new Error(`METHOD_LAB_INSTITUTIONAL_RETURN_PERSIST_FAILED:${persisted.error?.message ?? 'unknown'}`);
  return {
    ok:true as const,
    analysisId:String(persisted.data.id),
    runId:input.runId,
    sourceRunRef:runRef,
    resultHash:original.artifacts.RESULT.resultHash,
    alreadyPersisted:false as const,
    createdAt:String(persisted.data.created_at ?? input.realityReturn.observedAt),
  };
}

export async function recordInstitutionalMethodLabContrastLearningCandidate(input: {
  experimentId: string;
  runId: string;
  actorId: string;
  tenantId?: string;
}) {
  const actorId = input.actorId.trim();
  const tenantId = (input.tenantId ?? 'sfi').trim();
  if (!actorId || !tenantId) throw new Error('METHOD_LAB_INSTITUTIONAL_LEARNING_ACTOR_AND_TENANT_REQUIRED');
  const prereg = await readInstitutionalMethodLabExperimentPreregistration(input.experimentId);
  if (!prereg) throw new Error('METHOD_LAB_INSTITUTIONAL_LEARNING_PREREGISTRATION_REQUIRED');
  const db = createServiceSupabaseClient();
  const contrastRef = methodLabReturnId(input.runId.trim());
  const found = await db.from('sfi_lab_analyses')
    .select('id,owner_id,raw_analysis,created_at')
    .eq('id', contrastRef)
    .is('owner_id', null)
    .maybeSingle();
  if (found.error) throw new Error(`METHOD_LAB_INSTITUTIONAL_LEARNING_CONTRAST_READ_FAILED:${found.error.message}`);
  if (!found.data) throw new Error('METHOD_LAB_INSTITUTIONAL_LEARNING_CONTRAST_REQUIRED');
  const raw = record(found.data.raw_analysis);
  const run = assertMethodLabExperimentRun(prereg.preregistration, record(raw.run) as MethodLabExperimentRun);
  if (run.artifacts.CONTRAST.status !== 'AVAILABLE' || !run.artifacts.CONTRAST.realityReturn) throw new Error('METHOD_LAB_INSTITUTIONAL_LEARNING_OBSERVED_RETURN_REQUIRED');
  const realityReturn = run.artifacts.CONTRAST.realityReturn;
  const history = {
    cycleId: `method-lab:${input.experimentId}:${input.runId}`,
    cognitiveRuns: [{ event_id:contrastRef, payload:{ cycleId:`method-lab:${input.experimentId}:${input.runId}` } }],
    returns: [{ event_id:contrastRef, payload:{ outcome:realityReturn.outcome, evidenceRefs:realityReturn.evidenceRefs } }],
    returnContrasts: [{ event_id:contrastRef, payload:{ status:'AVAILABLE', resultHash:run.artifacts.RESULT.resultHash } }],
    closures: [],
    aiSyntheses: [],
    events: [],
  };
  return recordUniversalLearningCandidate({
    history,
    requested: {
      classification:'OPERATIONAL_EVIDENCE',
      learningCandidate: {
        source:'METHOD_LAB_CONTRAST',
        experimentId:input.experimentId,
        runId:input.runId,
        methodId:prereg.preregistration.METHOD.methodId,
        resultHash:run.artifacts.RESULT.resultHash,
        contrastRef,
      },
    },
    actorId,
    tenantId,
    closureEventId:null,
  });
}

export async function recordMethodLabContrastLearningCandidate(input: {
  experimentId: string;
  runId: string;
  ownerId: string;
  tenantId: string;
}) {
  const ownerId = input.ownerId.trim();
  const tenantId = input.tenantId.trim();
  if (!ownerId || !tenantId) throw new Error('METHOD_LAB_LEARNING_ACTOR_AND_TENANT_REQUIRED');
  const prereg = await readOwnedMethodLabExperimentPreregistration({ experimentId: input.experimentId, ownerId });
  const db = createServiceSupabaseClient();
  const contrastRef = methodLabReturnId(input.runId.trim());
  const found = await db.from('sfi_lab_analyses').select('id,owner_id,raw_analysis,created_at').eq('id', contrastRef).eq('owner_id', ownerId).maybeSingle();
  if (found.error) throw new Error(`METHOD_LAB_LEARNING_CONTRAST_READ_FAILED:${found.error.message}`);
  if (!found.data) throw new Error('METHOD_LAB_LEARNING_CONTRAST_REQUIRED');
  const raw = record(found.data.raw_analysis);
  const run = assertMethodLabExperimentRun(prereg.preregistration, record(raw.run) as MethodLabExperimentRun);
  if (run.artifacts.CONTRAST.status !== 'AVAILABLE' || !run.artifacts.CONTRAST.realityReturn) throw new Error('METHOD_LAB_LEARNING_OBSERVED_RETURN_REQUIRED');
  const realityReturn = run.artifacts.CONTRAST.realityReturn;
  const history = {
    cycleId: `method-lab:${input.experimentId}:${input.runId}`,
    cognitiveRuns: [{ event_id: contrastRef, payload: { cycleId: `method-lab:${input.experimentId}:${input.runId}` } }],
    returns: [{ event_id: contrastRef, payload: { outcome: realityReturn.outcome, evidenceRefs: realityReturn.evidenceRefs } }],
    returnContrasts: [],
    closures: [],
    aiSyntheses: [],
    events: [],
  };
  return recordUniversalLearningCandidate({
    history,
    requested: {
      classification: 'OPERATIONAL_EVIDENCE',
      learningCandidate: {
        source: 'METHOD_LAB_CONTRAST',
        experimentId: input.experimentId,
        runId: input.runId,
        methodId: prereg.preregistration.METHOD.methodId,
        resultHash: run.artifacts.RESULT.resultHash,
        contrastRef,
      },
    },
    actorId: ownerId,
    tenantId,
    closureEventId: null,
  });
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

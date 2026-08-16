import 'server-only';

import { createHash } from 'node:crypto';
import { getLlmProviderStatus } from '@/lib/ai/providerRouter';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { canonicalJson } from './decisionCommitment';

type Row = Record<string, unknown>;

export const SFI_DT_PROTOCOL_VERSION = 'SFI-DT-1.0' as const;
export const SFI_DT_INSTRUMENT_BASE_COMMIT = '3b7ce699e2654ed1fb551498cfeaad37731f6f88' as const;
export const SFI_DT_INSTRUMENT_SOURCE_HASH = '0000000000000000000000000000000000000000000000000000000000000000' as const;
export const SFI_DT_CONFIRMATORY_MODEL = {
  provider: 'groq',
  expectedModel: 'openai/gpt-oss-20b',
  maxTokens: 1000,
  temperature: 0.2,
} as const;

export const SFI_DT_BLIND_SYSTEM_PROMPT_SHA256 = '99b9f89a95238a9a0195fdbc1ec68d40860128fce2ebde9cd69436012b44154d' as const;
export const SFI_DT_BLIND_PROMPT_TEMPLATE_SHA256 = '1bfaf23ecdf14ce105c3daa75c48c23a396a34ae092eb72cfeca962cb285d887' as const;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function runtimeCommitSha() {
  const value = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? null;
  if (!value || !/^[0-9a-f]{40}$/i.test(value)) throw new Error('DT_INSTRUMENT_RUNTIME_COMMIT_UNAVAILABLE');
  return value.toLowerCase();
}

export function assertDecisionTransferInstrumentRevision() {
  if (!/^[0-9a-f]{64}$/i.test(SFI_DT_INSTRUMENT_SOURCE_HASH) || /^0{64}$/.test(SFI_DT_INSTRUMENT_SOURCE_HASH)) {
    throw new Error('DT_INSTRUMENT_SOURCE_HASH_NOT_FROZEN');
  }
  return {
    instrumentSourceHash: SFI_DT_INSTRUMENT_SOURCE_HASH,
    runtimeCommit: runtimeCommitSha(),
  };
}

export function applyDecisionTransferExperimentFreeze(value: unknown) {
  const source = record(value);
  if (source.contextSource !== 'CANONICAL_MATERIALIZED') return value;

  const requestedProvider = text(source.preferredProvider);
  if (requestedProvider && requestedProvider !== SFI_DT_CONFIRMATORY_MODEL.provider) {
    throw new Error(`DT_MODEL_PROVIDER_CONTRACT_MISMATCH:${requestedProvider}->${SFI_DT_CONFIRMATORY_MODEL.provider}`);
  }
  const requestedMaxTokens = typeof source.maxTokens === 'number' ? source.maxTokens : SFI_DT_CONFIRMATORY_MODEL.maxTokens;
  if (requestedMaxTokens !== SFI_DT_CONFIRMATORY_MODEL.maxTokens) {
    throw new Error(`DT_MODEL_MAX_TOKENS_CONTRACT_MISMATCH:${requestedMaxTokens}->${SFI_DT_CONFIRMATORY_MODEL.maxTokens}`);
  }
  if (source.strictProvider === false) throw new Error('DT_MODEL_STRICT_PROVIDER_REQUIRED');

  return {
    ...source,
    preferredProvider: SFI_DT_CONFIRMATORY_MODEL.provider,
    strictProvider: true,
    maxTokens: SFI_DT_CONFIRMATORY_MODEL.maxTokens,
  };
}

export function assertDecisionTransferModelPreflight() {
  const instrumentRevision = assertDecisionTransferInstrumentRevision();
  const provider = getLlmProviderStatus().find((item) => item.id === SFI_DT_CONFIRMATORY_MODEL.provider);
  if (!provider?.available) {
    throw new Error(`DT_MODEL_PROVIDER_UNAVAILABLE:${SFI_DT_CONFIRMATORY_MODEL.provider}`);
  }
  if (provider.model !== SFI_DT_CONFIRMATORY_MODEL.expectedModel) {
    throw new Error(`DT_MODEL_EXPECTED_MODEL_MISMATCH:${SFI_DT_CONFIRMATORY_MODEL.expectedModel}->${provider.model}`);
  }
  return {
    protocolVersion: SFI_DT_PROTOCOL_VERSION,
    provider: provider.id,
    expectedModel: SFI_DT_CONFIRMATORY_MODEL.expectedModel,
    configuredModel: provider.model,
    maxTokens: SFI_DT_CONFIRMATORY_MODEL.maxTokens,
    generationConfig: { temperature: SFI_DT_CONFIRMATORY_MODEL.temperature },
    systemPromptHash: SFI_DT_BLIND_SYSTEM_PROMPT_SHA256,
    promptTemplateHash: SFI_DT_BLIND_PROMPT_TEMPLATE_SHA256,
    instrumentBaseCommit: SFI_DT_INSTRUMENT_BASE_COMMIT,
    ...instrumentRevision,
  };
}

export async function bindDecisionTransferModelContract(input: {
  blindRunId: string;
  actualProvider: string;
  actualModel: string;
}) {
  if (input.actualProvider !== SFI_DT_CONFIRMATORY_MODEL.provider) {
    throw new Error(`DT_MODEL_ACTUAL_PROVIDER_MISMATCH:${SFI_DT_CONFIRMATORY_MODEL.provider}->${input.actualProvider}`);
  }
  if (input.actualModel !== SFI_DT_CONFIRMATORY_MODEL.expectedModel) {
    throw new Error(`DT_MODEL_ACTUAL_MODEL_MISMATCH:${SFI_DT_CONFIRMATORY_MODEL.expectedModel}->${input.actualModel}`);
  }

  const instrumentRevision = assertDecisionTransferInstrumentRevision();
  const db = createServiceSupabaseClient();
  const read = await db.from('sfi_cognitive_twin_runs')
    .select('id,role,status,input_snapshot')
    .eq('id', input.blindRunId)
    .maybeSingle();
  if (read.error || !read.data) throw new Error(`DT_MODEL_BIND_RUN_NOT_FOUND:${read.error?.message ?? input.blindRunId}`);
  if (read.data.role !== 'DECISION_TRANSFER_BLIND_RECONSTRUCTOR' || read.data.status !== 'EVIDENCE_PENDING') {
    throw new Error(`DT_MODEL_BIND_RUN_STATE_INVALID:${read.data.role}:${read.data.status}`);
  }

  const snapshot = record(read.data.input_snapshot);
  const contractBase = {
    protocolVersion: SFI_DT_PROTOCOL_VERSION,
    provider: SFI_DT_CONFIRMATORY_MODEL.provider,
    expectedModel: SFI_DT_CONFIRMATORY_MODEL.expectedModel,
    actualModel: input.actualModel,
    maxTokens: SFI_DT_CONFIRMATORY_MODEL.maxTokens,
    generationConfig: { temperature: SFI_DT_CONFIRMATORY_MODEL.temperature },
    systemPromptHash: SFI_DT_BLIND_SYSTEM_PROMPT_SHA256,
    promptTemplateHash: SFI_DT_BLIND_PROMPT_TEMPLATE_SHA256,
    instrumentBaseCommit: SFI_DT_INSTRUMENT_BASE_COMMIT,
    instrumentSourceHash: instrumentRevision.instrumentSourceHash,
    runtimeCommit: instrumentRevision.runtimeCommit,
  };
  const modelContract = {
    ...contractBase,
    contractHash: sha256(canonicalJson(contractBase)),
  };

  const update = await db.from('sfi_cognitive_twin_runs').update({
    input_snapshot: { ...snapshot, experimentalFreeze: modelContract },
  }).eq('id', input.blindRunId).eq('status', 'EVIDENCE_PENDING');
  if (update.error) {
    await db.from('sfi_cognitive_twin_runs').delete().eq('id', input.blindRunId).eq('status', 'EVIDENCE_PENDING');
    throw new Error(`DT_MODEL_BIND_FAILED:${update.error.message}`);
  }
  return modelContract;
}

import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export type SfiRecord = Record<string, any>;

export type SfiReadResult<T> = {
  ok: boolean;
  data: T;
  source: string;
  degraded?: boolean;
  error?: string;
};

export function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    return [record.message, record.details, record.hint, record.code]
      .filter((item): item is string => typeof item === 'string' && item.length > 0)
      .join(' | ') || fallback;
  }
  return typeof error === 'string' && error.length > 0 ? error : fallback;
}

export function asRecord(value: unknown): SfiRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as SfiRecord : {};
}

export function textValue(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

export function numericValue(value: unknown, fallback: number | null = null) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return fallback;
}

const SFI_READ_TIMEOUT_MS = Number(process.env.SFI_OPERATIONAL_READ_TIMEOUT_MS ?? 1800);

function createReadAbortController() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SFI_READ_TIMEOUT_MS);
  return { controller, timeout };
}

export async function readSingleFromView(view: string): Promise<SfiReadResult<SfiRecord | null>> {
  const { controller, timeout } = createReadAbortController();
  try {
    const supabase = createServiceSupabaseClient();
    const query = supabase.from(view).select('*').limit(1).maybeSingle();
    const executable = 'abortSignal' in query
      ? (query as typeof query & { abortSignal: (signal: AbortSignal) => typeof query }).abortSignal(controller.signal)
      : query;
    const { data, error } = await executable;
    if (error) throw error;
    return { ok: true, data: data ?? null, source: view };
  } catch (error) {
    return {
      ok: false,
      data: null,
      source: view,
      degraded: true,
      error: errorMessage(error, `${view}_read_failed`),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function readListFromView(view: string, limit = 50): Promise<SfiReadResult<SfiRecord[]>> {
  const { controller, timeout } = createReadAbortController();
  try {
    const supabase = createServiceSupabaseClient();
    const query = supabase.from(view).select('*').limit(limit);
    const executable = 'abortSignal' in query
      ? (query as typeof query & { abortSignal: (signal: AbortSignal) => typeof query }).abortSignal(controller.signal)
      : query;
    const { data, error } = await executable;
    if (error) throw error;
    return { ok: true, data: data ?? [], source: view };
  } catch (error) {
    return {
      ok: false,
      data: [],
      source: view,
      degraded: true,
      error: errorMessage(error, `${view}_read_failed`),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function readOperationalConsoleState() {
  const [operationalCycle, stability, pipelineLoss, recoveryQueue, worldSpect, scoreFriction, evidenceMap, closedLoop, attractor, alignmentQueue] =
    await Promise.all([
      readSingleFromView('vw_sfi_operational_cycle'),
      readSingleFromView('vw_sfi_stability'),
      readSingleFromView('vw_sfi_pipeline_loss'),
      readListFromView('vw_sfi_execution_recovery_queue', 25),
      readSingleFromView('vw_worldspect_real'),
      readSingleFromView('vw_scorefriction_real'),
      readListFromView('vw_sfi_evidence_map', 25),
      readSingleFromView('vw_sfi_closed_loop_state'),
      readSingleFromView('sfi_declared_attractors'),
      readListFromView('vw_sfi_attractor_alignment_queue', 25),
    ]);

  return {
    ok: [
      operationalCycle,
      stability,
      pipelineLoss,
      recoveryQueue,
      worldSpect,
      scoreFriction,
      evidenceMap,
      closedLoop,
      attractor,
      alignmentQueue,
    ].every((item) => item.ok),
    operationalCycle,
    stability,
    pipelineLoss,
    recoveryQueue,
    worldSpect,
    scoreFriction,
    evidenceMap,
    closedLoop,
    attractor,
    alignmentQueue,
  };
}

export function inferAlignment(input: {
  proposal: SfiRecord;
  attractor: SfiRecord | null;
  body?: SfiRecord;
}) {
  const proposalText = [
    input.proposal.title,
    input.proposal.objective,
    input.proposal.description,
    JSON.stringify(input.proposal.expected_field_delta ?? {}),
  ].filter(Boolean).join(' ').toLowerCase();
  const attractorText = [
    input.attractor?.title,
    input.attractor?.desired_future_state,
    JSON.stringify(input.attractor?.success_markers ?? []),
  ].filter(Boolean).join(' ').toLowerCase();
  const body = input.body ?? {};
  const manualStatus = textValue(body.recommended_status);

  if (!input.attractor) {
    return {
      recommended_status: 'request_attractor',
      recommendation: 'Declare active attractor before recommending execution.',
      rationale: 'missing active attractor',
      alignment_score: null,
      evidence_score: null,
      regime_fit_score: null,
      execution_value_score: null,
      recovery_cost_score: null,
      risk_score: null,
    };
  }

  if (!proposalText.trim()) {
    return {
      recommended_status: 'request_evidence',
      recommendation: 'Request evidence because proposal objective is missing.',
      rationale: 'not enough trace',
      alignment_score: 0,
      evidence_score: 0,
      regime_fit_score: null,
      execution_value_score: null,
      recovery_cost_score: null,
      risk_score: null,
    };
  }

  const attractorTerms = new Set(attractorText.split(/[^a-z0-9_]+/).filter((term) => term.length > 4));
  const proposalTerms = new Set(proposalText.split(/[^a-z0-9_]+/).filter((term) => term.length > 4));
  const overlap = [...proposalTerms].filter((term) => attractorTerms.has(term)).length;
  const alignmentScore = attractorTerms.size === 0 ? 0.35 : Math.min(1, overlap / Math.max(3, attractorTerms.size));
  const evidenceScore = proposalText.includes('evidence') || proposalText.includes('evidencia') ? 0.75 : 0.35;
  const riskScore = textValue(input.proposal.risk_level, 'medium') === 'high' ? 0.7 : 0.35;
  const recommendedStatus =
    manualStatus ||
    (alignmentScore >= 0.45 && evidenceScore >= 0.5
      ? 'execute_now'
      : alignmentScore >= 0.25
        ? 'reformulate'
        : 'request_evidence');

  return {
    recommended_status: recommendedStatus,
    recommendation:
      textValue(body.recommendation) ||
      (recommendedStatus === 'execute_now'
        ? `Create execution ledger record for proposal ${input.proposal.id}. Required evidence: proposal trace and active attractor markers. Verification window: ${textValue(input.attractor.horizon, 'next review cycle')}.`
        : recommendedStatus === 'reformulate'
          ? `Reformulate proposal ${input.proposal.id} so objective, required evidence and expected effect explicitly serve ${input.attractor.title}.`
          : `Request evidence for proposal ${input.proposal.id} before execution because attractor fit is not sufficiently traced.`),
    alternative_perturbation: textValue(body.alternative_perturbation, ''),
    rationale:
      textValue(body.rationale) ||
      `alignment=${alignmentScore.toFixed(2)} evidence=${evidenceScore.toFixed(2)} risk=${riskScore.toFixed(2)}`,
    alignment_score: alignmentScore,
    evidence_score: evidenceScore,
    regime_fit_score: numericValue(body.regime_fit_score, null),
    execution_value_score: numericValue(body.execution_value_score, alignmentScore),
    recovery_cost_score: numericValue(body.recovery_cost_score, riskScore),
    risk_score: numericValue(body.risk_score, riskScore),
  };
}

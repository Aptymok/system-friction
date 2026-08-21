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

export async function readLatestProposalAlignments(proposalIds: string[]): Promise<SfiReadResult<SfiRecord[]>> {
  const ids = [...new Set(proposalIds.map((item) => item.trim()).filter(Boolean))];
  if (ids.length === 0) return { ok: true, data: [], source: 'sfi_proposal_alignment' };

  const { controller, timeout } = createReadAbortController();
  try {
    const supabase = createServiceSupabaseClient();
    const query = supabase
      .from('sfi_proposal_alignment')
      .select('*')
      .in('proposal_id', ids)
      .order('created_at', { ascending: false })
      .limit(Math.max(25, ids.length * 5));
    const executable = 'abortSignal' in query
      ? (query as typeof query & { abortSignal: (signal: AbortSignal) => typeof query }).abortSignal(controller.signal)
      : query;
    const { data, error } = await executable;
    if (error) throw error;

    const byProposal = new Map<string, SfiRecord>();
    for (const row of data ?? []) {
      const proposalId = textValue(row.proposal_id);
      if (proposalId && !byProposal.has(proposalId)) byProposal.set(proposalId, row);
    }

    return { ok: true, data: [...byProposal.values()], source: 'sfi_proposal_alignment' };
  } catch (error) {
    return {
      ok: false,
      data: [],
      source: 'sfi_proposal_alignment',
      degraded: true,
      error: errorMessage(error, 'sfi_proposal_alignment_read_failed'),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function readLatestProposalAlignment(proposalId: string | null): Promise<SfiReadResult<SfiRecord | null>> {
  const id = textValue(proposalId);
  if (!id) return { ok: true, data: null, source: 'sfi_proposal_alignment' };
  const result = await readLatestProposalAlignments([id]);
  return { ...result, data: result.data[0] ?? null };
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
    ok: [operationalCycle, stability, pipelineLoss, recoveryQueue, worldSpect, scoreFriction, evidenceMap, closedLoop, attractor, alignmentQueue].every((item) => item.ok),
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

/**
 * Persists an alignment assessment without inventing scores from lexical overlap.
 * If no evidence-backed assessment is supplied, the only valid output is a request
 * for evidence. Numeric scores remain null unless they are explicitly supplied by
 * an assessed source.
 */
export function buildAlignmentAssessment(input: {
  proposal: SfiRecord;
  attractor: SfiRecord | null;
  body?: SfiRecord;
}) {
  const body = input.body ?? {};
  const proposalObjective = textValue(input.proposal.objective, textValue(input.proposal.description));

  if (!input.attractor) {
    return {
      recommended_status: 'request_attractor',
      recommendation: 'Declare an active attractor before assessing proposal alignment.',
      rationale: 'No active attractor exists.',
      alignment_score: null,
      evidence_score: null,
      regime_fit_score: null,
      execution_value_score: null,
      recovery_cost_score: null,
      risk_score: null,
    };
  }

  if (!proposalObjective) {
    return {
      recommended_status: 'request_evidence',
      recommendation: 'Record the proposal objective and supporting evidence before alignment assessment.',
      rationale: 'Proposal objective is missing.',
      alignment_score: null,
      evidence_score: null,
      regime_fit_score: null,
      execution_value_score: null,
      recovery_cost_score: null,
      risk_score: null,
    };
  }

  const recommendedStatus = textValue(body.recommended_status);
  const recommendation = textValue(body.recommendation);
  const rationale = textValue(body.rationale);

  if (!recommendedStatus || !recommendation || !rationale) {
    return {
      recommended_status: 'request_evidence',
      recommendation: 'Attach an evidence-backed alignment assessment before execution can be prepared.',
      rationale: 'No assessed alignment was supplied. SFI does not infer alignment from word overlap.',
      alignment_score: null,
      evidence_score: null,
      regime_fit_score: null,
      execution_value_score: null,
      recovery_cost_score: null,
      risk_score: null,
    };
  }

  return {
    recommended_status: recommendedStatus,
    recommendation,
    alternative_perturbation: textValue(body.alternative_perturbation),
    rationale,
    alignment_score: numericValue(body.alignment_score, null),
    evidence_score: numericValue(body.evidence_score, null),
    regime_fit_score: numericValue(body.regime_fit_score, null),
    execution_value_score: numericValue(body.execution_value_score, null),
    recovery_cost_score: numericValue(body.recovery_cost_score, null),
    risk_score: numericValue(body.risk_score, null),
  };
}

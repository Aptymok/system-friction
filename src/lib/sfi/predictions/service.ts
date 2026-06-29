import 'server-only';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { runEvidenceStateAgent, runReturnWindowAgent } from './agents';
import {
  SFI_PREDICTION_EVIDENCE_STATES,
  SFI_PREDICTION_OBSERVATION_STATES,
  type CreateSfiPredictionInput,
  type SfiPredictionEntry,
  type SfiPredictionEvidenceState,
  type SfiPredictionHealth,
  type SfiPredictionObservationState,
  type UpdateSfiPredictionReturnInput,
} from './types';

type ServiceResult<T> =
  | { ok: true; data: T; warnings?: string[] }
  | { ok: false; error: string; status?: number; details?: unknown; blocked?: string[]; warnings?: string[] };

type PredictionClassification = {
  estado_observacion: SfiPredictionObservationState;
  is_predictive_evidence: boolean;
  evidence_state: SfiPredictionEvidenceState;
  prediction_registered_before_perturbation: boolean;
  retrospective_only: boolean;
};

const TABLE = 'sfi_prediction_entries';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function textValue(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function nullableText(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function numberValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function booleanValue(value: unknown) {
  return value === true;
}

function isoOrNull(value: unknown) {
  const text = textValue(value);
  if (!text) return null;
  const time = Date.parse(text);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function serviceClient() {
  try {
    return { ok: true as const, client: createServiceSupabaseClient() };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : 'supabase_service_unavailable',
      blocked: ['supabase_service_unavailable'],
    };
  }
}

function evidenceState(value: unknown): SfiPredictionEvidenceState | null {
  return SFI_PREDICTION_EVIDENCE_STATES.includes(value as SfiPredictionEvidenceState)
    ? value as SfiPredictionEvidenceState
    : null;
}

function observationState(value: unknown): SfiPredictionObservationState | null {
  return SFI_PREDICTION_OBSERVATION_STATES.includes(value as SfiPredictionObservationState)
    ? value as SfiPredictionObservationState
    : null;
}

function hasEvidencePayload(input: {
  ssp_observada?: string | null;
  friccion_respuesta_campo?: string | null;
  resultado_72h?: string | null;
  resultado_7d?: string | null;
  resultado_30d?: string | null;
  resultado_90d?: string | null;
}) {
  return Boolean(
    input.ssp_observada
    || input.friccion_respuesta_campo
    || input.resultado_72h
    || input.resultado_7d
    || input.resultado_30d
    || input.resultado_90d
  );
}

export function normalizeCreatePredictionInput(raw: unknown): ServiceResult<CreateSfiPredictionInput> {
  const record = asRecord(raw);
  const required = {
    case_id: textValue(record.case_id),
    hypothesis_id: textValue(record.hypothesis_id),
    fenotipo_estimado: textValue(record.fenotipo_estimado),
    ep_estado_inicial: textValue(record.ep_estado_inicial),
    ssp_esperada: textValue(record.ssp_esperada),
    perturbacion_tipo: textValue(record.perturbacion_tipo),
    perturbacion_aplicada: textValue(record.perturbacion_aplicada),
    prediccion_explicita: textValue(record.prediccion_explicita),
    probabilidad_estimativa: numberValue(record.probabilidad_estimativa),
  };
  const missing = Object.entries(required)
    .filter(([, value]) => value === null)
    .map(([key]) => key);

  if (missing.length > 0) {
    return { ok: false, error: 'missing_required_prediction_fields', status: 400, details: { missing } };
  }

  if (required.probabilidad_estimativa === null || required.probabilidad_estimativa < 0 || required.probabilidad_estimativa > 1) {
    return { ok: false, error: 'probabilidad_estimativa_out_of_range', status: 400 };
  }

  const perturbationAppliedAt = record.perturbation_applied_at ? isoOrNull(record.perturbation_applied_at) : null;
  if (record.perturbation_applied_at && !perturbationAppliedAt) {
    return { ok: false, error: 'invalid_perturbation_applied_at', status: 400 };
  }

  return {
    ok: true,
    data: {
      case_id: required.case_id!,
      hypothesis_id: required.hypothesis_id!,
      fenotipo_estimado: required.fenotipo_estimado!,
      ep_estado_inicial: required.ep_estado_inicial!,
      ssp_esperada: required.ssp_esperada!,
      perturbacion_tipo: required.perturbacion_tipo!,
      perturbacion_aplicada: required.perturbacion_aplicada!,
      prediccion_explicita: required.prediccion_explicita!,
      probabilidad_estimativa: required.probabilidad_estimativa,
      case_label: nullableText(record.case_label),
      operator_mode: nullableText(record.operator_mode),
      perturbation_applied_at: perturbationAppliedAt,
      friccion_respuesta_campo: nullableText(record.friccion_respuesta_campo),
      ssp_observada: nullableText(record.ssp_observada),
      created_by: nullableText(record.created_by),
    },
  };
}

export function normalizeUpdatePredictionReturnInput(raw: unknown): ServiceResult<UpdateSfiPredictionReturnInput> {
  const record = asRecord(raw);
  const cpDias = record.cp_dias === null || record.cp_dias === undefined || record.cp_dias === ''
    ? null
    : numberValue(record.cp_dias);
  if (record.cp_dias !== undefined && record.cp_dias !== null && record.cp_dias !== '' && cpDias === null) {
    return { ok: false, error: 'invalid_cp_dias', status: 400 };
  }

  const nextEvidenceState = record.evidence_state === undefined ? undefined : evidenceState(record.evidence_state);
  if (record.evidence_state !== undefined && !nextEvidenceState) {
    return { ok: false, error: 'invalid_evidence_state', status: 400 };
  }

  const nextObservationState = record.estado_observacion === undefined ? undefined : observationState(record.estado_observacion);
  if (record.estado_observacion !== undefined && !nextObservationState) {
    return { ok: false, error: 'invalid_estado_observacion', status: 400 };
  }

  return {
    ok: true,
    data: {
      resultado_72h: record.resultado_72h === undefined ? undefined : nullableText(record.resultado_72h),
      resultado_7d: record.resultado_7d === undefined ? undefined : nullableText(record.resultado_7d),
      resultado_30d: record.resultado_30d === undefined ? undefined : nullableText(record.resultado_30d),
      resultado_90d: record.resultado_90d === undefined ? undefined : nullableText(record.resultado_90d),
      ssp_observada: record.ssp_observada === undefined ? undefined : nullableText(record.ssp_observada),
      friccion_respuesta_campo: record.friccion_respuesta_campo === undefined ? undefined : nullableText(record.friccion_respuesta_campo),
      ep_t_registrada: record.ep_t_registrada === undefined ? undefined : nullableText(record.ep_t_registrada),
      cp_dias: record.cp_dias === undefined ? undefined : cpDias,
      fallo_hipotesis: record.fallo_hipotesis === undefined ? undefined : nullableText(record.fallo_hipotesis),
      refinamiento: record.refinamiento === undefined ? undefined : nullableText(record.refinamiento),
      evidence_state: nextEvidenceState ?? undefined,
      estado_observacion: nextObservationState ?? undefined,
    },
  };
}

function predictionEntryFromRow(row: unknown): SfiPredictionEntry {
  const record = asRecord(row);

  return {
    id: textValue(record.id) ?? '',
    case_id: textValue(record.case_id) ?? '',
    hypothesis_id: textValue(record.hypothesis_id) ?? '',
    case_label: nullableText(record.case_label),
    operator_mode: nullableText(record.operator_mode),
    fenotipo_estimado: textValue(record.fenotipo_estimado) ?? '',
    ep_estado_inicial: textValue(record.ep_estado_inicial) ?? '',
    ssp_esperada: textValue(record.ssp_esperada) ?? '',
    ssp_observada: nullableText(record.ssp_observada),
    perturbacion_tipo: textValue(record.perturbacion_tipo) ?? '',
    perturbacion_aplicada: textValue(record.perturbacion_aplicada) ?? '',
    prediccion_explicita: textValue(record.prediccion_explicita) ?? '',
    probabilidad_estimativa: numberValue(record.probabilidad_estimativa) ?? 0,
    friccion_respuesta_campo: nullableText(record.friccion_respuesta_campo),
    resultado_72h: nullableText(record.resultado_72h),
    resultado_7d: nullableText(record.resultado_7d),
    resultado_30d: nullableText(record.resultado_30d),
    resultado_90d: nullableText(record.resultado_90d),
    ep_t_registrada: nullableText(record.ep_t_registrada),
    cp_dias: numberValue(record.cp_dias),
    fallo_hipotesis: nullableText(record.fallo_hipotesis),
    refinamiento: nullableText(record.refinamiento),
    estado_observacion: observationState(record.estado_observacion) ?? 'pendiente',
    prediction_registered_at: textValue(record.prediction_registered_at) ?? '',
    perturbation_applied_at: nullableText(record.perturbation_applied_at),
    is_predictive_evidence: booleanValue(record.is_predictive_evidence),
    evidence_state: evidenceState(record.evidence_state) ?? 'PENDING',
    created_by: nullableText(record.created_by),
    created_at: textValue(record.created_at) ?? '',
    updated_at: textValue(record.updated_at) ?? '',
  };
}

export function classifyPredictionEvidence(entry: {
  prediction_registered_at: string;
  perturbation_applied_at?: string | null;
  ssp_observada?: string | null;
  friccion_respuesta_campo?: string | null;
  resultado_72h?: string | null;
  resultado_7d?: string | null;
  resultado_30d?: string | null;
  resultado_90d?: string | null;
}): PredictionClassification {
  const registeredAt = Date.parse(entry.prediction_registered_at);
  const perturbationAt = entry.perturbation_applied_at ? Date.parse(entry.perturbation_applied_at) : null;
  const predictionRegisteredBeforePerturbation = Number.isFinite(registeredAt)
    && (perturbationAt === null || (Number.isFinite(perturbationAt) && perturbationAt > registeredAt));

  if (predictionRegisteredBeforePerturbation) {
    return {
      estado_observacion: 'registrada_pre_perturbacion',
      is_predictive_evidence: true,
      evidence_state: 'PENDING',
      prediction_registered_before_perturbation: true,
      retrospective_only: false,
    };
  }

  return {
    estado_observacion: 'retrospective_observation',
    is_predictive_evidence: false,
    evidence_state: hasEvidencePayload(entry) ? 'OBSERVED' : 'UNCERTAIN',
    prediction_registered_before_perturbation: false,
    retrospective_only: true,
  };
}

export async function createPredictionEntry(input: CreateSfiPredictionInput): Promise<ServiceResult<SfiPredictionEntry>> {
  const client = serviceClient();
  if (!client.ok) return { ok: false, error: client.error, status: 503, blocked: client.blocked };

  const registeredAt = new Date().toISOString();
  const classification = classifyPredictionEvidence({
    prediction_registered_at: registeredAt,
    perturbation_applied_at: input.perturbation_applied_at ?? null,
    ssp_observada: input.ssp_observada ?? null,
    friccion_respuesta_campo: input.friccion_respuesta_campo ?? null,
  });

  const { data, error } = await client.client
    .from(TABLE)
    .insert({
      case_id: input.case_id,
      hypothesis_id: input.hypothesis_id,
      case_label: input.case_label ?? null,
      operator_mode: input.operator_mode ?? null,
      fenotipo_estimado: input.fenotipo_estimado,
      ep_estado_inicial: input.ep_estado_inicial,
      ssp_esperada: input.ssp_esperada,
      ssp_observada: input.ssp_observada ?? null,
      perturbacion_tipo: input.perturbacion_tipo,
      perturbacion_aplicada: input.perturbacion_aplicada,
      prediccion_explicita: input.prediccion_explicita,
      probabilidad_estimativa: input.probabilidad_estimativa,
      friccion_respuesta_campo: input.friccion_respuesta_campo ?? null,
      estado_observacion: classification.estado_observacion,
      prediction_registered_at: registeredAt,
      perturbation_applied_at: input.perturbation_applied_at ?? null,
      is_predictive_evidence: classification.is_predictive_evidence,
      evidence_state: classification.evidence_state,
      created_by: input.created_by ?? null,
    })
    .select('*')
    .single();

  if (error) return { ok: false, error: 'prediction_insert_failed', status: 400, details: error.message };
  return { ok: true, data: predictionEntryFromRow(data) };
}

export async function listPredictionEntries(options: { limit?: number } = {}): Promise<ServiceResult<{ entries: SfiPredictionEntry[]; count: number | null }>> {
  const client = serviceClient();
  if (!client.ok) return { ok: false, error: client.error, status: 503, blocked: client.blocked };
  const limit = Math.max(1, Math.min(100, options.limit ?? 50));

  const { data, error, count } = await client.client
    .from(TABLE)
    .select('*', { count: 'exact' })
    .order('prediction_registered_at', { ascending: false })
    .limit(limit);

  if (error) return { ok: false, error: 'prediction_list_failed', status: 400, details: error.message };
  return { ok: true, data: { entries: (data ?? []).map(predictionEntryFromRow), count: count ?? null } };
}

export async function getPredictionEntry(hypothesisId: string): Promise<ServiceResult<SfiPredictionEntry>> {
  const client = serviceClient();
  if (!client.ok) return { ok: false, error: client.error, status: 503, blocked: client.blocked };

  const { data, error } = await client.client
    .from(TABLE)
    .select('*')
    .eq('hypothesis_id', hypothesisId)
    .maybeSingle();

  if (error) return { ok: false, error: 'prediction_lookup_failed', status: 400, details: error.message };
  if (!data) return { ok: false, error: 'prediction_not_found', status: 404 };
  return { ok: true, data: predictionEntryFromRow(data) };
}

export async function updatePredictionReturn(hypothesisId: string, updates: UpdateSfiPredictionReturnInput): Promise<ServiceResult<SfiPredictionEntry>> {
  const client = serviceClient();
  if (!client.ok) return { ok: false, error: client.error, status: 503, blocked: client.blocked };

  const patch = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined)
  );

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: 'empty_prediction_return_update', status: 400 };
  }

  const { data, error } = await client.client
    .from(TABLE)
    .update(patch)
    .eq('hypothesis_id', hypothesisId)
    .select('*')
    .single();

  if (error) return { ok: false, error: 'prediction_return_update_failed', status: 400, details: error.message };
  return { ok: true, data: predictionEntryFromRow(data) };
}

export async function getPredictionRegistryHealth(): Promise<SfiPredictionHealth> {
  const client = serviceClient();
  if (!client.ok) {
    return {
      ok: false,
      table_available: false,
      entries_count: null,
      pending_returns_count: null,
      blocked: client.blocked,
      warnings: [client.error],
      agents: {
        evidenceStateAgent: { ok: false, checked: 0, blocked: client.blocked, warnings: [] },
        returnWindowAgent: { ok: false, checked: 0, pending_returns_count: 0, overdue_returns_count: 0, blocked: client.blocked, warnings: [] },
      },
    };
  }

  const countResult = await client.client.from(TABLE).select('id', { count: 'exact', head: true });
  if (countResult.error) {
    return {
      ok: false,
      table_available: false,
      entries_count: null,
      pending_returns_count: null,
      blocked: ['sfi_prediction_entries_unavailable'],
      warnings: [countResult.error.message],
      agents: {
        evidenceStateAgent: { ok: false, checked: 0, blocked: ['sfi_prediction_entries_unavailable'], warnings: [] },
        returnWindowAgent: { ok: false, checked: 0, pending_returns_count: 0, overdue_returns_count: 0, blocked: ['sfi_prediction_entries_unavailable'], warnings: [] },
      },
    };
  }

  const rowsResult = await client.client
    .from(TABLE)
    .select('*')
    .order('prediction_registered_at', { ascending: false })
    .limit(200);

  if (rowsResult.error) {
    return {
      ok: false,
      table_available: true,
      entries_count: countResult.count ?? null,
      pending_returns_count: null,
      blocked: ['sfi_prediction_entries_read_failed'],
      warnings: [rowsResult.error.message],
      agents: {
        evidenceStateAgent: { ok: false, checked: 0, blocked: ['sfi_prediction_entries_read_failed'], warnings: [] },
        returnWindowAgent: { ok: false, checked: 0, pending_returns_count: 0, overdue_returns_count: 0, blocked: ['sfi_prediction_entries_read_failed'], warnings: [] },
      },
    };
  }

  const entries = (rowsResult.data ?? []).map(predictionEntryFromRow);
  const evidenceAgents = entries.map(runEvidenceStateAgent);
  const returnAgents = entries.map((entry) => runReturnWindowAgent(entry));
  const pendingReturnsCount = returnAgents.reduce((total, result) => total + result.pending_count, 0);
  const overdueReturnsCount = returnAgents.reduce((total, result) => total + result.overdue_count, 0);
  const evidenceBlocked = evidenceAgents.flatMap((result) => result.blocked);
  const returnBlocked = returnAgents.flatMap((result) => result.blocked);
  const evidenceWarnings = evidenceAgents.flatMap((result) => result.warnings);
  const returnWarnings = returnAgents.flatMap((result) => result.warnings);
  const blocked = [...new Set([...evidenceBlocked, ...returnBlocked])];
  const warnings = [...new Set([...evidenceWarnings, ...returnWarnings])];

  return {
    ok: blocked.length === 0,
    table_available: true,
    entries_count: countResult.count ?? entries.length,
    pending_returns_count: pendingReturnsCount,
    blocked,
    warnings,
    agents: {
      evidenceStateAgent: {
        ok: evidenceBlocked.length === 0,
        checked: evidenceAgents.length,
        blocked: [...new Set(evidenceBlocked)],
        warnings: [...new Set(evidenceWarnings)],
      },
      returnWindowAgent: {
        ok: returnBlocked.length === 0,
        checked: returnAgents.length,
        pending_returns_count: pendingReturnsCount,
        overdue_returns_count: overdueReturnsCount,
        blocked: [...new Set(returnBlocked)],
        warnings: [...new Set(returnWarnings)],
      },
    },
  };
}

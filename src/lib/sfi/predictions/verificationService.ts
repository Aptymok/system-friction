import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import type {
  CloseSfiPredictionVerificationInput,
  CreateSfiPredictionVerificationInput,
  SfiPredictionVerification,
} from './types';

const TABLE = 'sfi_prediction_verifications';

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

/**
 * Lee todas las verificaciones (una por ventana como mÃ¡ximo, mÃ¡s las
 * SUPERSEDED histÃ³ricas) de una predicciÃ³n.
 */
export async function listVerificationsForPrediction(
  predictionEntryId: string,
): Promise<ServiceResult<SfiPredictionVerification[]>> {
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('prediction_entry_id', predictionEntryId)
      .order('created_at', { ascending: true });

    if (error) return { ok: false, error: error.message };
    return { ok: true, data: (data ?? []) as SfiPredictionVerification[] };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'unknown_verification_read_error' };
  }
}

/**
 * Registra una regla de verificaciÃ³n. R19 exige que esto exista antes de
 * convertir una nota/retorno en verdad cerrada.
 */
export async function createVerificationRule(
  input: CreateSfiPredictionVerificationInput,
): Promise<ServiceResult<SfiPredictionVerification>> {
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        prediction_entry_id: input.prediction_entry_id,
        hypothesis_id: input.hypothesis_id,
        return_window: input.return_window,
        verification_rule: input.verification_rule,
        ground_truth_source_type: input.ground_truth_source_type,
        ground_truth_source_url: input.ground_truth_source_url ?? null,
        ground_truth_source_query: input.ground_truth_source_query ?? null,
        source_quality_tier: input.source_quality_tier,
        verification_state: 'OPEN',
        evaluation_result: 'NOT_EVALUATED',
      })
      .select('*')
      .single();

    if (error) return { ok: false, error: error.message };
    return { ok: true, data: data as SfiPredictionVerification };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'unknown_verification_create_error' };
  }
}

/**
 * Cierra una verificaciÃ³n con resultado lÃ³gico. UNVERIFIABLE tambiÃ©n es cierre:
 * no es lo mismo que DISPUTED. DISPUTED queda reservado para conflicto explÃ­cito
 * entre fuentes.
 */
export async function closeVerification(
  input: CloseSfiPredictionVerificationInput,
): Promise<ServiceResult<SfiPredictionVerification>> {
  try {
    const supabase = createServiceSupabaseClient();

    const { data: existing, error: readError } = await supabase
      .from(TABLE)
      .select('verification_state')
      .eq('id', input.id)
      .single();

    if (readError) return { ok: false, error: readError.message };
    if (existing?.verification_state === 'CLOSED') {
      return {
        ok: false,
        error: 'verification_already_closed_use_supersede_instead',
        status: 409,
      };
    }

    const { data, error } = await supabase
      .from(TABLE)
      .update({
        verification_state: 'CLOSED',
        evaluation_result: input.evaluation_result,
        source_snapshot_hash: input.source_snapshot_hash ?? null,
        source_value: input.source_value ?? null,
        source_checked_at: new Date().toISOString(),
        evaluation_confidence: input.evaluation_confidence ?? null,
        evidence_state_after_verification: input.evidence_state_after_verification ?? null,
        verification_notes: input.verification_notes ?? null,
        verified_by: input.verified_by ?? null,
      })
      .eq('id', input.id)
      .select('*')
      .single();

    if (error) return { ok: false, error: error.message };
    return { ok: true, data: data as SfiPredictionVerification };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'unknown_verification_close_error' };
  }
}

/**
 * Corrige un cierre existente sin editarlo en silencio: crea una fila nueva
 * y marca la anterior como SUPERSEDED.
 */
export async function supersedeVerification(
  previousId: string,
  input: CreateSfiPredictionVerificationInput,
): Promise<ServiceResult<SfiPredictionVerification>> {
  const created = await createVerificationRule(input);
  if (!created.ok) return created;

  try {
    const supabase = createServiceSupabaseClient();
    const { error } = await supabase
      .from(TABLE)
      .update({ verification_state: 'SUPERSEDED', superseded_by: created.data.id })
      .eq('id', previousId);

    if (error) return { ok: false, error: error.message };
    return created;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'unknown_verification_supersede_error' };
  }
}
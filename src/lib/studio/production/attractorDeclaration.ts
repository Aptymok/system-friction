import 'server-only';

import { runMophAgent } from '@/lib/agents/sfiAgents';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { recordObservationEvent } from '@/lib/root/telemetry/agentRegistry';

/**
 * Studio no tenía forma de declarar un objetivo/atractor — Field sí
 * (`field_cases.declared_attractor` + `runMophAgent`). Esto NO duplica esa
 * lógica: reutiliza el mismo agente MOP-H, y persiste el resultado con el
 * mismo patrón que ya usa `objectFieldProjection.ts` (fila en
 * `studio_hypotheses`, identificada por `origin`), en vez de crear una
 * tabla nueva.
 */

export const ATTRACTOR_DECLARATION_ORIGIN = 'attractor_declaration';

export type DeclareStudioAttractorInput = {
  objectId: string;
  /** Qué está atorado / qué se quiere mover con esta pieza. */
  stuckSystem: string;
  /** El atractor: hacia dónde se dirige esta pieza si sigues actuando igual. */
  objective: string;
  attempts?: string;
  evidence?: string;
  consequence?: string;
};

export type StudioAttractorDeclaration = {
  objectId: string;
  declaredAt: string;
  atractor: string;
  lecturaFriccion: string;
  perturbacionMinima: string;
  proximaAccion: string;
  riesgo: 'low' | 'medium' | 'high';
  confianza: number;
  explicacion: string;
};

function toDeclaration(
  objectId: string,
  objective: string,
  createdAt: string,
  moph: Awaited<ReturnType<typeof runMophAgent>>,
): StudioAttractorDeclaration {
  return {
    objectId,
    declaredAt: createdAt,
    atractor: objective,
    lecturaFriccion: moph.friction_reading,
    perturbacionMinima: moph.minimal_perturbation,
    proximaAccion: moph.next_action,
    riesgo: moph.risk,
    confianza: moph.confidence,
    explicacion: moph.user_friendly_explanation,
  };
}

export async function declareStudioAttractor(
  input: DeclareStudioAttractorInput,
): Promise<StudioAttractorDeclaration> {
  if (input.objective.trim().length < 8) {
    throw new Error('STUDIO_ATTRACTOR_OBJECTIVE_REQUIRED');
  }
  if (input.stuckSystem.trim().length < 8) {
    throw new Error('STUDIO_ATTRACTOR_STUCK_SYSTEM_REQUIRED');
  }

  const moph = await runMophAgent({
    stuckSystem: input.stuckSystem.trim(),
    objective: input.objective.trim(),
    attempts: input.attempts?.trim(),
    evidence: input.evidence?.trim(),
    consequence: input.consequence?.trim(),
  });

  const service = createServiceSupabaseClient();
  const createdAt = new Date().toISOString();

  // Mismo patrón que projectStudioObjectField: se reemplaza la declaración
  // anterior por la nueva (un objeto tiene UN atractor vigente a la vez,
  // no un historial acumulado de intentos de declaración).
  await service
    .from('studio_hypotheses')
    .delete()
    .eq('object_id', input.objectId)
    .eq('origin', ATTRACTOR_DECLARATION_ORIGIN);

  const { error } = await service.from('studio_hypotheses').insert({
    object_id: input.objectId,
    origin: ATTRACTOR_DECLARATION_ORIGIN,
    severity: moph.risk === 'high' ? 'action' : moph.risk === 'medium' ? 'watch' : 'info',
    statement: `Atractor declarado: ${input.objective.trim()}`,
    recommended_change: moph.minimal_perturbation,
    route: 'inspect',
    sources: [],
    payload: {
      declaration: toDeclaration(input.objectId, input.objective.trim(), createdAt, moph),
      raw: moph,
    },
    created_at: createdAt,
  });

  if (error) {
    throw new Error(`STUDIO_ATTRACTOR_PERSIST_FAILED:${error.message}`);
  }

  recordObservationEvent({
    agentKey: 'studio_attractor_agent',
    signal: `Atractor declarado para objeto ${input.objectId}: ${input.objective.trim()}`,
    confidence: moph.confidence,
    linked: [{ type: 'studio_object', id: input.objectId }],
    evidenceUsed: [
      { type: 'stuck_system', id: input.objectId, note: input.stuckSystem.trim() },
      ...(input.evidence ? [{ type: 'evidence_note', id: input.objectId, note: input.evidence.trim() }] : []),
    ],
    patternDetected: moph.friction_reading,
    proposedAction: moph.minimal_perturbation,
    awaitingAuthorization: moph.risk !== 'low',
  }).catch(() => undefined);

  return toDeclaration(input.objectId, input.objective.trim(), createdAt, moph);
}

export async function getStudioAttractor(
  objectId: string,
): Promise<StudioAttractorDeclaration | null> {
  const service = createServiceSupabaseClient();

  const { data, error } = await service
    .from('studio_hypotheses')
    .select('payload, created_at')
    .eq('object_id', objectId)
    .eq('origin', ATTRACTOR_DECLARATION_ORIGIN)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`STUDIO_ATTRACTOR_READ_FAILED:${error.message}`);
  }
  if (!data) return null;

  const payload = data.payload as { declaration?: StudioAttractorDeclaration } | null;
  return payload?.declaration ?? null;
}

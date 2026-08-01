// src/core/memory/policy/contract.ts
//
// Contrato de política de memoria institucional. NO contiene reglas.
// Define qué es una fuente de política válida, para que
// InstitutionalEventPipeline dependa de esta interfaz — no de una
// implementación concreta.
//
// Esto es lo que permite, sin tocar el pipeline ni los agentes/governance
// que lo alimentan, migrar el origen de la política de "código TypeScript"
// a "configuración versionada", "repositorio institucional" o cualquier
// otra fuente de gobernanza, el día que el ACP lo decida.

import type { EpistemicEventRow } from '../epistemicEventWriter';

export type MemoryDecision = {
  shouldWrite: boolean;
  entityType?: string;
  memoryType?: string;
  confidence?: number;
  reason: string;
  /** Identifica qué versión/fuente de política produjo esta decisión — necesario para auditar decisiones pasadas si la política cambia. */
  policySourceId: string;
};

/**
 * Un MemoryPolicySource es lo único que InstitutionalEventPipeline conoce.
 * No importa si las reglas viven en código, en una tabla Supabase, en un
 * documento institucional versionado, o en un servicio externo — mientras
 * implemente esta interfaz, es una fuente de política válida.
 */
export interface MemoryPolicySource {
  /** Identificador estable de esta fuente (para trazabilidad en MemoryDecision.policySourceId). */
  readonly id: string;

  /** Resuelve la decisión de memoria para un evento ya persistido en epistemic_events. */
  resolve(event: EpistemicEventRow): Promise<MemoryDecision> | MemoryDecision;
}

/** Decisión por defecto cuando una fuente no tiene regla para el evento. Denegar, nunca conservar por accidente. */
export function denyByDefault(event: EpistemicEventRow, policySourceId: string): MemoryDecision {
  return {
    shouldWrite: false,
    reason: `no_policy_defined_for_event_name:${event.event_name}`,
    policySourceId,
  };
}
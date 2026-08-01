// src/core/memory/memoryPolicyValidator.ts
//
// Punto único de resolución de política. NO contiene reglas — depende de
// MemoryPolicySource (el contrato), con staticCodePolicySource como
// implementación por defecto mientras no exista una fuente de gobernanza
// versionada. Cambiar la fuente en producción es cambiar el argumento por
// defecto de evaluateMemoryPolicy(), o pasar una fuente distinta en el
// call site — el pipeline no necesita saber cuál es.

import type { EpistemicEventRow } from './epistemicEventWriter';
import type { MemoryDecision, MemoryPolicySource } from './policy/contract';
import { staticCodePolicySource } from './policy/staticCodePolicySource';

export async function evaluateMemoryPolicy(
  event: EpistemicEventRow,
  source: MemoryPolicySource = staticCodePolicySource
): Promise<MemoryDecision> {
  return source.resolve(event);
}

export type { MemoryDecision, MemoryPolicySource };
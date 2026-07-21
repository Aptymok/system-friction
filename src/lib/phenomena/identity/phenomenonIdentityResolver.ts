import 'server-only';

import { findPpoiIdentityCandidates } from './adapters/ppoiAdapter';
import { findStudioIdentityCandidates } from './adapters/studioAdapter';
import { findFieldIdentityCandidates } from './adapters/fieldAdapter';
import { findRegistryIdentityCandidates } from './adapters/registryAdapter';
import { recordObservationEvent } from '@/lib/root/telemetry/agentRegistry';

import type { IdentityCandidate } from './phenomenonIdentityTypes';

export type PhenomenonIdentityResolution = {
  // Estado de la decisión operativa dentro de PPOI — es el único que
  // determina si ROOT abre un caso existente o crea uno nuevo. Los
  // candidatos de otros dominios son contexto, no gobernanza.
  status: 'MATCH' | 'AMBIGUOUS' | 'NEW';
  phenomenon: Record<string, unknown> | null;
  candidates: IdentityCandidate[];
};

/**
 * ROOT → Phenomenon Identity Resolver → { PPOI, Studio, Field, Registry }
 *
 * Este es el único punto de entrada que ROOT debe consultar para responder
 * "¿este fenómeno ya existe, y dónde vive?". No decide nada por sí mismo:
 * PPOI conserva la autoridad de gobernanza sobre casos (abrir/crear);
 * los demás dominios solo aportan visibilidad de identidades relacionadas.
 */
export async function resolvePhenomenonIdentityGlobal(
  ownerId: string,
  query: string,
): Promise<PhenomenonIdentityResolution> {
  const [ppoi, studioCandidates, fieldCandidates, registryCandidates] = await Promise.all([
    findPpoiIdentityCandidates(ownerId, query),
    findStudioIdentityCandidates(query),
    findFieldIdentityCandidates(ownerId, query),
    findRegistryIdentityCandidates(query),
  ]);

  const merged = [
    ...ppoi.candidates,
    ...studioCandidates,
    ...fieldCandidates,
    ...registryCandidates,
  ].sort((a, b) => b.similarity - a.similarity);

  const topSimilarity = merged[0]?.similarity ?? (ppoi.status === 'MATCH' ? 1 : 0);

  recordObservationEvent({
    agentKey: 'phenomenon_identity_resolver',
    signal: `Búsqueda "${query}" → ${ppoi.status} (${merged.length} candidatos cross-dominio)`,
    confidence: topSimilarity,
    phenomenonId: ppoi.phenomenon ? String((ppoi.phenomenon as Record<string, unknown>).id ?? '') || null : null,
    linked: merged.slice(0, 5).map((c) => ({ type: c.originModule, id: c.id })),
    action: ppoi.status === 'MATCH' ? 'open_existing' : ppoi.status === 'AMBIGUOUS' ? 'presented_candidates' : 'none',
  }).catch(() => undefined);

  return {
    status: ppoi.status,
    phenomenon: ppoi.phenomenon,
    candidates: merged,
  };
}

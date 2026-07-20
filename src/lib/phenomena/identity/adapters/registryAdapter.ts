import 'server-only';

import { listPhenomena } from '@/lib/phenomena/phenomenon-engine';

import {
  identitySimilarity,
  IDENTITY_SIMILARITY_FLOOR,
  type IdentityCandidate,
} from '../phenomenonIdentityTypes';

/**
 * `sfi_phenomena` es el registro de fenómenos ya promovidos (persistencia +
 * densidad + confianza validadas), no un universo paralelo de casos activos.
 * Este adapter solo lee — la promoción sigue ocurriendo exclusivamente vía
 * `promotePhenomenonCandidate` desde el ciclo PPOI, nunca desde aquí.
 */
export async function findRegistryIdentityCandidates(
  query: string,
): Promise<IdentityCandidate[]> {
  const result = await listPhenomena();

  if (!result.ok) return [];

  return (result.data ?? [])
    .map((row) => {
      const record = row as Record<string, unknown>;
      const label = String(record.label ?? 'sfi_phenomena entry');
      return {
        id: String(record.phenomenon_key ?? record.id ?? ''),
        label,
        originModule: 'registry' as const,
        similarity: identitySimilarity(query, label),
        livesAt: `Registro global · régimen ${String(record.regime ?? 'desconocido')}`,
        meta: record,
      };
    })
    .filter((candidate) => candidate.id && candidate.similarity >= IDENTITY_SIMILARITY_FLOOR);
}

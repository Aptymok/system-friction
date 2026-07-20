import 'server-only';

import {
  resolvePhenomenonIdentity,
} from '@/lib/ppoi/phenomenonResolver';

import type { IdentityCandidate } from '../phenomenonIdentityTypes';

/**
 * No reimplementa la resolución PPOI — la reutiliza. `phenomenonResolver.ts`
 * sigue siendo la única fuente de verdad para MATCH/AMBIGUOUS/NEW dentro de
 * PPOI (R18: No Duplicación de Gobernanza).
 */
export async function findPpoiIdentityCandidates(
  ownerId: string,
  query: string,
): Promise<{
  status: 'MATCH' | 'AMBIGUOUS' | 'NEW';
  phenomenon: Record<string, unknown> | null;
  candidates: IdentityCandidate[];
}> {
  const resolution = await resolvePhenomenonIdentity(ownerId, query);

  const candidates: IdentityCandidate[] = (resolution.candidates ?? []).map((row) => ({
    id: String((row as Record<string, unknown>).id ?? ''),
    label: String((row as Record<string, unknown>).name ?? 'PPOI phenomenon'),
    originModule: 'ppoi',
    similarity: Number((row as Record<string, unknown>).similarity ?? 0),
    livesAt: 'PPOI · Expediente de observación',
    meta: row as Record<string, unknown>,
  }));

  return {
    status: resolution.status as 'MATCH' | 'AMBIGUOUS' | 'NEW',
    phenomenon: (resolution as { phenomenon?: Record<string, unknown> }).phenomenon ?? null,
    candidates,
  };
}

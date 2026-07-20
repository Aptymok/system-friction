import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';

import {
  identitySimilarity,
  IDENTITY_SIMILARITY_FLOOR,
  rowLabel,
  type IdentityCandidate,
} from '../phenomenonIdentityTypes';

const LABEL_KEYS = ['label', 'title', 'name', 'filename'];

export async function findStudioIdentityCandidates(
  query: string,
): Promise<IdentityCandidate[]> {
  try {
    const client = createServiceSupabaseClient();

    const { data, error } = await client
      .from('studio_objects')
      .select('id, label, title, name, filename, modality, updated_at')
      .order('updated_at', { ascending: false })
      .limit(200);

    if (error) throw new Error(error.message);

    return (data ?? [])
      .map((row) => {
        const record = row as Record<string, unknown>;
        const label = rowLabel(record, LABEL_KEYS, 'Studio object');
        return {
          id: String(record.id ?? ''),
          label,
          originModule: 'studio' as const,
          similarity: identitySimilarity(query, label),
          livesAt: `Studio · objeto ${record.modality ? String(record.modality) : ''}`.trim(),
          meta: record,
        };
      })
      .filter((candidate) => candidate.id && candidate.similarity >= IDENTITY_SIMILARITY_FLOOR);
  } catch {
    // Studio no disponible o tabla no encontrada: no bloquea la resolución
    // global, simplemente no aporta candidatos de este dominio.
    return [];
  }
}

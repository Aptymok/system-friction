import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';

import {
  identitySimilarity,
  IDENTITY_SIMILARITY_FLOOR,
  rowLabel,
  type IdentityCandidate,
} from '../phenomenonIdentityTypes';

const LABEL_KEYS = ['label', 'name', 'title'];

export async function findFieldIdentityCandidates(
  ownerId: string,
  query: string,
): Promise<IdentityCandidate[]> {
  try {
    const client = createServiceSupabaseClient();

    const { data, error } = await client
      .from('field_cases')
      .select('id, label, name, title, status, updated_at')
      .eq('owner_id', ownerId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(200);

    if (error) throw new Error(error.message);

    return (data ?? [])
      .map((row) => {
        const record = row as Record<string, unknown>;
        const label = rowLabel(record, LABEL_KEYS, 'Field case');
        return {
          id: String(record.id ?? ''),
          label,
          originModule: 'field' as const,
          similarity: identitySimilarity(query, label),
          livesAt: `Field · ciclo ${record.status ? String(record.status) : 'ACTIVO'}`,
          meta: record,
        };
      })
      .filter((candidate) => candidate.id && candidate.similarity >= IDENTITY_SIMILARITY_FLOOR);
  } catch {
    return [];
  }
}

import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import type { Publication } from '@/lib/system/contracts';

export type PublicObservatoryState = {
  generatedAt: string;
  publications: Publication[];
};

export async function getPublicObservatoryState(): Promise<PublicObservatoryState> {
  const service = createServiceSupabaseClient();
  const { data, error } = await service
    .from('sfi_publications')
    .select('id, source_type, source_id, approved_by, public_fields, public_payload, status, published_at')
    .eq('status', 'PUBLISHED')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(50);

  if (error) {
    return { generatedAt: new Date().toISOString(), publications: [] };
  }

  return {
    generatedAt: new Date().toISOString(),
    publications: (data ?? []).map((row) => ({
      id: row.id,
      sourceType: row.source_type,
      sourceId: row.source_id,
      approvedBy: row.approved_by,
      publicFields: row.public_fields ?? [],
      publicPayload: row.public_payload,
      status: row.status,
      publishedAt: row.published_at,
    })),
  };
}

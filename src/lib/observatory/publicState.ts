import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import type { Publication } from '@/lib/system/contracts';

type PublishedPublicationRow = {
  id: string;
  source_type: string | null;
  source_id: string | null;
  approved_by: string | null;
  public_fields: string[] | null;
  public_payload: Record<string, unknown> | null;
  snapshot_version: string | null;
  status: string;
  published_at: string | null;
};

export type PublicPublishedReturn = {
  id: string;
  publicPayload: Record<string, unknown> | null;
  snapshotVersion: string | null;
  publishedAt: string | null;
};

export type PublicObservatoryState = {
  generatedAt: string;
  publications: Publication[];
};

async function readPublishedPublicationRows(limit: number): Promise<PublishedPublicationRow[]> {
  try {
    const service = createServiceSupabaseClient();
    const { data, error } = await service
      .from('sfi_publications')
      .select('id, source_type, source_id, approved_by, public_fields, public_payload, snapshot_version, status, published_at')
      .eq('status', 'PUBLISHED')
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) return [];
    return (data ?? []) as PublishedPublicationRow[];
  } catch {
    return [];
  }
}

export async function getPublicPublishedReturns(limit = 12): Promise<PublicPublishedReturn[]> {
  const rows = await readPublishedPublicationRows(limit);
  return rows.map((row) => ({
    id: row.id,
    publicPayload: row.public_payload,
    snapshotVersion: row.snapshot_version,
    publishedAt: row.published_at,
  }));
}

export async function getPublicObservatoryState(): Promise<PublicObservatoryState> {
  const rows = await readPublishedPublicationRows(50);

  return {
    generatedAt: new Date().toISOString(),
    publications: rows.map((row) => ({
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

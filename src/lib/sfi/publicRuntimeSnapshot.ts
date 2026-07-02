import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';

const TABLE = 'sfi_public_runtime_snapshots';

type SnapshotPayload<T> = {
  state?: T;
  [key: string]: unknown;
};

type SnapshotRow<T> = {
  payload: SnapshotPayload<T> | null;
  expires_at: string | null;
  generated_at: string | null;
};

function isFresh(expiresAt: string | null) {
  if (!expiresAt) return true;
  const time = Date.parse(expiresAt);
  return Number.isFinite(time) && time > Date.now();
}

export async function resolvePublicRuntimeState<T>(
  snapshotKey: string,
  builder: () => Promise<T>,
): Promise<T> {
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from(TABLE)
      .select('payload,expires_at,generated_at')
      .eq('snapshot_key', snapshotKey)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const row = data as SnapshotRow<T>;
      if (row.payload && typeof row.payload === 'object' && 'state' in row.payload && isFresh(row.expires_at)) {
        return row.payload.state as T;
      }
    }
  } catch {
    // Fallback deliberado.
  }

  return builder();
}

export async function writePublicRuntimeSnapshot(
  snapshotKey: string,
  payload: Record<string, unknown>,
  warnings: string[] = [],
  ttlSeconds = 300,
) {
  const generatedAt = new Date();
  const expiresAt = new Date(generatedAt.getTime() + ttlSeconds * 1000);

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(
      {
        snapshot_key: snapshotKey,
        generated_at: generatedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        payload,
        warnings,
      },
      { onConflict: 'snapshot_key' },
    )
    .select('snapshot_key,generated_at,expires_at,warnings')
    .single();

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const, data };
}
import type { BitacoraEventType } from '@/observatory/field/patternModel';
import type { ManualSocialReturn } from '@/observatory/social/socialManualReturnTypes';
import type { SocialIngestionResult, SocialProvider } from '@/observatory/social/socialOAuthTypes';
import type { SocialDraft } from '@/observatory/social/socialDraftTypes';

export type PersistenceResult<T = unknown> = {
  ok: boolean;
  mode: 'supabase' | 'local_only';
  data?: T;
  error?: string;
};

type TracePayload = Record<string, unknown>;

async function postPersistence<T>(action: string, payload: Record<string, unknown>): Promise<PersistenceResult<T>> {
  if (typeof window === 'undefined') return { ok: false, mode: 'local_only', error: 'client_only_adapter' };

  try {
    const res = await fetch('/api/field/persist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, mode: 'local_only', error: data?.error || `${res.status}` };
    return data as PersistenceResult<T>;
  } catch (error) {
    return {
      ok: false,
      mode: 'local_only',
      error: error instanceof Error ? error.message : 'persistence_unavailable',
    };
  }
}

export function persistFieldEvent(input: {
  event_type: BitacoraEventType;
  message: string;
  node_id?: string;
  trace_payload?: TracePayload;
}) {
  return postPersistence('field_event', input);
}

export function persistSfiLogbookEvent(input: {
  asset_id: string;
  event_type: BitacoraEventType;
  message: string;
  trace_payload?: TracePayload;
}) {
  return postPersistence('sfi_logbook_event', input);
}

export function persistWorldSpectrumSnapshot(input: {
  node_id?: string | null;
  active_node_id?: string | null;
  reading: Record<string, unknown>;
}) {
  return postPersistence('world_spectrum_snapshot', input);
}

export function persistSocialDraft(input: {
  node_id?: string | null;
  draft: SocialDraft;
  fieldMode?: string;
  primaryPatternId?: string | null;
  secondaryPatternIds?: string[];
}) {
  return postPersistence('social_draft', input);
}

export function persistManualSocialPost(input: {
  node_id?: string | null;
  network: string;
  postUrl?: string | null;
  text: string;
  postedAt: string;
  externalPostId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  return postPersistence('manual_social_post', input);
}

export function persistManualSocialReturn(input: {
  node_id?: string | null;
  manualReturn: ManualSocialReturn;
}) {
  return postPersistence('manual_social_return', input);
}

export function getLatestWorldSpectrumSnapshot(input: { nodeId?: string | null; userId?: string | null }) {
  return postPersistence<Record<string, unknown> | null>('latest_world_spectrum_snapshot', input);
}

export function getConnectedSocialSources(input: { node_id?: string | null }) {
  return postPersistence<{ sources: Array<{ provider: SocialProvider; status: string; scope: string[] }> }>('social_readonly_sources', input);
}

export function ingestReadOnlySocialMetrics(input: {
  node_id?: string | null;
  asset_id?: string | null;
  provider: SocialProvider;
}) {
  return postPersistence<SocialIngestionResult>('social_readonly_ingest', input);
}

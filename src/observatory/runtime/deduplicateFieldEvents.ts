type FieldEventLike = {
  event_type: string;
  message?: string;
  node_id?: string | null;
  pattern_id?: string | null;
  trace_payload?: Record<string, unknown>;
};

type ManualPostLike = {
  network?: string;
  provider?: string;
  externalPostId?: string | null;
  external_post_id?: string | null;
  postUrl?: string | null;
  post_url?: string | null;
  text?: string;
  postText?: string;
};

type ManualReturnLike = {
  platform?: string;
  postId?: string | null;
  post_id?: string | null;
  capturedAt?: string | null;
  engagement?: Record<string, unknown>;
};

export type DeduplicationDecision = {
  persist: boolean;
  hash: string;
  reason?: string;
};

const recentHashes = new Map<string, number>();
const recentThrottleKeys = new Map<string, number>();
const socialDraftStatuses = new Map<string, string>();
const recentManualPosts = new Map<string, number>();
const recentManualReturns = new Map<string, number>();

function stableNormalize(value: unknown): unknown {
  if (value === undefined) return null;
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stableNormalize);
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, stableNormalize(item)]),
  );
}

function stableStringify(value: unknown) {
  return JSON.stringify(stableNormalize(value));
}

function hashStable(value: unknown) {
  const input = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function prune(map: Map<string, number>, now: number) {
  for (const [key, timestamp] of map) {
    if (now - timestamp > 120_000) map.delete(key);
  }
}

function throttle(key: string, ttlMs: number, now: number) {
  const previous = recentThrottleKeys.get(key);
  if (previous && now - previous < ttlMs) return false;
  recentThrottleKeys.set(key, now);
  return true;
}

export function hashEventPayload(event: FieldEventLike) {
  const payload = event.trace_payload || {};
  return hashStable({
    event_type: event.event_type,
    node_id: event.node_id || null,
    pattern_id: event.pattern_id || payload.pattern_id || payload.primaryPatternId || null,
    sourceState: payload.sourceState || null,
    payload,
  });
}

export function shouldPersistFieldEvent(event: FieldEventLike): DeduplicationDecision {
  const now = Date.now();
  prune(recentHashes, now);
  prune(recentThrottleKeys, now);

  const hash = hashEventPayload(event);
  const previous = recentHashes.get(hash);
  if (previous && now - previous < 5_000) {
    return { persist: false, hash, reason: 'recent_duplicate' };
  }

  if (event.event_type === 'GRAPH_VECTOR_STATE_UPDATED') {
    const key = `${event.event_type}:${event.node_id || 'field'}`;
    if (!throttle(key, 3_000, now)) return { persist: false, hash, reason: 'graph_throttle' };
  }

  if (['WORLD_SPECT_TRIGGER_DETECTED', 'WORLD_SPECT_READING_TRIGGERED', 'OBSERVATION_WINDOW_SUGGESTED'].includes(event.event_type)) {
    const payload = event.trace_payload || {};
    const key = [
      event.event_type,
      payload.triggerId || 'trigger',
      payload.activeNode || event.node_id || 'field',
      payload.primaryPatternId || event.pattern_id || 'pattern',
    ].join(':');
    if (!throttle(key, 10_000, now)) return { persist: false, hash, reason: 'worldspect_throttle' };
  }

  if (event.event_type.startsWith('SOCIAL_DRAFT_')) {
    const payload = event.trace_payload || {};
    const draftId = String(payload.draftId || '');
    const status = String(payload.status || event.event_type);
    if (draftId) {
      const previousStatus = socialDraftStatuses.get(draftId);
      if (previousStatus === status) return { persist: false, hash, reason: 'social_draft_status_duplicate' };
      socialDraftStatuses.set(draftId, status);
    }
  }

  recentHashes.set(hash, now);
  return { persist: true, hash };
}

export function shouldPersistManualPost(post: ManualPostLike): DeduplicationDecision {
  const now = Date.now();
  prune(recentManualPosts, now);
  const provider = post.network || post.provider || 'manual';
  const externalId = post.externalPostId || post.external_post_id || '';
  const postUrl = post.postUrl || post.post_url || '';
  const hash = hashStable({
    provider,
    identity: externalId || postUrl || `${post.postText || post.text || ''}`,
  });
  const previous = recentManualPosts.get(hash);
  if (previous && now - previous < 60_000) return { persist: false, hash, reason: 'manual_post_duplicate' };
  recentManualPosts.set(hash, now);
  return { persist: true, hash };
}

export function shouldPersistManualReturn(returnPayload: ManualReturnLike): DeduplicationDecision {
  const now = Date.now();
  prune(recentManualReturns, now);
  const hash = hashStable({
    platform: returnPayload.platform || 'manual',
    postId: returnPayload.postId || returnPayload.post_id || null,
    capturedAt: returnPayload.capturedAt || null,
    engagement: returnPayload.engagement || {},
  });
  const previous = recentManualReturns.get(hash);
  if (previous && now - previous < 60_000) return { persist: false, hash, reason: 'manual_return_duplicate' };
  recentManualReturns.set(hash, now);
  return { persist: true, hash };
}

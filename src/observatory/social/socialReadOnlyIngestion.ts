import 'server-only';

import { createHash } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createObservationSourceDescriptor } from '@/observatory/source/sourceStateTypes';
import type {
  SocialIngestedPost,
  SocialIngestionResult,
  SocialMetricSnapshot,
  SocialProvider,
  SocialTokenRecord,
} from './socialOAuthTypes';

type ServerContext = {
  service: SupabaseClient;
  user: { id: string };
  node?: { id: string } | null;
};

function tokenProvider(provider: SocialProvider) {
  return provider === 'x' ? 'twitter' : provider;
}

function publicProvider(provider: string): SocialProvider {
  return provider === 'twitter' ? 'x' : provider as SocialProvider;
}

function numericRecord(input: Record<string, unknown> = {}) {
  return Object.fromEntries(
    Object.entries(input)
      .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
      .map(([key, value]) => [key, Number(value)]),
  );
}

function scoreFromEngagement(engagement: Record<string, number>) {
  const values = Object.values(engagement);
  if (!values.length) return null;
  const weighted = (engagement.likes || 0) + (engagement.reactions || 0) + (engagement.comments || 0) * 2 + (engagement.reposts || 0) * 2 + (engagement.clicks || 0) * 1.5;
  const exposure = Math.max(engagement.impressions || engagement.views || engagement.reach || weighted || 1, 1);
  return Math.max(0, Math.min(1, Number((weighted / exposure).toFixed(4))));
}

function hashEngagement(engagement: Record<string, number>) {
  return createHash('sha256').update(JSON.stringify(Object.entries(engagement).sort())).digest('hex').slice(0, 24);
}

export function assertSocialWriteDisabled() {
  return {
    canPublish: false,
    reason: 'OAuth write no habilitado.',
  };
}

export async function getConnectedSocialSources(ctx: ServerContext) {
  const { data: tokens, error } = await ctx.service
    .from('social_tokens')
    .select('*')
    .eq('user_id', ctx.user.id);
  if (error) return [] as Array<{ provider: SocialProvider; status: 'error'; scope: string[] }>;

  const now = new Date().toISOString();
  const sources = (tokens || []).map((token: SocialTokenRecord) => ({
    provider: publicProvider(token.provider),
    status: token.expires_at && new Date(token.expires_at).getTime() < Date.now() ? 'error' as const : 'connected_read_only' as const,
    scope: token.scope || [],
  }));

  for (const source of sources) {
    if (source.status !== 'connected_read_only') continue;
    await upsertTelemetrySource(ctx, source.provider, source.scope, now);
  }

  return sources;
}

async function upsertTelemetrySource(ctx: ServerContext, provider: SocialProvider, scope: string[], lastSyncAt: string) {
  const { data: existing } = await ctx.service
    .from('telemetry_sources')
    .select('id')
    .eq('user_id', ctx.user.id)
    .eq('provider', provider)
    .eq('source_type', 'oauth')
    .limit(1)
    .maybeSingle();

  const payload = {
    user_id: ctx.user.id,
    node_id: ctx.node?.id || null,
    provider,
    source_type: 'oauth',
    status: 'active',
    consent_scope: { mode: 'READ_ONLY', scopes: scope },
    last_sync_at: lastSyncAt,
    metadata: { write: 'disabled' },
  };

  if (existing?.id) {
    return ctx.service.from('telemetry_sources').update(payload).eq('id', existing.id).select('*').single();
  }
  return ctx.service.from('telemetry_sources').insert(payload).select('*').single();
}

async function readToken(ctx: ServerContext, provider: SocialProvider) {
  const { data, error } = await ctx.service
    .from('social_tokens')
    .select('*')
    .eq('user_id', ctx.user.id)
    .eq('provider', tokenProvider(provider))
    .maybeSingle();
  if (error || !data) return null;
  return data as SocialTokenRecord;
}

async function fetchXPosts(token: SocialTokenRecord): Promise<SocialIngestedPost[]> {
  const meRes = await fetch('https://api.twitter.com/2/users/me', {
    headers: { Authorization: `Bearer ${token.access_token}` },
    cache: 'no-store',
  });
  if (!meRes.ok) throw new Error('provider_error');
  const me = await meRes.json();
  const userId = me?.data?.id || token.provider_user_id;
  if (!userId) throw new Error('provider_error');

  const postsRes = await fetch(`https://api.twitter.com/2/users/${userId}/tweets?max_results=10&tweet.fields=created_at,public_metrics`, {
    headers: { Authorization: `Bearer ${token.access_token}` },
    cache: 'no-store',
  });
  if (!postsRes.ok) throw new Error('provider_error');
  const payload = await postsRes.json();
  return (payload?.data || []).map((tweet: any) => {
    const metrics = tweet.public_metrics || {};
    return {
      provider: 'x',
      externalId: String(tweet.id),
      text: String(tweet.text || ''),
      publishedAt: tweet.created_at || null,
      rawPayload: tweet,
      engagement: {
        impressions: Number(metrics.impression_count || 0),
        likes: Number(metrics.like_count || 0),
        comments: Number(metrics.reply_count || 0),
        reposts: Number(metrics.retweet_count || 0),
      },
      sourceUrl: `https://x.com/i/web/status/${tweet.id}`,
    } satisfies SocialIngestedPost;
  });
}

async function fetchLinkedInPosts(token: SocialTokenRecord): Promise<SocialIngestedPost[]> {
  const author = token.provider_user_id;
  if (!author) throw new Error('provider_error');
  const postsRes = await fetch(`https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(${encodeURIComponent(author)})`, {
    headers: { Authorization: `Bearer ${token.access_token}` },
    cache: 'no-store',
  });
  if (!postsRes.ok) throw new Error('provider_error');
  const payload = await postsRes.json();
  return (payload?.elements || []).slice(0, 10).map((post: any) => {
    const text = post?.specificContent?.['com.linkedin.ugc.ShareContent']?.shareCommentary?.text || '';
    return {
      provider: 'linkedin',
      externalId: String(post.id || post.activity || post.created?.time),
      text: String(text),
      publishedAt: post?.created?.time ? new Date(Number(post.created.time)).toISOString() : null,
      rawPayload: post,
      engagement: numericRecord(post?.socialDetail?.totalSocialActivityCounts || {}),
      sourceUrl: post?.permalink || null,
    } satisfies SocialIngestedPost;
  });
}

export function normalizeSocialMetrics(provider: SocialProvider, rawPayload: Record<string, unknown>): SocialMetricSnapshot {
  const engagement = numericRecord((rawPayload.engagement || rawPayload.public_metrics || {}) as Record<string, unknown>);
  return {
    provider,
    postId: String(rawPayload.id || rawPayload.externalId || ''),
    engagement,
    resonanceScore: scoreFromEngagement(engagement),
    commentsSummary: null,
    rawPayload,
    sourceDescriptor: createObservationSourceDescriptor({
      sourceState: 'SOCIAL_RETURN',
      confidence: 'limited',
      isExternal: true,
      isSimulated: false,
    }),
    capturedAt: new Date().toISOString(),
  };
}

export async function persistSocialMetricSnapshot(ctx: ServerContext, snapshot: SocialMetricSnapshot) {
  const engagementHash = hashEngagement(snapshot.engagement);
  const { data: existing } = await ctx.service
    .from('social_resonance_events')
    .select('*')
    .eq('node_id', ctx.node?.id || null)
    .eq('platform', snapshot.provider)
    .eq('post_id', snapshot.postId)
    .eq('raw_payload->>captureMode', 'oauth_read_only')
    .eq('raw_payload->>engagementHash', engagementHash)
    .limit(1)
    .maybeSingle();
  if (existing) return { data: existing, error: null };

  const payload = {
    node_id: ctx.node?.id || null,
    platform: snapshot.provider,
    post_id: snapshot.postId,
    resonance_score: snapshot.resonanceScore ?? null,
    engagement: snapshot.engagement,
    comments_summary: snapshot.commentsSummary,
    raw_payload: {
      ...snapshot.rawPayload,
      sourceState: 'SOCIAL_RETURN',
      captureMode: 'oauth_read_only',
      isSimulated: false,
      capturedAt: snapshot.capturedAt,
      engagementHash,
    },
  };
  return ctx.service.from('social_resonance_events').insert(payload).select('*').single();
}

async function persistExternalSignal(ctx: ServerContext, telemetrySourceId: string | null, post: SocialIngestedPost) {
  const { data: existing } = await ctx.service
    .from('external_signals')
    .select('*')
    .eq('user_id', ctx.user.id)
    .eq('provider', post.provider)
    .eq('external_id', post.externalId)
    .limit(1)
    .maybeSingle();
  if (existing) return { data: existing, error: null };

  return ctx.service.from('external_signals').insert({
    telemetry_source_id: telemetrySourceId,
    user_id: ctx.user.id,
    node_id: ctx.node?.id || null,
    provider: post.provider,
    external_id: post.externalId,
    raw_payload: post.rawPayload,
    normalized_text: post.text,
    semantic_tags: [],
    engagement: post.engagement,
    signal_strength: scoreFromEngagement(post.engagement) ?? 0,
    published_at: post.publishedAt,
    ingested_at: new Date().toISOString(),
  }).select('*').single();
}

export async function ingestSocialMetrics(ctx: ServerContext, provider: SocialProvider): Promise<SocialIngestionResult> {
  const token = await readToken(ctx, provider);
  if (!token) return { ok: false, provider, reason: 'missing_token', sourceStatus: 'none' };
  if (token.expires_at && new Date(token.expires_at).getTime() < Date.now()) {
    return { ok: false, provider, reason: 'missing_token', sourceStatus: 'error' };
  }

  const syncAt = new Date().toISOString();
  const { data: telemetrySource } = await upsertTelemetrySource(ctx, provider, token.scope || [], syncAt);

  try {
    const posts = provider === 'x' || provider === 'twitter'
      ? await fetchXPosts(token)
      : provider === 'linkedin'
        ? await fetchLinkedInPosts(token)
        : null;
    if (!posts) return { ok: false, provider, reason: 'unsupported_provider', sourceStatus: 'error' };

    const snapshots: SocialMetricSnapshot[] = [];
    for (const post of posts) {
      await persistExternalSignal(ctx, telemetrySource?.id || null, post);
      const snapshot = normalizeSocialMetrics(post.provider, {
        ...post.rawPayload,
        id: post.externalId,
        engagement: post.engagement,
      });
      await persistSocialMetricSnapshot(ctx, snapshot);
      snapshots.push(snapshot);
    }

    return {
      ok: true,
      provider,
      sourceStatus: 'connected_read_only',
      posts,
      snapshots,
      capturedCount: snapshots.length,
      lastSyncAt: syncAt,
    };
  } catch {
    await ctx.service
      .from('telemetry_sources')
      .update({ status: 'error', last_sync_at: syncAt })
      .eq('user_id', ctx.user.id)
      .eq('provider', provider)
      .eq('source_type', 'oauth');
    return { ok: false, provider, reason: 'provider_error', sourceStatus: 'error' };
  }
}

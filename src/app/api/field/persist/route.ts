import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { ensureOwnedNode, getServerUserContext } from '@/lib/server/productionBackend';
import { getConnectedSocialSources, ingestSocialMetrics } from '@/observatory/social/socialReadOnlyIngestion';
import type { SocialProvider } from '@/observatory/social/socialOAuthTypes';

function jsonOk(data?: unknown) {
  return NextResponse.json({ ok: true, mode: 'supabase', data });
}

function localOnly(error: string) {
  return NextResponse.json({ ok: false, mode: 'local_only', error });
}

function hashPayload(payload: unknown) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 24);
}

function draftStatus(status: string) {
  if (status === 'CONTENT_APPROVED') return 'approved';
  if (status === 'ARCHIVED') return 'rejected';
  return 'pending_human_validation';
}

function isUuid(value?: string | null) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.action) return localOnly('missing_action');

  try {
    if (body.action === 'field_event') {
      const ctx = await ensureOwnedNode(body.node_id);
      if (ctx.error) return localOnly('node_unavailable');
      const payload = {
        ...(body.trace_payload || {}),
        message: body.message,
      };
      const { data, error } = await ctx.service.from('cognitive_event_stream').insert({
        node_id: ctx.node.id,
        stream_type: 'field',
        event_name: String(body.event_type),
        payload,
        emitted_by: 'SFI_FIELD',
      }).select('*').single();
      if (error) return localOnly(error.message);
      return jsonOk(data);
    }

    if (body.action === 'sfi_logbook_event') {
      const ctx = await getServerUserContext();
      if (!ctx.user) return localOnly('unauthorized');
      const payload = {
        ...(body.trace_payload || {}),
        message: body.message,
      };
      const { data, error } = await ctx.service.from('sfi_logbook').insert({
        asset_id: String(body.asset_id),
        event_type: String(body.event_type),
        payload,
        created_by: ctx.user.id,
        hash: hashPayload(payload),
      }).select('*').single();
      if (error) return localOnly(error.message);
      return jsonOk(data);
    }

    if (body.action === 'world_spectrum_snapshot') {
      const reading = body.reading || {};
      const wsi = reading.wsi ?? reading.WSI;
      const nti = reading.nti ?? reading.NTI;
      const sources = reading.sources || reading.sourceUrl || reading.source_url;
      if (typeof wsi !== 'number' || typeof nti !== 'number' || !sources) {
        return localOnly('worldspect_snapshot_not_measured');
      }
      const ctx = await ensureOwnedNode(body.node_id);
      if (ctx.error) return localOnly('node_unavailable');
      const { data, error } = await ctx.service.from('world_spectrum_snapshots').insert({
        node_id: ctx.node.id,
        user_id: ctx.user.id,
        ihg: Number(wsi),
        nti: Number(nti),
        ldi: Number(reading.ldi ?? reading.LDI ?? 0),
        payload: reading,
        observed_at: reading.ts || reading.observed_at || new Date().toISOString(),
      }).select('*').single();
      if (error) return localOnly(error.message);
      return jsonOk(data);
    }

    if (body.action === 'latest_world_spectrum_snapshot') {
      const ctx = await ensureOwnedNode(body.nodeId);
      if (ctx.error) return localOnly('node_unavailable');
      const { data, error } = await ctx.service
        .from('world_spectrum_snapshots')
        .select('*')
        .eq('node_id', ctx.node.id)
        .eq('user_id', ctx.user.id)
        .order('observed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return localOnly(error.message);
      return jsonOk(data || null);
    }

    if (body.action === 'social_draft') {
      const ctx = await ensureOwnedNode(body.node_id);
      if (ctx.error) return localOnly('node_unavailable');
      const draft = body.draft || {};
      const metadata = {
        draftId: draft.id,
        objective: draft.objective,
        fieldMode: body.fieldMode,
        primaryPatternId: body.primaryPatternId,
        secondaryPatternIds: body.secondaryPatternIds || [],
        sourceDescriptor: draft.sourceDescriptor,
        mihmReview: draft.mihmReview,
        worldSpectReview: draft.worldSpectReview,
        contentHash: draft.contentHash,
        approvals: draft.approval ? [draft.approval] : [],
      };
      const payload = {
        node_id: ctx.node.id,
        source_type: 'field',
        source_id: isUuid(draft.id) ? draft.id : null,
        platform_target: String(draft.network || 'unknown'),
        content: String(draft.text || '').slice(0, 2800),
        status: draftStatus(String(draft.status || 'DRAFT')),
        metadata,
        approved_at: draft.status === 'CONTENT_APPROVED' ? new Date().toISOString() : null,
      };

      const { data: existing } = await ctx.service
        .from('media_drafts')
        .select('id')
        .eq('node_id', ctx.node.id)
        .eq('metadata->>draftId', String(draft.id))
        .limit(1)
        .maybeSingle();

      const query = existing?.id
        ? ctx.service.from('media_drafts').update(payload).eq('id', existing.id).select('*').single()
        : ctx.service.from('media_drafts').insert(payload).select('*').single();
      const { data, error } = await query;
      if (error) return localOnly(error.message);
      return jsonOk(data);
    }

    if (body.action === 'manual_social_post') {
      const ctx = await ensureOwnedNode(body.node_id);
      if (ctx.error) return localOnly('node_unavailable');
      const provider = String(body.network || 'manual');
      const externalPostId = body.externalPostId ? String(body.externalPostId) : null;
      const postUrl = body.postUrl ? String(body.postUrl) : null;

      if (externalPostId) {
        const { data: existing } = await ctx.service
          .from('social_posts')
          .select('*')
          .eq('user_id', ctx.user.id)
          .eq('provider', provider)
          .eq('external_post_id', externalPostId)
          .limit(1)
          .maybeSingle();
        if (existing) return jsonOk({ ...existing, duplicate: true });
      } else if (postUrl) {
        const { data: existing } = await ctx.service
          .from('social_posts')
          .select('*')
          .eq('user_id', ctx.user.id)
          .eq('provider', provider)
          .eq('engagement_metrics->_metadata->>postUrl', postUrl)
          .limit(1)
          .maybeSingle();
        if (existing) return jsonOk({ ...existing, duplicate: true });
      }

      const { data, error } = await ctx.service.from('social_posts').insert({
        id: randomUUID(),
        user_id: ctx.user.id,
        node_id: ctx.node.id,
        provider,
        content: String(body.text || ''),
        published_at: body.postedAt || new Date().toISOString(),
        status: 'published',
        external_post_id: externalPostId,
        engagement_metrics: { _metadata: { ...(body.metadata || {}), postUrl } },
      }).select('*').single();
      if (error) return localOnly(error.message);
      return jsonOk(data);
    }

    if (body.action === 'manual_social_return') {
      const ctx = await ensureOwnedNode(body.node_id);
      if (ctx.error) return localOnly('node_unavailable');
      const manualReturn = body.manualReturn || {};
      const platform = String(manualReturn.platform || 'manual');
      const postId = manualReturn.postId ? String(manualReturn.postId) : null;
      const capturedAt = manualReturn.capturedAt || new Date().toISOString();

      let existingQuery = ctx.service
        .from('social_resonance_events')
        .select('*')
        .eq('node_id', ctx.node.id)
        .eq('platform', platform)
        .eq('raw_payload->>capturedAt', capturedAt)
        .limit(1);
      existingQuery = postId ? existingQuery.eq('post_id', postId) : existingQuery.is('post_id', null);
      const { data: existing } = await existingQuery.maybeSingle();
      if (existing) return jsonOk({ ...existing, duplicate: true });

      const payload = {
        node_id: ctx.node.id,
        platform,
        post_id: postId,
        resonance_score: manualReturn.resonanceScore === undefined || manualReturn.resonanceScore === null
          ? null
          : Number(manualReturn.resonanceScore),
        engagement: manualReturn.engagement || {},
        comments_summary: manualReturn.commentsSummary ? String(manualReturn.commentsSummary) : null,
        raw_payload: {
          ...(manualReturn.rawPayload || {}),
          capturedAt,
          sourceState: 'SOCIAL_RETURN',
          captureMode: 'manual',
        },
      };
      const { data, error } = await ctx.service.from('social_resonance_events').insert(payload).select('*').single();
      if (error) return localOnly(error.message);
      return jsonOk(data);
    }

    if (body.action === 'social_readonly_sources') {
      const ctx = await ensureOwnedNode(body.node_id);
      if (ctx.error) return localOnly('node_unavailable');
      const sources = await getConnectedSocialSources(ctx);
      return jsonOk({ sources });
    }

    if (body.action === 'social_readonly_ingest') {
      const ctx = await ensureOwnedNode(body.node_id);
      if (ctx.error) return localOnly('node_unavailable');
      const provider = String(body.provider || 'x') as SocialProvider;
      const result = await ingestSocialMetrics(ctx, provider);

      if (result.ok) {
        for (const snapshot of result.snapshots || []) {
          const payload = {
            provider: snapshot.provider,
            post_id: snapshot.postId,
            metrics: snapshot.engagement,
            sourceState: 'SOCIAL_RETURN',
            captureMode: 'oauth_read_only',
            isSimulated: false,
          };
          await ctx.service.from('cognitive_event_stream').insert({
            node_id: ctx.node.id,
            stream_type: 'social',
            event_name: 'SOCIAL_RETURN_CAPTURED',
            payload,
            emitted_by: 'SFI_FIELD',
          });
          if (body.asset_id) {
            await ctx.service.from('sfi_logbook').insert({
              asset_id: String(body.asset_id),
              event_type: 'SOCIAL_RETURN_CAPTURED',
              payload,
              created_by: ctx.user.id,
              hash: hashPayload(payload),
            });
          }
        }
      }

      return jsonOk(result);
    }

    if (body.action === 'runtime_status') {
      const ctx = await ensureOwnedNode(body.node_id);
      if (ctx.error) return localOnly('node_unavailable');
      const since = new Date(Date.now() - 5 * 60_000).toISOString();
      const [
        fieldEvents,
        latestWorld,
        socialPosts,
        socialReturns,
        tokens,
        latestReturn,
        latestEvent,
      ] = await Promise.all([
        ctx.service
          .from('cognitive_event_stream')
          .select('id', { count: 'exact', head: true })
          .eq('node_id', ctx.node.id)
          .gte('created_at', since),
        ctx.service
          .from('world_spectrum_snapshots')
          .select('*')
          .eq('node_id', ctx.node.id)
          .eq('user_id', ctx.user.id)
          .order('observed_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        ctx.service
          .from('social_posts')
          .select('id', { count: 'exact', head: true })
          .eq('node_id', ctx.node.id)
          .eq('user_id', ctx.user.id)
          .gte('created_at', since),
        ctx.service
          .from('social_resonance_events')
          .select('id', { count: 'exact', head: true })
          .eq('node_id', ctx.node.id)
          .gte('created_at', since),
        ctx.service
          .from('social_tokens')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', ctx.user.id),
        ctx.service
          .from('social_resonance_events')
          .select('created_at')
          .eq('node_id', ctx.node.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        ctx.service
          .from('cognitive_event_stream')
          .select('created_at')
          .eq('node_id', ctx.node.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      return jsonOk({
        recentFieldEventsCount: fieldEvents.count || 0,
        latestWorldSpectrumSnapshot: latestWorld.data || null,
        recentSocialPostsCount: socialPosts.count || 0,
        recentSocialReturnsCount: socialReturns.count || 0,
        hasReadOnlyTokens: Boolean(tokens.count),
        latestSocialReturnAt: latestReturn.data?.created_at || null,
        latestPersistedEventAt: latestEvent.data?.created_at || null,
      });
    }

    return localOnly('unknown_action');
  } catch (error) {
    return localOnly(error instanceof Error ? error.message : 'persistence_failed');
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { ensureOwnedNode, getServerUserContext } from '@/lib/server/productionBackend';
import { emitEpistemicEvent } from '@/core/memory/epistemicEventWriter';
import { getLatestWorldSpectSnapshotRead } from '@/lib/worldspect/snapshotStore';

function jsonOk(data?: unknown) {
  return NextResponse.json({ ok: true, mode: 'systemic_data_plane', data });
}

function localOnly(error: string) {
  return NextResponse.json({ ok: false, mode: 'local_only', error });
}

function retiredAction(error: string, routes: Record<string, string>) {
  return NextResponse.json({
    ok: false,
    mode: 'retired',
    error,
    ...routes,
  }, { status: 410 });
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
      if (ctx.error || !ctx.node || !ctx.user) return localOnly('node_not_ready');
      const payload = {
        ...(body.trace_payload || {}),
        message: body.message,
        streamType: 'field',
      };
      const emitted = await emitEpistemicEvent({
        eventName: String(body.event_type),
        logbookId: `ACTOR:${ctx.user.id}`,
        epistemicClass: 'declared',
        schemaVersion: '2026-09-21.actor-event.v1',
        sourceId: hashPayload({ event_type: body.event_type, payload }),
        sourceType: 'SFI_FIELD',
        actorId: ctx.user.id,
        nodeId: ctx.node.id,
        confidence: 0.6,
        payload,
      });
      if (!emitted.ok) return localOnly('field_event_persist_failed');
      return jsonOk({
        id: emitted.event.id,
        node_id: emitted.event.node_id,
        event_name: emitted.event.event_name,
        payload: emitted.event.payload,
        created_at: emitted.event.created_at,
      });
    }

    if (body.action === 'sfi_logbook_event') {
      const ctx = await getServerUserContext();
      if (!ctx.user) return localOnly('unauthorized');
      const payload = {
        asset_id: body.asset_id ? String(body.asset_id) : null,
        ...(body.trace_payload || {}),
        message: body.message,
        streamType: 'legacy_logbook_adapter',
      };
      const emitted = await emitEpistemicEvent({
        eventName: String(body.event_type || 'SFI_LOGBOOK_EVENT'),
        logbookId: `ACTOR:${ctx.user.id}`,
        epistemicClass: 'declared',
        schemaVersion: '2026-09-22.field-logbook-adapter.v1',
        sourceId: hashPayload({ asset_id: body.asset_id, event_type: body.event_type, payload }),
        sourceType: 'SFI_FIELD_LEGACY_LOGBOOK_ADAPTER',
        actorId: ctx.user.id,
        nodeId: null,
        confidence: 0.6,
        payload,
      });
      if (!emitted.ok) return localOnly('sfi_logbook_event_persist_failed');
      return jsonOk({
        id: emitted.event.id,
        event_name: emitted.event.event_name,
        payload: emitted.event.payload,
        created_at: emitted.event.created_at,
      });
    }

    if (body.action === 'world_spectrum_snapshot') {
      const ctx = await ensureOwnedNode(body.node_id);
      if (ctx.error || !ctx.node || !ctx.user) return localOnly('node_not_ready');
      return retiredAction('worldspect_legacy_snapshot_writer_retired', {
        canonicalWrite: '/api/worldspect/ingest',
        canonicalRead: '/api/worldspect/real',
      });
    }

    if (body.action === 'latest_world_spectrum_snapshot') {
      const ctx = await ensureOwnedNode(body.nodeId);
      if (ctx.error || !ctx.node || !ctx.user) return localOnly('node_not_ready');
      const latest = await getLatestWorldSpectSnapshotRead();
      return jsonOk(latest.data ? {
        ...latest.data,
        scope: 'global_canonical_worldspect',
        readPlane: latest.readPlane,
        primaryDiagnostic: latest.primaryDiagnostic,
      } : null);
    }

    if (body.action === 'social_draft') {
      const ctx = await ensureOwnedNode(body.node_id);
      if (ctx.error || !ctx.node || !ctx.user) return localOnly('node_not_ready');
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
        streamType: 'media_draft',
      };

      const emitted = await emitEpistemicEvent({
        eventName: 'SFI_MEDIA_DRAFT_RECORDED',
        logbookId: `ACTOR:${ctx.user.id}`,
        epistemicClass: 'declared',
        schemaVersion: '2026-09-21.actor-event.v1',
        sourceId: String(draft.id || draft.contentHash || 'social_draft'),
        sourceType: 'SFI_FIELD_SOCIAL_DRAFT',
        actorId: ctx.user.id,
        nodeId: ctx.node.id,
        confidence: draft.status === 'CONTENT_APPROVED' ? 0.75 : 0.6,
        payload,
      });

      if (!emitted.ok) return localOnly('social_draft_persist_failed');
      return jsonOk({
        id: emitted.event.id,
        ...payload,
        created_at: emitted.event.created_at,
      });
    }

    if (body.action === 'manual_social_post') {
      const ctx = await ensureOwnedNode(body.node_id);
      if (ctx.error || !ctx.node || !ctx.user) return localOnly('node_not_ready');
      const provider = String(body.network || 'manual');
      const externalPostId = body.externalPostId ? String(body.externalPostId) : null;
      const postUrl = body.postUrl ? String(body.postUrl) : null;
      const publishedAt = body.postedAt || new Date().toISOString();
      const dedupeKey = hashPayload({
        actorId: ctx.user.id,
        nodeId: ctx.node.id,
        provider,
        externalPostId,
        postUrl,
        publishedAt,
        text: String(body.text || ''),
      });
      const eventId = `ACTOR:${ctx.user.id}:SOCIAL_POST_DECLARED:${dedupeKey}`;
      const { data: existing, error: existingError } = await ctx.service
        .from('epistemic_events')
        .select('id,event_name,payload,created_at')
        .eq('event_id', eventId)
        .limit(1)
        .maybeSingle();
      if (existingError) return localOnly(existingError.message);
      if (existing) return jsonOk({ ...existing, duplicate: true });

      const payload = {
        provider,
        content: String(body.text || ''),
        published_at: publishedAt,
        external_post_id: externalPostId,
        post_url: postUrl,
        metadata: body.metadata || {},
        sourceState: 'declared',
        captureMode: 'manual',
        streamType: 'social_post',
      };
      const emitted = await emitEpistemicEvent({
        eventId,
        eventName: 'SOCIAL_POST_DECLARED',
        logbookId: `ACTOR:${ctx.user.id}`,
        epistemicClass: 'declared',
        schemaVersion: '2026-09-22.actor-social.v1',
        sourceId: externalPostId || postUrl || dedupeKey,
        sourceType: 'SFI_FIELD_MANUAL_SOCIAL_POST',
        actorId: ctx.user.id,
        nodeId: ctx.node.id,
        confidence: 0.6,
        payload,
        occurredAt: publishedAt,
      });
      if (!emitted.ok) return localOnly('manual_social_post_persist_failed');
      return jsonOk({
        id: emitted.event.id,
        event_name: emitted.event.event_name,
        payload: emitted.event.payload,
        created_at: emitted.event.created_at,
      });
    }

    if (body.action === 'manual_social_return') {
      const ctx = await ensureOwnedNode(body.node_id);
      if (ctx.error || !ctx.node || !ctx.user) return localOnly('node_not_ready');
      const manualReturn = body.manualReturn || {};
      const platform = String(manualReturn.platform || 'manual');
      const postId = manualReturn.postId ? String(manualReturn.postId) : null;
      const capturedAt = manualReturn.capturedAt || new Date().toISOString();
      const dedupeKey = hashPayload({
        actorId: ctx.user.id,
        nodeId: ctx.node.id,
        platform,
        postId,
        capturedAt,
        engagement: manualReturn.engagement || {},
      });
      const eventId = `ACTOR:${ctx.user.id}:SOCIAL_RETURN_CAPTURED:${dedupeKey}`;
      const { data: existing, error: existingError } = await ctx.service
        .from('epistemic_events')
        .select('id,event_name,payload,created_at')
        .eq('event_id', eventId)
        .limit(1)
        .maybeSingle();
      if (existingError) return localOnly(existingError.message);
      if (existing) return jsonOk({ ...existing, duplicate: true });

      const payload = {
        platform,
        post_id: postId,
        resonance_score: manualReturn.resonanceScore === undefined || manualReturn.resonanceScore === null
          ? null
          : Number(manualReturn.resonanceScore),
        engagement: manualReturn.engagement || {},
        comments_summary: manualReturn.commentsSummary ? String(manualReturn.commentsSummary) : null,
        raw_payload: manualReturn.rawPayload || {},
        capturedAt,
        sourceState: 'declared',
        captureMode: 'manual',
        streamType: 'social_field',
      };
      const emitted = await emitEpistemicEvent({
        eventId,
        eventName: 'SOCIAL_RETURN_CAPTURED',
        logbookId: `ACTOR:${ctx.user.id}`,
        epistemicClass: 'declared',
        schemaVersion: '2026-09-22.actor-social.v1',
        sourceId: postId || `${platform}:${capturedAt}`,
        sourceType: 'SFI_FIELD_MANUAL_SOCIAL_RETURN',
        actorId: ctx.user.id,
        nodeId: ctx.node.id,
        confidence: 0.6,
        payload,
        occurredAt: capturedAt,
      });
      if (!emitted.ok) return localOnly('manual_social_return_persist_failed');
      return jsonOk({
        id: emitted.event.id,
        event_name: emitted.event.event_name,
        payload: emitted.event.payload,
        created_at: emitted.event.created_at,
      });
    }

    if (body.action === 'social_readonly_sources' || body.action === 'social_readonly_ingest') {
      const ctx = await ensureOwnedNode(body.node_id);
      if (ctx.error || !ctx.node || !ctx.user) return localOnly('node_not_ready');
      return retiredAction('social_readonly_integration_retired', {
        canonicalWrite: '/api/social/resonance',
        statusEndpoint: '/api/field/persist',
        statusAction: 'runtime_status',
      });
    }

    if (body.action === 'runtime_status') {
      const ctx = await ensureOwnedNode(body.node_id);
      if (ctx.error || !ctx.node || !ctx.user) return localOnly('node_not_ready');
      const since = new Date(Date.now() - 5 * 60_000).toISOString();
      const [fieldEvents, latestWorld] = await Promise.all([
        ctx.service
          .from('epistemic_events')
          .select('id,event_name,payload,created_at')
          .eq('actor_id', ctx.user.id)
          .eq('node_id', ctx.node.id)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(100),
        getLatestWorldSpectSnapshotRead(),
      ]);

      if (fieldEvents.error) return localOnly(fieldEvents.error.message);
      const recentEvents = fieldEvents.data || [];
      const socialPosts = recentEvents.filter((event) => event.event_name === 'SOCIAL_POST_DECLARED');
      const socialReturns = recentEvents.filter((event) =>
        event.event_name === 'SOCIAL_RETURN_CAPTURED' || event.event_name === 'social_resonance_ingested');
      const latestReturn = socialReturns[0] || null;

      return jsonOk({
        recentFieldEventsCount: recentEvents.length,
        latestWorldSpectrumSnapshot: latestWorld.data || null,
        latestWorldSpectrumReadPlane: latestWorld.readPlane,
        recentSocialPostsCount: socialPosts.length,
        recentSocialReturnsCount: socialReturns.length,
        hasReadOnlyTokens: false,
        socialReadOnlyIntegration: 'retired',
        latestSocialReturnAt: latestReturn?.created_at || null,
        latestPersistedEventAt: recentEvents[0]?.created_at || null,
      });
    }

    return localOnly('unknown_action');
  } catch (error) {
    return localOnly(error instanceof Error ? error.message : 'persistence_failed');
  }
}

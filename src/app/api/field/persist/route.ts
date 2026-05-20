import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { ensureOwnedNode, getServerUserContext } from '@/lib/server/productionBackend';

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
      const { data, error } = await ctx.service.from('social_posts').insert({
        id: randomUUID(),
        user_id: ctx.user.id,
        node_id: ctx.node.id,
        provider: String(body.network || 'manual'),
        content: String(body.text || ''),
        published_at: body.postedAt || new Date().toISOString(),
        status: 'published',
        external_post_id: body.externalPostId || null,
        engagement_metrics: { _metadata: body.metadata || {} },
      }).select('*').single();
      if (error) return localOnly(error.message);
      return jsonOk(data);
    }

    return localOnly('unknown_action');
  } catch (error) {
    return localOnly(error instanceof Error ? error.message : 'persistence_failed');
  }
}

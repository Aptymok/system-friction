import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { studioFieldMetadataFromUnknown, type StudioFieldMetadata, type StudioPersistedFieldEdge, type StudioPersistedFieldNode } from '@/lib/studio/field/studioFieldState';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Row = Record<string, unknown>;
type FieldAction = 'create_attractor' | 'create_node' | 'update_node' | 'archive_node' | 'link_nodes' | 'unlink_nodes' | 'attach_object';

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function text(value: unknown, max = 240): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}
function boundedNumber(value: unknown, min: number, max: number): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : null;
}
function relation(value: unknown): StudioPersistedFieldEdge['relationType'] {
  const normalized = String(value ?? '').toUpperCase();
  return ['CONTAINS', 'DERIVED_FROM', 'INFLUENCES', 'PROJECTS'].includes(normalized)
    ? normalized as StudioPersistedFieldEdge['relationType']
    : 'DERIVED_FROM';
}

async function latestOwnedSession(ownerId: string, requestedSessionId: string | null) {
  const db = createServiceSupabaseClient();
  let query = db.from('studio_sessions').select('*').eq('owner_id', ownerId);
  const result = requestedSessionId
    ? await query.eq('id', requestedSessionId).maybeSingle()
    : await query.order('updated_at', { ascending: false }).limit(1).maybeSingle();
  return { db, row: result.data ? record(result.data) : null, error: result.error };
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAuthenticatedUser();
    const body = await request.json().catch(() => null) as Row | null;
    if (!body) return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
    const action = text(body.action, 64) as FieldAction | null;
    const allowed: FieldAction[] = ['create_attractor', 'create_node', 'update_node', 'archive_node', 'link_nodes', 'unlink_nodes', 'attach_object'];
    if (!action || !allowed.includes(action)) return NextResponse.json({ ok: false, error: 'INVALID_FIELD_ACTION' }, { status: 400 });

    const requestedSessionId = text(body.sessionId, 80);
    const resolved = await latestOwnedSession(user.id, requestedSessionId);
    const db = resolved.db;
    let session = resolved.row;
    const now = new Date().toISOString();

    if (requestedSessionId && (resolved.error || !session)) return NextResponse.json({ ok: false, error: 'STUDIO_SESSION_NOT_FOUND' }, { status: 404 });
    if (!session && action !== 'create_attractor') return NextResponse.json({ ok: false, error: 'ATTRACTOR_REQUIRED' }, { status: 409 });

    if (!session) {
      const label = text(body.label) ?? 'Atractor';
      const field: StudioFieldMetadata = {
        version: 'STUDIO_FIELD_V1',
        attractor: { id: randomUUID(), label, method: 'MOP-H', declaredAt: now, description: text(body.description, 1200) },
        nodes: [],
        edges: [],
      };
      const created = await db.from('studio_sessions').insert({
        title: text(body.sessionTitle) ?? `${label} · Studio Field`,
        status: 'active',
        owner_id: user.id,
        metadata: { source: 'studio_field_v1', field },
      }).select('*').single();
      if (created.error || !created.data) return NextResponse.json({ ok: false, error: 'FIELD_CREATE_FAILED', details: created.error?.message }, { status: 503 });
      session = record(created.data);
      await db.from('studio_archive_events').insert({
        session_id: String(session.id), owner_id: user.id, event_type: 'ATTRACTOR_CREATED', label, source: 'studio_field_v1', payload: { nodeId: field.attractor?.id, method: 'MOP-H', epistemicClass: 'DECLARED' },
      });
      return NextResponse.json({ ok: true, sessionId: String(session.id), field }, { status: 201 });
    }

    const metadata = record(session.metadata);
    const field = studioFieldMetadataFromUnknown(metadata);

    if (action === 'create_attractor') {
      if (field.attractor) return NextResponse.json({ ok: false, error: 'ATTRACTOR_ALREADY_EXISTS' }, { status: 409 });
      const label = text(body.label) ?? 'Atractor';
      field.attractor = { id: randomUUID(), label, method: 'MOP-H', declaredAt: now, description: text(body.description, 1200) };
    } else if (action === 'create_node') {
      if (!field.attractor) return NextResponse.json({ ok: false, error: 'ATTRACTOR_REQUIRED' }, { status: 409 });
      const label = text(body.label);
      if (!label) return NextResponse.json({ ok: false, error: 'NODE_LABEL_REQUIRED' }, { status: 400 });
      const kind = body.kind === 'project' ? 'project' as const : 'node' as const;
      const parentId = text(body.parentId, 80) ?? field.attractor.id;
      if (parentId !== field.attractor.id && !field.nodes.some((item) => item.id === parentId)) return NextResponse.json({ ok: false, error: 'PARENT_NODE_NOT_FOUND' }, { status: 404 });
      const node: StudioPersistedFieldNode = { id: randomUUID(), kind, label, description: text(body.description, 1200), parentId, x: boundedNumber(body.x, -1, 1), y: boundedNumber(body.y, -1, 1), createdAt: now, updatedAt: now, archivedAt: null };
      field.nodes.push(node);
      field.edges.push({ id: randomUUID(), sourceId: parentId, targetId: node.id, relationType: kind === 'project' ? 'CONTAINS' : 'DERIVED_FROM', createdAt: now });
      await db.from('studio_archive_events').insert({ session_id: String(session.id), owner_id: user.id, event_type: kind === 'project' ? 'PROJECT_CREATED' : 'NODE_CREATED', label, source: 'studio_field_v1', payload: { nodeId: node.id, parentId } });
    } else if (action === 'update_node') {
      const nodeId = text(body.nodeId, 80);
      const index = field.nodes.findIndex((item) => item.id === nodeId);
      if (!nodeId || index < 0) return NextResponse.json({ ok: false, error: 'NODE_NOT_FOUND' }, { status: 404 });
      const node = field.nodes[index];
      field.nodes[index] = { ...node, label: text(body.label) ?? node.label, description: body.description === null ? null : text(body.description, 1200) ?? node.description, x: body.x === undefined ? node.x : boundedNumber(body.x, -1, 1), y: body.y === undefined ? node.y : boundedNumber(body.y, -1, 1), updatedAt: now };
    } else if (action === 'archive_node') {
      const nodeId = text(body.nodeId, 80);
      const index = field.nodes.findIndex((item) => item.id === nodeId);
      if (!nodeId || index < 0) return NextResponse.json({ ok: false, error: 'NODE_NOT_FOUND' }, { status: 404 });
      field.nodes[index] = { ...field.nodes[index], archivedAt: now, updatedAt: now };
      field.edges = field.edges.filter((edge) => edge.sourceId !== nodeId && edge.targetId !== nodeId);
      await db.from('studio_archive_events').insert({ session_id: String(session.id), owner_id: user.id, event_type: 'NODE_ARCHIVED', label: field.nodes[index].label, source: 'studio_field_v1', payload: { nodeId } });
    } else if (action === 'link_nodes') {
      const sourceId = text(body.sourceId, 80);
      const targetId = text(body.targetId, 80);
      const known = new Set([field.attractor?.id, ...field.nodes.map((node) => node.id)].filter((item): item is string => Boolean(item)));
      if (!sourceId || !targetId || sourceId === targetId || !known.has(sourceId) || !known.has(targetId)) return NextResponse.json({ ok: false, error: 'INVALID_NODE_LINK' }, { status: 400 });
      const relationType = relation(body.relationType);
      if (!field.edges.some((edge) => edge.sourceId === sourceId && edge.targetId === targetId && edge.relationType === relationType)) field.edges.push({ id: randomUUID(), sourceId, targetId, relationType, createdAt: now });
    } else if (action === 'unlink_nodes') {
      const edgeId = text(body.edgeId, 80);
      if (!edgeId) return NextResponse.json({ ok: false, error: 'EDGE_ID_REQUIRED' }, { status: 400 });
      field.edges = field.edges.filter((edge) => edge.id !== edgeId);
    } else if (action === 'attach_object') {
      const objectId = text(body.objectId, 80);
      const nodeId = text(body.nodeId, 80);
      const known = new Set([field.attractor?.id, ...field.nodes.map((node) => node.id)].filter((item): item is string => Boolean(item)));
      if (!objectId || !nodeId || !known.has(nodeId)) return NextResponse.json({ ok: false, error: 'INVALID_OBJECT_NODE_LINK' }, { status: 400 });
      const objectResult = await db.from('studio_objects').select('id,metadata').eq('id', objectId).eq('session_id', String(session.id)).eq('owner_id', user.id).maybeSingle();
      if (objectResult.error || !objectResult.data) return NextResponse.json({ ok: false, error: 'OBJECT_NOT_FOUND' }, { status: 404 });
      const objectMetadata = record(objectResult.data.metadata);
      const objectUpdate = await db.from('studio_objects').update({ metadata: { ...objectMetadata, fieldNodeId: nodeId }, updated_at: now }).eq('id', objectId);
      if (objectUpdate.error) return NextResponse.json({ ok: false, error: 'OBJECT_LINK_FAILED', details: objectUpdate.error.message }, { status: 503 });
      await db.from('studio_archive_events').insert({ session_id: String(session.id), object_id: objectId, owner_id: user.id, event_type: 'OBJECT_LINKED_TO_NODE', label: objectId, source: 'studio_field_v1', payload: { nodeId } });
    }

    const updated = await db.from('studio_sessions').update({ metadata: { ...metadata, field }, updated_at: now }).eq('id', String(session.id)).eq('owner_id', user.id);
    if (updated.error) return NextResponse.json({ ok: false, error: 'FIELD_UPDATE_FAILED', details: updated.error.message }, { status: 503 });
    return NextResponse.json({ ok: true, sessionId: String(session.id), field });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'STUDIO_FIELD_FAILED', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

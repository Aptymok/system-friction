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
  // Empty input means no coordinate. Number(null) and Number('') would
  // otherwise silently turn a missing position into a real zero.
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : null;
}
function relation(value: unknown): StudioPersistedFieldEdge['relationType'] {
  const normalized = String(value ?? '').toUpperCase();
  return ['CONTAINS', 'DERIVED_FROM', 'INFLUENCES', 'PROJECTS', 'PRECEDES'].includes(normalized)
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
    const createNewSession = action==='create_attractor'&&body.createNewSession===true;
    if(createNewSession&&requestedSessionId)return NextResponse.json({
      ok:false,error:'NEW_SESSION_CANNOT_TARGET_EXISTING_SESSION'
    },{status:400});
    const resolved = createNewSession
      ?{db:createServiceSupabaseClient(),row:null as Row|null,error:null}
      :await latestOwnedSession(user.id, requestedSessionId);
    const db = resolved.db;
    let session = resolved.row;
    const now = new Date().toISOString();

    // Failure to read the current session must never create a duplicate
    // attractor. Only an authoritative empty read permits first creation.
    if (resolved.error) return NextResponse.json({
      ok:false,error:'STUDIO_SESSION_READ_UNAVAILABLE'
    },{status:503});
    if (requestedSessionId && !session) return NextResponse.json({
      ok:false,error:'STUDIO_SESSION_NOT_FOUND'
    },{status:404});
    if (!session && action !== 'create_attractor') return NextResponse.json({ ok: false, error: 'ATTRACTOR_REQUIRED' }, { status: 409 });

    if (!session) {
      const label = text(body.label) ?? 'Atractor';
      const field: StudioFieldMetadata = {
        version:'STUDIO_FIELD_V1',
        attractor:{ id:randomUUID(),label,method:'MOP-H',declaredAt:now,
          description:text(body.description,1200) },
        nodes:[],edges:[],
      };
      const created=await db.from('studio_sessions').insert({
        title:text(body.sessionTitle)??(label+' · Studio Field'),
        status:'active',owner_id:user.id,
        metadata:{source:'studio_field_v1',field},
      }).select('id,metadata').single();
      if(created.error||!created.data)return NextResponse.json({
        ok:false,error:'FIELD_CREATE_FAILED'
      },{status:503});
      const readback=await db.from('studio_sessions').select('id,metadata')
        .eq('id',String(created.data.id)).eq('owner_id',user.id).maybeSingle();
      if(readback.error||!readback.data||!studioFieldMetadataFromUnknown(readback.data.metadata).attractor){
        return NextResponse.json({ok:false,error:'FIELD_CREATION_READBACK_UNVERIFIED'},{status:503});
      }
      const logged=await db.from('studio_archive_events').insert({
        session_id:String(created.data.id),owner_id:user.id,event_type:'ATTRACTOR_CREATED',
        label,source:'studio_field_v1',
        payload:{nodeId:field.attractor?.id ?? '',method:'MOP-H',epistemicClass:'DECLARED'},
      }).select('id').maybeSingle();
      return NextResponse.json({
        ok:true,sessionId:String(created.data.id),field,
        persistence:'INDEPENDENTLY_REREAD',
        auditEventStatus:logged.error?'WRITE_FAILED':'RECORDED_NOT_REREAD',
        publicationAuthorized:false,
      },{status:201,headers:{'Cache-Control':'private, no-store'}});
    }

    const metadata = record(session.metadata);
    const field = studioFieldMetadataFromUnknown(metadata);

    const pendingEvents:Array<{
      event_type:string;label:string;source:string;payload:Record<string,unknown>;
    }>=[];
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
      pendingEvents.push({event_type:kind==='project'?'PROJECT_CREATED':'NODE_CREATED',
        label,source:'studio_field_v1',payload:{nodeId:node.id,parentId}});
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
      pendingEvents.push({event_type:'NODE_ARCHIVED',label:field.nodes[index].label,
        source:'studio_field_v1',payload:{nodeId}});
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
      const objectId=text(body.objectId,80);
      const nodeId=text(body.nodeId,80);
      const known=new Set([field.attractor?.id,
        ...field.nodes.filter(n=>!n.archivedAt).map(node=>node.id)]
        .filter((item):item is string=>Boolean(item)));
      if(!objectId||!nodeId||!known.has(nodeId)){
        return NextResponse.json({ok:false,error:'INVALID_OBJECT_NODE_LINK'},{status:400});
      }
      // An object attachment changes only studio_objects. Do not rewrite an
      // unrelated session revision or log an event before a successful update.
      const objectResult=await db.from('studio_objects')
        .select('id,metadata,updated_at')
        .eq('id',objectId).eq('session_id',String(session.id))
        .eq('owner_id',user.id).maybeSingle();
      if(objectResult.error||!objectResult.data){
        return NextResponse.json({ok:false,error:'OBJECT_NOT_IN_OWNED_SESSION'},{status:403});
      }
      const previous=record(objectResult.data.metadata);
      const unchanged=previous.fieldNodeId===nodeId;
      if(!unchanged){
        let update=db.from('studio_objects')
          .update({metadata:{...previous,fieldNodeId:nodeId},updated_at:now})
          .eq('id',objectId).eq('session_id',String(session.id))
          .eq('owner_id',user.id);
        if(typeof objectResult.data.updated_at==='string'){
          update=update.eq('updated_at',objectResult.data.updated_at);
        }
        const response=await update.select('id').maybeSingle();
        if(response.error)return NextResponse.json({ok:false,error:'OBJECT_LINK_FAILED'},{status:503});
        if(!response.data)return NextResponse.json({ok:false,error:'OBJECT_LINK_CONFLICT'},{status:409});
      }
      const readback=await db.from('studio_objects').select('id,metadata')
        .eq('id',objectId).eq('owner_id',user.id)
        .eq('session_id',String(session.id)).maybeSingle();
      if(readback.error||record(readback.data?.metadata).fieldNodeId!==nodeId){
        return NextResponse.json({ok:false,error:'OBJECT_LINK_READBACK_UNVERIFIED'},{status:503});
      }
      let eventStatus='NOT_APPLICABLE';
      if(!unchanged){
        const event=await db.from('studio_archive_events').insert({
          session_id:String(session.id),object_id:objectId,owner_id:user.id,
          event_type:'OBJECT_LINKED_TO_NODE',label:objectId,source:'studio_field_v1',
          payload:{nodeId,epistemicClass:'DECLARED',source:'OWNER_SCOPED_FIELD_LINK'},
        }).select('id').maybeSingle();
        eventStatus=event.error?'WRITE_FAILED':'RECORDED_NOT_REREAD';
      }
      return NextResponse.json({
        ok:true,sessionId:String(session.id),field,
        persistence:'INDEPENDENTLY_REREAD',
        archiveEventStatus:eventStatus,
        objectLinked:true,publicationAuthorized:false,authorityGranted:false,
      },{headers:{'Cache-Control':'private, no-store'}});
    }

    // Optimistic concurrency prevents silently overwriting another editor's field.
    let mutation=db.from('studio_sessions')
      .update({metadata:{...metadata,field},updated_at:now})
      .eq('id',String(session.id)).eq('owner_id',user.id);
    if(typeof session.updated_at==='string')mutation=mutation.eq('updated_at',session.updated_at);
    const updated=await mutation.select('id').maybeSingle();
    if(updated.error)return NextResponse.json({ok:false,error:'FIELD_UPDATE_FAILED'},{status:503});
    if(!updated.data)return NextResponse.json({ok:false,error:'FIELD_EDIT_CONFLICT'},{status:409});
    const readback=await db.from('studio_sessions').select('id,metadata')
      .eq('id',String(session.id)).eq('owner_id',user.id).maybeSingle();
    if(readback.error||!readback.data)return NextResponse.json({
      ok:false,error:'FIELD_READBACK_UNAVAILABLE'
    },{status:503});
    const persisted=studioFieldMetadataFromUnknown(readback.data.metadata);
    // Normalization hides archived nodes by design. Compare equivalent
    // normalized views, otherwise a successful archive write is reported as
    // a false readback failure even when its persisted state is correct.
    const intended=JSON.stringify(studioFieldMetadataFromUnknown({field}));
    const observed=JSON.stringify(persisted);
    if(intended!==observed)return NextResponse.json({
      ok:false,error:'FIELD_READBACK_MISMATCH'
    },{status:503});
    let archiveEventStatus='NOT_APPLICABLE';
    if(pendingEvents.length){
      const insert=await db.from('studio_archive_events').insert(pendingEvents.map(event=>({
        ...event,session_id:String(session.id),owner_id:user.id,
      }))).select('id');
      archiveEventStatus=insert.error?'WRITE_FAILED':'RECORDED_NOT_REREAD';
    }
    return NextResponse.json({
      ok:true,sessionId:String(session.id),field:persisted,
      persistence:'INDEPENDENTLY_REREAD',archiveEventStatus,
      publicationAuthorized:false,authorityGranted:false,
    },{headers:{'Cache-Control':'private, no-store'}});
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'STUDIO_FIELD_FAILED', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

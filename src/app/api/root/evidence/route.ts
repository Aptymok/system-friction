import { NextResponse } from 'next/server';
import { appendOperationalEvent, buildMutationLogbookRow, createActionProposal, sha256, stringValue } from '@/lib/operational/common';
import { auditRootAction, asRecord, requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const gate = await requireRootActor('evidence.write');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await req.json().catch(() => ({}));
  const content = stringValue(body.content) ?? stringValue(body.text) ?? stringValue(body.entry);
  if (!content) return NextResponse.json({ ok: false, error: 'evidence_content_required' }, { status: 400 });

  const title = stringValue(body.title) ?? 'root.evidence';
  const evidenceType = stringValue(body.evidenceType) ?? 'root_evidence';
  const targetNodeId = stringValue(body.targetNodeId);
  const proposalType = stringValue(body.proposalType);
  const payload = {
    title,
    content,
    evidenceType,
    targetNodeId,
    source: stringValue(body.source) ?? 'root_console',
    metadata: asRecord(body.metadata),
  };
  const evidenceHash = sha256(payload);
  const service = gate.ctx.service;

  const existing = await service
    .from('root_evidence_entries')
    .select('*')
    .eq('evidence_hash', evidenceHash)
    .maybeSingle();

  if (existing.error) return NextResponse.json({ ok: false, error: 'root_evidence_lookup_failed', details: existing.error.message }, { status: 400 });
  if (existing.data) {
    const audit = await auditRootAction({
      actorId: gate.ctx.user.id,
      action: 'evidence.duplicate_seen',
      target: 'root_evidence_entries',
      payload: { evidenceHash, evidenceId: existing.data.id },
      request: req,
    });
    if (!audit.ok) return NextResponse.json(audit, { status: 500 });
    return NextResponse.json({ ok: true, duplicate: true, data: existing.data });
  }

  const event = await appendOperationalEvent({
    eventName: 'root.evidence.recorded',
    actorId: gate.ctx.user.id,
    confidence: 0.9,
    payload: { ...payload, evidenceHash },
    lineage: [],
  });
  if (!event.ok) return NextResponse.json(event, { status: 400 });

  const evidenceInsert = await service
    .from('root_evidence_entries')
    .insert({
      evidence_hash: evidenceHash,
      actor_id: gate.ctx.user.id,
      title,
      content,
      evidence_type: evidenceType,
      target_node_id: targetNodeId,
      payload,
      epistemic_event_id: event.data.id,
    })
    .select('*')
    .single();
  if (evidenceInsert.error) return NextResponse.json({ ok: false, error: 'root_evidence_insert_failed', details: evidenceInsert.error.message }, { status: 400 });

  const evidenceNodeId = `root_evidence:${evidenceHash.slice(0, 24)}`;
  const graphNode = await service
  .from('graph_nodes')
  .upsert({
    node_key: evidenceNodeId,
    node_id: evidenceNodeId,
    label: title,
    node_type: 'INF',
    ontology_type: 'evidence',
    profile: 'sfi',
    q_n: 0.5,
    d_n: 0,
    co_n: 1,
    u_n: 0,
    origin: 'root_console',
    epistemic_class: 'observed',
    confidence: 0.9,
    payload: { evidenceHash, evidenceType, rootEvidenceId: evidenceInsert.data.id, targetNodeId },
    lineage: [String(event.data.event_id ?? event.data.id)],
    attributes: { evidenceHash, evidenceType, rootEvidenceId: evidenceInsert.data.id, targetNodeId },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'node_key' })
  .select('*')
  .single();

  let graphEdge = null;
  if (targetNodeId && !graphNode.error) {
  const edgeId = `${evidenceNodeId}->${targetNodeId}`;
  const edge = await service
    .from('graph_edges')
    .upsert({
      edge_id: edgeId,
      source_node_key: evidenceNodeId,
      target_node_key: targetNodeId,
      source_node_id: evidenceNodeId,
      target_node_id: targetNodeId,
      relation_type: 'structural_inferred',
      relation: 'supports',
      w_ij: 0.72,
      weight: 0.72,
      confidence: 0.9,
      evidence_ids: [String(event.data.id)],
      payload: { evidenceHash, verified: true },
      lineage: [String(event.data.event_id ?? event.data.id)],
      attributes: { evidenceHash, verified: true },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'source_node_key,target_node_key,relation_type' })
    .select('*')
    .maybeSingle();

  graphEdge = edge.error ? { error: edge.error.message } : edge.data;
}

  const proposal = proposalType
    ? await createActionProposal({
      proposalType,
      actorId: gate.ctx.user.id,
      title: `root.evidence.${proposalType}`,
      objective: stringValue(body.objective) ?? `Procesar evidencia root: ${title}`,
      graphNodeCount: 1,
      graphEdgeCount: graphEdge && !('error' in graphEdge) ? 1 : 0,
      inputVectorHash: evidenceHash,
      contentHash: evidenceHash,
      status: 'proposed',
      eventId: event.data.id,
      payload: { ...payload, evidenceHash, rootEvidenceId: evidenceInsert.data.id },
    })
    : null;

  const mutation = await service
    .from('logbook_mutations')
    .insert(buildMutationLogbookRow({
      proposalId: proposal?.ok ? proposal.data.id : evidenceInsert.data.id,
      eventId: event.data.id,
      actorId: gate.ctx.user.id,
      mutationType: 'root_evidence',
      status: proposal?.ok ? 'proposed' : 'queued',
      target: 'root_evidence_entries',
      currentState: null,
      proposedState: payload,
      coherenceDelta: 0,
      payload: { ...payload, evidenceHash, rootEvidenceId: evidenceInsert.data.id, proposalId: proposal?.ok ? proposal.data.id : null },
    }))
    .select('*')
    .single();

  if (mutation.error) return NextResponse.json({ ok: false, error: 'logbook_evidence_insert_failed', details: mutation.error.message }, { status: 400 });

  const audit = await auditRootAction({
    actorId: gate.ctx.user.id,
    action: 'evidence.write',
    target: 'root_evidence_entries',
    payload: { evidenceHash, evidenceId: evidenceInsert.data.id, eventId: event.data.id, proposalId: proposal?.ok ? proposal.data.id : null },
    request: req,
  });
  if (!audit.ok) return NextResponse.json(audit, { status: 500 });

  return NextResponse.json({
    ok: true,
    data: {
      evidence: evidenceInsert.data,
      epistemicEvent: event.data,
      graphNode: graphNode.error ? { error: graphNode.error.message } : graphNode.data,
      graphEdge,
      mutation: mutation.data,
      proposal,
      audit,
    },
  }, { status: 201 });
}

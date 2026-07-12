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
    node_id: evidenceNodeId,
    label: title,
    ontology_type: 'evidence',
    lineage: [String(event.data.event_id ?? event.data.id)],
    attributes: { evidenceHash, evidenceType, rootEvidenceId: evidenceInsert.data.id, targetNodeId },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'node_id' })
  .select('*')
  .single();

  let graphEdge = null;
  if (targetNodeId && !graphNode.error) {
    const target = await service.from('graph_nodes').select('node_id').eq('node_id', targetNodeId).maybeSingle();
    if (target.error || !target.data) {
      graphEdge = { error: target.error?.message ?? 'target_node_missing' };
    } else {
      const edgeId = `${evidenceNodeId}->${targetNodeId}:supports`;
      const edge = await service
        .from('graph_edges')
        .upsert({
          edge_id: edgeId,
          source_node_id: evidenceNodeId,
          target_node_id: targetNodeId,
          relation: 'supports',
          weight: 0.72,
          lineage: [String(event.data.event_id ?? event.data.id)],
          attributes: { evidenceHash, verified: true, epistemicClass: 'observed', confidence: 0.9 },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'edge_id' })
        .select('*')
        .maybeSingle();
      graphEdge = edge.error ? { error: edge.error.message } : edge.data;
    }
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

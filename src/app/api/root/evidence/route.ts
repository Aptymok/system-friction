import { createHash, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { appendOperationalEvent, buildMutationLogbookRow, createActionProposal, sha256, stringValue } from '@/lib/operational/common';
import { auditRootAction, asRecord, requireRootActor } from '@/lib/root/server';
import { ingestRootEvidenceIntoCognitiveTwin } from '@/lib/cognitive-twin/evidenceIngestion';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const ROOT_EVIDENCE_BUCKET = 'root-evidence';
const MAX_ATTACHMENT_BYTES = 80 * 1024 * 1024;

type ParsedEvidence = {
  title: string | null;
  content: string | null;
  evidenceType: string | null;
  targetNodeId: string | null;
  proposalType: string | null;
  objective: string | null;
  source: string | null;
  metadata: Record<string, unknown>;
  file: File | null;
};

function formText(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function safeFileName(value: string) {
  return value.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 180) || 'evidence.bin';
}

async function parseEvidenceRequest(request: Request): Promise<ParsedEvidence> {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const maybeFile = form.get('file');
    const caseId = formText(form, 'caseId');
    const domain = formText(form, 'domain');
    return {
      title: formText(form, 'title'),
      content: formText(form, 'content') ?? formText(form, 'text') ?? formText(form, 'entry'),
      evidenceType: formText(form, 'evidenceType'),
      targetNodeId: formText(form, 'targetNodeId'),
      proposalType: formText(form, 'proposalType'),
      objective: formText(form, 'objective'),
      source: formText(form, 'source'),
      metadata: {
        ...(caseId ? { caseId } : {}),
        ...(domain ? { domain } : {}),
        captureMode: 'root_topology_multipart_v1',
      },
      file: maybeFile instanceof File && maybeFile.size > 0 ? maybeFile : null,
    };
  }

  const body = await request.json().catch(() => ({}));
  return {
    title: stringValue(body.title),
    content: stringValue(body.content) ?? stringValue(body.text) ?? stringValue(body.entry),
    evidenceType: stringValue(body.evidenceType),
    targetNodeId: stringValue(body.targetNodeId),
    proposalType: stringValue(body.proposalType),
    objective: stringValue(body.objective),
    source: stringValue(body.source),
    metadata: asRecord(body.metadata),
    file: null,
  };
}

export async function POST(req: Request) {
  const gate = await requireRootActor('evidence.write');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const input = await parseEvidenceRequest(req);
  if (input.file && input.file.size > MAX_ATTACHMENT_BYTES) {
    return NextResponse.json({ ok: false, error: 'evidence_attachment_too_large', maxBytes: MAX_ATTACHMENT_BYTES, receivedBytes: input.file.size }, { status: 413 });
  }
  if (!input.content && !input.file) return NextResponse.json({ ok: false, error: 'evidence_content_or_attachment_required' }, { status: 400 });

  const title = input.title ?? input.file?.name ?? 'root.evidence';
  const evidenceType = input.evidenceType ?? 'root_evidence';
  const targetNodeId = input.targetNodeId;
  const proposalType = input.proposalType;
  const service = gate.ctx.service;

  let attachment: Record<string, unknown> | null = null;
  let attachmentBytes: Buffer | null = null;
  if (input.file) {
    attachmentBytes = Buffer.from(await input.file.arrayBuffer());
    attachment = {
      fileName: input.file.name,
      mimeType: input.file.type || 'application/octet-stream',
      sizeBytes: input.file.size,
      sha256: createHash('sha256').update(attachmentBytes).digest('hex'),
    };
  }

  const content = input.content ?? `Archivo adjunto: ${input.file?.name ?? 'evidence'}`;
  const payload = {
    title,
    content,
    evidenceType,
    targetNodeId,
    source: input.source ?? 'root_console',
    metadata: { ...input.metadata, ...(attachment ? { attachment } : {}) },
  };
  const evidenceHash = sha256(payload);

  const existing = await service.from('root_evidence_entries').select('*').eq('evidence_hash', evidenceHash).maybeSingle();
  if (existing.error) return NextResponse.json({ ok: false, error: 'root_evidence_lookup_failed', details: existing.error.message }, { status: 400 });
  if (existing.data) {
    const [audit, cognitiveTwin] = await Promise.all([
      auditRootAction({ actorId: gate.ctx.user.id, action: 'evidence.duplicate_seen', target: 'root_evidence_entries', payload: { evidenceHash, evidenceId: existing.data.id }, request: req }),
      ingestRootEvidenceIntoCognitiveTwin(existing.data),
    ]);
    if (!audit.ok) return NextResponse.json(audit, { status: 500 });
    return NextResponse.json({ ok: true, duplicate: true, data: existing.data, cognitiveTwin });
  }

  let storagePath: string | null = null;
  if (input.file && attachmentBytes && attachment) {
    const currentBucket = await service.storage.getBucket(ROOT_EVIDENCE_BUCKET);
    if (currentBucket.error) {
      const message = currentBucket.error.message.toLowerCase();
      if (!message.includes('not found') && !message.includes('does not exist')) return NextResponse.json({ ok: false, error: 'root_evidence_bucket_unavailable', details: currentBucket.error.message }, { status: 503 });
      const created = await service.storage.createBucket(ROOT_EVIDENCE_BUCKET, { public: false, fileSizeLimit: MAX_ATTACHMENT_BYTES });
      if (created.error) return NextResponse.json({ ok: false, error: 'root_evidence_bucket_create_failed', details: created.error.message }, { status: 503 });
    }

    storagePath = `${gate.ctx.user.id}/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${randomUUID()}-${safeFileName(input.file.name)}`;
    const uploaded = await service.storage.from(ROOT_EVIDENCE_BUCKET).upload(storagePath, attachmentBytes, { contentType: input.file.type || 'application/octet-stream', upsert: false });
    if (uploaded.error) return NextResponse.json({ ok: false, error: 'root_evidence_attachment_upload_failed', details: uploaded.error.message }, { status: 503 });
    attachment = { ...attachment, bucket: ROOT_EVIDENCE_BUCKET, storagePath };
    payload.metadata = { ...payload.metadata, attachment };
  }

  const event = await appendOperationalEvent({ eventName: 'root.evidence.recorded', actorId: gate.ctx.user.id, confidence: 0.9, payload: { ...payload, evidenceHash }, lineage: [] });
  if (!event.ok) {
    if (storagePath) await service.storage.from(ROOT_EVIDENCE_BUCKET).remove([storagePath]);
    return NextResponse.json(event, { status: 400 });
  }

  const evidenceInsert = await service.from('root_evidence_entries').insert({
    evidence_hash: evidenceHash,
    actor_id: gate.ctx.user.id,
    title,
    content,
    evidence_type: evidenceType,
    target_node_id: targetNodeId,
    payload,
    epistemic_event_id: event.data.id,
  }).select('*').single();
  if (evidenceInsert.error) {
    if (storagePath) await service.storage.from(ROOT_EVIDENCE_BUCKET).remove([storagePath]);
    return NextResponse.json({ ok: false, error: 'root_evidence_insert_failed', details: evidenceInsert.error.message }, { status: 400 });
  }

  const evidenceNodeId = `root_evidence:${evidenceHash.slice(0, 24)}`;
  const graphNode = await service.from('graph_nodes').upsert({
    node_id: evidenceNodeId,
    label: title,
    ontology_type: 'evidence',
    lineage: [String(event.data.event_id ?? event.data.id)],
    attributes: { evidenceHash, evidenceType, rootEvidenceId: evidenceInsert.data.id, targetNodeId, attachment },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'node_id' }).select('*').single();

  let graphEdge = null;
  if (targetNodeId && !graphNode.error) {
    const target = await service.from('graph_nodes').select('node_id').eq('node_id', targetNodeId).maybeSingle();
    if (target.error || !target.data) graphEdge = { error: target.error?.message ?? 'target_node_missing' };
    else {
      const edge = await service.from('graph_edges').upsert({
        edge_id: `${evidenceNodeId}->${targetNodeId}:supports`,
        source_node_id: evidenceNodeId,
        target_node_id: targetNodeId,
        relation: 'supports',
        weight: 0.72,
        lineage: [String(event.data.event_id ?? event.data.id)],
        attributes: { evidenceHash, verified: false, epistemicClass: 'observed', confidence: 0.9, attachment },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'edge_id' }).select('*').maybeSingle();
      graphEdge = edge.error ? { error: edge.error.message } : edge.data;
    }
  }

  const proposal = proposalType ? await createActionProposal({
    proposalType,
    actorId: gate.ctx.user.id,
    title: `root.evidence.${proposalType}`,
    objective: input.objective ?? `Procesar evidencia root: ${title}`,
    graphNodeCount: 1,
    graphEdgeCount: graphEdge && !('error' in graphEdge) ? 1 : 0,
    inputVectorHash: evidenceHash,
    contentHash: evidenceHash,
    status: 'proposed',
    eventId: event.data.id,
    payload: { ...payload, evidenceHash, rootEvidenceId: evidenceInsert.data.id },
  }) : null;

  const mutation = await service.from('logbook_mutations').insert(buildMutationLogbookRow({
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
  })).select('*').single();
  if (mutation.error) return NextResponse.json({ ok: false, error: 'logbook_evidence_insert_failed', details: mutation.error.message }, { status: 400 });

  const [audit, cognitiveTwin] = await Promise.all([
    auditRootAction({ actorId: gate.ctx.user.id, action: 'evidence.write', target: 'root_evidence_entries', payload: { evidenceHash, evidenceId: evidenceInsert.data.id, eventId: event.data.id, proposalId: proposal?.ok ? proposal.data.id : null, attachment }, request: req }),
    ingestRootEvidenceIntoCognitiveTwin(evidenceInsert.data),
  ]);
  if (!audit.ok) return NextResponse.json(audit, { status: 500 });

  return NextResponse.json({
    ok: true,
    data: {
      evidence: evidenceInsert.data,
      attachment,
      epistemicEvent: event.data,
      graphNode: graphNode.error ? { error: graphNode.error.message } : graphNode.data,
      graphEdge,
      mutation: mutation.data,
      proposal,
      cognitiveTwin,
      audit,
    },
  }, { status: 201 });
}

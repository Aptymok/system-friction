import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { readMethodLabState } from '@/lib/method-lab/readModel';
import { runMethodLabSimulation } from '@/lib/method-lab/simulationRun';
import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { appendOperationalEvent, recordValue, sha256 } from '@/lib/operational/common';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { authorizeExternalRequest, externalActor } from '@/lib/sfi/externalAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type LabOperation = 'state' | 'report' | 'persist' | 'run';
type PersistSemanticInput = {
  title: string;
  content: string;
  source: unknown;
  refs: string[];
  metadata: Record<string, unknown>;
  confidence: number;
};

function operationScope(operation: LabOperation) {
  if (operation === 'state' || operation === 'report') return 'lab:read';
  if (operation === 'persist') return 'lab:write';
  return 'lab:run';
}

function normalizedCommandId(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 240) : '';
}

function persistEventId(commandId: string) {
  return `external-method-lab-persist:${createHash('sha256').update(commandId).digest('hex')}`;
}

function persistFingerprint(input: PersistSemanticInput) {
  return sha256(input);
}

function existingPersistFingerprint(row: Record<string, unknown>) {
  const payload = recordValue(row.payload);
  const stored = typeof payload.commandFingerprint === 'string' ? payload.commandFingerprint : '';
  if (stored) return stored;
  return persistFingerprint({
    title: typeof payload.title === 'string' ? payload.title : '',
    content: typeof payload.content === 'string' ? payload.content : '',
    source: payload.source ?? 'github_lab_bridge',
    refs: Array.isArray(payload.refs) ? payload.refs.filter((value): value is string => typeof value === 'string') : [],
    metadata: recordValue(payload.metadata),
    confidence: typeof row.confidence === 'number' ? row.confidence : Number(row.confidence ?? 0),
  });
}

async function readExistingPersist(commandId: string) {
  const db = createServiceSupabaseClient();
  return db.from('epistemic_events')
    .select('id,sequence,event_id,event_name,epistemic_class,source,confidence,payload,lineage,occurred_at,created_at,hash_self')
    .eq('event_name', 'external.method_lab.record.persisted')
    .contains('payload', { commandId })
    .order('sequence', { ascending: true })
    .limit(1)
    .maybeSingle();
}

function idempotentPersistResponse(input: {
  operation: LabOperation;
  actorId: string;
  commandId: string;
  incomingFingerprint: string;
  existing: Record<string, unknown>;
}) {
  const existingFingerprint = existingPersistFingerprint(input.existing);
  if (existingFingerprint !== input.incomingFingerprint) {
    return NextResponse.json({
      ok: false,
      error: 'method_lab_persist_command_id_conflict',
      commandId: input.commandId,
      existingEventId: input.existing.event_id ?? null,
    }, { status: 409 });
  }
  return NextResponse.json({ ok: true, operation: input.operation, actor: input.actorId, idempotent: true, event: input.existing }, { status: 200 });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const operation = String(body.operation || 'state') as LabOperation;
  if (!['state', 'report', 'persist', 'run'].includes(operation)) {
    return NextResponse.json({ ok: false, error: 'unsupported_lab_operation' }, { status: 400 });
  }

  const auth = authorizeExternalRequest(req, operationScope(operation));
  const cred = auth.credential;
  if (!cred) {
    return NextResponse.json({
      ok: false,
      error: 'unauthorized',
      auth: {
        tokenPresent: auth.tokenPresent,
        registryConfigured: auth.registryConfigured,
        scopeAllowed: auth.scopeAllowed,
        acceptedHeaders: ['Authorization: Bearer <token>', 'X-SFI-Token: <token>'],
      },
    }, { status: 401 });
  }
  const actorId = externalActor(cred);

  if (operation === 'state') {
    const state = await readMethodLabState();
    return NextResponse.json({ ok: true, operation, actor: actorId, lab: state });
  }

  if (operation === 'report') {
    const db = createServiceSupabaseClient();
    const [analyses, evaluations] = await Promise.all([
      db.from('sfi_lab_analyses').select('id,mode,source,data_mode,limitations,recommendations,raw_analysis,created_at').order('created_at', { ascending: false }).limit(100),
      db.from('sfi_cognitive_twin_evaluations').select('id,provider,model,test_key,test_version,outcome,evidence_refs,executed_at,executor,observed_result').order('executed_at', { ascending: false }).limit(100),
    ]);
    return NextResponse.json({ ok: !analyses.error && !evaluations.error, operation, actor: actorId, data: { analyses: analyses.data ?? [], evaluations: evaluations.data ?? [] }, warnings: [analyses.error?.message, evaluations.error?.message].filter(Boolean) });
  }

  if (operation === 'persist') {
    const title = String(body.title || '').trim();
    const content = String(body.content || '').trim();
    if (!title || !content) return NextResponse.json({ ok: false, error: 'title_and_content_required' }, { status: 400 });

    const commandId = normalizedCommandId(body.commandId);
    const requestedConfidence = typeof body.confidence === 'number' ? body.confidence : 1;
    const confidenceIsValid = Number.isFinite(requestedConfidence) && requestedConfidence >= 0 && requestedConfidence <= 1;
    const confidence = confidenceIsValid ? requestedConfidence : 0;
    const refs = Array.isArray(body.refs) ? body.refs.filter((value): value is string => typeof value === 'string') : [];
    const metadata = body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata as Record<string, unknown> : {};
    const source = body.source ?? 'github_lab_bridge';
    const incomingFingerprint = persistFingerprint({ title, content, source, refs, metadata, confidence });

    if (commandId) {
      const existing = await readExistingPersist(commandId);
      if (existing.error) {
        return NextResponse.json({ ok: false, error: 'method_lab_persist_idempotency_lookup_failed', details: existing.error.message }, { status: 500 });
      }
      if (existing.data) {
        return idempotentPersistResponse({ operation, actorId, commandId, incomingFingerprint, existing: existing.data as Record<string, unknown> });
      }
    }

    const payload = {
      title,
      content,
      source,
      commandId: commandId || null,
      commandFingerprint: incomingFingerprint,
      refs,
      metadata,
      credentialLabel: cred.label ?? null,
      delegatedRole: cred.role ?? 'agent',
      confidenceState: confidenceIsValid ? 'EXPLICIT' : 'UNASSESSED',
    };

    const event = await appendEpistemicEvent({
      eventId: commandId ? persistEventId(commandId) : undefined,
      eventName: 'external.method_lab.record.persisted',
      epistemicClass: 'derived',
      confidence,
      payload,
      occurredAt: new Date().toISOString(),
      source: { sourceId: 'SYSTEM_FRICTION_INSTITUTE', sourceType: 'operational_runtime' },
      logbookId: 'BR',
      lineage: refs,
      uncertainty: confidenceIsValid ? undefined : 'Confidence not assessed; numeric zero is a schema sentinel, not a measurement.',
    });

    if (!event.ok && commandId) {
      // `event_id` is UNIQUE. If two requests race with the same commandId,
      // the deterministic event id lets the database reject the duplicate;
      // reread the winning event and return idempotent success only when the
      // semantic command fingerprint is identical.
      const existing = await readExistingPersist(commandId);
      if (!existing.error && existing.data) {
        return idempotentPersistResponse({ operation, actorId, commandId, incomingFingerprint, existing: existing.data as Record<string, unknown> });
      }
    }

    return NextResponse.json(event.ok ? { ok: true, operation, actor: actorId, idempotent: false, event: event.data } : event, { status: event.ok ? 201 : 500 });
  }

  if (cred.role !== 'root_delegate') return NextResponse.json({ ok: false, error: 'root_delegate_required_for_lab_runtime' }, { status: 403 });
  const protocolId = body.protocolId === 'sociotechnical_simulation' || body.protocolId === 'economic_simulation' ? body.protocolId : null;
  const evidenceIds = Array.isArray(body.evidenceIds) ? body.evidenceIds.filter((value): value is string => typeof value === 'string' && value.trim().length > 0) : [];
  if (!protocolId || !evidenceIds.length) return NextResponse.json({ ok: false, error: 'protocolId_and_persisted_evidenceIds_required' }, { status: 400 });
  if (body.confirm !== true) return NextResponse.json({ ok: false, error: 'explicit_runtime_confirmation_required' }, { status: 400 });

  const parameters = body.parameters && typeof body.parameters === 'object' && !Array.isArray(body.parameters) ? body.parameters as Record<string, unknown> : {};
  const cognitiveSpineContextRefs = Array.isArray(body.cognitiveSpineContextRefs) ? body.cognitiveSpineContextRefs.filter((value): value is string => typeof value === 'string' && value.trim().length > 0) : [];

  try {
    const result = await runMethodLabSimulation({ protocolId, evidenceIds, actorId, parameters: { ...parameters, externalLabBridge: true, credentialLabel: cred.label ?? null }, cognitiveSpineContextRefs });
    const trace = await appendOperationalEvent({ eventName: 'external.method_lab.runtime.executed', actorId, confidence: 1, payload: { labAnalysisId: result.labAnalysisId, labRunId: result.run.labRunId, resultHash: result.run.resultHash, protocolId, evidenceIds, credentialLabel: cred.label ?? null, delegatedRole: cred.role }, lineage: [result.labAnalysisId, ...evidenceIds] });
    return NextResponse.json({ ok: true, operation, actor: actorId, result, trace: trace.ok ? trace.data : trace });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'external_method_lab_runtime_failed', details: error instanceof Error ? error.message : String(error) }, { status: 503 });
  }
}

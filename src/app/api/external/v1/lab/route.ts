import { NextResponse } from 'next/server';
import { readMethodLabState } from '@/lib/method-lab/readModel';
import { runMethodLabSimulation } from '@/lib/method-lab/simulationRun';
import { appendOperationalEvent } from '@/lib/operational/common';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type ExternalCredential = {
  label?: string;
  scopes?: string[];
  role?: 'agent' | 'root_delegate';
  actorId?: string;
};

type LabOperation = 'state' | 'report' | 'persist' | 'run';

function credential(req: Request, scope: string): ExternalCredential | null {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  try {
    const map = JSON.parse(process.env.SFI_EXTERNAL_API_KEYS_JSON || '{}') as Record<string, ExternalCredential>;
    const found = map[token];
    if (!found) return null;
    const scopes = found.scopes ?? [];
    return scopes.includes(scope) || scopes.includes('*') ? found : null;
  } catch {
    return null;
  }
}

function actor(cred: ExternalCredential) {
  return cred.actorId?.trim() || `external:${cred.label?.trim() || 'agent'}`;
}

function operationScope(operation: LabOperation) {
  if (operation === 'state' || operation === 'report') return 'lab:read';
  if (operation === 'persist') return 'lab:write';
  return 'lab:run';
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const operation = String(body.operation || 'state') as LabOperation;
  if (!['state', 'report', 'persist', 'run'].includes(operation)) {
    return NextResponse.json({ ok: false, error: 'unsupported_lab_operation' }, { status: 400 });
  }

  const cred = credential(req, operationScope(operation));
  if (!cred) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const actorId = actor(cred);

  if (operation === 'state') {
    const state = await readMethodLabState();
    return NextResponse.json({ ok: true, operation, actor: actorId, lab: state });
  }

  if (operation === 'report') {
    const db = createServiceSupabaseClient();
    const [analyses, evaluations] = await Promise.all([
      db.from('sfi_lab_analyses')
        .select('id,mode,source,data_mode,limitations,recommendations,raw_analysis,created_at')
        .order('created_at', { ascending: false })
        .limit(100),
      db.from('sfi_cognitive_twin_evaluations')
        .select('id,provider,model,test_key,test_version,outcome,evidence_refs,executed_at,executor,observed_result')
        .order('executed_at', { ascending: false })
        .limit(100),
    ]);
    return NextResponse.json({
      ok: !analyses.error && !evaluations.error,
      operation,
      actor: actorId,
      data: {
        analyses: analyses.data ?? [],
        evaluations: evaluations.data ?? [],
      },
      warnings: [analyses.error?.message, evaluations.error?.message].filter(Boolean),
    });
  }

  if (operation === 'persist') {
    const title = String(body.title || '').trim();
    const content = String(body.content || '').trim();
    if (!title || !content) {
      return NextResponse.json({ ok: false, error: 'title_and_content_required' }, { status: 400 });
    }
    const event = await appendOperationalEvent({
      eventName: 'external.method_lab.record.persisted',
      actorId,
      confidence: typeof body.confidence === 'number' ? body.confidence : 1,
      payload: {
        title,
        content,
        source: body.source ?? 'github_lab_bridge',
        commandId: body.commandId ?? null,
        refs: Array.isArray(body.refs) ? body.refs : [],
        metadata: body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : {},
        credentialLabel: cred.label ?? null,
        delegatedRole: cred.role ?? 'agent',
      },
      lineage: Array.isArray(body.refs) ? body.refs.filter((value): value is string => typeof value === 'string') : [],
    });
    return NextResponse.json(event.ok
      ? { ok: true, operation, actor: actorId, event: event.data }
      : event,
      { status: event.ok ? 201 : 500 });
  }

  if (cred.role !== 'root_delegate') {
    return NextResponse.json({ ok: false, error: 'root_delegate_required_for_lab_runtime' }, { status: 403 });
  }
  const protocolId = body.protocolId === 'sociotechnical_simulation' || body.protocolId === 'economic_simulation'
    ? body.protocolId
    : null;
  const evidenceIds = Array.isArray(body.evidenceIds)
    ? body.evidenceIds.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : [];
  if (!protocolId || !evidenceIds.length) {
    return NextResponse.json({ ok: false, error: 'protocolId_and_persisted_evidenceIds_required' }, { status: 400 });
  }
  if (body.confirm !== true) {
    return NextResponse.json({ ok: false, error: 'explicit_runtime_confirmation_required' }, { status: 400 });
  }

  const parameters = body.parameters && typeof body.parameters === 'object' && !Array.isArray(body.parameters)
    ? body.parameters as Record<string, unknown>
    : {};
  const cognitiveSpineContextRefs = Array.isArray(body.cognitiveSpineContextRefs)
    ? body.cognitiveSpineContextRefs.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : [];

  try {
    const result = await runMethodLabSimulation({
      protocolId,
      evidenceIds,
      actorId,
      parameters: {
        ...parameters,
        externalLabBridge: true,
        credentialLabel: cred.label ?? null,
      },
      cognitiveSpineContextRefs,
    });
    const trace = await appendOperationalEvent({
      eventName: 'external.method_lab.runtime.executed',
      actorId,
      confidence: 1,
      payload: {
        labAnalysisId: result.labAnalysisId,
        labRunId: result.run.labRunId,
        resultHash: result.run.resultHash,
        protocolId,
        evidenceIds,
        credentialLabel: cred.label ?? null,
        delegatedRole: cred.role,
      },
      lineage: [result.labAnalysisId, ...evidenceIds],
    });
    return NextResponse.json({ ok: true, operation, actor: actorId, result, trace: trace.ok ? trace.data : trace });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'external_method_lab_runtime_failed',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 503 });
  }
}

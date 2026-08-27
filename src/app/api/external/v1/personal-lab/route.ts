import { NextResponse } from 'next/server';
import { authorizeExternalRequest, externalActor, externalAuthError } from '@/lib/sfi/externalAuth';
import {
  createPersonalCase,
  persistPersonalEvidence,
  readPersonalCognitiveWorkspace,
  runPersonalLab,
} from '@/lib/sfi/personal/cognitiveWorkspace';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type Row = Record<string, unknown>;

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function operationScope(operation: string) {
  if (operation === 'state' || operation === 'report') return 'lab:read';
  if (operation === 'run') return 'lab:run';
  return 'lab:write';
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as Row;
  const operation = String(body.operation || 'state');
  const scope = operationScope(operation);
  const auth = authorizeExternalRequest(req, scope);
  const credential = auth.credential;
  if (!credential) return NextResponse.json(externalAuthError(auth, scope), { status: 401 });
  if (credential.authMethod !== 'oauth' || !credential.subjectId) {
    return NextResponse.json({ ok: false, error: 'oauth_subject_required_for_personal_lab' }, { status: 403 });
  }

  const ownerId = credential.subjectId;
  try {
    if (operation === 'state' || operation === 'report') {
      const workspace = await readPersonalCognitiveWorkspace(ownerId);
      return NextResponse.json({
        ok: workspace.ok,
        operation,
        actor: externalActor(credential),
        ownershipBoundary: 'owner_id == OAuth subjectId',
        workspace: operation === 'report'
          ? { cognitiveRuns: workspace.cognitiveRuns, labRuns: workspace.labRuns, cases: workspace.cases, warnings: workspace.warnings }
          : workspace,
      });
    }

    if (operation === 'create_case') {
      const created = await createPersonalCase({
        ownerId,
        title: String(body.title || ''),
        domain: typeof body.domain === 'string' ? body.domain : undefined,
        objective: String(body.objective || ''),
        baseline: typeof body.baseline === 'string' ? body.baseline : undefined,
        verificationWindow: body.verificationWindow === '72h' || body.verificationWindow === '30d' ? body.verificationWindow : '7d',
      });
      return NextResponse.json({ ok: true, operation, case: created, actor: externalActor(credential) }, { status: 201 });
    }

    if (operation === 'persist') {
      const evidence = await persistPersonalEvidence({
        ownerId,
        caseId: String(body.caseId || ''),
        label: String(body.label || body.title || ''),
        content: String(body.content || ''),
        source: typeof body.source === 'string' ? body.source : 'chatgpt_action',
        reliability: typeof body.reliability === 'number' ? body.reliability : 1,
        evidenceType: typeof body.evidenceType === 'string' ? body.evidenceType : undefined,
        uri: typeof body.uri === 'string' ? body.uri : null,
        observedAt: typeof body.observedAt === 'string' ? body.observedAt : null,
      });
      return NextResponse.json({ ok: true, operation, evidence, actor: externalActor(credential) }, { status: 201 });
    }

    if (operation === 'run') {
      const protocolId = body.protocolId === 'economic_simulation'
        ? 'economic_simulation'
        : body.protocolId === 'sociotechnical_simulation'
          ? 'sociotechnical_simulation'
          : null;
      if (!protocolId) return NextResponse.json({ ok: false, error: 'PERSONAL_LAB_PROTOCOL_NOT_SUPPORTED' }, { status: 400 });
      const result = await runPersonalLab({
        ownerId,
        protocolId,
        caseId: String(body.caseId || ''),
        evidenceIds: strings(body.evidenceIds),
        objective: typeof body.objective === 'string' ? body.objective : undefined,
        parameters: record(body.parameters),
      });
      return NextResponse.json({ ...result, operation, actor: externalActor(credential) }, { status: result.ok ? 201 : 207 });
    }

    return NextResponse.json({
      ok: false,
      error: 'unsupported_personal_lab_operation',
      allowed: ['state', 'report', 'create_case', 'persist', 'run'],
    }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes('NOT_FOUND') ? 404 : message.includes('REQUIRED') || message.includes('NOT_SUPPORTED') ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

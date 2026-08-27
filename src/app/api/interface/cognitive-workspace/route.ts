import { NextResponse } from 'next/server';
import { AccessDeniedError, requireUserProfile } from '@/lib/system/access/server';
import {
  createPersonalCase,
  persistPersonalEvidence,
  readPersonalCognitiveWorkspace,
  runPersonalCognitive,
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

function statusForError(error: unknown) {
  if (error instanceof AccessDeniedError) return error.status;
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('NOT_FOUND')) return 404;
  if (message.includes('REQUIRED') || message.includes('NOT_SUPPORTED')) return 400;
  return 500;
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return NextResponse.json({ ok: false, error: message }, { status: statusForError(error) });
}

export async function GET() {
  try {
    const context = await requireUserProfile();
    const workspace = await readPersonalCognitiveWorkspace(context.user.id);
    return NextResponse.json({
      ok: workspace.ok,
      principal: {
        subjectId: context.user.id,
        alias: context.profile.alias ?? null,
        workspace: 'personal',
      },
      workspace,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const context = await requireUserProfile();
    const body = await req.json().catch(() => ({})) as Row;
    const operation = String(body.operation || 'state');

    if (operation === 'state') {
      const workspace = await readPersonalCognitiveWorkspace(context.user.id);
      return NextResponse.json({ ok: workspace.ok, operation, workspace });
    }

    if (operation === 'create_case') {
      const created = await createPersonalCase({
        ownerId: context.user.id,
        title: String(body.title || ''),
        domain: typeof body.domain === 'string' ? body.domain : undefined,
        objective: String(body.objective || ''),
        baseline: typeof body.baseline === 'string' ? body.baseline : undefined,
        verificationWindow: body.verificationWindow === '72h' || body.verificationWindow === '30d' ? body.verificationWindow : '7d',
      });
      return NextResponse.json({ ok: true, operation, case: created }, { status: 201 });
    }

    if (operation === 'persist') {
      const evidence = await persistPersonalEvidence({
        ownerId: context.user.id,
        caseId: String(body.caseId || ''),
        label: String(body.label || body.title || ''),
        content: String(body.content || ''),
        source: typeof body.source === 'string' ? body.source : undefined,
        reliability: typeof body.reliability === 'number' ? body.reliability : 1,
        evidenceType: typeof body.evidenceType === 'string' ? body.evidenceType : undefined,
        uri: typeof body.uri === 'string' ? body.uri : null,
        observedAt: typeof body.observedAt === 'string' ? body.observedAt : null,
      });
      return NextResponse.json({ ok: true, operation, evidence }, { status: 201 });
    }

    if (operation === 'cognitive') {
      const result = await runPersonalCognitive({
        ownerId: context.user.id,
        objective: String(body.objective || body.question || ''),
        caseId: typeof body.caseId === 'string' && body.caseId.trim() ? body.caseId.trim() : null,
        evidenceIds: strings(body.evidenceIds),
        requestedAutomations: strings(body.requestedAutomations),
        cognitiveIntents: strings(body.cognitiveIntents),
      });
      return NextResponse.json({ ...result, operation }, { status: result.ok ? 201 : 207 });
    }

    if (operation === 'lab') {
      const protocolId = body.protocolId === 'economic_simulation' ? 'economic_simulation' : body.protocolId === 'sociotechnical_simulation' ? 'sociotechnical_simulation' : null;
      if (!protocolId) return NextResponse.json({ ok: false, error: 'PERSONAL_LAB_PROTOCOL_NOT_SUPPORTED' }, { status: 400 });
      const result = await runPersonalLab({
        ownerId: context.user.id,
        protocolId,
        caseId: String(body.caseId || ''),
        evidenceIds: strings(body.evidenceIds),
        objective: typeof body.objective === 'string' ? body.objective : undefined,
        parameters: record(body.parameters),
      });
      return NextResponse.json({ ...result, operation }, { status: result.ok ? 201 : 207 });
    }

    return NextResponse.json({
      ok: false,
      error: 'unsupported_personal_workspace_operation',
      allowed: ['state', 'create_case', 'persist', 'cognitive', 'lab'],
    }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}

import { NextResponse } from 'next/server';
import { authorizeExternalRequest, externalActor, externalAuthError } from '@/lib/sfi/externalAuth';
import { readPersonalCognitiveWorkspace, runPersonalCognitive } from '@/lib/sfi/personal/cognitiveWorkspace';
import {
  proposePersonCognitivePattern,
  readPersonCognitivePatterns,
  resolvePersonCognitivePattern,
  SFI_PERSON_PATTERN_CATEGORIES,
} from '@/lib/sfi/personal/cognitivePatternLedger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type Row = Record<string, unknown>;

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}
function text(value: unknown) { return typeof value === 'string' && value.trim() ? value.trim() : null; }

function operationScope(operation: string) {
  if (operation === 'run') return 'lab:run';
  if (['propose_pattern', 'confirm_pattern', 'reject_pattern', 'learn_declared_pattern'].includes(operation)) return 'lab:write';
  return 'lab:read';
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as Row;
  const operation = String(body.operation || 'state');
  const requiredScope = operationScope(operation);
  const auth = authorizeExternalRequest(req, requiredScope);
  const credential = auth.credential;
  if (!credential) return NextResponse.json(externalAuthError(auth, requiredScope), { status: 401 });

  if (credential.authMethod !== 'oauth' || !credential.subjectId) {
    return NextResponse.json({ ok: false, error: 'oauth_subject_required_for_personal_cognitive' }, { status: 403 });
  }
  const ownerId = credential.subjectId;

  try {
    if (operation === 'state') {
      const [workspace, patterns] = await Promise.all([
        readPersonalCognitiveWorkspace(ownerId),
        readPersonCognitivePatterns(ownerId, 80),
      ]);
      return NextResponse.json({
        ok: workspace.ok && patterns.ok,
        operation,
        actor: externalActor(credential),
        ownershipBoundary: 'owner_id == OAuth subjectId',
        workspace,
        cognitivePatterns: patterns,
      });
    }

    if (operation === 'patterns') {
      const patterns = await readPersonCognitivePatterns(ownerId, 160);
      return NextResponse.json({
        ...patterns,
        operation,
        actor: externalActor(credential),
        categories: SFI_PERSON_PATTERN_CATEGORIES,
        ownershipBoundary: 'PERSON_CT owner == OAuth subjectId; institutional inheritance is denied by default.',
      });
    }

    if (operation === 'propose_pattern') {
      const statement = text(body.statement);
      if (!statement) return NextResponse.json({ ok: false, error: 'statement_required' }, { status: 400 });
      const result = await proposePersonCognitivePattern({
        ownerId,
        dimension: body.dimension,
        category: body.category,
        statement,
        operationalMeaning: text(body.operationalMeaning),
        useCases: strings(body.useCases),
        conditions: strings(body.conditions),
        counterSignals: strings(body.counterSignals),
        supportingRunIds: strings(body.supportingRunIds),
        supportingEvidenceIds: strings(body.supportingEvidenceIds),
        selfDeclared: body.selfDeclared === true,
        confidence: typeof body.confidence === 'number' ? body.confidence : undefined,
      });
      return NextResponse.json({
        ...result,
        operation,
        actor: externalActor(credential),
        ownershipBoundary: 'Pattern is private PERSON_CT state and cannot become institutional Cognitive Spine state by inheritance.',
      }, { status: result.ok ? (result.idempotent ? 200 : 201) : 409 });
    }

    if (operation === 'learn_declared_pattern') {
      const statement = text(body.statement);
      if (!statement) return NextResponse.json({ ok: false, error: 'statement_required' }, { status: 400 });
      const proposed = await proposePersonCognitivePattern({
        ownerId,
        dimension: body.dimension,
        category: body.category,
        statement,
        operationalMeaning: text(body.operationalMeaning),
        useCases: strings(body.useCases),
        conditions: strings(body.conditions),
        counterSignals: strings(body.counterSignals),
        supportingRunIds: [],
        supportingEvidenceIds: [],
        selfDeclared: true,
        confidence: typeof body.confidence === 'number' ? body.confidence : 0.7,
      });
      if (!proposed.ok) {
        return NextResponse.json({ ...proposed, operation, actor: externalActor(credential) }, { status: 409 });
      }
      const resolved = await resolvePersonCognitivePattern({
        ownerId,
        patternId: proposed.patternId,
        disposition: 'CONFIRMED',
        note: text(body.note) ?? 'Explicit owner request to learn/remember/apply this personal interaction rule.',
      });
      return NextResponse.json({
        ok: resolved.ok,
        operation,
        proposed,
        resolved,
        actor: externalActor(credential),
        ownershipBoundary: 'This is an explicitly owner-confirmed PERSON_CT representation. It is private, reversible only through a new governed representation, and cannot become institutional state by inheritance.',
        epistemicBoundary: 'The owner confirmation establishes the interaction preference as an accepted PERSON_CT representation, not as proof of a universal or permanent cognitive trait.',
      }, { status: resolved.ok ? (proposed.idempotent && resolved.idempotent ? 200 : 201) : 409 });
    }

    if (operation === 'confirm_pattern' || operation === 'reject_pattern') {
      const patternId = text(body.patternId);
      if (!patternId) return NextResponse.json({ ok: false, error: 'patternId_required' }, { status: 400 });
      const result = await resolvePersonCognitivePattern({
        ownerId,
        patternId,
        disposition: operation === 'confirm_pattern' ? 'CONFIRMED' : 'REJECTED',
        note: text(body.note),
      });
      return NextResponse.json({
        ...result,
        operation,
        actor: externalActor(credential),
        ownershipBoundary: 'Confirmation accepts an owner-scoped representation; it does not establish universality or institutional applicability.',
      }, { status: result.ok ? (result.idempotent ? 200 : 201) : 409 });
    }

    if (operation === 'run') {
      const result = await runPersonalCognitive({
        ownerId,
        objective: String(body.objective || body.question || ''),
        caseId: typeof body.caseId === 'string' && body.caseId.trim() ? body.caseId.trim() : null,
        evidenceIds: strings(body.evidenceIds),
        requestedAutomations: strings(body.requestedAutomations),
        cognitiveIntents: strings(body.cognitiveIntents),
      });
      return NextResponse.json({
        ...result,
        operation,
        actor: externalActor(credential),
        ownershipBoundary: 'owner_id == OAuth subjectId',
        next: 'A run does not automatically create a PERSON_CT pattern. Recurrent patterns must be proposed with supporting owner-scoped refs and confirmed/rejected separately.',
      }, { status: result.ok ? 201 : 207 });
    }

    return NextResponse.json({
      ok: false,
      error: 'unsupported_cognitive_operation',
      allowed: ['state', 'patterns', 'propose_pattern', 'learn_declared_pattern', 'confirm_pattern', 'reject_pattern', 'run'],
    }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes('NOT_FOUND') ? 404 : message.includes('REQUIRED') || message.includes('NOT_OWNED') ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

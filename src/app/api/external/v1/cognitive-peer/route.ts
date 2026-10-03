import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';

import { appendEpistemicEvent } from '@/lib/events/eventStore';
import {
  SFI_EXTERNAL_COGNITIVE_PEER_CONTRACT,
  SFI_EXTERNAL_COGNITIVE_PEER_POLICY,
  findForbiddenCognitivePeerKey,
  projectExternalCognitivePeerModel,
  projectExternalCognitivePeerResponse,
} from '@/lib/sfi/externalCognitivePeer';
import { buildSfiCognitiveBootstrap } from '@/lib/sfi/cognitiveBootstrap';
import { authorizeExternalRequest, externalActor, externalAuthError } from '@/lib/sfi/externalAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function text(value: unknown, max = 12_000) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}
function strings(value: unknown, limit = 100) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, limit).map((item) => item.trim())
    : [];
}
function institutionalOauth(credential: NonNullable<ReturnType<typeof authorizeExternalRequest>['credential']>) {
  return credential.authMethod === 'oauth' && (credential.tenantId ?? 'sfi') === 'sfi' && Boolean(credential.subjectId);
}

export async function GET(req: Request) {
  const auth = authorizeExternalRequest(req, 'observe');
  if (!auth.credential) return NextResponse.json(externalAuthError(auth, 'observe'), { status: 401 });
  if (!institutionalOauth(auth.credential)) {
    return NextResponse.json({ ok: false, error: 'institutional_user_bound_oauth_required' }, { status: 403 });
  }

  const url = new URL(req.url);
  const caseId = url.searchParams.get('caseId')?.trim() || null;
  const bootstrap = await buildSfiCognitiveBootstrap({
    actorId: externalActor(auth.credential),
    subjectId: auth.credential.subjectId ?? null,
    tenantId: auth.credential.tenantId ?? 'sfi',
    role: auth.credential.role ?? 'agent',
    scopes: auth.credential.scopes ?? [],
    caseId,
  });

  return NextResponse.json({
    ok: true,
    contract: SFI_EXTERNAL_COGNITIVE_PEER_CONTRACT,
    generatedAt: new Date().toISOString(),
    peerMode: SFI_EXTERNAL_COGNITIVE_PEER_POLICY.role,
    principal: bootstrap.principal,
    capsuleHash: bootstrap.capsuleHash,
    authority: {
      contextScope: SFI_EXTERNAL_COGNITIVE_PEER_POLICY.contextScope,
      submitScope: SFI_EXTERNAL_COGNITIVE_PEER_POLICY.submitScope,
      authorityExpanded: false,
      modelCapabilityImpliesAuthority: false,
      mayMintReturn: false,
      mayMintTruth: false,
      mayPromoteCanon: false,
    },
    responseContract: {
      persistedEpistemicClass: SFI_EXTERNAL_COGNITIVE_PEER_POLICY.persistedEpistemicClass,
      allowedOutputs: SFI_EXTERNAL_COGNITIVE_PEER_POLICY.allowedOutputs,
      prohibitedEffects: SFI_EXTERNAL_COGNITIVE_PEER_POLICY.prohibitedEffects,
      requiredOnSubmit: ['capsuleHash', 'task', 'response'],
      nextActionRule: SFI_EXTERNAL_COGNITIVE_PEER_POLICY.nextActionRule,
    },
    context: {
      institutionalContract: bootstrap.institutionalContract,
      cognitiveSpine: bootstrap.cognitiveSpine,
      boundedInstitutionalContext: bootstrap.boundedInstitutionalContext,
      learning: bootstrap.learning,
      operationalState: bootstrap.operationalState,
      warnings: bootstrap.warnings,
    },
    submit: {
      method: 'POST',
      path: '/api/external/v1/cognitive-peer',
      operationId: 'submitSfiExternalCognitivePeerResponse',
      requiredScope: 'lab:write',
    },
    epistemicBoundary: 'This context may support reasoning but is not a new observation. A submitted peer response is persisted as INFERRED only and cannot itself become evidence, RETURN, governance, learning promotion or canon.',
  }, {
    headers: {
      'Cache-Control': 'no-store',
      'X-SFI-External-Cognitive-Peer': SFI_EXTERNAL_COGNITIVE_PEER_CONTRACT,
      'X-SFI-Capsule-Hash': bootstrap.capsuleHash,
    },
  });
}

export async function POST(req: Request) {
  const auth = authorizeExternalRequest(req, 'lab:write');
  if (!auth.credential) return NextResponse.json(externalAuthError(auth, 'lab:write'), { status: 401 });
  if (!institutionalOauth(auth.credential)) {
    return NextResponse.json({ ok: false, error: 'institutional_user_bound_oauth_required' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as Row;
  const forbiddenKey = findForbiddenCognitivePeerKey(body);
  if (forbiddenKey) {
    return NextResponse.json({
      ok: false,
      error: 'external_cognitive_peer_forbidden_authority_claim',
      forbiddenKey,
      boundary: SFI_EXTERNAL_COGNITIVE_PEER_POLICY.prohibitedEffects,
    }, { status: 400 });
  }

  const capsuleHash = text(body.capsuleHash, 256);
  const task = row(body.task);
  const response = projectExternalCognitivePeerResponse(body.response);
  if (!capsuleHash || !response.summary) {
    return NextResponse.json({ ok: false, error: 'capsule_hash_task_and_response_summary_required' }, { status: 400 });
  }

  const actorId = externalActor(auth.credential);
  const tenantId = auth.credential.tenantId ?? 'sfi';
  const peerResponseId = text(body.peerResponseId, 256) ?? randomUUID();
  const lineage = Array.from(new Set([
    capsuleHash,
    ...strings(body.lineage, 100),
    ...response.claims.flatMap((item) => item.evidenceRefs),
    ...response.hypotheses.flatMap((item) => item.evidenceRefs),
    ...response.rivalHypotheses.flatMap((item) => item.evidenceRefs),
    ...response.proposedActions.flatMap((item) => item.evidenceRefs),
  ])).slice(0, 300);

  const event = await appendEpistemicEvent({
    eventName: 'SFI_EXTERNAL_COGNITIVE_PEER_RESPONSE_RECEIVED',
    epistemicClass: 'inferred',
    confidence: typeof body.confidence === 'number' ? Math.max(0, Math.min(1, body.confidence)) : 0.5,
    payload: {
      contract: SFI_EXTERNAL_COGNITIVE_PEER_CONTRACT,
      peerResponseId,
      actorId,
      tenantId,
      capsuleHash,
      task: {
        question: text(task.question, 12_000),
        objective: text(task.objective, 12_000),
        caseId: text(task.caseId, 256),
        cycleId: text(task.cycleId, 256),
      },
      model: projectExternalCognitivePeerModel(body.model),
      response,
      authorityBoundary: {
        authorityExpanded: false,
        acceptedEvidenceCreated: false,
        observedReturnCreated: false,
        governanceDecisionCreated: false,
        executionAuthorized: false,
        learningPromoted: false,
        canonPromoted: false,
      },
      receivedAt: new Date().toISOString(),
    },
    occurredAt: new Date().toISOString(),
    source: { sourceId: actorId, sourceType: 'external_cognitive_peer' },
    logbookId: `external-cognitive-peer:${capsuleHash}`,
    lineage,
    uncertainty: text(body.uncertainty, 2_000) ?? 'External cognitive peer output is an inference until separately tested, evidenced and contrasted.',
    returnMode: 'receipt',
  });

  if (!event.ok) return NextResponse.json(event, { status: 500 });

  return NextResponse.json({
    ok: true,
    contract: SFI_EXTERNAL_COGNITIVE_PEER_CONTRACT,
    peerResponseId,
    eventId: String(event.data.event_id ?? ''),
    epistemicClass: 'INFERRED',
    authorityExpanded: false,
    next: {
      evidence: 'Use existing evidence-candidate/evidence owners; this peer route cannot admit evidence.',
      proposal: 'Use proposeSfiAction only if the inference crosses a governed decision boundary.',
      execution: 'Use existing queue/capability-grant owners; this peer route cannot execute.',
      return: 'Use an existing observed RETURN owner only after a real outcome exists; this peer route cannot mint RETURN.',
      learning: 'Calibration and governed promotion remain separate.',
    },
  }, { status: 201 });
}

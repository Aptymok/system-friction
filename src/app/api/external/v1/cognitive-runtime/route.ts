import { NextResponse } from 'next/server';
import {
  authorizeExternalRequest,
  externalActor,
  externalAuthError,
  type ExternalCredential,
} from '@/lib/sfi/externalAuth';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from '@/lib/sfi/cognitive-runtime/convergedRegistry';
import {
  compactExecutionContract,
  executionContractForAgent,
  listExecutionContracts,
} from '@/lib/sfi/cognitive-runtime/executionContracts';
import { readAgentExecutionDossier } from '@/lib/sfi/cognitive-runtime/agentDossierRead';
import {
  executeManualCognitiveAgent,
  SFI_MANUAL_COGNITIVE_EXECUTION_VERSION,
} from '@/lib/sfi/cognitive-runtime/manualExecution';
import { readObservedSfiCognitiveRuntime } from '@/lib/sfi/cognitive-runtime/observedRuntime';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

export const SFI_EXTERNAL_COGNITIVE_RUNTIME_VERSION = 'SFI-EXTERNAL-COGNITIVE-RUNTIME-1.0' as const;

type Row = Record<string, unknown>;

function text(value: unknown, max = 500) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

function number(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function compactPassport(agent: (typeof SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY)[number]) {
  return {
    id: agent.id,
    name: agent.name,
    purpose: agent.purpose,
    domain: agent.domain,
    layer: agent.layer,
    authority: agent.authorityLevel,
    simulationAllowed: agent.simulationAllowed,
    humanApprovalRequired: agent.humanApprovalRequired,
    reads: agent.readsMemory,
    writes: agent.writesMemory,
    emits: agent.emits,
  };
}

function principal(credential: ExternalCredential) {
  return {
    actorId: externalActor(credential),
    subjectId: credential.subjectId ?? null,
    tenantId: credential.tenantId ?? 'sfi',
    role: credential.role ?? 'agent',
    authMethod: credential.authMethod ?? 'static_token',
    scopes: credential.scopes ?? [],
  };
}

function boundary() {
  return {
    auditUnit: 'EXECUTION',
    contextIsEvidence: false,
    inferenceIsObservation: false,
    authorityExpandedByModel: false,
    executionScopeImpliesApproval: false,
    executionScopeImpliesCanonicalPromotion: false,
    personalWorkspaceInheritance: false,
    historyAbsenceMeansNonExistence: false,
    telemetryIsEvidence: false,
    openTelemetryIsTruthAuthority: false,
    duplicateCanonicalEventReads: 0,
  };
}

export async function GET(request: Request) {
  const auth = authorizeExternalRequest(request, 'observe');
  const credential = auth.credential;
  if (!credential) return NextResponse.json(externalAuthError(auth, 'observe'), { status: 401 });

  const url = new URL(request.url);
  const agentId = text(url.searchParams.get('agentId'), 120);
  const executionId = text(url.searchParams.get('executionId'), 500);
  const limit = Math.max(1, Math.min(200, number(url.searchParams.get('limit'), 80)));

  if (!agentId) {
    return NextResponse.json({
      ok: true,
      apiVersion: SFI_EXTERNAL_COGNITIVE_RUNTIME_VERSION,
      executionApiVersion: SFI_MANUAL_COGNITIVE_EXECUTION_VERSION,
      principal: principal(credential),
      runtime: await readObservedSfiCognitiveRuntime(),
      agents: SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.map(compactPassport),
      executionContracts: listExecutionContracts().map(compactExecutionContract),
      boundary: boundary(),
    }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const agent = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.find((item) => item.id === agentId);
  if (!agent) return NextResponse.json({ ok: false, error: 'agent_not_found' }, { status: 404 });
  const contract = executionContractForAgent(agentId);
  if (!contract) return NextResponse.json({ ok: false, error: 'execution_contract_not_found' }, { status: 409 });

  const dossier = await readAgentExecutionDossier({
    agentId,
    executionId: executionId ?? undefined,
    historyLimit: limit,
  });

  return NextResponse.json({
    ok: true,
    apiVersion: SFI_EXTERNAL_COGNITIVE_RUNTIME_VERSION,
    executionApiVersion: SFI_MANUAL_COGNITIVE_EXECUTION_VERSION,
    principal: principal(credential),
    passport: compactPassport(agent),
    contract: compactExecutionContract(contract),
    state: dossier.state,
    history: dossier.history,
    historyRead: {
      generatedAt: dossier.generatedAt,
      source: dossier.source,
      readLimit: dossier.eventReadLimit,
      requestedHistoryLimit: dossier.historyLimit,
      exhaustive: dossier.exhaustive,
      warnings: dossier.warnings,
      oneCanonicalEventReadPerDossier: true,
    },
    assurance: dossier.assurance,
    assuranceRead: {
      generatedAt: dossier.generatedAt,
      source: dossier.source,
      readLimit: dossier.eventReadLimit,
      exhaustive: dossier.exhaustive,
      warnings: dossier.warnings,
      reusedHistoryRead: true,
    },
    boundary: boundary(),
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const auth = authorizeExternalRequest(request, 'execute');
  const credential = auth.credential;
  if (!credential) return NextResponse.json(externalAuthError(auth, 'execute'), { status: 401 });

  if (credential.authMethod !== 'oauth' || !credential.subjectId) {
    return NextResponse.json({
      ok: false,
      error: 'user_bound_oauth_required_for_cognitive_execution',
      boundary: boundary(),
    }, { status: 403 });
  }
  if (credential.tenantId !== 'sfi') {
    return NextResponse.json({
      ok: false,
      error: 'institutional_tenant_required_for_cognitive_execution',
      tenantId: credential.tenantId ?? null,
      boundary: boundary(),
    }, { status: 403 });
  }

  const body = await request.json().catch(() => ({})) as Row;
  const operation = text(body.operation, 30) ?? 'execute';
  if (operation !== 'execute') {
    return NextResponse.json({ ok: false, error: 'unsupported_cognitive_runtime_operation', allowed: ['execute'] }, { status: 400 });
  }

  const result = await executeManualCognitiveAgent(body, {
    userId: credential.subjectId,
    actorId: externalActor(credential),
    tenantId: credential.tenantId,
    requestSource: 'EXTERNAL_API',
    allowLegacyCompatibility: false,
  });

  return NextResponse.json({
    ...result.body,
    apiVersion: SFI_EXTERNAL_COGNITIVE_RUNTIME_VERSION,
    principal: principal(credential),
    boundary: boundary(),
  }, { status: result.status, headers: { 'Cache-Control': 'no-store' } });
}

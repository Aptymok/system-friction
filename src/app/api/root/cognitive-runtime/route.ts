import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { runPublicResearch } from '@/lib/agents/publicResearch';
import { requireRootActor } from '@/lib/root/server';
import { readOperationalCase } from '@/lib/sfi/case-platform/repository';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from '@/lib/sfi/cognitive-runtime/convergedRegistry';
import { createKernelContext } from '@/lib/sfi/cognitive-runtime/createKernelContext';
import {
  compactExecutionContract,
  executionContractForAgent,
  listExecutionContracts,
  normalizeExecutionRequest,
  validateExecutionRequest,
  type SfiExecutionTargetKind,
} from '@/lib/sfi/cognitive-runtime/executionContracts';
import { readObservedSfiCognitiveRuntime } from '@/lib/sfi/cognitive-runtime/observedRuntime';
import { planCognitiveQuestion } from '@/lib/sfi/cognitive-runtime/planning';
import { runCognitiveAgent } from '@/lib/sfi/cognitive-runtime/runtimeAgentExecutor';
import { readUniversalCycleHistory } from '@/lib/sfi/universalSignalCycle';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

type Row = Record<string, unknown>;
type LoadedTarget = {
  kind: SfiExecutionTargetKind;
  id: string;
  title: string;
  data: unknown;
};

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown, max = 4000) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

function numberOrNull(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function host(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
}

async function loadTarget(kind: SfiExecutionTargetKind, id: string, userId: string): Promise<LoadedTarget> {
  const db = createServiceSupabaseClient();
  if (kind === 'CASE') {
    const value = await readOperationalCase(id, userId);
    return { kind, id, title: value.caseRecord.subject, data: value };
  }
  if (kind === 'PROJECT') {
    const project = await db.from('sfi_projects').select('*').eq('id', id).maybeSingle();
    if (project.error) throw new Error(`SFI_PROJECT_READ_FAILED:${project.error.message}`);
    if (!project.data) throw new Error('SFI_PROJECT_NOT_FOUND');
    const membership = await db.from('sfi_tenant_members').select('status').eq('tenant_id', project.data.tenant_id).eq('user_id', userId).maybeSingle();
    if (!membership.data || membership.data.status !== 'ACTIVE') throw new Error('SFI_PROJECT_FORBIDDEN');
    return { kind, id, title: String(project.data.name), data: project.data };
  }
  if (kind === 'EVIDENCE') {
    const evidence = await db.from('root_evidence_entries').select('*').eq('id', id).maybeSingle();
    if (evidence.error) throw new Error(`SFI_EVIDENCE_READ_FAILED:${evidence.error.message}`);
    if (!evidence.data) throw new Error('SFI_EVIDENCE_NOT_FOUND');
    return { kind, id, title: String(evidence.data.title ?? 'Evidencia'), data: evidence.data };
  }
  if (kind === 'CYCLE') {
    const history = await readUniversalCycleHistory(id);
    if (!history.ok) throw new Error(history.error ?? 'SFI_CYCLE_NOT_FOUND');
    const opened = row(history.opened);
    const openedPayload = row(opened.payload);
    return { kind, id, title: text(openedPayload.question) ?? text(openedPayload.objectKey) ?? `Ciclo ${id}`, data: history };
  }
  const node = await db.from('graph_nodes').select('*').or(`node_id.eq.${id},node_key.eq.${id}`).maybeSingle();
  if (node.error) throw new Error(`SFI_NODE_READ_FAILED:${node.error.message}`);
  if (!node.data) throw new Error('SFI_NODE_NOT_FOUND');
  return { kind, id, title: String(node.data.label ?? node.data.node_key ?? id), data: node.data };
}

function compactAgent(agent: (typeof SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY)[number]) {
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
    emits: agent.emits,
  };
}

function referenceKey(kind: string, id: string) {
  return `${kind}:${id}`;
}

export async function GET() {
  const gate = await requireRootActor('root.cognitive-runtime.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  return NextResponse.json({
    ok: true,
    runtime: await readObservedSfiCognitiveRuntime(),
    agents: SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.map(compactAgent),
    executionContracts: listExecutionContracts().map(compactExecutionContract),
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const gate = await requireRootActor('root.cognitive-runtime.operate');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await request.json().catch(() => ({})) as Row;
  const operation = text(body.operation, 30) ?? 'plan';
  if (operation === 'plan') {
    const question = text(body.question);
    if (!question) return NextResponse.json({ ok: false, error: 'question_required' }, { status: 400 });
    const result = await planCognitiveQuestion(question, gate.ctx.user.id);
    if (!result.ok) return NextResponse.json(result, { status: 503 });
    return NextResponse.json(result);
  }

  if (operation !== 'execute') return NextResponse.json({ ok: false, error: 'unsupported_cognitive_operation' }, { status: 400 });

  const agentId = text(body.agentId, 120);
  if (!agentId) return NextResponse.json({ ok: false, error: 'agent_required' }, { status: 400 });
  const agent = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.find((item) => item.id === agentId);
  if (!agent) return NextResponse.json({ ok: false, error: 'agent_not_found' }, { status: 404 });
  const contract = executionContractForAgent(agentId);
  if (!contract) return NextResponse.json({ ok: false, error: 'execution_contract_not_found' }, { status: 409 });

  const executionId = randomUUID();
  const executionRequest = normalizeExecutionRequest(agentId, body, executionId);
  const validation = validateExecutionRequest(contract, executionRequest);
  if (!validation.ok) {
    return NextResponse.json({
      ok: false,
      error: 'execution_contract_validation_failed',
      contract: compactExecutionContract(contract),
      validation,
    }, { status: 400 });
  }

  try {
    const resolvableRefs = [
      ...executionRequest.targets,
      ...executionRequest.anchors
        .filter((anchor) => anchor.kind !== 'ANALYSIS_SESSION')
        .map((anchor) => ({ kind: anchor.kind as SfiExecutionTargetKind, id: anchor.id })),
      ...executionRequest.evidenceIds.map((id) => ({ kind: 'EVIDENCE' as const, id })),
    ];
    const uniqueRefs = [...new Map(resolvableRefs.map((ref) => [referenceKey(ref.kind, ref.id), ref])).values()];
    const loaded = await Promise.all(uniqueRefs.map((ref) => loadTarget(ref.kind, ref.id, gate.ctx.user.id)));
    const loadedByKey = new Map(loaded.map((item) => [referenceKey(item.kind, item.id), item]));

    const resolvedTargets = executionRequest.targets.map((target) => {
      const resolved = loadedByKey.get(referenceKey(target.kind, target.id));
      if (!resolved) throw new Error(`SFI_EXECUTION_TARGET_NOT_RESOLVED:${target.kind}:${target.id}`);
      return { kind: target.kind, id: target.id, title: resolved.title };
    });
    const resolvedAnchors = executionRequest.anchors.map((anchor) => {
      if (anchor.kind === 'ANALYSIS_SESSION') return { kind: anchor.kind, id: anchor.id, title: anchor.label ?? 'Analysis Session' };
      const resolved = loadedByKey.get(referenceKey(anchor.kind, anchor.id));
      if (!resolved) throw new Error(`SFI_EXECUTION_ANCHOR_NOT_RESOLVED:${anchor.kind}:${anchor.id}`);
      return { kind: anchor.kind, id: anchor.id, title: resolved.title };
    });
    const resolvedEvidence = executionRequest.evidenceIds.map((id) => {
      const resolved = loadedByKey.get(referenceKey('EVIDENCE', id));
      if (!resolved) throw new Error(`SFI_EXECUTION_EVIDENCE_NOT_RESOLVED:${id}`);
      return resolved;
    });

    const primaryTarget = resolvedTargets[0] ?? null;
    const context = createKernelContext(executionId, `root-agent:${executionId}`, 'SFI_ROOT_MANUAL_AGENT_REQUESTED');
    context.metadata = {
      actorId: gate.ctx.user.id,
      executionId,
      executionContractVersion: contract.version,
      objectKey: primaryTarget ? `${primaryTarget.kind.toLowerCase()}:${primaryTarget.id}` : `analysis:${executionId}`,
      objective: executionRequest.purpose,
      question: executionRequest.purpose,
      manualRootExecution: true,
      selectedAgentId: agentId,
      target: primaryTarget,
      targets: resolvedTargets,
      anchors: resolvedAnchors,
      sourceUrl: executionRequest.sourceUrls[0] ?? null,
      sourceUrls: executionRequest.sourceUrls,
      aiGovernancePolicyId: 'SFI-AIMS-2026-08',
      llmAugmentation: true,
      llmAugmentationAgents: [agentId],
      executionRequest: {
        contractVersion: contract.version,
        purpose: executionRequest.purpose,
        anchors: resolvedAnchors,
        targets: resolvedTargets,
        evidenceIds: executionRequest.evidenceIds,
        sourceUrls: executionRequest.sourceUrls,
        timeRange: executionRequest.timeRange,
        direction: executionRequest.direction,
        parameters: executionRequest.parameters,
        requestedOutputs: executionRequest.requestedOutputs.length ? executionRequest.requestedOutputs : contract.requestedOutputs,
        governanceContext: executionRequest.governanceContext,
        governanceProfile: contract.governanceProfile,
        validationWarnings: validation.warnings,
        legacyCompatibilityUsed: executionRequest.legacyCompatibilityUsed,
      },
      contextCoverage: {
        selectedTargets: resolvedTargets.length,
        contextAnchors: resolvedAnchors.length,
        referencedEvidence: resolvedEvidence.length,
        requestedSourceUrls: executionRequest.sourceUrls.length,
        publicSourceCandidates: 0,
      },
      epistemicBoundary: 'Selected objects are context, not automatically evidence. Existing evidence references retain their own prior admissibility. Public research results are source candidates until explicitly admitted through evidence governance. Manual execution cannot grant itself intervention, closure, canon or truth authority.',
    };

    for (const target of executionRequest.targets) {
      const resolved = loadedByKey.get(referenceKey(target.kind, target.id));
      if (!resolved) continue;
      context.evidence.push({
        id: `target:${target.kind}:${target.id}`,
        source: 'ROOT_MANUAL_TARGET_CONTEXT',
        confidence: 1,
        payload: {
          epistemicClass: 'record',
          targetKind: target.kind,
          targetId: target.id,
          title: resolved.title,
          data: resolved.data,
          boundary: 'TARGET_CONTEXT_NOT_AUTOMATICALLY_ACCEPTED_EVIDENCE',
        },
      });
    }

    for (const evidence of resolvedEvidence) {
      const evidenceRow = row(evidence.data);
      context.evidence.push({
        id: `evidence-ref:${evidence.id}`,
        source: 'ROOT_EXISTING_EVIDENCE_REFERENCE',
        confidence: 1,
        payload: {
          epistemicClass: 'evidence_reference',
          evidenceId: evidence.id,
          title: evidence.title,
          record: evidence.data,
          priorConfidence: numberOrNull(evidenceRow.confidence),
          boundary: 'EXISTING_EVIDENCE_REFERENCE_RETAINS_PRIOR_ADMISSIBILITY_AND_IS_NOT_REASSESSED_BY_REFERENCE',
        },
      });
    }

    let research: Awaited<ReturnType<typeof runPublicResearch>> | null = null;
    const researchEligible = ['evidence_hunter', 'historical_scout', 'field_observer', 'context_builder'].includes(agentId);
    if (researchEligible) {
      const targetTitles = resolvedTargets.map((target) => target.title).join(' · ');
      const queryBase = `${targetTitles} ${executionRequest.purpose}`.slice(0, 500);
      const domains = [...new Set(executionRequest.sourceUrls.map(host).filter((item): item is string => Boolean(item)))].slice(0, 3);
      const queries = domains.length ? domains.map((domain) => `site:${domain} ${queryBase}`) : [queryBase];
      research = await runPublicResearch({
        prompt: `Busca fuentes públicas relevantes para los objetos seleccionados. Objetos: ${targetTitles}. Propósito: ${executionRequest.purpose}. No conviertas afirmaciones de las fuentes en hechos verificados ni en evidencia admitida.`,
        queries,
        country: 'MX',
        searchLang: 'es',
        timezone: executionRequest.timeRange?.timezone ?? 'America/Mexico_City',
      }).catch((error) => ({ ok: false, provider: 'unavailable' as const, answer: '', sources: [], queries, warnings: [error instanceof Error ? error.message : String(error)] }));
      for (const source of research.sources.slice(0, 30)) {
        context.evidence.push({
          id: source.id,
          source: 'PublicResearchCandidate',
          confidence: source.reliability,
          payload: {
            epistemicClass: 'source_claim',
            url: source.url,
            title: source.title,
            publisher: source.publisher,
            snippet: source.snippet,
            retrievedAt: source.retrievedAt,
            sourceType: source.sourceType,
            boundary: 'SOURCE_CANDIDATE_NOT_ACCEPTED_EVIDENCE',
          },
        });
      }
      context.metadata.contextCoverage = {
        ...row(context.metadata.contextCoverage),
        publicSourceCandidates: research.sources.length,
      };
    }

    const inputEvidenceIds = new Set(context.evidence.map((item) => item.id));
    const result = await runCognitiveAgent(agentId, context);
    const produced = result.context.evidence
      .filter((item) => !inputEvidenceIds.has(item.id))
      .map((item) => ({ id: item.id, source: item.source, confidence: item.confidence, payload: item.payload }));
    const researchSources = research?.sources.map((source) => ({
      title: source.title,
      url: source.url,
      publisher: source.publisher,
      sourceType: source.sourceType,
      reliability: source.reliability,
      retrievedAt: source.retrievedAt,
    })) ?? [];
    const llmRuntime = row(result.context.metadata?.llmRuntime);
    const insights = row(result.context.metadata?.agentInsights);
    const interpretation = row(insights[agentId]);

    return NextResponse.json({
      ok: true,
      execution: {
        id: executionId,
        contract: compactExecutionContract(contract),
        agent: compactAgent(agent),
        anchors: resolvedAnchors,
        targets: resolvedTargets,
        executed: result.executed,
        purpose: executionRequest.purpose,
        timeRange: executionRequest.timeRange,
        direction: executionRequest.direction,
        parameters: executionRequest.parameters,
        governanceContext: executionRequest.governanceContext,
        validationWarnings: validation.warnings,
        compatibility: executionRequest.legacyCompatibilityUsed ? 'LEGACY_SINGLE_TARGET_NORMALIZED' : 'CANONICAL_EXECUTION_REQUEST',
        epistemicBoundary: {
          selectedObjectsAreEvidence: false,
          publicSourcesAreAdmittedEvidence: false,
          existingEvidenceReferencesRetainPriorStatus: true,
          aiInterpretationClass: 'INFERENCE',
          externalEffectExecutedByThisRoute: false,
        },
        contextCoverage: {
          ...row(result.context.metadata?.contextCoverage),
          llmPromptCharacters: llmRuntime.promptCharacters ?? null,
          llmPromptBounded: llmRuntime.promptBounded ?? null,
          llmProjection: llmRuntime.promptProjection ?? null,
          maxOutputTokens: llmRuntime.maxOutputTokens ?? null,
        },
        model: {
          provider: interpretation.provider ?? llmRuntime.lastProvider ?? null,
          model: interpretation.model ?? llmRuntime.lastModel ?? null,
          status: interpretation.status ?? llmRuntime.lastStatus ?? null,
          tokens: 'NOT_OBSERVED',
          cost: 'NOT_OBSERVED',
        },
        interpretation,
        findings: {
          hypotheses: result.context.hypotheses,
          contradictions: result.context.contradictions,
          predictions: result.context.predictions,
          risks: result.context.risks,
          opportunities: result.context.opportunities,
          simulations: result.context.simulations,
          produced,
          referencedEvidence: resolvedEvidence.map((evidence) => ({ id: evidence.id, title: evidence.title })),
          publicSources: researchSources,
        },
        humanSummary: researchEligible
          ? researchSources.length
            ? `La ejecución terminó. Encontró ${researchSources.length} fuentes públicas candidatas. Siguen siendo candidatas hasta su admisión por gobernanza de evidencia.`
            : 'La ejecución terminó sin una fuente pública utilizable. Si el material existe en una fuente interna o archivo controlado, debe aportarse o autorizarse su acceso.'
          : 'La ejecución terminó sobre los objetos declarados. Sus resultados conservan la autoridad y clase epistemológica del agente; no se convierten automáticamente en evidencia, decisión, intervención, RETURN o aprendizaje.',
        next: researchSources.length
          ? 'Revisar y admitir/rechazar las fuentes pertinentes por la ruta de evidencia; después ejecutar el contraste que corresponda.'
          : 'Revisar la interpretación y la cobertura de contexto; si falta información, aportar evidencia o contexto autorizado antes de elevar la conclusión.',
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'manual_agent_execution_failed', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

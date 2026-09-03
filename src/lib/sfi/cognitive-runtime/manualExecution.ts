import { randomUUID } from 'node:crypto';
import { runPublicResearch } from '@/lib/agents/publicResearch';
import { readOperationalCase } from '@/lib/sfi/case-platform/repository';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from '@/lib/sfi/cognitive-runtime/convergedRegistry';
import { createKernelContext } from '@/lib/sfi/cognitive-runtime/createKernelContext';
import {
  compactExecutionContract,
  executionContractForAgent,
  normalizeExecutionRequest,
  validateExecutionRequest,
  type SfiExecutionTargetKind,
} from '@/lib/sfi/cognitive-runtime/executionContracts';
import { materialEvidenceView } from '@/lib/sfi/cognitive-runtime/materialEvidence';
import { runCognitiveAgent } from '@/lib/sfi/cognitive-runtime/runtimeAgentExecutor';
import { readUniversalCycleHistory } from '@/lib/sfi/universalSignalCycle';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const SFI_MANUAL_COGNITIVE_EXECUTION_VERSION = 'SFI-MANUAL-COGNITIVE-EXECUTION-1.1' as const;

type Row = Record<string, unknown>;

type LoadedTarget = {
  kind: SfiExecutionTargetKind;
  id: string;
  title: string;
  data: unknown;
};

export type SfiManualExecutionPrincipal = {
  userId: string;
  actorId: string;
  tenantId: string;
  requestSource: 'ROOT_MANUAL' | 'EXTERNAL_API';
  allowLegacyCompatibility: boolean;
};

export type SfiManualExecutionResponse = {
  status: number;
  body: Row;
};

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown, max = 4_000) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function observedString(value: unknown) {
  const parsed = text(value, 500);
  return parsed === null
    ? { value: null, observation: 'NOT_OBSERVED' as const }
    : { value: parsed, observation: 'OBSERVED' as const };
}

function observedNumber(value: unknown) {
  const parsed = numberOrNull(value);
  return parsed === null
    ? { value: null, observation: 'NOT_OBSERVED' as const }
    : { value: parsed, observation: 'OBSERVED' as const };
}

function host(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
}

function referenceKey(kind: string, id: string) {
  return `${kind}:${id}`;
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

function errorStatus(message: string) {
  if (message.includes('FORBIDDEN')) return 403;
  if (message.includes('NOT_FOUND')) return 404;
  if (message.includes('REQUIRED') || message.includes('NOT_RESOLVED')) return 400;
  return 500;
}

export async function executeManualCognitiveAgent(
  body: Row,
  principal: SfiManualExecutionPrincipal,
): Promise<SfiManualExecutionResponse> {
  const agentId = text(body.agentId, 120);
  if (!agentId) return { status: 400, body: { ok: false, error: 'agent_required' } };

  const agent = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.find((item) => item.id === agentId);
  if (!agent) return { status: 404, body: { ok: false, error: 'agent_not_found' } };

  const contract = executionContractForAgent(agentId);
  if (!contract) return { status: 409, body: { ok: false, error: 'execution_contract_not_found' } };

  const executionId = randomUUID();
  const executionRequest = normalizeExecutionRequest(agentId, body, executionId);
  if (!principal.allowLegacyCompatibility && executionRequest.legacyCompatibilityUsed) {
    return {
      status: 400,
      body: {
        ok: false,
        error: 'legacy_execution_shape_not_allowed',
        requiredShape: 'agentId + purpose + anchors[] + targets[] + contract-driven parameters',
        contract: compactExecutionContract(contract),
      },
    };
  }

  const validation = validateExecutionRequest(contract, executionRequest);
  if (!validation.ok) {
    return {
      status: 400,
      body: {
        ok: false,
        error: 'execution_contract_validation_failed',
        contract: compactExecutionContract(contract),
        validation,
      },
    };
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
    const loaded = await Promise.all(uniqueRefs.map((ref) => loadTarget(ref.kind, ref.id, principal.userId)));
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
    const context = createKernelContext(executionId, `${principal.requestSource.toLowerCase()}:${executionId}`, 'SFI_MANUAL_AGENT_REQUESTED');
    context.metadata = {
      actorId: principal.actorId,
      executionId,
      executionContractVersion: contract.version,
      executionRequestSource: principal.requestSource,
      tenantId: principal.tenantId,
      objectKey: primaryTarget ? `${primaryTarget.kind.toLowerCase()}:${primaryTarget.id}` : `analysis:${executionId}`,
      objective: executionRequest.purpose,
      question: executionRequest.purpose,
      manualRootExecution: principal.requestSource === 'ROOT_MANUAL',
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
      epistemicBoundary: 'Selected objects are context, not automatically evidence. Persisted material evidence nested inside selected targets/references may be reused only when its prior epistemic class and provenance are explicit. Public research remains source-candidate material. Manual execution cannot grant itself intervention, closure, canon or truth authority.',
    };

    for (const target of executionRequest.targets) {
      const resolved = loadedByKey.get(referenceKey(target.kind, target.id));
      if (!resolved) continue;
      context.evidence.push({
        id: `target:${target.kind}:${target.id}`,
        source: 'MANUAL_TARGET_CONTEXT',
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
        source: 'EXISTING_EVIDENCE_REFERENCE',
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

    const preResearchMaterial = materialEvidenceView(context);
    context.metadata.contextCoverage = {
      ...row(context.metadata.contextCoverage),
      resolvedPersistedMaterialBeforeResearch: preResearchMaterial.length,
    };

    let research: Awaited<ReturnType<typeof runPublicResearch>> | null = null;
    const researchCapable = ['evidence_hunter', 'historical_scout', 'field_observer', 'context_builder'].includes(agentId);
    const internalEvidenceAlreadyAvailable = preResearchMaterial.length > 0;
    const evidenceHunterNeedsExternalSearch = agentId === 'evidence_hunter'
      && (executionRequest.sourceUrls.length > 0 || !internalEvidenceAlreadyAvailable);
    const researchEligible = researchCapable && (agentId !== 'evidence_hunter' || evidenceHunterNeedsExternalSearch);
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
      }).catch((error) => ({
        ok: false,
        provider: 'unavailable' as const,
        answer: '',
        sources: [],
        queries,
        warnings: [error instanceof Error ? error.message : String(error)],
      }));
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
    const materialResolution = row(result.context.metadata?.materialEvidenceResolution);
    const evidenceHunterState = row(result.context.metadata?.evidenceHunter);
    const proposalBridge = row(result.context.metadata?.cognitiveProposalBridge);
    const materialEvidenceResolved = numberOrNull(materialResolution.resolvedMaterialEvidence)
      ?? numberOrNull(row(result.context.metadata?.contextCoverage).resolvedPersistedMaterialBeforeResearch)
      ?? 0;
    const residualMissing = produced.filter((item) => String(row(item.payload).epistemicClass ?? '').toLowerCase() === 'missing').length;
    const proposalPersistedCount = numberOrNull(proposalBridge.persistedCount) ?? 0;

    const humanSummary = materialEvidenceResolved > 0
      ? residualMissing > 0
        ? `La ejecución reutilizó ${materialEvidenceResolved} evidencias materiales persistidas. Quedan ${residualMissing} faltantes residuales discriminantes; no se requiere volver a aportar el objeto ya procesado.`
        : `La ejecución reutilizó ${materialEvidenceResolved} evidencias materiales persistidas. No se requiere volver a subir, ingerir ni aportar de nuevo el objeto ya procesado.`
      : researchEligible
        ? researchSources.length
          ? `La ejecución terminó. Encontró ${researchSources.length} fuentes públicas candidatas. Siguen siendo candidatas hasta su admisión por gobernanza de evidencia.`
          : 'La ejecución no resolvió evidencia material persistida ni una fuente pública utilizable. Sólo debe solicitarse el faltante discriminante exacto; nunca debe pedirse de nuevo un objeto ya persistido por defecto.'
        : 'La ejecución terminó sobre los objetos declarados. Sus resultados conservan la autoridad y clase epistemológica del agente; no se convierten automáticamente en evidencia, decisión, intervención, RETURN o aprendizaje.';

    const next = proposalPersistedCount > 0
      ? `Revisar en ROOT ${proposalPersistedCount} propuesta(s) cognitiva(s) gobernada(s). La persistencia de la propuesta no ejecuta la intervención ni fabrica RETURN.`
      : residualMissing > 0
        ? 'Resolver únicamente los faltantes discriminantes residuales identificados después de reutilizar la evidencia persistida. No reingestar ni volver a aportar el objeto base.'
        : 'Continuar con el siguiente contraste/intervención gobernada que corresponda utilizando la evidencia ya persistida.';

    return {
      status: 200,
      body: {
        ok: true,
        executionApiVersion: SFI_MANUAL_COGNITIVE_EXECUTION_VERSION,
        execution: {
          id: executionId,
          requestSource: principal.requestSource,
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
            persistedMaterialCanBeReusedByPriorClass: true,
            aiInterpretationClass: 'INFERENCE',
            externalEffectExecutedByThisRoute: false,
          },
          contextCoverage: {
            ...row(result.context.metadata?.contextCoverage),
            materialEvidenceResolved,
            evidenceHunterReuseStatus: evidenceHunterState.reuseStatus ?? null,
            llmPromptCharacters: llmRuntime.promptCharacters ?? null,
            llmPromptBounded: llmRuntime.promptBounded ?? null,
            llmProjection: llmRuntime.promptProjection ?? null,
            maxOutputTokens: llmRuntime.maxOutputTokens ?? null,
          },
          telemetry: {
            provider: observedString(llmRuntime.observedProvider),
            model: observedString(llmRuntime.observedModel),
            inputTokens: observedNumber(llmRuntime.observedInputTokens),
            outputTokens: observedNumber(llmRuntime.observedOutputTokens),
            providerCost: observedNumber(llmRuntime.observedProviderCost),
            providerCostCurrency: observedString(llmRuntime.observedProviderCostCurrency),
            latencyMs: observedNumber(llmRuntime.observedLatencyMs),
            boundary: 'Only provider/runtime-observed values are exposed. Missing telemetry remains NOT_OBSERVED and is never estimated.',
          },
          interpretation,
          governedProposalBridge: proposalBridge,
          findings: {
            hypotheses: result.context.hypotheses,
            contradictions: result.context.contradictions,
            predictions: result.context.predictions,
            risks: result.context.risks,
            opportunities: result.context.opportunities,
            simulations: result.context.simulations,
            produced,
            referencedEvidence: resolvedEvidence.map((evidence) => ({ id: evidence.id, title: evidence.title })),
            resolvedMaterialEvidenceRefs: materialEvidenceView(result.context).map((evidence) => evidence.id).slice(0, 50),
            publicSources: researchSources,
          },
          humanSummary,
          next,
        },
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: errorStatus(message),
      body: {
        ok: false,
        error: 'manual_agent_execution_failed',
        message,
        requestSource: principal.requestSource,
      },
    };
  }
}

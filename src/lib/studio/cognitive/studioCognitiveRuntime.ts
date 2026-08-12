import 'server-only';

import { randomUUID } from 'node:crypto';
import { runLlmTask, type LlmProviderId } from '@/lib/ai/providerRouter';
import { createCognitiveTwinEnvelope } from '@/core/cognitive-twin/contract';
import { persistStudioLearningCandidate, readStudioTwinContext, registerStudioTwinRun } from '@/core/cognitive-twin/studioContext';
import type { KernelContext, KernelEvidence } from '@/lib/sfi/cognitive-runtime/kernelContext';
import { executeSfiRuntime } from '@/lib/sfi/cognitive-runtime/runtime';
import { analyzeStudioSessionRelations } from '@/lib/studio/audio/sessionRelationalAnalysis';
import { readStudioProductionState } from '@/lib/studio/production/studioProductionAdapter';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export type StudioCognitiveAction = 'analyze' | 'generate_hypothesis' | 'verify';
export type StudioIdentityStatus = 'SAME' | 'ALTERED' | 'INDETERMINATE';
export type StudioProductionGate = 'READY' | 'BLOCKED' | 'EVIDENCE_PENDING';

type Row = Record<string, unknown>;

type FinalResult = {
  summary: string | null;
  findings: Array<{ statement: string; epistemicClass: 'OBSERVED' | 'DERIVED' | 'INFERENCE'; evidenceRefs: string[] }>;
  inconsistencies: Array<{ statement: string; severity: 'low' | 'medium' | 'high'; evidenceRefs: string[] }>;
  changes: Array<{ label: string; before: number | string | null; after: number | string | null; meaning: string }>;
  identity: { status: StudioIdentityStatus; confidence: number; reason: string; preserved: string[] };
  production: { status: StudioProductionGate; reason: string; blockers: string[] };
  ejector: { direction: string[]; magnitude: number | null; velocity: number | null; horizon: string | null; confidence: number; causalNodes: string[]; basis: string };
  hypothesis: null | { statement: string; perturbation: string; expectedOutput: string; controls: string[]; evidenceRequired: string[]; falsificationCriterion: string };
  hypothesisOutcome: 'SUPPORTED' | 'FALSIFIED' | 'INCONCLUSIVE' | null;
};

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function text(value: unknown, max = 2400): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}
function strings(value: unknown, max = 8): string[] {
  return Array.isArray(value) ? value.map((item) => text(item, 800)).filter((item): item is string => Boolean(item)).slice(0, max) : [];
}
function number(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed > 1 ? parsed / 100 : parsed)) : fallback;
}
function stripFence(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith('```') ? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim() : trimmed;
}
function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function methodContext(objectType: string, attractorPresent: boolean) {
  return {
    analysis: objectType === 'music' ? ['FAD', 'MIHM'] : ['MIHM'],
    attractor: attractorPresent ? 'MOP-H' : null,
    lineage: 'DIOL-SF',
    rule: 'Methods identify the SFI observation/intervention contract applied by Studio; they do not prove success by declaration.',
  };
}

function verificationProvider(previousProvider: string | null): LlmProviderId {
  const candidates: LlmProviderId[] = ['openai', 'anthropic', 'gemini', 'groq', 'ollama', 'huggingface'];
  return candidates.find((provider) => provider !== previousProvider) ?? 'groq';
}

function parseFinalResult(raw: string, allowedEvidence: Set<string>): FinalResult | null {
  try {
    const parsed = record(JSON.parse(stripFence(raw)));
    const findings = Array.isArray(parsed.findings) ? parsed.findings.map(record).slice(0, 8).map((item) => {
      const evidenceRefs = strings(item.evidenceRefs, 12).filter((id) => allowedEvidence.has(id));
      const requestedClass = String(item.epistemicClass ?? 'INFERENCE').toUpperCase();
      const epistemicClass: 'OBSERVED' | 'DERIVED' | 'INFERENCE' = requestedClass === 'OBSERVED' && evidenceRefs.length
        ? 'OBSERVED'
        : requestedClass === 'DERIVED' && evidenceRefs.length
          ? 'DERIVED'
          : 'INFERENCE';
      return { statement: text(item.statement, 1200) ?? '', epistemicClass, evidenceRefs };
    }).filter((item) => item.statement) : [];
    const inconsistencies = Array.isArray(parsed.inconsistencies) ? parsed.inconsistencies.map(record).slice(0, 3).map((item) => ({
      statement: text(item.statement, 1000) ?? '',
      severity: ['low', 'medium', 'high'].includes(String(item.severity)) ? String(item.severity) as 'low' | 'medium' | 'high' : 'medium',
      evidenceRefs: strings(item.evidenceRefs, 10).filter((id) => allowedEvidence.has(id)),
    })).filter((item) => item.statement) : [];
    const changes = Array.isArray(parsed.changes) ? parsed.changes.map(record).slice(0, 3).map((item) => ({
      label: text(item.label, 240) ?? 'Cambio',
      before: (typeof item.before === 'number' || typeof item.before === 'string') ? item.before : null,
      after: (typeof item.after === 'number' || typeof item.after === 'string') ? item.after : null,
      meaning: text(item.meaning, 800) ?? '',
    })) : [];
    const identityRaw = record(parsed.identity);
    const identityStatus = ['SAME', 'ALTERED', 'INDETERMINATE'].includes(String(identityRaw.status).toUpperCase()) ? String(identityRaw.status).toUpperCase() as StudioIdentityStatus : 'INDETERMINATE';
    const productionRaw = record(parsed.production);
    const productionStatus = ['READY', 'BLOCKED', 'EVIDENCE_PENDING'].includes(String(productionRaw.status).toUpperCase()) ? String(productionRaw.status).toUpperCase() as StudioProductionGate : 'EVIDENCE_PENDING';
    const ejectorRaw = record(parsed.ejector);
    const hypothesisRaw = record(parsed.hypothesis);
    const outcome = String(parsed.hypothesisOutcome ?? '').toUpperCase();
    return {
      summary: text(parsed.summary),
      findings,
      inconsistencies,
      changes,
      identity: {
        status: identityStatus,
        confidence: number(identityRaw.confidence),
        reason: text(identityRaw.reason, 1200) ?? 'No se proporcionó razón suficiente.',
        preserved: strings(identityRaw.preserved, 8),
      },
      production: {
        status: productionStatus,
        reason: text(productionRaw.reason, 1200) ?? 'Estado de producción no justificado.',
        blockers: strings(productionRaw.blockers, 3),
      },
      ejector: {
        direction: strings(ejectorRaw.direction, 6),
        magnitude: typeof ejectorRaw.magnitude === 'number' ? number(ejectorRaw.magnitude) : null,
        velocity: typeof ejectorRaw.velocity === 'number' ? Number(ejectorRaw.velocity) : null,
        horizon: text(ejectorRaw.horizon, 160),
        confidence: number(ejectorRaw.confidence),
        causalNodes: strings(ejectorRaw.causalNodes, 8),
        basis: text(ejectorRaw.basis, 1000) ?? 'Insufficient basis.',
      },
      hypothesis: Object.keys(hypothesisRaw).length ? {
        statement: text(hypothesisRaw.statement, 1200) ?? '',
        perturbation: text(hypothesisRaw.perturbation, 1200) ?? '',
        expectedOutput: text(hypothesisRaw.expectedOutput, 1200) ?? '',
        controls: strings(hypothesisRaw.controls, 8),
        evidenceRequired: strings(hypothesisRaw.evidenceRequired, 8),
        falsificationCriterion: text(hypothesisRaw.falsificationCriterion, 1200) ?? '',
      } : null,
      hypothesisOutcome: ['SUPPORTED', 'FALSIFIED', 'INCONCLUSIVE'].includes(outcome) ? outcome as FinalResult['hypothesisOutcome'] : null,
    };
  } catch {
    return null;
  }
}

async function sessionContext(ownerId: string, sessionId: string) {
  const db = createServiceSupabaseClient();
  const objects = await db.from('studio_objects').select('id,title,status,created_at,metadata').eq('session_id', sessionId).eq('owner_id', ownerId).order('created_at', { ascending: true }).limit(120);
  const objectIds = (objects.data ?? []).map((row) => String(row.id));
  const hypotheses = objectIds.length ? await db.from('studio_hypotheses').select('*').in('object_id', objectIds).eq('owner_id', ownerId).order('created_at', { ascending: false }).limit(200) : { data: [], error: null };
  const evidence = objectIds.length ? await db.from('studio_evidence_traces').select('*').in('object_id', objectIds).eq('owner_id', ownerId).order('created_at', { ascending: false }).limit(500) : { data: [], error: null };
  const activeHypothesis = (hypotheses.data ?? []).map(record).find((row) => {
    if (text(row.origin) !== 'studio_cognitive_runtime_v1') return false;
    const payload = record(row.payload);
    return ['PROPOSED', 'EVIDENCE_PENDING', 'IN_TEST', 'ACCEPTED'].includes(String(payload.suggestionStatus ?? payload.status ?? '').toUpperCase());
  }) ?? null;
  return { db, objects: (objects.data ?? []).map(record), hypotheses: (hypotheses.data ?? []).map(record), evidence: (evidence.data ?? []).map(record), activeHypothesis };
}

function selectedAgents(action: StudioCognitiveAction, studio: Awaited<ReturnType<typeof readStudioProductionState>>) {
  const agents = [
    'field_observer', 'evidence_hunter', 'temporal_resolver', 'historical_scout', 'context_builder',
    'cross_impact', 'friction_field_simulator', 'cultural_simulator', 'entropy_redistribution',
    'trajectory_agent', 'risk_agent', 'opportunity_agent', 'project_execution_manager',
  ];
  const hasAttractor = studio.metricValues.some((metric) => metric.key === 'V_i' && metric.value !== null) || studio.culturalLens !== null;
  if (hasAttractor) agents.splice(9, 0, 'psychological_simulator');
  if (action === 'verify') agents.push('reality_calibration');
  return unique(agents);
}

function kernelEvidence(studio: Awaited<ReturnType<typeof readStudioProductionState>>, relational: Awaited<ReturnType<typeof analyzeStudioSessionRelations>>): KernelEvidence[] {
  const evidence: KernelEvidence[] = studio.evidence.slice(0, 80).map((item) => ({
    id: item.id,
    source: item.source,
    confidence: item.reliability,
    payload: { type: item.type, label: item.label, observedAt: item.observedAt, uri: item.uri },
  }));
  studio.metricValues.filter((metric) => metric.value !== null).slice(0, 80).forEach((metric) => evidence.push({
    id: `metric:${metric.key}`,
    source: metric.source ?? 'studio_metric',
    confidence: metric.confidence,
    payload: { key: metric.key, label: metric.label, value: metric.value, unit: metric.unit, status: metric.status, explanation: metric.explanation, warnings: metric.warnings, evidenceIds: metric.evidenceIds },
  }));
  relational.findings.forEach((finding) => evidence.push({ id: `relational:${finding.id}`, source: relational.engine, confidence: finding.confidence, payload: finding }));
  return evidence;
}

function synthesisSystem(action: StudioCognitiveAction) {
  return [
    'You are the final synthesis stage of System Friction Institute Studio.',
    'You receive measured object evidence, session-level relational analysis, existing SFI agent inferences, WorldSpect context, and the governed Cognitive Twin context.',
    'Evidence before inference. A filename/label is a declaration, not proof. Correlation does not prove routing. Simulation is not observation. Missing evidence remains missing.',
    'Do not invent measurements. Do not inflate the number of changes. changes MUST contain at most 3 material changes.',
    'Production must converge: READY when there is no evidence-bound blocker and no unverified active perturbation; BLOCKED for a specific inconsistency; EVIDENCE_PENDING only when a named piece of evidence is actually needed.',
    action === 'generate_hypothesis' ? 'Return exactly one minimal, falsifiable hypothesis if a defensible intervention is needed. If no intervention is defensible, hypothesis may be null.' : 'Do not invent a new hypothesis unless the action explicitly requests it.',
    action === 'verify' ? 'Use the returned evidence to classify the active hypothesis as SUPPORTED, FALSIFIED or INCONCLUSIVE. Provider independence is enforced by the runtime after your response.' : 'hypothesisOutcome must be null.',
    'The Ejector is a projection, not observation. Its confidence must reflect available temporal/relational evidence.',
    'Return ONLY valid JSON: {"summary":string|null,"findings":[{"statement":string,"epistemicClass":"OBSERVED|DERIVED|INFERENCE","evidenceRefs":string[]}],"inconsistencies":[{"statement":string,"severity":"low|medium|high","evidenceRefs":string[]}],"changes":[{"label":string,"before":number|string|null,"after":number|string|null,"meaning":string}],"identity":{"status":"SAME|ALTERED|INDETERMINATE","confidence":number,"reason":string,"preserved":string[]},"production":{"status":"READY|BLOCKED|EVIDENCE_PENDING","reason":string,"blockers":string[]},"ejector":{"direction":string[],"magnitude":number|null,"velocity":number|null,"horizon":string|null,"confidence":number,"causalNodes":string[],"basis":string},"hypothesis":null|{"statement":string,"perturbation":string,"expectedOutput":string,"controls":string[],"evidenceRequired":string[],"falsificationCriterion":string},"hypothesisOutcome":"SUPPORTED|FALSIFIED|INCONCLUSIVE"|null}.',
  ].join('\n');
}

export async function runStudioCognitiveRuntime(input: { ownerId: string; objectId: string; action: StudioCognitiveAction }) {
  const startedAt = new Date().toISOString();
  const studio = await readStudioProductionState({ ownerId: input.ownerId, objectId: input.objectId });
  if (!studio.activeObject.id || !studio.session.id) return { ok: false as const, status: 409, error: 'STUDIO_OBJECT_OR_SESSION_MISSING' };
  if (studio.activeObject.analysisStatus !== 'COMPLETE' && studio.activeObject.type !== 'unknown') return { ok: false as const, status: 409, error: 'OBJECT_ANALYSIS_NOT_COMPLETE', details: studio.activeObject.analysisStatus };

  const session = await sessionContext(input.ownerId, studio.session.id);
  if (input.action === 'generate_hypothesis' && session.activeHypothesis) return { ok: false as const, status: 409, error: 'ACTIVE_HYPOTHESIS_EXISTS', hypothesisId: String(session.activeHypothesis.id) };

  const relational = await analyzeStudioSessionRelations({ sessionId: studio.session.id, ownerId: input.ownerId, activeObjectId: input.objectId }).catch((error) => ({
    engine: 'studio_audio_relational_v1' as const,
    sessionId: studio.session.id as string,
    generatedAt: new Date().toISOString(),
    objectCount: session.objects.length,
    audioObjectCount: 0,
    roleAssignments: [],
    pairwise: [],
    routeTests: [],
    stateContrast: null,
    findings: [],
    warnings: [`relational_analysis_failed:${error instanceof Error ? error.message : String(error)}`],
  }));
  const twin = await readStudioTwinContext();
  const evidence = kernelEvidence(studio, relational);
  const evidenceRefs = unique(evidence.map((item) => item.id));
  let returnedEvidenceAfterHypothesis: Row[] = [];
  if (input.action === 'verify') {
    if (!session.activeHypothesis) return { ok: false as const, status: 409, error: 'ACTIVE_HYPOTHESIS_REQUIRED' };
    const hypothesisAt = new Date(String(session.activeHypothesis.created_at)).getTime();
    returnedEvidenceAfterHypothesis = session.evidence.filter((row) => new Date(String(row.created_at)).getTime() > hypothesisAt);
    if (!returnedEvidenceAfterHypothesis.length) return { ok: false as const, status: 409, error: 'PERTURBATION_EVIDENCE_REQUIRED', hypothesisId: String(session.activeHypothesis.id) };
  }

  const agents = selectedAgents(input.action, studio);
  const activeHypothesisPayload = session.activeHypothesis ? record(session.activeHypothesis.payload) : null;
  const hypothesisProvider = text(activeHypothesisPayload?.provider, 80);
  const preferredProvider: LlmProviderId = input.action === 'verify' ? verificationProvider(hypothesisProvider) : 'groq';
  const hasAttractor = studio.metricValues.some((metric) => metric.key === 'V_i' && metric.value !== null) || studio.culturalLens !== null;
  const methods = methodContext(studio.activeObject.type, hasAttractor);

  const context: KernelContext = {
    cycleId: randomUUID(),
    logbookId: `studio:${studio.session.id}:${randomUUID()}`,
    phenomenonId: input.objectId,
    taskId: `studio-${input.action}-${randomUUID()}`,
    currentEvent: `STUDIO_${input.action.toUpperCase()}`,
    evidence,
    hypotheses: session.activeHypothesis ? [{
      id: String(session.activeHypothesis.id),
      statement: text(session.activeHypothesis.statement) ?? 'Active Studio hypothesis',
      confidence: number(activeHypothesisPayload?.confidence, 0.5),
    }] : [],
    contradictions: [],
    simulations: [],
    predictions: [],
    risks: [],
    opportunities: [],
    metadata: {
      studioAction: input.action,
      requestedAgents: agents,
      llmAugmentation: true,
      preferredLlmProvider: preferredProvider,
      cognitiveTwinContext: twin,
      sfiMethods: methods,
      studio: {
        sessionId: studio.session.id,
        objectId: input.objectId,
        objectTitle: studio.activeObject.title,
        objectType: studio.activeObject.type,
        analysisStatus: studio.activeObject.analysisStatus,
        readiness: studio.activeObject.readiness,
        metrics: studio.metricValues.filter((metric) => metric.value !== null).slice(0, 80),
        culturalLens: studio.culturalLens,
        mihm: studio.mihmReport,
        fieldGraph: studio.fieldGraph,
        relational,
        activeHypothesis: session.activeHypothesis ? {
          id: String(session.activeHypothesis.id),
          statement: session.activeHypothesis.statement,
          payload: session.activeHypothesis.payload,
          createdAt: session.activeHypothesis.created_at,
        } : null,
        returnedEvidenceAfterHypothesis: returnedEvidenceAfterHypothesis.map((row) => ({ id: row.id, label: row.label, source: row.source, createdAt: row.created_at })),
      },
    },
  };

  const cycle = await executeSfiRuntime(context);
  const agentInsights = record(cycle.context.metadata?.agentInsights);
  const synthesisPrompt = JSON.stringify({
    action: input.action,
    methods,
    object: { id: input.objectId, title: studio.activeObject.title, type: studio.activeObject.type },
    metrics: studio.metricValues.filter((metric) => metric.value !== null).slice(0, 100),
    culturalLens: studio.culturalLens,
    mihm: studio.mihmReport,
    relational,
    activeHypothesis: session.activeHypothesis ? {
      id: String(session.activeHypothesis.id),
      statement: session.activeHypothesis.statement,
      recommendedChange: session.activeHypothesis.recommended_change,
      payload: session.activeHypothesis.payload,
    } : null,
    returnedEvidenceAfterHypothesis: returnedEvidenceAfterHypothesis.map((row) => ({ id: row.id, source: row.source, label: row.label, payload: row.payload })),
    agentInsights,
    cognitiveTwin: {
      contractVersion: twin.contractVersion,
      memory: twin.memory.slice(0, 30),
      approvedDecisions: twin.decisions.slice(0, 24),
      warnings: twin.warnings,
    },
  });
  const synthesis = await runLlmTask({
    task: 'graph_interpretation',
    system: synthesisSystem(input.action),
    prompt: synthesisPrompt,
    fallbackResult: '{"status":"LLM_UNAVAILABLE"}',
    preferredProvider,
    maxTokens: 1800,
  });
  const allowedEvidence = new Set(evidenceRefs.concat(returnedEvidenceAfterHypothesis.map((row) => String(row.id))));
  const parsed = synthesis.ok ? parseFinalResult(synthesis.result, allowedEvidence) : null;
  const finalResult: FinalResult = parsed ?? {
    summary: null,
    findings: [],
    inconsistencies: [],
    changes: [],
    identity: {
      status: 'INDETERMINATE',
      confidence: 0,
      reason: synthesis.ok ? 'El modelo no devolvió el contrato JSON requerido.' : 'No existe un proveedor LLM disponible para cerrar la síntesis.',
      preserved: [],
    },
    production: {
      status: 'EVIDENCE_PENDING',
      reason: 'Studio no representa una síntesis degradada como análisis final.',
      blockers: [synthesis.ok ? 'LLM_RESPONSE_SCHEMA_INVALID' : 'LLM_PROVIDER_UNAVAILABLE'],
    },
    ejector: { direction: [], magnitude: null, velocity: null, horizon: null, confidence: 0, causalNodes: [], basis: 'No calculado.' },
    hypothesis: null,
    hypothesisOutcome: input.action === 'verify' ? 'INCONCLUSIVE' : null,
  };

  if (input.action !== 'generate_hypothesis') finalResult.hypothesis = null;
  if (input.action !== 'verify') finalResult.hypothesisOutcome = null;
  if (input.action === 'generate_hypothesis' && finalResult.hypothesis && !finalResult.hypothesis.statement.trim()) finalResult.hypothesis = null;

  const independentVerifier = input.action !== 'verify'
    ? true
    : Boolean(hypothesisProvider && synthesis.ok && synthesis.provider !== hypothesisProvider);
  if (input.action === 'verify' && !independentVerifier) {
    finalResult.hypothesisOutcome = 'INCONCLUSIVE';
    finalResult.production = {
      status: 'EVIDENCE_PENDING',
      reason: 'El Cognitive Twin prohíbe que el mismo proveedor que formuló la hipótesis cierre su verificación. Se requiere un proveedor independiente.',
      blockers: unique([...finalResult.production.blockers, 'INDEPENDENT_VERIFIER_REQUIRED']).slice(0, 3),
    };
  }

  const finishedAt = new Date().toISOString();
  const runtimeLimitations = unique([
    ...relational.warnings,
    ...twin.warnings,
    ...synthesis.warnings,
    ...(input.action === 'verify' && !independentVerifier ? ['INDEPENDENT_VERIFIER_REQUIRED'] : []),
  ]);
  const envelope = createCognitiveTwinEnvelope({
    taskId: context.taskId!,
    status: synthesis.ok ? 'EXECUTED' : 'ESCALATED',
    modelId: synthesis.ok ? `${synthesis.provider}:${synthesis.model}` : null,
    result: finalResult,
    claims: finalResult.findings.map((finding) => ({ statement: finding.statement, epistemicClass: finding.epistemicClass, evidenceRefs: finding.evidenceRefs })),
    limitations: runtimeLimitations,
    contradictions: finalResult.inconsistencies.map((item) => item.statement),
    missingEvidence: finalResult.production.status === 'EVIDENCE_PENDING' ? finalResult.production.blockers : [],
    actionsExecuted: cycle.executedAgents.map((agent) => `agent:${agent}`),
    testsRun: ['studio_object_analysis', relational.audioObjectCount > 1 ? 'studio_audio_relational_v1' : 'studio_audio_relational_not_applicable'],
    recommendedTransition: finalResult.production.status === 'READY' ? 'VERIFYING' : 'EVIDENCE_PENDING',
  });

  const db = session.db;
  let hypothesisId: string | null = session.activeHypothesis ? String(session.activeHypothesis.id) : null;
  if (input.action === 'generate_hypothesis' && finalResult.hypothesis) {
    const inserted = await db.from('studio_hypotheses').insert({
      object_id: input.objectId,
      owner_id: input.ownerId,
      origin: 'studio_cognitive_runtime_v1',
      severity: finalResult.inconsistencies.some((item) => item.severity === 'high') ? 'high' : 'medium',
      statement: finalResult.hypothesis.statement,
      recommended_change: finalResult.hypothesis.perturbation,
      route: 'FAD_MINIMUM_PERTURBATION',
      sources: evidenceRefs.slice(0, 40),
      payload: {
        suggestionStatus: 'EVIDENCE_PENDING',
        status: 'EVIDENCE_PENDING',
        confidence: finalResult.identity.confidence,
        expectedSignal: finalResult.hypothesis.expectedOutput,
        controls: finalResult.hypothesis.controls,
        evidenceRequired: finalResult.hypothesis.evidenceRequired,
        falsificationCriterion: finalResult.hypothesis.falsificationCriterion,
        taskId: context.taskId,
        agentIds: cycle.executedAgents,
        provider: synthesis.ok ? synthesis.provider : null,
        model: synthesis.ok ? synthesis.model : null,
        methods,
      },
    }).select('id').single();
    if (inserted.error || !inserted.data) return { ok: false as const, status: 503, error: 'HYPOTHESIS_PERSISTENCE_FAILED', details: inserted.error?.message };
    hypothesisId = String(inserted.data.id);
  }

  if (input.action === 'verify' && session.activeHypothesis) {
    const outcome = finalResult.hypothesisOutcome ?? 'INCONCLUSIVE';
    const nextStatus = outcome === 'SUPPORTED' ? 'VERIFIED' : outcome === 'FALSIFIED' ? 'REJECTED' : 'INCONCLUSIVE';
    await db.from('studio_hypotheses').update({
      payload: {
        ...record(session.activeHypothesis.payload),
        suggestionStatus: nextStatus,
        status: nextStatus,
        verifiedAt: finishedAt,
        verificationObjectId: input.objectId,
        verificationEvidenceIds: returnedEvidenceAfterHypothesis.map((row) => String(row.id)),
        hypothesisOutcome: outcome,
        verificationProvider: synthesis.ok ? synthesis.provider : null,
        verificationModel: synthesis.ok ? synthesis.model : null,
        independentVerifier,
      },
    }).eq('id', String(session.activeHypothesis.id)).eq('owner_id', input.ownerId);
    await persistStudioLearningCandidate({
      memoryKey: `studio:${studio.session.id}:hypothesis:${String(session.activeHypothesis.id)}:${finishedAt}`,
      memoryType: 'EVIDENCE',
      content: {
        hypothesisId: String(session.activeHypothesis.id),
        hypothesisOutcome: outcome,
        independentVerifier,
        result: finalResult,
        relational,
        methods,
      },
      evidenceRefs: returnedEvidenceAfterHypothesis.map((row) => String(row.id)),
      sourceRef: input.objectId,
      createdBy: input.ownerId,
    });
  }

  const trace = await db.from('studio_evidence_traces').insert({
    object_id: input.objectId,
    owner_id: input.ownerId,
    source: 'studio_cognitive_runtime_v1',
    label: `Studio cognitive ${input.action}`,
    payload: {
      observedAt: finishedAt,
      action: input.action,
      methods,
      result: finalResult,
      envelope,
      relational,
      executedAgents: cycle.executedAgents,
      agentInsights,
      provider: synthesis.ok ? synthesis.provider : null,
      model: synthesis.ok ? synthesis.model : null,
      llmStatus: synthesis.ok ? 'COMPLETE' : 'UNAVAILABLE',
      warnings: runtimeLimitations,
      hypothesisId,
      verification: input.action === 'verify' ? { hypothesisProvider, verificationProvider: synthesis.ok ? synthesis.provider : null, independentVerifier } : null,
    },
  }).select('id').single();
  const cognitiveEvidenceId = trace.data?.id ? String(trace.data.id) : null;
  const runRefs = unique([...evidenceRefs, ...(cognitiveEvidenceId ? [cognitiveEvidenceId] : [])]);
  const twinRun = await registerStudioTwinRun({
    taskId: context.taskId!,
    role: `studio_${input.action}`,
    objective: `Analyze Studio object ${input.objectId} under active field and SFI methods.`,
    provider: synthesis.ok ? synthesis.provider : null,
    model: synthesis.ok ? synthesis.model : null,
    status: synthesis.ok ? (input.action === 'verify' ? 'VERIFYING' : finalResult.production.status === 'READY' ? 'READY' : 'EVIDENCE_PENDING') : 'BLOCKED',
    inputSnapshot: { sessionId: studio.session.id, objectId: input.objectId, action: input.action, agentIds: cycle.executedAgents, methods },
    outputEnvelope: envelope as unknown as Record<string, unknown>,
    evidenceRefs: runRefs,
    limitations: runtimeLimitations,
    startedAt,
    finishedAt,
  });
  await db.from('studio_archive_events').insert({
    session_id: studio.session.id,
    object_id: input.objectId,
    owner_id: input.ownerId,
    event_type: input.action === 'verify' ? 'VERIFICATION_COMPLETED' : input.action === 'generate_hypothesis' ? 'HYPOTHESIS_CREATED' : 'COGNITIVE_ANALYSIS_COMPLETED',
    label: finalResult.summary ?? `Studio ${input.action}`,
    source: 'studio_cognitive_runtime_v1',
    payload: {
      evidenceId: cognitiveEvidenceId,
      twinRunId: twinRun.id,
      hypothesisId,
      methods,
      production: finalResult.production,
      identity: finalResult.identity,
      ejector: finalResult.ejector,
      independentVerifier: input.action === 'verify' ? independentVerifier : null,
    },
  });

  return {
    ok: true as const,
    status: 201,
    objectId: input.objectId,
    sessionId: studio.session.id,
    action: input.action,
    result: finalResult,
    relational,
    methods,
    agents: { executed: cycle.executedAgents, insights: agentInsights },
    llm: {
      ok: synthesis.ok,
      provider: synthesis.ok ? synthesis.provider : null,
      model: synthesis.ok ? synthesis.model : null,
      warnings: runtimeLimitations,
      independentVerifier: input.action === 'verify' ? independentVerifier : null,
    },
    twin: { runId: twinRun.id, evidenceId: cognitiveEvidenceId, contractVersion: twin.contractVersion },
    hypothesisId,
  };
}

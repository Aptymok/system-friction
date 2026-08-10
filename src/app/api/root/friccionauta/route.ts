import { NextResponse } from 'next/server';
import { runLlmTask } from '@/lib/ai/providerRouter';
import { createCognitiveTwinEnvelope, evaluateCognitiveTwinAuthority } from '@/lib/cognitive-twin/contract';
import { readCognitiveTwinState } from '@/lib/cognitive-twin/readState';
import { runNeuralGraphAgent } from '@/lib/agents/neuralGraphAgent';
import { readAmvOperationalMemory } from '@/lib/agents/amvAgent';
import { buildWorldVectorOperationalState } from '@/lib/world-vector/operationalState';
import { readRootSovereignState } from '@/lib/root/sovereign/rootSovereignAdapter';
import { auditRootAction, requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Row = Record<string, unknown>;
type RootActorGate = Extract<Awaited<ReturnType<typeof requireRootActor>>, { ok: true }>;

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}
function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}
function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())) : [];
}
function compact(value: unknown, max = 6000) {
  const serialized = JSON.stringify(value);
  return serialized.length > max ? `${serialized.slice(0, max)}…[TRUNCATED]` : serialized;
}
function recentConversation(value: unknown) {
  return rows(value).slice(-8).map((item) => ({ role: text(item.role, 'user'), content: text(item.content).slice(0, 2200) }));
}
function rejectedWarning(label: string, result: PromiseSettledResult<unknown>) {
  return result.status === 'rejected'
    ? `${label}_unavailable:${result.reason instanceof Error ? result.reason.message : String(result.reason)}`
    : null;
}

async function ask(request: Request, gate: RootActorGate, body: Row) {
  const question = text(body.question);
  if (!question) return NextResponse.json({ ok: false, error: 'question_required' }, { status: 400 });
  const startedAt = new Date().toISOString();

  // A conversational surface must not collapse because one observational reader is degraded.
  // Each source is independently optional; the LLM still receives the context that is actually available.
  const [rootResult, twinResult, worldResult, graphResult, amvResult] = await Promise.allSettled([
    readRootSovereignState(),
    readCognitiveTwinState(),
    buildWorldVectorOperationalState(),
    runNeuralGraphAgent({ query: question, filters: ['evidence', 'amv', 'prediction', 'world_vector', 'prospect', 'report'] }),
    readAmvOperationalMemory({ query: question, limit: 14 }),
  ]);

  const root = rootResult.status === 'fulfilled' ? rootResult.value : null;
  const twin = twinResult.status === 'fulfilled' ? twinResult.value : null;
  const world = worldResult.status === 'fulfilled' ? worldResult.value : null;
  const graph = graphResult.status === 'fulfilled' ? graphResult.value : null;
  const amv = amvResult.status === 'fulfilled' ? amvResult.value : null;
  const retrievalWarnings = [
    rejectedWarning('root', rootResult),
    rejectedWarning('cognitive_twin', twinResult),
    rejectedWarning('world_vector', worldResult),
    rejectedWarning('neural_graph', graphResult),
    rejectedWarning('amv', amvResult),
  ].filter((item): item is string => Boolean(item));

  const evidenceRefs = Array.from(new Set([
    ...(graph?.evidence ?? []).map((item) => item.id),
    ...(amv?.items ?? []).map((item) => item.id),
    ...(root?.interpretation.facts ?? []).flatMap((fact) => fact.evidenceIds),
    ...(root?.predictions.data.runs ?? []).flatMap((row) => strings(row.evidence_refs)),
  ])).slice(0, 80);

  const context = {
    generatedAt: root?.generatedAt ?? new Date().toISOString(),
    retrievalWarnings,
    institutionalInterpretation: root?.interpretation ?? null,
    systemMatrix: root?.system.data.matrix ?? [],
    warnings: root?.warnings ?? [],
    governance: root ? {
      proposals: root.governance.data.proposals.slice(0, 18),
      mutations: root.governance.data.mutations.slice(0, 12),
    } : null,
    cognitiveRuntime: root ? {
      status: root.cognitiveRuntime.data.status,
      contract: root.cognitiveRuntime.data.contract,
      agents: root.cognitiveRuntime.data.agents,
      recentEvents: root.cognitiveRuntime.data.eventGraph.recentEvents.slice(0, 24),
    } : null,
    predictions: root ? {
      runs: root.predictions.data.runs.slice(0, 16),
      outcomes: root.predictions.data.outcomes.slice(0, 16),
      legacy: root.predictions.data.legacyEntries.slice(0, 12),
    } : null,
    attractors: root?.amv.data.attractors.slice(0, 18) ?? [],
    executionCapabilities: root?.execution.data.capabilities ?? [],
    worldVector: world?.today.observation ?? null,
    cognitiveTwin: twin ? {
      implementation: twin.implementation,
      counts: twin.counts,
      recentDecisions: twin.recentDecisions.slice(0, 12),
      recentRuns: twin.recentRuns.slice(0, 12),
      errors: twin.errors,
    } : null,
    targetedRetrieval: graph ? {
      interpretation: graph.interpretation,
      evidence: graph.evidence.slice(0, 16),
      nodes: graph.nodes.slice(0, 22),
      predictions: graph.related_predictions.slice(0, 12),
      reports: graph.related_reports.slice(0, 10),
      missingContext: graph.missing_context,
    } : null,
    amv: amv ? {
      items: amv.items.slice(0, 14),
      recurrentPatterns: amv.recurrent_patterns,
      warnings: amv.warnings,
    } : null,
    conversation: recentConversation(body.history),
  };

  const fallback = [
    'FRICCIONAUTA · DEGRADED',
    `Pregunta: ${question}`,
    `Fuentes degradadas: ${retrievalWarnings.length}.`,
    `Evidencia recuperada: ${graph?.evidence.length ?? 0}.`,
    'No hubo proveedor LLM disponible para sintetizar una respuesta. La conversación permanece registrada como intento degradado.',
  ].join('\n');

  const llm = await runLlmTask({
    task: 'context_long',
    preferredProvider: 'groq',
    system: [
      'You are FRICCIONAUTA, the read-only conversational interface of System Friction Institute ROOT.',
      'You operate through the Cognitive Twin contract. You are not the Cognitive Twin itself and you do not own institutional memory.',
      'Answer questions about SFI using the supplied current institutional state and targeted retrieval.',
      'Some readers may be explicitly unavailable. Missing readers are not a reason to refuse the whole conversation; name the missing context and continue with what is available.',
      'You may interpret, compare, diagnose gaps and propose next observations. You may NOT execute endpoints, approve, publish, mutate canon, alter formulas, grant access, contact anyone or represent a proposal as executed.',
      'Evidence before inference. Distinguish OBSERVED, IMPORTED, DERIVED, INFERRED, PROPOSED and MISSING.',
      'When asked what something means, explain the operational consequence rather than restating database fields.',
      'When dates matter, reconstruct the temporal context from the supplied records and say when the context is incomplete.',
      'If the user asks about something not present in SFI context, say that it is not currently observable from ROOT rather than inventing it.',
      'Be concise but sufficiently diagnostic. Prefer: answer, evidence/context, contradiction or uncertainty, next useful observation.',
    ].join(' '),
    prompt: `QUESTION\n${question}\n\nSFI_CONTEXT\n${compact(context, 52000)}`,
    fallbackResult: fallback,
    maxTokens: 1500,
  });

  const authority = evaluateCognitiveTwinAuthority({ action: 'propose', founderAbsent: false, evidencePresent: evidenceRefs.length > 0 });
  const taskId = `friccionauta:${Date.now()}`;
  const allWarnings = [
    ...retrievalWarnings,
    ...llm.warnings,
    ...(root?.warnings ?? []),
    ...(graph?.warnings ?? []),
    ...(amv?.warnings ?? []),
  ];
  const missingEvidence = graph?.missing_context ?? (graph ? [] : ['neural_graph_context_unavailable']);
  const envelope = createCognitiveTwinEnvelope({
    status: llm.ok ? 'PROPOSED' : 'REJECTED',
    taskId,
    modelId: `${llm.provider}:${llm.model}`,
    result: {
      question,
      answer: llm.result,
      provider: llm.provider,
      model: llm.model,
      authority,
      rootGeneratedAt: root?.generatedAt ?? null,
      evidenceRefCount: evidenceRefs.length,
      retrievalDegradationCount: retrievalWarnings.length,
      providerExecutionSucceeded: llm.ok,
    },
    limitations: allWarnings,
    missingEvidence,
    actionsExecuted: [
      root ? 'read_root_state' : 'read_root_state_failed',
      twin ? 'read_cognitive_twin' : 'read_cognitive_twin_failed',
      world ? 'read_world_vector' : 'read_world_vector_failed',
      graph ? 'retrieve_neural_graph' : 'retrieve_neural_graph_failed',
      amv ? 'read_amv' : 'read_amv_failed',
      llm.ok ? 'llm_synthesis' : 'llm_synthesis_failed',
    ],
    recommendedTransition: llm.ok ? 'VERIFYING' : 'BLOCKED',
  });
  const finishedAt = new Date().toISOString();

  const persisted = await gate.ctx.service.from('sfi_cognitive_twin_runs').insert({
    task_id: taskId,
    contract_version: envelope.contractVersion,
    provider: llm.provider,
    model: llm.model,
    role: 'friccionauta',
    status: llm.ok ? 'READY' : 'BLOCKED',
    objective: question,
    input_snapshot: {
      question,
      requestedBy: gate.ctx.user.id,
      rootGeneratedAt: root?.generatedAt ?? null,
      retrievalWarnings,
      providerExecutionSucceeded: llm.ok,
    },
    output_envelope: envelope,
    evidence_refs: evidenceRefs,
    limitations: envelope.limitations,
    started_at: startedAt,
    finished_at: finishedAt,
  }).select('id,task_id,status,provider,model,role,objective,evidence_refs,limitations,created_at').single();

  if (persisted.error) return NextResponse.json({ ok: false, error: 'friccionauta_run_persistence_failed', details: persisted.error.message, envelope }, { status: 500 });
  const audit = await auditRootAction({
    actorId: gate.ctx.user.id,
    action: 'friccionauta.ask',
    target: taskId,
    payload: {
      runId: persisted.data.id,
      provider: llm.provider,
      model: llm.model,
      providerExecutionSucceeded: llm.ok,
      evidenceRefs: evidenceRefs.length,
      retrievalDegradationCount: retrievalWarnings.length,
    },
    request,
  });
  if (!audit.ok) return NextResponse.json(audit, { status: 500 });

  return NextResponse.json({
    ok: true,
    cognitiveExecution: llm.ok ? 'EXECUTED' : 'DEGRADED',
    answer: llm.result,
    provider: llm.provider,
    model: llm.model,
    evidenceRefs,
    warnings: envelope.limitations,
    retrievalWarnings,
    run: persisted.data,
    envelope,
    audit,
  });
}

async function saveFinding(request: Request, gate: RootActorGate, body: Row) {
  const finding = text(body.finding);
  const question = text(body.question);
  const sourceRunId = text(body.sourceRunId);
  const evidenceRefs = strings(body.evidenceRefs);
  if (!finding) return NextResponse.json({ ok: false, error: 'finding_required' }, { status: 400 });
  const memoryKey = `FRICCIONAUTA:FINDING:${new Date().toISOString()}:${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const write = await gate.ctx.service.from('sfi_cognitive_twin_memory').insert({
    memory_key: memoryKey,
    memory_type: 'EVIDENCE',
    status: 'CANDIDATE',
    content: {
      finding,
      question: question || null,
      sourceRunId: sourceRunId || null,
      epistemicClass: 'INFERRED',
      observedObject: 'founder_selected_friccionauta_finding',
      claimBoundary: 'The founder selected this finding for institutional memory. Selection does not make the finding verified or canonical.',
      selectedAt: new Date().toISOString(),
    },
    evidence_refs: evidenceRefs,
    source_kind: 'friccionauta_root',
    source_ref: sourceRunId || null,
    created_by: gate.ctx.user.id,
  }).select('*').single();
  if (write.error) return NextResponse.json({ ok: false, error: 'friccionauta_finding_persistence_failed', details: write.error.message }, { status: 500 });
  const audit = await auditRootAction({ actorId: gate.ctx.user.id, action: 'friccionauta.finding.save', target: memoryKey, payload: { sourceRunId: sourceRunId || null, evidenceRefs }, request });
  return NextResponse.json({ ok: audit.ok, memory: write.data, audit });
}

export async function POST(request: Request) {
  const gate = await requireRootActor('friccionauta');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const body = await request.json().catch(() => ({})) as Row;
  const rootGate: RootActorGate = gate;
  return text(body.action, 'ask') === 'save_finding' ? saveFinding(request, rootGate, body) : ask(request, rootGate, body);
}

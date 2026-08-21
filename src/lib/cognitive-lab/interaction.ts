import 'server-only';

import { runLlmTask } from '@/lib/ai/providerRouter';
import { createCognitiveTwinEnvelope, evaluateCognitiveTwinAuthority } from '@/core/cognitive-twin/contract';
import { readCanonicalCognitiveTwinMemory } from '@/core/cognitive-twin/canonicalMemoryView';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { appendCognitiveLabEvent, getCognitiveLabSession } from './service';

type Row = Record<string, unknown>;

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

export async function runCognitiveLabInteraction(createdBy: string, sessionId: string, input: {
  prompt: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}) {
  const db = createServiceSupabaseClient();
  const lab = await getCognitiveLabSession(sessionId);
  const session = lab.session as Row;
  const condition = String(session.condition ?? 'OTHER');
  if (!['FOUNDER_MODEL', 'FOUNDER_TWIN'].includes(condition)) throw new Error('COGNITIVE_LAB_INTERACTION_REQUIRES_MODEL_CONDITION');

  const promptEvent = await appendCognitiveLabEvent(createdBy, sessionId, {
    eventKind: 'PROMPT', provenance: 'FOUNDER_ORIGINATED', actorKey: 'FOUNDER', relationFrom: 'FOUNDER',
    relationTo: condition === 'FOUNDER_TWIN' ? 'COGNITIVE_TWIN' : 'MODEL',
    payload: { text: input.prompt, interactionMode: condition }, evidenceRefs: [], sourceRef: `cognitive-lab:${sessionId}:interaction`,
  });

  let memory: Row[] = [];
  let decisions: Row[] = [];
  const warnings: string[] = [];
  if (condition === 'FOUNDER_TWIN') {
    const [memoryResult, decisionsResult] = await Promise.all([
      readCanonicalCognitiveTwinMemory(80),
      db.from('sfi_cognitive_twin_decisions')
        .select('decision_id,situation,rejected_condition,correct_state,general_rule,required_evidence,evidence_refs,status,approved_at')
        .eq('status', 'APPROVED').order('approved_at', { ascending: false }).limit(50),
    ]);
    if (memoryResult.error) warnings.push(`memory_unavailable:${memoryResult.error}`);
    if (decisionsResult.error) warnings.push(`decisions_unavailable:${decisionsResult.error.message}`);
    memory = memoryResult.rows as unknown as Row[];
    decisions = (decisionsResult.data ?? []) as Row[];
  }

  const evidenceRefs = Array.from(new Set([
    `cognitive-lab-event:${String(promptEvent.id)}`,
    ...memory.flatMap((row) => strings(row.evidence_refs)),
    ...decisions.flatMap((row) => strings(row.evidence_refs)),
  ])).slice(0, 100);

  const system = condition === 'FOUNDER_TWIN'
    ? [
        'You are the replaceable execution model operating inside a controlled Cognitive Twin laboratory condition.',
        'Use only the supplied VERIFIED/CANONICAL institutional memory and APPROVED founder decisions as Cognitive Twin context.',
        'Do not use candidate learning and do not infer that founder authorization means founder origination.',
        'Respond to the task normally, but preserve uncertainty, provenance and reversibility where material.',
        'Do not mutate canon or claim verification.',
      ].join(' ')
    : [
        'You are a general model operating inside a controlled human-model laboratory condition.',
        'You have no Cognitive Twin memory and must not infer a founder-specific method from the prompt alone.',
        'Solve the task as a capable general assistant. Preserve uncertainty and do not claim hidden knowledge about the founder.',
      ].join(' ');

  const llm = await runLlmTask({
    task: 'context_long',
    system,
    prompt: JSON.stringify({
      prompt: input.prompt,
      history: (input.history ?? []).slice(-10),
      condition,
      cognitiveTwinContext: condition === 'FOUNDER_TWIN' ? { memory, decisions } : null,
      warnings,
    }),
    fallbackResult: '',
    maxTokens: 1800,
  });

  const outputEvent = await appendCognitiveLabEvent(createdBy, sessionId, {
    eventKind: 'MODEL_OUTPUT', provenance: 'MODEL_PROPOSED',
    actorKey: condition === 'FOUNDER_TWIN' ? 'COGNITIVE_TWIN_EXECUTION_MODEL' : 'MODEL',
    relationFrom: condition === 'FOUNDER_TWIN' ? 'COGNITIVE_TWIN' : 'MODEL', relationTo: 'FOUNDER',
    payload: { text: llm.result, provider: llm.provider, model: llm.model, providerExecutionSucceeded: llm.ok, interactionMode: condition },
    evidenceRefs, sourceRef: `cognitive-lab:${sessionId}:interaction`,
  });

  let twinRun: Row | null = null;
  if (condition === 'FOUNDER_TWIN') {
    const authority = evaluateCognitiveTwinAuthority({ action: 'propose', founderAbsent: false, evidencePresent: evidenceRefs.length > 0 });
    const taskId = `cognitive-lab:interaction:${sessionId}:${Date.now()}`;
    const envelope = createCognitiveTwinEnvelope({
      status: llm.ok ? 'PROPOSED' : 'REJECTED', taskId, modelId: `${llm.provider}:${llm.model}`,
      result: { labSessionId: sessionId, promptEventId: promptEvent.id, outputEventId: outputEvent.id, answer: llm.result, authority, condition, providerExecutionSucceeded: llm.ok },
      limitations: [...warnings, ...llm.warnings], missingEvidence: [],
      actionsExecuted: ['read_verified_canonical_memory', 'read_approved_decisions', llm.ok ? 'execute_lab_interaction' : 'lab_interaction_provider_failed'],
      recommendedTransition: llm.ok ? 'VERIFYING' : 'BLOCKED',
    });
    const persisted = await db.from('sfi_cognitive_twin_runs').insert({
      task_id: taskId, contract_version: envelope.contractVersion, provider: llm.provider, model: llm.model,
      role: 'cognitive_lab_interaction', status: llm.ok ? 'READY' : 'BLOCKED', objective: input.prompt,
      input_snapshot: { labSessionId: sessionId, promptEventId: promptEvent.id, requestedBy: createdBy, condition },
      output_envelope: envelope, evidence_refs: evidenceRefs, limitations: envelope.limitations,
      started_at: promptEvent.occurred_at, finished_at: outputEvent.occurred_at,
    }).select('id,task_id,status,provider,model,role,created_at').single();
    if (!persisted.error) twinRun = persisted.data as Row;
  }

  return { ok: llm.ok, answer: llm.result, provider: llm.provider, model: llm.model, warnings: [...warnings, ...llm.warnings], condition, promptEvent, outputEvent, twinRun };
}

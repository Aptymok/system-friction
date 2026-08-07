import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { executeSfiRuntime } from '@/lib/sfi/cognitive-runtime/runtime';
import type { KernelContext, KernelEvidence } from '@/lib/sfi/cognitive-runtime/kernelContext';
import { createCognitiveTwinEnvelope } from '@/lib/cognitive-twin/contract';
import { syncRecentInstitutionalEvidenceToCognitiveTwin } from '@/lib/cognitive-twin/evidenceIngestion';
import { readInstitutionalAttractor, refreshInstitutionalAttractorTrajectory, SFI_INSTITUTIONAL_ATTRACTOR_KEY } from './institutionalAttractor';
import { refreshPhenomenonTrajectoriesAndPpoi } from './phenomenonTrajectory';

type Row = Record<string, unknown>;

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}
function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function clamp01(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : fallback;
}

async function readCycleEvidence(limit = 80): Promise<{ evidence: KernelEvidence[]; refs: string[]; warnings: string[] }> {
  const db = createServiceSupabaseClient();
  const [root, ledger] = await Promise.all([
    db.from('root_evidence_entries')
      .select('id,title,content,evidence_type,payload,epistemic_event_id,created_at')
      .order('created_at', { ascending: false })
      .limit(Math.max(1, Math.floor(limit / 2))),
    db.from('sfi_evidence_ledger')
      .select('id,module,evidence_kind,source_name,public_summary,trust_score,observed_at')
      .order('observed_at', { ascending: false })
      .limit(Math.max(1, Math.floor(limit / 2))),
  ]);

  const rootRows = rows(root.data);
  const eventIds = [...new Set(rootRows.map((item) => text(item.epistemic_event_id)).filter((value): value is string => Boolean(value)))];
  const events = eventIds.length
    ? await db.from('epistemic_events').select('event_id,epistemic_class,confidence,source,occurred_at').in('event_id', eventIds)
    : { data: [], error: null };
  const eventById = new Map(rows(events.data).map((item) => [String(item.event_id), item]));

  const evidence: KernelEvidence[] = [];
  const warnings = [root.error?.message, ledger.error?.message, events.error?.message].filter((value): value is string => Boolean(value));

  for (const item of rootRows) {
    const id = text(item.id);
    if (!id) continue;
    const eventId = text(item.epistemic_event_id);
    const event = eventId ? eventById.get(eventId) : null;
    if (!event) warnings.push(`root_evidence_event_missing:${id}`);
    const eventSource = record(event?.source);
    evidence.push({
      id,
      source: `root_evidence_entries:${text(item.evidence_type) ?? 'observed_record'}`,
      confidence: event ? clamp01(event.confidence, 0) : 0,
      payload: {
        title: text(item.title),
        content: text(item.content),
        metadata: record(record(item.payload).metadata),
        epistemicClass: text(event?.epistemic_class)?.toUpperCase() ?? 'MISSING',
        eventId,
        eventSource,
        observedAt: text(event?.occurred_at) ?? text(item.created_at),
        epistemicRule: 'The evidence record and its provenance may be OBSERVED; claims inside its content retain their own epistemic status until independently evaluated.',
      },
    });
  }

  for (const item of rows(ledger.data)) {
    const id = text(item.id);
    if (!id) continue;
    evidence.push({
      id,
      source: `sfi_evidence_ledger:${text(item.module) ?? text(item.source_name) ?? 'unknown'}`,
      confidence: clamp01(item.trust_score, 0),
      payload: {
        kind: text(item.evidence_kind),
        sourceName: text(item.source_name),
        summary: record(item.public_summary),
        observedAt: text(item.observed_at),
        epistemicClass: 'IMPORTED',
        epistemicRule: 'Ledger trust and epistemic class remain separate; trust does not promote a claim to OBSERVED or CANONICAL.',
      },
    });
  }

  return {
    evidence,
    refs: [...new Set(evidence.map((item) => item.id))],
    warnings: [...new Set(warnings)],
  };
}

function cognitiveTwinSyncWarnings(result: Awaited<ReturnType<typeof syncRecentInstitutionalEvidenceToCognitiveTwin>>) {
  if (result.ok) return [];
  if ('error' in result && typeof result.error === 'string') return [result.error];
  if ('failures' in result && Array.isArray(result.failures)) return result.failures;
  return ['cognitive_twin_evidence_sync_degraded'];
}

export async function runInstitutionalCycle(trigger = 'scheduled') {
  const db = createServiceSupabaseClient();
  const startedAt = new Date().toISOString();
  const taskId = crypto.randomUUID();
  const cycleId = crypto.randomUUID();
  const logbookId = `institutional-cycle:${taskId}`;

  const [memorySync, phenomenonRefresh] = await Promise.all([
    syncRecentInstitutionalEvidenceToCognitiveTwin(250),
    refreshPhenomenonTrajectoriesAndPpoi(),
  ]);
  // Attractor contrast follows phenomenon/PPOI refresh so the trajectory never races the evidence-bearing phenomenon state.
  const attractorRefresh = await refreshInstitutionalAttractorTrajectory();

  const [cycleEvidence, attractorState] = await Promise.all([
    readCycleEvidence(),
    readInstitutionalAttractor(),
  ]);

  const vector = record(attractorState.attractor?.vector);
  const desiredState = text(vector.desiredState) ?? 'Institutional attractor declaration unavailable.';
  const context: KernelContext = {
    cycleId,
    logbookId,
    taskId,
    currentEvent: 'SFI_INSTITUTIONAL_CYCLE',
    evidence: cycleEvidence.evidence,
    hypotheses: [{
      id: SFI_INSTITUTIONAL_ATTRACTOR_KEY,
      statement: `Declared institutional direction to contrast against evidence: ${desiredState}`,
      confidence: attractorState.attractor ? 1 : 0,
    }],
    contradictions: [],
    simulations: [],
    predictions: [],
    risks: [],
    opportunities: [],
    metadata: {
      trigger,
      attractorKey: SFI_INSTITUTIONAL_ATTRACTOR_KEY,
      attractorEpistemicClass: 'DECLARED',
      evidenceCountAtStart: cycleEvidence.evidence.length,
      rule: 'This cycle may observe, extract, derive, simulate and propose. It cannot publish, claim attainment, spend, grant access, change canon or execute irreversible external action.',
    },
  };

  const result = await executeSfiRuntime(context);
  const completedAt = new Date().toISOString();
  const memoryWarnings = cognitiveTwinSyncWarnings(memorySync);
  const phenomenonWarnings = 'warnings' in phenomenonRefresh && Array.isArray(phenomenonRefresh.warnings) ? phenomenonRefresh.warnings : [];
  const criticalSubstepsOk = memorySync.ok && phenomenonRefresh.ok && attractorRefresh.ok && cycleEvidence.warnings.length === 0;

  const envelope = createCognitiveTwinEnvelope({
    taskId,
    status: result.completed ? 'EXECUTED' : 'ESCALATED',
    modelId: null,
    result: {
      executedAgents: result.executedAgents,
      evidenceAtStart: cycleEvidence.evidence.length,
      evidenceAtEnd: result.context.evidence.length,
      hypotheses: result.context.hypotheses.length,
      predictions: result.context.predictions.length,
      risks: result.context.risks.length,
      opportunities: result.context.opportunities.length,
      attractor: {
        key: SFI_INSTITUTIONAL_ATTRACTOR_KEY,
        evidenceCoverage: attractorRefresh.evidenceCoverage,
        supportedDimensions: attractorRefresh.supportedDimensions,
        contradictedDimensions: attractorRefresh.contradictedDimensions,
        missingDimensions: attractorRefresh.missingDimensions,
      },
      ppoi: phenomenonRefresh,
    },
    claims: [{
      statement: 'An institutional cognitive cycle execution was recorded against persisted evidence and a DECLARED attractor.',
      epistemicClass: 'OBSERVED',
      evidenceRefs: cycleEvidence.refs,
    }],
    assumptions: [],
    limitations: [
      'Attractor direction is founder-declared; attainment is evidence-dependent.',
      'Agent execution does not constitute external execution or independent validation.',
      'Evidence coverage measures whether a dimension is evidenced or contradicted; it is not an attainment percentage.',
      ...cycleEvidence.warnings,
      ...memoryWarnings,
      ...phenomenonWarnings,
    ],
    contradictions: [
      ...result.context.contradictions.map((item) => item.id),
      ...attractorRefresh.contradictedDimensions.map((dimension) => `attractor:${dimension}`),
    ],
    missingEvidence: attractorRefresh.missingDimensions,
    actionsExecuted: result.executedAgents.map((agent) => `cognitive:${agent}`),
    testsRun: [],
    recommendedTransition: criticalSubstepsOk ? 'VERIFYING' : 'ESCALATED',
  });

  const runInsert = await db.from('sfi_cognitive_twin_runs').insert({
    task_id: taskId,
    contract_version: envelope.contractVersion,
    provider: null,
    model: null,
    role: 'institutional_cycle',
    status: 'CLOSED',
    objective: 'Contrast persisted institutional evidence and phenomena against the declared SFI attractor, then execute the governed cognitive topology.',
    input_snapshot: {
      trigger,
      cycleId,
      logbookId,
      evidenceRefs: cycleEvidence.refs,
      attractorKey: SFI_INSTITUTIONAL_ATTRACTOR_KEY,
    },
    output_envelope: envelope,
    evidence_refs: cycleEvidence.refs,
    limitations: envelope.limitations,
    started_at: startedAt,
    finished_at: completedAt,
  }).select('id,task_id,status,created_at').single();

  const warnings = [
    ...cycleEvidence.warnings,
    ...attractorState.warnings,
    ...memoryWarnings,
    ...phenomenonWarnings,
    ...attractorRefresh.warnings,
    ...(runInsert.error ? [`cognitive_twin_run:${runInsert.error.message}`] : []),
  ];

  return {
    ok: result.completed && criticalSubstepsOk && !runInsert.error,
    status: result.completed && criticalSubstepsOk && !runInsert.error ? 'COMPLETED' : 'DEGRADED',
    trigger,
    startedAt,
    completedAt,
    taskId,
    cycleId,
    logbookId,
    executedAgents: result.executedAgents,
    agentCount: result.executedAgents.length,
    cognitiveTwinMemory: memorySync,
    attractor: attractorRefresh,
    phenomenaPpoi: phenomenonRefresh,
    run: runInsert.data ?? null,
    warnings: [...new Set(warnings)],
  };
}
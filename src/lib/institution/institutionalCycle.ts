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
function clamp01(value: unknown, fallback = 0.5) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : fallback;
}

async function readCycleEvidence(limit = 80): Promise<{ evidence: KernelEvidence[]; refs: string[]; warnings: string[] }> {
  const db = createServiceSupabaseClient();
  const [root, ledger] = await Promise.all([
    db.from('root_evidence_entries').select('id,title,content,evidence_type,payload,created_at').order('created_at', { ascending: false }).limit(Math.max(1, Math.floor(limit / 2))),
    db.from('sfi_evidence_ledger').select('id,module,evidence_kind,source_name,public_summary,trust_score,observed_at').order('observed_at', { ascending: false }).limit(Math.max(1, Math.floor(limit / 2))),
  ]);

  const evidence: KernelEvidence[] = [];
  for (const item of rows(root.data)) {
    const id = text(item.id);
    if (!id) continue;
    evidence.push({
      id,
      source: `root_evidence_entries:${text(item.evidence_type) ?? 'observed_record'}`,
      confidence: 0.5,
      payload: {
        title: text(item.title),
        content: text(item.content),
        metadata: record(record(item.payload).metadata),
        epistemicRule: 'Evidence content is input to analysis, not automatically a verified claim.',
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
      },
    });
  }

  return {
    evidence,
    refs: [...new Set(evidence.map((item) => item.id))],
    warnings: [root.error?.message, ledger.error?.message].filter((value): value is string => Boolean(value)),
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

  const [memorySync, phenomenonRefresh, attractorRefresh] = await Promise.all([
    syncRecentInstitutionalEvidenceToCognitiveTwin(250),
    refreshPhenomenonTrajectoriesAndPpoi(),
    refreshInstitutionalAttractorTrajectory(),
  ]);

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
      attractorEpistemicClass: 'declared',
      evidenceCountAtStart: cycleEvidence.evidence.length,
      rule: 'This cycle may observe, derive, simulate and propose. It cannot publish, claim attainment, spend, grant access or execute irreversible external action.',
    },
  };

  const result = await executeSfiRuntime(context);
  const completedAt = new Date().toISOString();
  const envelope = createCognitiveTwinEnvelope({
    taskId,
    status: 'EXECUTED',
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
        missingDimensions: attractorRefresh.missingDimensions,
      },
      ppoi: phenomenonRefresh,
    },
    claims: [{
      statement: 'The institutional cognitive cycle executed against persisted evidence and a declared attractor.',
      epistemicClass: 'observed_execution',
      evidenceRefs: cycleEvidence.refs,
    }],
    assumptions: [],
    limitations: [
      'Attractor direction is founder-declared; attainment is evidence-dependent.',
      'Agent execution does not constitute external execution or independent validation.',
      ...cycleEvidence.warnings,
    ],
    contradictions: result.context.contradictions.map((item) => item.id),
    missingEvidence: attractorRefresh.missingDimensions,
    actionsExecuted: result.executedAgents.map((agent) => `cognitive:${agent}`),
    testsRun: [],
    recommendedTransition: 'VERIFYING',
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

  return {
    ok: result.completed && !runInsert.error,
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
    warnings: [
      ...cycleEvidence.warnings,
      ...attractorState.warnings,
      ...cognitiveTwinSyncWarnings(memorySync),
      ...('warnings' in phenomenonRefresh && Array.isArray(phenomenonRefresh.warnings) ? phenomenonRefresh.warnings : []),
      ...(runInsert.error ? [`cognitive_twin_run:${runInsert.error.message}`] : []),
    ],
  };
}

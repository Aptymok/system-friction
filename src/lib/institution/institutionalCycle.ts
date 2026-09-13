import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import type { KernelContext, KernelEvidence } from '@/lib/sfi/cognitive-runtime/kernelContext';
import { createCognitiveTwinEnvelope } from '@/core/cognitive-twin/contract';
import { syncRecentInstitutionalEvidenceToCognitiveTwin } from '@/core/cognitive-twin/evidenceIngestion';
import { reconcileAutomaticPpoi } from '@/lib/mihm/automaticPpoiReconciliation';
import { ensureInstitutionalAttractorDeclaration } from './ensureInstitutionalAttractor';
import { readInstitutionalAttractor, refreshInstitutionalAttractorTrajectory, SFI_INSTITUTIONAL_ATTRACTOR_KEY } from './institutionalAttractor';
import { readOpenInstitutionalEvolutionWork } from './institutionalEvolution';
import { refreshPhenomenonTrajectoriesAndPpoi } from './phenomenonTrajectory';
import { executeInstitutionalRuntimeWithCognitiveSpine } from './cognitiveSpineRuntimeExecution';

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

  // Declaration reconciliation is idempotent. It persists strategic direction
  // without changing evidence-derived trajectory fields or claiming attainment.
  const attractorDeclaration = await ensureInstitutionalAttractorDeclaration();

  const [memorySync, phenomenonRefresh, automaticPpoi] = await Promise.all([
    syncRecentInstitutionalEvidenceToCognitiveTwin(250),
    refreshPhenomenonTrajectoriesAndPpoi(),
    reconcileAutomaticPpoi(),
  ]);
  const attractorRefresh = await refreshInstitutionalAttractorTrajectory();

  const [cycleEvidence, attractorState, evolutionWork] = await Promise.all([
    readCycleEvidence(),
    readInstitutionalAttractor(),
    readOpenInstitutionalEvolutionWork(12),
  ]);

  const vector = record(attractorState.attractor?.vector);
  const desiredState = text(vector.desiredState) ?? 'Institutional attractor declaration unavailable.';
  const declaredTargetRecord = record(vector.convergenceTarget);
  const declaredTarget = Object.keys(declaredTargetRecord).length ? declaredTargetRecord : null;
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
      declaredTarget,
      executionRequest: {
        contract: evolutionWork.contract,
        authority: evolutionWork.authority,
        sourceCutoff: startedAt,
        mode: 'ROUTINE_OWNER_RECONCILIATION',
        proposals: evolutionWork.work,
        proposalRefs: evolutionWork.proposalRefs,
        rule: 'Consume open institutional-evolution work as proposed non-executing work. Repair or absorb an existing owner first. Routine work must not be returned to the founder merely because it is unresolved. Sovereign authority remains gated.',
      },
      invariants: [
        'MANHATTAN_TARGET_IS_DECLARED_NOT_ATTAINED',
        'EVIDENCE_COVERAGE_IS_NOT_ALIGNMENT',
        'ROUTINE_EVOLUTION_WORK_REENTERS_NEXT_CYCLE',
        'EXISTING_OWNER_BEFORE_NEW_MODULE',
        'FOUNDER_ONLY_FOR_SOVEREIGN_BOUNDARY',
      ],
      automaticPpoi: {
        created: automaticPpoi.created,
        linked: automaticPpoi.linked,
        blocked: automaticPpoi.blocked,
      },
      evidenceCountAtStart: cycleEvidence.evidence.length,
      rule: 'This cycle may observe, extract, derive, simulate, propose, reconcile routine owners and calibrate. It cannot publish, claim attainment, spend, grant access, change canon or execute irreversible external action.',
    },
  };

  // The source cutoff is the cycle start, intentionally before current-cycle
  // sync writes. This prevents a cycle from feeding its own newly materialized
  // memory back into the state it claims to have started with.
  const runtimeExecution = await executeInstitutionalRuntimeWithCognitiveSpine({
    context,
    sourceCutoff: startedAt,
    createdAt: startedAt,
    consume: true,
  });
  const result = runtimeExecution.runtime;
  const cognitiveSpine = runtimeExecution.cognitiveSpine;
  const completedAt = new Date().toISOString();
  const memoryWarnings = cognitiveTwinSyncWarnings(memorySync);
  const phenomenonWarnings = 'warnings' in phenomenonRefresh && Array.isArray(phenomenonRefresh.warnings) ? phenomenonRefresh.warnings : [];
  const ppoiWarnings = automaticPpoi.warnings;
  const spineWarnings = cognitiveSpine.warnings;
  const declarationWarnings = attractorDeclaration.ok ? [] : [attractorDeclaration.error];
  const evolutionWorkWarnings = evolutionWork.warning ? [`institutional_evolution_work:${evolutionWork.warning}`] : [];
  const criticalSubstepsOk = attractorDeclaration.ok
    && evolutionWork.ok
    && memorySync.ok
    && phenomenonRefresh.ok
    && automaticPpoi.ok
    && attractorRefresh.ok
    && cycleEvidence.warnings.length === 0
    && spineWarnings.length === 0;
  const runStatus = !result.completed ? 'ESCALATED' : criticalSubstepsOk ? 'CLOSED' : 'EVIDENCE_PENDING';

  const envelope = createCognitiveTwinEnvelope({
    taskId,
    status: runStatus === 'CLOSED' ? 'EXECUTED' : 'ESCALATED',
    modelId: null,
    result: {
      executedAgents: result.executedAgents,
      evidenceAtStart: cycleEvidence.evidence.length,
      evidenceAtEnd: result.context.evidence.length,
      hypotheses: result.context.hypotheses.length,
      predictions: result.context.predictions.length,
      risks: result.context.risks.length,
      opportunities: result.context.opportunities.length,
      closureState: runStatus,
      cognitiveSpine: {
        snapshotId: cognitiveSpine.snapshot.snapshotId,
        snapshotHash: cognitiveSpine.snapshot.snapshotHash,
        sourceCutoff: cognitiveSpine.snapshot.semanticPayload.sourceCutoff,
        projectionProfile: cognitiveSpine.trace.projectionProfile,
        profileVersion: cognitiveSpine.trace.profileVersion,
        consumed: cognitiveSpine.trace.ctSnapshotConsumed,
        sourceCount: cognitiveSpine.snapshot.semanticPayload.derivedState.sourceCount,
        memoryRefs: cognitiveSpine.snapshot.semanticPayload.memoryRefs.length,
        decisionRefs: cognitiveSpine.snapshot.semanticPayload.decisionRefs.length,
        verificationDebt: cognitiveSpine.snapshot.semanticPayload.verificationDebt.absolute,
        provenanceGaps: cognitiveSpine.decisionProvenance.provenanceGaps,
      },
      attractor: {
        key: SFI_INSTITUTIONAL_ATTRACTOR_KEY,
        declaredTarget,
        evidenceCoverage: attractorRefresh.evidenceCoverage,
        supportedDimensions: attractorRefresh.supportedDimensions,
        contradictedDimensions: attractorRefresh.contradictedDimensions,
        missingDimensions: attractorRefresh.missingDimensions,
      },
      institutionalEvolutionWork: {
        authority: evolutionWork.authority,
        proposalRefs: evolutionWork.proposalRefs,
        workCount: evolutionWork.work.length,
        consumedAsExecutionRequest: true,
        externalExecutionAuthorized: false,
      },
      ppoi: {
        phenomenonTrajectory: phenomenonRefresh,
        methodologyReconciliation: {
          created: automaticPpoi.created,
          linked: automaticPpoi.linked,
          blocked: automaticPpoi.blocked,
          cases: automaticPpoi.cases.length,
        },
      },
    },
    claims: [{
      statement: runStatus === 'CLOSED'
        ? 'A complete institutional cognitive cycle was recorded against persisted evidence and a DECLARED attractor with required internal substeps intact.'
        : 'An institutional cognitive-cycle attempt was recorded, but it is not represented as closed because required evidence or internal substeps remain incomplete.',
      epistemicClass: 'OBSERVED',
      evidenceRefs: cycleEvidence.refs,
    }],
    assumptions: [],
    limitations: [
      'Attractor direction and Manhattan convergence coordinate are founder-declared; attainment is evidence-dependent and remains unresolved without a canonical threshold.',
      'Agent execution does not constitute external execution or independent validation.',
      'Open institutional-evolution proposals are proposed work context, not approved actions or evidence.',
      'Cognitive Spine memory and approved decisions are contextual state and are not promoted into observed evidence by consumption.',
      'The consumed Cognitive Spine snapshot is sealed at the cycle-start cutoff; agents may not enrich the same run from live Twin state.',
      'Automatic PPOI registration is workflow state only; it does not constitute evidence, approval, intervention or outcome.',
      'Evidence coverage measures whether a dimension is evidenced or contradicted; it is not an attainment percentage or Manhattan-alignment score.',
      ...cycleEvidence.warnings,
      ...memoryWarnings,
      ...phenomenonWarnings,
      ...ppoiWarnings,
      ...declarationWarnings,
      ...evolutionWorkWarnings,
      ...spineWarnings,
      ...cognitiveSpine.decisionProvenance.provenanceGaps.map((gap) => `cprt_b_gap:${gap}`),
    ],
    contradictions: [
      ...result.context.contradictions.map((item) => item.id),
      ...attractorRefresh.contradictedDimensions.map((dimension) => `attractor:${dimension}`),
    ],
    missingEvidence: [...new Set([...attractorRefresh.missingDimensions, ...cycleEvidence.warnings, ...spineWarnings])],
    actionsExecuted: [
      ...result.executedAgents.map((agent) => `cognitive:${agent}`),
      `cognitive_spine:consumed:${cognitiveSpine.snapshot.snapshotId}`,
      `institutional_evolution_work:consumed:${evolutionWork.work.length}`,
      `ppoi:auto_created:${automaticPpoi.created}`,
      `ppoi:auto_linked:${automaticPpoi.linked}`,
    ],
    testsRun: [],
    recommendedTransition: runStatus === 'CLOSED' ? 'VERIFYING' : 'EVIDENCE_PENDING',
  });

  const runInsert = await db.from('sfi_cognitive_twin_runs').insert({
    task_id: taskId,
    contract_version: envelope.contractVersion,
    provider: null,
    model: null,
    role: 'institutional_cycle',
    status: runStatus,
    objective: 'Contrast persisted institutional evidence and phenomena against the declared SFI attractor and Manhattan convergence coordinate, reconcile eligible PPOI containers and open institutional-evolution work, then execute the governed cognitive topology through one sealed Cognitive Spine context.',
    input_snapshot: {
      trigger,
      cycleId,
      logbookId,
      evidenceRefs: cycleEvidence.refs,
      attractorKey: SFI_INSTITUTIONAL_ATTRACTOR_KEY,
      declaredTarget,
      institutionalEvolutionWork: {
        proposalRefs: evolutionWork.proposalRefs,
        authority: evolutionWork.authority,
      },
      cognitiveSpine: {
        snapshot: cognitiveSpine.snapshot,
        consumptionTrace: cognitiveSpine.trace,
        decisionProvenance: cognitiveSpine.decisionProvenance,
        consumedContext: cognitiveSpine.runtimeProjection.cognitiveTwinContext,
      },
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
    ...ppoiWarnings,
    ...declarationWarnings,
    ...evolutionWorkWarnings,
    ...attractorRefresh.warnings,
    ...spineWarnings,
    ...(runInsert.error ? [`cognitive_twin_run:${runInsert.error.message}`] : []),
  ];

  const closed = runStatus === 'CLOSED' && !runInsert.error;
  return {
    ok: closed,
    status: closed ? 'COMPLETED' : 'DEGRADED',
    closureState: runStatus,
    trigger,
    startedAt,
    completedAt,
    taskId,
    cycleId,
    logbookId,
    executedAgents: result.executedAgents,
    agentCount: result.executedAgents.length,
    cognitiveTwinMemory: memorySync,
    cognitiveSpine: {
      snapshotId: cognitiveSpine.snapshot.snapshotId,
      snapshotHash: cognitiveSpine.snapshot.snapshotHash,
      consumed: cognitiveSpine.trace.ctSnapshotConsumed,
      projectionProfile: cognitiveSpine.trace.projectionProfile,
      profileVersion: cognitiveSpine.trace.profileVersion,
      decisionProvenance: cognitiveSpine.decisionProvenance,
    },
    attractorDeclaration,
    declaredTarget,
    attractor: attractorRefresh,
    institutionalEvolutionWork: evolutionWork,
    phenomenaPpoi: phenomenonRefresh,
    automaticPpoi,
    run: runInsert.data ?? null,
    warnings: [...new Set(warnings)],
  };
}
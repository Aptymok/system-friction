import 'server-only';

import { createHash } from 'crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { runLlmTask } from '@/lib/ai/providerRouter';
import { isSfiContinuityConfigured, readContinuityPublicWorldBundle } from '@/lib/sfi/continuityPostgres';

export const WORLD_HYPOTHESIS_CLOSURE_DOSSIER_CONTRACT = 'SFI-WORLD-HYPOTHESIS-CLOSURE-DOSSIER-1.0' as const;

type Row = Record<string, unknown>;

export type WorldHypothesisClosureRow = {
  id: string;
  phenomenonKey: string;
  statement: string;
  status: string;
  cutoffAt: string | null;
  validationStartsAt: string | null;
  validationEndsAt: string | null;
  initialConfidence: number | null;
  currentConfidence: number | null;
  methodologyVersion: string | null;
  outcome: {
    classification: string;
    observedOutcome: string | null;
    directionalAccuracy: number | null;
    temporalAccuracy: number | null;
    actorAccuracy: number | null;
    mechanismAccuracy: number | null;
    sourceCoverage: number | null;
    evidenceIds: string[];
    evaluatorVersion: string | null;
    evaluatedAt: string | null;
  } | null;
  learning: {
    retainedAssumptions: string[];
    rejectedAssumptions: string[];
    missingVariables: string[];
    confidenceBefore: number | null;
    confidenceAfter: number | null;
    createdAt: string | null;
  } | null;
};

export type WorldHypothesisClosureDossier = {
  contract: typeof WORLD_HYPOTHESIS_CLOSURE_DOSSIER_CONTRACT;
  generatedAt: string;
  scope: {
    from: string | null;
    to: string | null;
    statuses: string[];
    total: number;
  };
  counts: {
    byClassification: Record<string, number>;
    withOutcome: number;
    withLearning: number;
    withLinkedReturnEvidence: number;
    withoutLinkedReturnEvidence: number;
  };
  calibration: {
    meanInitialConfidence: number | null;
    meanCurrentConfidence: number | null;
    meanConfidenceDelta: number | null;
    meanSourceCoverage: number | null;
  };
  hypotheses: WorldHypothesisClosureRow[];
  synthesis: {
    strongestObservedPattern: string;
    principalLimitation: string;
    nextMethodGate: string;
  };
  boundaries: string[];
};

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}
function iso(value: unknown): string | null {
  const candidate = text(value);
  if (!candidate) return null;
  const date = new Date(candidate);
  return Number.isFinite(date.getTime()) ? date.toISOString() : candidate;
}
function num(value: unknown): number | null {
  if (value === null || typeof value === 'undefined' || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()))]
    : [];
}
function mean(values: Array<number | null>) {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}
function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function normalize(raw: Row): WorldHypothesisClosureRow {
  const outcome = row(raw.outcome);
  const learning = row(raw.learning);
  const outcomeId = text(outcome.id);
  const learningId = text(learning.id);
  return {
    id: text(raw.id),
    phenomenonKey: text(raw.phenomenon_key, 'UNKNOWN'),
    statement: text(raw.statement, 'MISSING · hypothesis statement unavailable'),
    status: text(raw.status, 'UNKNOWN'),
    cutoffAt: iso(raw.cutoff_at),
    validationStartsAt: iso(raw.validation_starts_at),
    validationEndsAt: iso(raw.validation_ends_at),
    initialConfidence: num(raw.initial_confidence),
    currentConfidence: num(raw.current_confidence),
    methodologyVersion: text(raw.methodology_version) || null,
    outcome: outcomeId ? {
      classification: text(outcome.classification, text(raw.status, 'UNKNOWN')),
      observedOutcome: text(outcome.observed_outcome) || null,
      directionalAccuracy: num(outcome.directional_accuracy),
      temporalAccuracy: num(outcome.temporal_accuracy),
      actorAccuracy: num(outcome.actor_accuracy),
      mechanismAccuracy: num(outcome.mechanism_accuracy),
      sourceCoverage: num(outcome.source_coverage),
      evidenceIds: strings(outcome.evidence_ids),
      evaluatorVersion: text(outcome.evaluator_version) || null,
      evaluatedAt: iso(outcome.evaluated_at),
    } : null,
    learning: learningId ? {
      retainedAssumptions: strings(learning.retained_assumptions),
      rejectedAssumptions: strings(learning.rejected_assumptions),
      missingVariables: strings(learning.missing_variables),
      confidenceBefore: num(learning.confidence_before),
      confidenceAfter: num(learning.confidence_after),
      createdAt: iso(learning.created_at),
    } : null,
  };
}

export function buildWorldHypothesisClosureDossier(
  hypotheses: readonly WorldHypothesisClosureRow[],
): WorldHypothesisClosureDossier {
  const ordered = [...hypotheses].sort((a, b) =>
    Date.parse(b.cutoffAt ?? '') - Date.parse(a.cutoffAt ?? '')
  );
  const byClassification: Record<string, number> = {};
  ordered.forEach((item) => {
    const key = item.outcome?.classification || item.status || 'UNKNOWN';
    byClassification[key] = (byClassification[key] ?? 0) + 1;
  });

  const withOutcome = ordered.filter((item) => item.outcome).length;
  const withLearning = ordered.filter((item) => item.learning).length;
  const withLinkedReturnEvidence = ordered.filter((item) => (item.outcome?.evidenceIds.length ?? 0) > 0).length;
  const withoutLinkedReturnEvidence = withOutcome - withLinkedReturnEvidence;
  const meanInitialConfidence = mean(ordered.map((item) => item.initialConfidence));
  const meanCurrentConfidence = mean(ordered.map((item) => item.currentConfidence));
  const meanConfidenceDelta = mean(ordered.map((item) =>
    item.initialConfidence !== null && item.currentConfidence !== null
      ? item.currentConfidence - item.initialConfidence
      : null
  ));
  const meanSourceCoverage = mean(ordered.map((item) => item.outcome?.sourceCoverage ?? null));

  const decisive = (byClassification.VALIDATED ?? 0) + (byClassification.CONTRADICTED ?? 0);
  const partial = byClassification.PARTIALLY_VALIDATED ?? 0;
  const inconclusive = byClassification.INCONCLUSIVE ?? 0;

  const strongestObservedPattern = decisive
    ? `${decisive} hypotheses reached a decisive VALIDATED/CONTRADICTED classification under the persisted calibration owner.`
    : partial
      ? `${partial} hypotheses reached PARTIALLY_VALIDATED; the dominant observed closure state is partial support rather than decisive validation.`
      : `No decisive or partially validated closure is present in this dossier; ${inconclusive} hypotheses are INCONCLUSIVE.`;

  const principalLimitation = withoutLinkedReturnEvidence > 0
    ? `${withoutLinkedReturnEvidence} closed outcomes have no linked RETURN evidence ids. Classification remains a record of the evaluator result, not independent evidentiary support.`
    : 'Every outcome in scope carries at least one linked RETURN evidence id.';

  const nextMethodGate = inconclusive > 0
    ? 'Future hypotheses should enter validation with a preregistered test contract, measurable criteria, source-family requirements and explicit contradiction thresholds before T0 closes.'
    : 'Preserve preregistered criteria and continue measuring calibration error, source coverage and confidence movement across future cohorts.';

  return {
    contract: WORLD_HYPOTHESIS_CLOSURE_DOSSIER_CONTRACT,
    generatedAt: new Date().toISOString(),
    scope: {
      from: ordered.at(-1)?.cutoffAt ?? null,
      to: ordered[0]?.cutoffAt ?? null,
      statuses: [...new Set(ordered.map((item) => item.status))].sort(),
      total: ordered.length,
    },
    counts: {
      byClassification,
      withOutcome,
      withLearning,
      withLinkedReturnEvidence,
      withoutLinkedReturnEvidence,
    },
    calibration: {
      meanInitialConfidence,
      meanCurrentConfidence,
      meanConfidenceDelta,
      meanSourceCoverage,
    },
    hypotheses: ordered,
    synthesis: {
      strongestObservedPattern,
      principalLimitation,
      nextMethodGate,
    },
    boundaries: [
      'Outcome classification is owned by the World calibration cycle; this dossier does not reclassify hypotheses.',
      'PARTIALLY_VALIDATED is not VALIDATED.',
      'INCONCLUSIVE is not evidence for or against the hypothesis.',
      'A persisted outcome without linked evidence ids is reconstructible as a record but is not promoted to independent evidence.',
      'Learning is reported only when a persisted world_learning_event exists.',
      'Publication or report generation does not create RETURN.',
    ],
  };
}

export async function readWorldHypothesisClosureDossier(input: {
  limit?: number;
  since?: string | null;
  hypothesisIds?: string[];
} = {}): Promise<WorldHypothesisClosureDossier> {
  const db = createServiceSupabaseClient();
  const limit = Math.max(1, Math.min(500, input.limit ?? 360));
  const since = input.since ?? new Date(Date.now() - 90 * 86_400_000).toISOString();
  const ids = [...new Set((input.hypothesisIds ?? []).filter((id)=>/^[0-9a-f-]{36}$/i.test(id)))].slice(0,100);

  let hypothesisQuery = db.from('world_hypotheses')
    .select('id,phenomenon_key,statement,status,cutoff_at,validation_starts_at,validation_ends_at,initial_confidence,current_confidence,methodology_version')
    .in('status', ['VALIDATED','PARTIALLY_VALIDATED','CONTRADICTED','INCONCLUSIVE'])
    .order('cutoff_at', { ascending: false })
    .limit(limit);
  let outcomeQuery = db.from('world_hypothesis_outcomes')
    .select('id,hypothesis_id,classification,observed_outcome,directional_accuracy,temporal_accuracy,actor_accuracy,mechanism_accuracy,source_coverage,evidence_ids,evaluator_version,evaluated_at')
    .order('evaluated_at', { ascending: false })
    .limit(limit);
  let learningQuery = db.from('world_learning_events')
    .select('id,hypothesis_id,retained_assumptions,rejected_assumptions,missing_variables,confidence_before,confidence_after,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (ids.length) {
    hypothesisQuery = hypothesisQuery.in('id', ids);
    outcomeQuery = outcomeQuery.in('hypothesis_id', ids);
    learningQuery = learningQuery.in('hypothesis_id', ids);
  } else {
    hypothesisQuery = hypothesisQuery.gte('cutoff_at', since);
    outcomeQuery = outcomeQuery.gte('evaluated_at', since);
    learningQuery = learningQuery.gte('created_at', since);
  }

  const [hypothesisRead,outcomeRead,learningRead] = await Promise.all([
    hypothesisQuery,outcomeQuery,learningQuery,
  ]);

  let hypothesisRows = (hypothesisRead.data ?? []) as unknown as Row[];
  let outcomeRows = (outcomeRead.data ?? []) as unknown as Row[];
  let learningRows = (learningRead.data ?? []) as unknown as Row[];

  const primaryErrors = [
    hypothesisRead.error ? `hypotheses:${hypothesisRead.error.message}` : null,
    outcomeRead.error ? `outcomes:${outcomeRead.error.message}` : null,
    learningRead.error ? `learning:${learningRead.error.message}` : null,
  ].filter((item): item is string => Boolean(item));

  if (primaryErrors.length) {
    if (!isSfiContinuityConfigured()) {
      throw new Error(`world_hypothesis_closure_dossier_read_failed:${primaryErrors.join('|')}`);
    }
    const continuity = await readContinuityPublicWorldBundle({ since, limit });
    hypothesisRows = (continuity.hypotheses ?? []) as unknown as Row[];
    outcomeRows = (continuity.outcomes ?? []) as unknown as Row[];
    learningRows = (continuity.learning ?? []) as unknown as Row[];
    if (ids.length) {
      const idSet = new Set(ids);
      hypothesisRows = hypothesisRows.filter((item)=>idSet.has(text(item.id)));
      outcomeRows = outcomeRows.filter((item)=>idSet.has(text(item.hypothesis_id)));
      learningRows = learningRows.filter((item)=>idSet.has(text(item.hypothesis_id)));
    }
  }

  const outcomeByHypothesis = new Map<string,Row>();
  for (const outcome of outcomeRows) {
    const hypothesisId = text(outcome.hypothesis_id);
    if (hypothesisId && !outcomeByHypothesis.has(hypothesisId)) outcomeByHypothesis.set(hypothesisId,outcome);
  }
  const learningByHypothesis = new Map<string,Row>();
  for (const learning of learningRows) {
    const hypothesisId = text(learning.hypothesis_id);
    if (hypothesisId && !learningByHypothesis.has(hypothesisId)) learningByHypothesis.set(hypothesisId,learning);
  }

  const closed = hypothesisRows
    .filter((item)=>['VALIDATED','PARTIALLY_VALIDATED','CONTRADICTED','INCONCLUSIVE'].includes(text(item.status)))
    .map((item) => normalize({
      ...item,
      outcome: outcomeByHypothesis.get(text(item.id)) ?? null,
      learning: learningByHypothesis.get(text(item.id)) ?? null,
    }));

  return buildWorldHypothesisClosureDossier(closed);
}

export function worldHypothesisClosureReportBody(dossier: WorldHypothesisClosureDossier) {
  const classificationLines = Object.entries(dossier.counts.byClassification)
    .sort((a,b)=>b[1]-a[1])
    .map(([classification,count])=>`- ${classification}: ${count}`);

  const sample = dossier.hypotheses.slice(0, 12).map((item) => [
    `- [${item.outcome?.classification ?? item.status}] ${item.statement}`,
    `  T0 ${item.cutoffAt ?? 'MISSING'} → close ${item.validationEndsAt ?? 'MISSING'}`,
    `  confidence ${item.initialConfidence ?? 'MISSING'} → ${item.currentConfidence ?? 'MISSING'}`,
    `  RETURN evidence: ${item.outcome?.evidenceIds.length ?? 0}; source coverage: ${item.outcome?.sourceCoverage ?? 'MISSING'}`,
    `  outcome: ${item.outcome?.observedOutcome ?? 'MISSING'}`,
  ].join('\n'));

  return [
    'SFI · WORLD HYPOTHESIS CLOSURE DOSSIER',
    `Contract: ${dossier.contract}`,
    `Generated: ${dossier.generatedAt}`,
    '',
    'EXECUTIVE READING',
    dossier.synthesis.strongestObservedPattern,
    dossier.synthesis.principalLimitation,
    dossier.synthesis.nextMethodGate,
    '',
    'COHORT',
    `Hypotheses: ${dossier.scope.total}`,
    `T0 range: ${dossier.scope.from ?? 'MISSING'} → ${dossier.scope.to ?? 'MISSING'}`,
    `With outcome: ${dossier.counts.withOutcome}`,
    `With learning event: ${dossier.counts.withLearning}`,
    `With linked RETURN evidence: ${dossier.counts.withLinkedReturnEvidence}`,
    `Without linked RETURN evidence: ${dossier.counts.withoutLinkedReturnEvidence}`,
    '',
    'CLASSIFICATION',
    ...classificationLines,
    '',
    'CALIBRATION',
    `Mean initial confidence: ${dossier.calibration.meanInitialConfidence ?? 'MISSING'}`,
    `Mean current confidence: ${dossier.calibration.meanCurrentConfidence ?? 'MISSING'}`,
    `Mean confidence delta: ${dossier.calibration.meanConfidenceDelta ?? 'MISSING'}`,
    `Mean source coverage: ${dossier.calibration.meanSourceCoverage ?? 'MISSING'}`,
    '',
    'RECENT CLOSURES',
    ...(sample.length ? sample : ['MISSING · no closed hypotheses in scope.']),
    '',
    'EPISTEMIC BOUNDARY',
    ...dossier.boundaries.map((item)=>`- ${item}`),
  ].join('\n');
}


export type WorldHypothesisClosureReportEnvelope = {
  ok: boolean;
  type: 'world_hypothesis_closure';
  title: string;
  body: string;
  evidence: string[];
  provider: string;
  warnings: string[];
  trace: Record<string, unknown>;
  approval_queue: {
    action: 'report_review';
    reason: string;
    evidence: string[];
    risk: 'low';
    expected_outcome: string;
    approval_required: true;
    status: 'queued_for_approval';
  };
};

function dossierFingerprint(dossier: WorldHypothesisClosureDossier) {
  const payload = dossier.hypotheses
    .map((item)=>({
      id:item.id,
      status:item.status,
      classification:item.outcome?.classification??null,
      evidenceIds:item.outcome?.evidenceIds??[],
      evaluatedAt:item.outcome?.evaluatedAt??null,
    }))
    .sort((a,b)=>a.id.localeCompare(b.id));
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export async function generateWorldHypothesisClosureReport(input: {
  hypothesisIds?: string[];
  since?: string | null;
} = {}): Promise<{ dossier: WorldHypothesisClosureDossier; report: WorldHypothesisClosureReportEnvelope; fingerprint: string }> {
  const dossier = await readWorldHypothesisClosureDossier({
    hypothesisIds: input.hypothesisIds,
    since: input.since,
    limit: input.hypothesisIds?.length ? Math.max(1,input.hypothesisIds.length) : 360,
  });
  const fingerprint = dossierFingerprint(dossier);
  const fallbackBody = worldHypothesisClosureReportBody(dossier);
  const evidence = [...new Set(dossier.hypotheses.flatMap((item)=>item.outcome?.evidenceIds??[]))].slice(0,120);

  if (!dossier.scope.total) {
    return {
      dossier,
      fingerprint,
      report: {
        ok:false,
        type:'world_hypothesis_closure',
        title:'World hypothesis closure · no closed objects in scope',
        body:fallbackBody,
        evidence:[],
        provider:'blocked:no-closed-hypotheses',
        warnings:['no_closed_hypotheses_in_scope'],
        trace:{contract:dossier.contract,fingerprint,hypothesisCount:0},
        approval_queue:{
          action:'report_review',
          reason:'No closed hypothesis exists in the selected scope; human review may adjust scope but cannot fabricate closure.',
          evidence:[],
          risk:'low',
          expected_outcome:'Reviewer confirms the empty closure scope or selects another persisted cohort.',
          approval_required:true,
          status:'queued_for_approval',
        },
      },
    };
  }

  const llm = await runLlmTask({
    task:'deep_report',
    system:[
      'You are the System Friction Institute closure-report editor. You are NOT the hypothesis evaluator.',
      'All classifications in the supplied dossier are immutable inputs owned by the World calibration cycle. Never upgrade, downgrade, merge or reinterpret them.',
      'Write a rigorous institutional report that is readable, striking and reconstructible without becoming promotional.',
      'Distinguish OBSERVED persisted fields from DERIVED aggregate readings. Do not call PARTIALLY_VALIDATED validated. Do not call INCONCLUSIVE false.',
      'Do not infer causality from count equality, temporal sequence, graph adjacency or evidence absence.',
      'Highlight contradictions, missing evidence, instrument limitations and methodological changes as strongly as apparent support.',
      'Use this narrative architecture: THE QUESTION; THE COHORT; THE CONFRONTATION WITH RETURN; WHERE DISCRIMINATION FAILED; METHOD TRANSITION; CALIBRATION; CONTRADICTIONS; LEARNING; NEXT FALSIFICATION; EPISTEMIC BOUNDARY.',
      'Keep identifiers and numeric quantities exactly as supplied. If a requested fact is not in the dossier, write NOT OBSERVED.',
      'Publication of this report is exposure only; never describe it as external validation or RETURN.',
    ].join('\n'),
    prompt:JSON.stringify({
      dossier,
      deterministicFallback:fallbackBody,
      instruction:'Produce the final internal closure-report body only. No JSON wrapper.',
    }).slice(0,120000),
    fallbackResult:fallbackBody,
    requirements:{reasoning:true,structuredOutput:false,priority:'quality'},
    maxTokens:4200,
  });

  const warnings=[...new Set([
    ...llm.warnings,
    ...(llm.ok?[]:['governed_report_model_unavailable_deterministic_fallback_used']),
  ])];

  return {
    dossier,
    fingerprint,
    report:{
      ok:true,
      type:'world_hypothesis_closure',
      title:`World hypothesis closure · ${dossier.scope.total} objects · ${dossier.generatedAt.slice(0,10)}`,
      body:llm.result||fallbackBody,
      evidence,
      provider:`${llm.provider}:${llm.model}`,
      warnings,
      trace:{
        contract:dossier.contract,
        fingerprint,
        hypothesisCount:dossier.scope.total,
        classifications:dossier.counts.byClassification,
        withLinkedReturnEvidence:dossier.counts.withLinkedReturnEvidence,
        withLearning:dossier.counts.withLearning,
        calibration:dossier.calibration,
        reportAuthority:'NARRATIVE_ONLY_CLASSIFICATION_OWNER_WORLD_CALIBRATION',
      },
      approval_queue:{
        action:'report_review',
        reason:'Closure report is a narrative projection of persisted outcomes. Human review is required before any external publication.',
        evidence,
        risk:'low',
        expected_outcome:'Reviewer verifies reconstruction, language and epistemic boundaries before publication.',
        approval_required:true,
        status:'queued_for_approval',
      },
    },
  };
}

export async function persistWorldHypothesisClosureReport(input: {
  hypothesisIds?: string[];
  since?: string | null;
} = {}) {
  const generated = await generateWorldHypothesisClosureReport(input);
  const db = createServiceSupabaseClient();
  const taskId = `world-hypothesis-closure:${generated.fingerprint}`;

  const existing = await db.from('sfi_cognitive_twin_runs')
    .select('id,task_id,status,created_at')
    .eq('role','report_agent')
    .eq('task_id',taskId)
    .maybeSingle();
  if (existing.error) throw new Error(`world_hypothesis_closure_report_lookup_failed:${existing.error.message}`);
  if (existing.data?.id) {
    return { ...generated, persisted:true, skipped:true, reportRunId:String(existing.data.id), taskId };
  }

  const startedAt = new Date().toISOString();
  const providerBlocked = generated.report.provider.startsWith('blocked:');
  const inserted = await db.from('sfi_cognitive_twin_runs').insert({
    task_id:taskId,
    contract_version:'world-hypothesis-closure-report-v1',
    provider:generated.report.provider||null,
    model:null,
    role:'report_agent',
    status:generated.report.ok&&!providerBlocked?'READY':'BLOCKED',
    objective:generated.report.title,
    input_snapshot:{
      reportType:generated.report.type,
      closureContract:generated.dossier.contract,
      fingerprint:generated.fingerprint,
      hypothesisIds:generated.dossier.hypotheses.map((item)=>item.id),
      generatedBy:'world-calibration-post-closure',
      authorityBoundary:'Report narrates persisted classifications; it never owns classification.',
    },
    output_envelope:generated.report,
    evidence_refs:generated.report.evidence,
    limitations:generated.report.warnings,
    started_at:startedAt,
    finished_at:new Date().toISOString(),
  }).select('id').single();

  if (inserted.error||!inserted.data?.id) {
    throw new Error(`world_hypothesis_closure_report_persistence_failed:${inserted.error?.message??'unknown'}`);
  }
  return { ...generated, persisted:true, skipped:false, reportRunId:String(inserted.data.id), taskId };
}

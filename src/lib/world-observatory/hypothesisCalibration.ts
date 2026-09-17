import 'server-only';

import { runLlmTask } from '@/lib/ai/providerRouter';
import { clamp01 } from '@/lib/sfi/math';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { WORLD_METHODOLOGY_VERSION } from './worldCycle';
import {
  classifyHypothesisTestContract,
  parseCriterionResults,
  parseHypothesisTestContract,
  type HypothesisCriterionResult,
} from './hypothesisTestContract';

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function strings(value: unknown, max = 100): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()))].slice(0, max)
    : [];
}

function text(value: unknown, max = 6000): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

function parseAssessment(value: string) {
  try {
    const clean = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = row(JSON.parse(clean));
    const rawConfidence = Number(parsed.confidenceAfter);
    return {
      criterionResults: parseCriterionResults(parsed.criterionResults),
      retainedAssumptions: strings(parsed.retainedAssumptions, 40),
      rejectedAssumptions: strings(parsed.rejectedAssumptions, 40),
      missingVariables: strings(parsed.missingVariables, 40),
      mechanismAssessment: text(parsed.mechanismAssessment, 5000),
      confidenceAfter: Number.isFinite(rawConfidence) ? clamp01(rawConfidence > 1 ? rawConfidence / 100 : rawConfidence) : null,
    };
  } catch {
    return null;
  }
}

function relevantEvidenceIds(results: HypothesisCriterionResult[], available: Set<string>) {
  return [...new Set(results.flatMap((result) => result.evidenceIds).filter((id) => available.has(id)))];
}

export async function runWorldCalibrationCycle() {
  const db = createServiceSupabaseClient();
  const now = new Date().toISOString();
  const { data: hypotheses, error } = await db
    .from('world_hypotheses')
    .select('*')
    .in('status', ['OPEN','AWAITING_OUTCOME'])
    .lte('validation_ends_at', now)
    .limit(100);
  if (error) return { ok: false, calibrated: 0, error: error.message, generatedAt: now };

  let calibrated = 0;
  const warnings: string[] = [];

  for (const hypothesis of hypotheses ?? []) {
    const predictedTrajectory = row(hypothesis.predicted_trajectory);
    const testContract = parseHypothesisTestContract(predictedTrajectory.testContract);
    const priorConfidence = clamp01(Number(hypothesis.current_confidence ?? hypothesis.initial_confidence ?? 0.5));

    // A historical hypothesis without a preregistered contract cannot be upgraded retroactively
    // after its RETURN is known. Close it conservatively as INCONCLUSIVE.
    if (!testContract) {
      const reason = 'LEGACY_HYPOTHESIS_WITHOUT_PREREGISTERED_TEST_CONTRACT';
      const { error: outcomeError } = await db.from('world_hypothesis_outcomes').upsert({
        hypothesis_id: hypothesis.id,
        classification: 'INCONCLUSIVE',
        observed_outcome: reason,
        directional_accuracy: null,
        temporal_accuracy: null,
        actor_accuracy: null,
        mechanism_accuracy: null,
        source_coverage: 0,
        evidence_ids: [],
        evaluator_version: `${WORLD_METHODOLOGY_VERSION}+strict-test-contract`,
      }, { onConflict: 'hypothesis_id' });
      if (outcomeError) {
        warnings.push(`legacy_outcome_write:${outcomeError.message}`);
        continue;
      }
      await db.from('world_hypotheses').update({ status: 'INCONCLUSIVE', current_confidence: priorConfidence }).eq('id', hypothesis.id);
      calibrated += 1;
      continue;
    }

    const { data: later, error: laterError } = await db.from('world_source_observations')
      .select('id,source_id,source_family,publisher,title,summary,affected_systems,actors,observed_at,released_at,fetched_at,confidence,source_url,payload')
      .gt('fetched_at', hypothesis.cutoff_at)
      .gte('fetched_at', hypothesis.validation_starts_at)
      .lte('fetched_at', hypothesis.validation_ends_at)
      .order('fetched_at', { ascending: true })
      .limit(400);
    if (laterError) {
      warnings.push(`return_observation_read:${laterError.message}`);
      continue;
    }

    const evidenceRows = (later ?? []) as Row[];
    const availableEvidenceIds = new Set(evidenceRows.map((item) => String(item.id ?? '')).filter(Boolean));
    const llm = await runLlmTask({
      task: 'deep_report',
      system: [
        'You are the governed criterion-assessment engine for the System Friction Institute World Observatory.',
        'Assess each preregistered criterion against observations acquired inside its validation window. Use only supplied material.',
        'You DO NOT choose the final hypothesis classification. Deterministic code owns VALIDATED/PARTIALLY_VALIDATED/CONTRADICTED/INCONCLUSIVE.',
        'For every expected and contradiction criterion return SATISFIED, NOT_SATISFIED, or NOT_DETERMINABLE and link only supplied evidence ids.',
        'Source reports are not automatically facts. Respect metric/operator/threshold, minimumObservations, sourceFamilies and source dependence.',
        'If evidence cannot measure a threshold or discriminate the criterion, use NOT_DETERMINABLE rather than narrative approximation.',
        'Return ONLY JSON: {"criterionResults":[{"criterionId":string,"verdict":"SATISFIED|NOT_SATISFIED|NOT_DETERMINABLE","evidenceIds":string[],"reason":string}],"retainedAssumptions":string[],"rejectedAssumptions":string[],"missingVariables":string[],"mechanismAssessment":string|null,"confidenceAfter":number|null}.',
      ].join('\n'),
      prompt: JSON.stringify({
        hypothesis: {
          id: hypothesis.id,
          statement: hypothesis.statement,
          graphSnapshot: hypothesis.graph_snapshot,
          predictedTrajectory,
          testContract,
          cutoffAt: hypothesis.cutoff_at,
          validationStartsAt: hypothesis.validation_starts_at,
          validationEndsAt: hypothesis.validation_ends_at,
          priorConfidence,
        },
        laterObservations: evidenceRows.map((item) => ({
          id: item.id,
          sourceId: item.source_id,
          sourceFamily: item.source_family,
          publisher: item.publisher,
          title: item.title,
          summary: item.summary,
          affectedSystems: item.affected_systems,
          actors: item.actors,
          observedAt: item.observed_at,
          fetchedAt: item.fetched_at,
          sourceConfidence: item.confidence,
          sourceUrl: item.source_url,
          payload: item.payload,
        })),
        epistemicBoundary: 'laterObservations are persisted source records. Criterion assessment is DERIVED/INFERRED. Final classification is deterministic code, not model authority.',
      }).slice(0, 50000),
      fallbackResult: '{"criterionResults":[],"retainedAssumptions":[],"rejectedAssumptions":[],"missingVariables":["governed_model_unavailable"],"mechanismAssessment":null,"confidenceAfter":null}',
      requirements: { reasoning: true, structuredOutput: true, priority: 'quality' },
      maxTokens: 2600,
    });

    const assessment = llm.ok ? parseAssessment(llm.result) : null;
    const criterionResults = assessment?.criterionResults ?? [];
    const linked = relevantEvidenceIds(criterionResults, availableEvidenceIds);
    const linkedSet = new Set(linked);
    const linkedSourceFamilies = new Set(
      evidenceRows
        .filter((item) => linkedSet.has(String(item.id ?? '')))
        .map((item) => String(item.source_family ?? ''))
        .filter(Boolean),
    ).size;
    const classificationResult = classifyHypothesisTestContract({
      contract: testContract,
      criterionResults,
      linkedEvidenceCount: linked.length,
      linkedSourceFamilies,
    });
    const classification = classificationResult.classification;
    const after = assessment?.confidenceAfter ?? priorConfidence;
    const directionalAccuracy = classification === 'VALIDATED' ? 1 : classification === 'PARTIALLY_VALIDATED' ? 0.6 : classification === 'CONTRADICTED' ? 0 : null;
    const sourceCoverage = evidenceRows.length ? linked.length / evidenceRows.length : 0;
    const observedOutcome = [
      classificationResult.reason,
      assessment?.mechanismAssessment ? `Mechanism: ${assessment.mechanismAssessment}` : null,
    ].filter(Boolean).join(' ');

    const { data: outcome, error: outcomeError } = await db.from('world_hypothesis_outcomes').upsert({
      hypothesis_id: hypothesis.id,
      classification,
      observed_outcome: observedOutcome,
      directional_accuracy: directionalAccuracy,
      temporal_accuracy: evidenceRows.length ? 1 : null,
      actor_accuracy: null,
      mechanism_accuracy: classificationResult.decisive ? after : null,
      source_coverage: sourceCoverage,
      evidence_ids: linked,
      evaluator_version: `${WORLD_METHODOLOGY_VERSION}+strict-test-contract`,
    }, { onConflict: 'hypothesis_id' }).select('id').single();
    if (outcomeError || !outcome) {
      warnings.push(`outcome_write:${outcomeError?.message ?? 'unknown'}`);
      continue;
    }

    // Only decisive falsifiable outcomes teach the hypothesis learner. Partial/inconclusive
    // outcomes remain visible outcomes but cannot silently mutate institutional learning.
    if ((classification === 'VALIDATED' || classification === 'CONTRADICTED') && linked.length > 0) {
      await db.from('world_learning_events').insert({
        hypothesis_id: hypothesis.id,
        outcome_id: outcome.id,
        retained_assumptions: assessment?.retainedAssumptions ?? [],
        rejected_assumptions: assessment?.rejectedAssumptions ?? [],
        missing_variables: assessment?.missingVariables ?? [],
        graph_adjustments: [],
        confidence_before: priorConfidence,
        confidence_after: after,
      });
    }

    await db.from('world_hypotheses').update({ status: classification, current_confidence: after }).eq('id', hypothesis.id);
    calibrated += 1;
  }

  return {
    ok: warnings.length === 0,
    calibrated,
    warnings: [...new Set(warnings)].slice(0, 20),
    generatedAt: now,
    rule: 'The governed model assesses preregistered criteria only. Deterministic code owns final classification; decisive evidence is required before a world_learning_event can be created.',
  };
}

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
import {
  buildLegacyFrozenSignals,
  classifyLegacyFrozenSignals,
} from './legacyHypothesisAdjudication';

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

    if (!testContract) {
      const frozenSignals = buildLegacyFrozenSignals({
        expectedSignals: hypothesis.expected_signals,
        contradictionSignals: hypothesis.contradiction_signals,
      });

      const llm = await runLlmTask({
        task: 'deep_report',
        system: [
          'You are the governed legacy RETURN-assessment engine for the System Friction Institute World Observatory.',
          'The hypothesis text, expected signals, contradiction signals and validation window were frozen before RETURN. Never add, broaden or rewrite them.',
          'Assess only those frozen signals against observations acquired inside the original validation window. Use only supplied material.',
          'A later observation may satisfy a literal frozen signal. This is a legitimate RETURN comparison, not retrospective hypothesis editing.',
          'Do not infer causality, mechanism, motive, actor influence or hidden linkage from temporal coincidence. Mark such claims NOT_DETERMINABLE unless directly supported by supplied evidence.',
          'For absence claims, SATISFIED requires supplied evidence that directly covers the relevant domain across the original window. Mere lack of a matching row is NOT_DETERMINABLE.',
          'Every SATISFIED verdict must link at least one supplied evidence id. Otherwise use NOT_DETERMINABLE.',
          'You DO NOT choose the final hypothesis classification. Deterministic code owns VALIDATED/PARTIALLY_VALIDATED/CONTRADICTED/INCONCLUSIVE.',
          'Return ONLY JSON: {"criterionResults":[{"criterionId":string,"verdict":"SATISFIED|NOT_SATISFIED|NOT_DETERMINABLE","evidenceIds":string[],"reason":string}],"retainedAssumptions":[],"rejectedAssumptions":[],"missingVariables":string[],"mechanismAssessment":string|null,"confidenceAfter":null}.',
        ].join('\n'),
        prompt: JSON.stringify({
          hypothesis: {
            id: hypothesis.id,
            statement: hypothesis.statement,
            cutoffAt: hypothesis.cutoff_at,
            validationStartsAt: hypothesis.validation_starts_at,
            validationEndsAt: hypothesis.validation_ends_at,
            priorConfidence,
            frozenExpectedSignals: frozenSignals.expected,
            frozenContradictionSignals: frozenSignals.contradiction,
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
          epistemicBoundary: 'This is legacy frozen-signal adjudication. Frozen T0 claims cannot be changed. Later observations are persisted source records; signal verdicts are DERIVED/INFERRED. Causal claims remain unproven without direct evidence.',
        }).slice(0, 50000),
        fallbackResult: '{"criterionResults":[],"retainedAssumptions":[],"rejectedAssumptions":[],"missingVariables":["governed_model_unavailable"],"mechanismAssessment":null,"confidenceAfter":null}',
        requirements: { reasoning: true, structuredOutput: true, priority: 'quality' },
        maxTokens: 2600,
      });

      const assessment = llm.ok ? parseAssessment(llm.result) : null;
      const criterionResults = assessment?.criterionResults ?? [];
      const linked = relevantEvidenceIds(criterionResults, availableEvidenceIds);
      const classificationResult = classifyLegacyFrozenSignals({
        expected: frozenSignals.expected,
        contradiction: frozenSignals.contradiction,
        criterionResults,
      });
      const classification = classificationResult.classification;
      const directionalAccuracy = classification === 'VALIDATED' ? 1 : classification === 'PARTIALLY_VALIDATED' ? 0.6 : classification === 'CONTRADICTED' ? 0 : null;
      const sourceCoverage = evidenceRows.length ? linked.length / evidenceRows.length : 0;
      const observedOutcome = [
        `LEGACY_FROZEN_SIGNAL_ADJUDICATION: ${classificationResult.reason}`,
        assessment?.mechanismAssessment ? `Mechanism boundary: ${assessment.mechanismAssessment}` : null,
      ].filter(Boolean).join(' ');

      const { error: outcomeError } = await db.from('world_hypothesis_outcomes').upsert({
        hypothesis_id: hypothesis.id,
        classification,
        observed_outcome: observedOutcome,
        directional_accuracy: directionalAccuracy,
        temporal_accuracy: evidenceRows.length ? 1 : null,
        actor_accuracy: null,
        mechanism_accuracy: null,
        source_coverage: sourceCoverage,
        evidence_ids: linked,
        evaluator_version: `${WORLD_METHODOLOGY_VERSION}+legacy-frozen-signal-adjudication`,
        evaluated_at: now,
      }, { onConflict: 'hypothesis_id' });
      if (outcomeError) {
        warnings.push(`legacy_outcome_write:${outcomeError.message}`);
        continue;
      }

      // Legacy adjudication never writes world_learning_events. It can preserve an
      // observed RETURN classification without granting retrospective learning authority.
      await db.from('world_hypotheses').update({
        status: classification,
        current_confidence: priorConfidence,
      }).eq('id', hypothesis.id);
      calibrated += 1;
      continue;
    }
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
      evaluated_at: now,
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
    rule: 'Current hypotheses use preregistered deterministic test contracts. Legacy hypotheses may be adjudicated only against frozen T0 signals and original-window evidence; legacy adjudication never creates world_learning_events.',
  };
}

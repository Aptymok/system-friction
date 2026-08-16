import 'server-only';

import type { CognitiveSpineSourceRecord } from '@/core/cognitive-spine/contracts/snapshot';
import {
  governanceEventToCognitiveSpineSource,
  labHypothesisToCognitiveSpineSource,
} from '@/core/cognitive-spine/sourcePlane/institutionalSourceMapping';
import { normalizeTimestamp, sortedUnique } from '@/core/cognitive-spine/serialization/canonicalSerialize';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

const MAX_LAB_HYPOTHESES = 96;
const MAX_GOVERNANCE_EVENTS = 128;

const GOVERNANCE_EVENT_NAMES = [
  'acp.proposal.design_approved',
  'acp.proposal.rejected',
  'acp.proposal.frozen',
  'acp.proposal.waiting_evidence',
] as const;

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : [];
}
function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export type AdditionalCognitiveSpineSourceSummary = {
  labHypotheses: number;
  governanceDecisions: number;
  governanceFreezes: number;
  governanceQuestions: number;
};

/**
 * Reads only source families whose historical identity can be reconstructed at
 * the requested cutoff without consulting mutable present-day state.
 *
 * Deliberately excluded here:
 * - action_proposals current rows (mutable lifecycle state)
 * - sfi_predictive_runs current rows (mutable status/calibration state)
 * - graph_nodes / graph_edges (rebuildable projections)
 *
 * Those sources require event/history semantics before they can participate in
 * historical Cognitive Spine snapshots.
 */
export async function readAdditionalInstitutionalCognitiveSpineSources(sourceCutoff: string): Promise<{
  records: CognitiveSpineSourceRecord[];
  warnings: string[];
  summary: AdditionalCognitiveSpineSourceSummary;
}> {
  const cutoff = normalizeTimestamp(sourceCutoff);
  const db = createServiceSupabaseClient();
  const warnings: string[] = [];

  const [hypothesisResult, governanceResult] = await Promise.all([
    db.from('sfi_hypotheses')
      .select('id,analysis_id,title,status,confidence,payload,created_at')
      .lte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(MAX_LAB_HYPOTHESES),
    db.from('epistemic_events')
      .select('event_id,event_name,epistemic_class,schema_version,payload,lineage,occurred_at,hash_self')
      .in('event_name', [...GOVERNANCE_EVENT_NAMES])
      .lte('occurred_at', cutoff)
      .order('occurred_at', { ascending: false })
      .limit(MAX_GOVERNANCE_EVENTS),
  ]);

  if (hypothesisResult.error) {
    warnings.push(`cognitive_spine_lab_hypotheses_unavailable:${hypothesisResult.error.message}`);
  }
  if (governanceResult.error) {
    warnings.push(`cognitive_spine_governance_events_unavailable:${governanceResult.error.message}`);
  }

  const hypothesisRows = rows(hypothesisResult.data);
  const analysisIds = sortedUnique(hypothesisRows
    .map((row) => text(row.analysis_id))
    .filter((value): value is string => Boolean(value)));

  const analysisResult = analysisIds.length
    ? await db.from('sfi_lab_analyses')
        .select('id,mode,source,data_mode,created_at')
        .in('id', analysisIds)
        .lte('created_at', cutoff)
    : { data: [], error: null };

  if (analysisResult.error) {
    warnings.push(`cognitive_spine_lab_analyses_unavailable:${analysisResult.error.message}`);
  }

  const analysisById = new Map(rows(analysisResult.data)
    .map((row) => [text(row.id), row] as const)
    .filter((entry): entry is [string, Row] => Boolean(entry[0])));

  const records: CognitiveSpineSourceRecord[] = [];
  let labHypotheses = 0;
  for (const hypothesis of hypothesisRows) {
    const analysisId = text(hypothesis.analysis_id);
    if (!analysisId) {
      warnings.push(`cognitive_spine_lab_hypothesis_analysis_ref_missing:${text(hypothesis.id) ?? 'unknown'}`);
      continue;
    }
    const analysis = analysisById.get(analysisId);
    if (!analysis) {
      warnings.push(`cognitive_spine_lab_hypothesis_analysis_missing:${text(hypothesis.id) ?? 'unknown'}:${analysisId}`);
      continue;
    }
    const mapped = labHypothesisToCognitiveSpineSource({ hypothesis, analysis });
    if (!mapped) {
      warnings.push(`cognitive_spine_lab_hypothesis_mapping_failed:${text(hypothesis.id) ?? 'unknown'}`);
      continue;
    }
    records.push(mapped);
    labHypotheses += 1;
  }

  let governanceDecisions = 0;
  let governanceFreezes = 0;
  let governanceQuestions = 0;
  for (const event of rows(governanceResult.data)) {
    const mapped = governanceEventToCognitiveSpineSource(event);
    if (!mapped) {
      warnings.push(`cognitive_spine_governance_event_mapping_failed:${text(event.event_id) ?? 'unknown'}`);
      continue;
    }
    records.push(mapped);
    if (mapped.kind === 'DECISION') governanceDecisions += 1;
    if (mapped.kind === 'FREEZE') governanceFreezes += 1;
    if (mapped.kind === 'QUESTION') governanceQuestions += 1;
  }

  return {
    records,
    warnings: sortedUnique(warnings),
    summary: {
      labHypotheses,
      governanceDecisions,
      governanceFreezes,
      governanceQuestions,
    },
  };
}

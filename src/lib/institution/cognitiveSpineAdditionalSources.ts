import 'server-only';

import type { CognitiveSpineSourceRecord } from '@/core/cognitive-spine/contracts/snapshot';
import { governanceEventToCognitiveSpineSource } from '@/core/cognitive-spine/sourcePlane/institutionalSourceMapping';
import { canonicalSha256, normalizeTimestamp, sortedUnique } from '@/core/cognitive-spine/serialization/canonicalSerialize';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

const MAX_STRUCTURED_RESULTS = 96;
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
function number01(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0.5;
  return Math.max(0, Math.min(1, parsed));
}

export type AdditionalCognitiveSpineSourceSummary = {
  labHypotheses: number;
  governanceDecisions: number;
  governanceFreezes: number;
  governanceQuestions: number;
};

function structuredResultHypotheses(event: Row): CognitiveSpineSourceRecord[] {
  const eventId = text(event.event_id);
  const occurredAt = text(event.occurred_at);
  const hashSelf = text(event.hash_self);
  if (!eventId || !occurredAt || !hashSelf) return [];

  const payload = record(event.payload);
  const result = record(payload.result);
  const hypotheses = rows(result.hypotheses);
  const lineage = Array.isArray(event.lineage)
    ? event.lineage.filter((item): item is string => typeof item === 'string')
    : [];

  return hypotheses
    .map((hypothesis, index): CognitiveSpineSourceRecord | null => {
      const statement = text(hypothesis.statement);
      if (!statement) return null;
      const role = text(hypothesis.role) ?? 'unspecified';
      const confidence = number01(hypothesis.confidence);
      const ref = `epistemic_events:${eventId}:hypothesis:${index}`;
      return {
        ref,
        kind: 'HYPOTHESIS',
        recordedAt: normalizeTimestamp(occurredAt),
        sourceHash: canonicalSha256({ eventHash: hashSelf, index, role, statement, confidence }),
        sourceVersion: text(event.schema_version) ?? 'SFI-STRUCTURED-HYPOTHESIS-1.0',
        ancestryRoots: sortedUnique([...lineage, `epistemic_events:${eventId}`]),
        visibilityProfiles: ['*'],
        debtType: 'VERIFICATION',
      };
    })
    .filter((item): item is CognitiveSpineSourceRecord => Boolean(item));
}

/**
 * Historical Cognitive Spine state is reconstructed from immutable events.
 * Hypotheses are sourced from structured-result ledger events rather than the
 * retired mutable sfi_hypotheses table. Rebuildable graph projections and
 * mutable present-day rows remain excluded from historical snapshots.
 */
export async function readAdditionalInstitutionalCognitiveSpineSources(sourceCutoff: string): Promise<{
  records: CognitiveSpineSourceRecord[];
  warnings: string[];
  summary: AdditionalCognitiveSpineSourceSummary;
}> {
  const cutoff = normalizeTimestamp(sourceCutoff);
  const db = createServiceSupabaseClient();
  const warnings: string[] = [];

  const [structuredResult, governanceResult] = await Promise.all([
    db.from('epistemic_events')
      .select('event_id,event_name,schema_version,payload,lineage,occurred_at,hash_self')
      .eq('event_name', 'SFI_STRUCTURED_ANALYSIS_RESULT_RECEIVED')
      .lte('occurred_at', cutoff)
      .order('occurred_at', { ascending: false })
      .limit(MAX_STRUCTURED_RESULTS),
    db.from('epistemic_events')
      .select('event_id,event_name,epistemic_class,schema_version,payload,lineage,occurred_at,hash_self')
      .in('event_name', [...GOVERNANCE_EVENT_NAMES])
      .lte('occurred_at', cutoff)
      .order('occurred_at', { ascending: false })
      .limit(MAX_GOVERNANCE_EVENTS),
  ]);

  if (structuredResult.error) {
    warnings.push(`cognitive_spine_structured_hypotheses_unavailable:${structuredResult.error.message}`);
  }
  if (governanceResult.error) {
    warnings.push(`cognitive_spine_governance_events_unavailable:${governanceResult.error.message}`);
  }

  const records: CognitiveSpineSourceRecord[] = [];
  let labHypotheses = 0;
  for (const event of rows(structuredResult.data)) {
    const mapped = structuredResultHypotheses(event);
    records.push(...mapped);
    labHypotheses += mapped.length;
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

import 'server-only';

import { createHash } from 'node:crypto';
import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const SFI_PERSON_CT_PATTERN_CONTRACT = 'SFI-PERSON-CT-PATTERN-1.0' as const;

export type PersonPatternDimension = 'COGNITION' | 'OBSERVATION';
export type PersonPatternSourceClass = 'SELF_DECLARED' | 'OBSERVED_RECURRENT';
export type PersonPatternStatus = 'CANDIDATE' | 'CONFIRMED' | 'REJECTED';

export const SFI_PERSON_PATTERN_CATEGORIES = [
  'PROBLEM_DECOMPOSITION',
  'EVIDENCE_SELECTION',
  'ATTENTION_ALLOCATION',
  'SIGNAL_DISCRIMINATION',
  'HYPOTHESIS_FORMATION',
  'RIVAL_GENERATION',
  'DECISION_THRESHOLD',
  'EXECUTION_RHYTHM',
  'CONTRADICTION_RESPONSE',
  'RETURN_CALIBRATION',
  'TEMPORAL_FRAMING',
  'SYSTEM_BOUNDARY_SELECTION',
] as const;

export type PersonPatternCategory = typeof SFI_PERSON_PATTERN_CATEGORIES[number];
type Row = Record<string, unknown>;

function row(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
function text(value: unknown) { return typeof value === 'string' && value.trim() ? value.trim() : null; }
function strings(value: unknown, max = 80) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()).slice(0, max) : []; }
function payload(value: unknown) { return row(row(value).payload); }
function sha256(value: string) { return createHash('sha256').update(value).digest('hex'); }
function clamp01(value: unknown, fallback = 0.5) { const parsed = Number(value); return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : fallback; }

function normalizeDimension(value: unknown): PersonPatternDimension | null {
  const candidate = text(value)?.toUpperCase();
  return candidate === 'COGNITION' || candidate === 'OBSERVATION' ? candidate : null;
}

function normalizeCategory(value: unknown): PersonPatternCategory | null {
  const candidate = text(value)?.toUpperCase();
  return candidate && (SFI_PERSON_PATTERN_CATEGORIES as readonly string[]).includes(candidate) ? candidate as PersonPatternCategory : null;
}

async function verifyOwnedSupport(ownerId: string, runIds: string[], evidenceIds: string[]) {
  const db = createServiceSupabaseClient();
  const uniqueRuns = [...new Set(runIds)];
  const uniqueEvidence = [...new Set(evidenceIds)];
  const [runsResult, evidenceResult] = await Promise.all([
    uniqueRuns.length
      ? db.from('sfi_cognitive_twin_runs').select('id').eq('owner_id', ownerId).in('id', uniqueRuns)
      : Promise.resolve({ data: [], error: null }),
    uniqueEvidence.length
      ? db.from('field_case_evidence').select('id').eq('owner_id', ownerId).in('id', uniqueEvidence)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (runsResult.error) throw new Error(`PERSON_CT_PATTERN_RUN_LOOKUP_FAILED:${runsResult.error.message}`);
  if (evidenceResult.error) throw new Error(`PERSON_CT_PATTERN_EVIDENCE_LOOKUP_FAILED:${evidenceResult.error.message}`);
  const foundRuns = new Set((runsResult.data ?? []).map((item) => String(item.id)));
  const foundEvidence = new Set((evidenceResult.data ?? []).map((item) => String(item.id)));
  const missingRuns = uniqueRuns.filter((id) => !foundRuns.has(id));
  const missingEvidence = uniqueEvidence.filter((id) => !foundEvidence.has(id));
  if (missingRuns.length || missingEvidence.length) {
    throw new Error(`PERSON_CT_PATTERN_SUPPORT_NOT_OWNED:${[...missingRuns, ...missingEvidence].join(',')}`);
  }
  return { runIds: uniqueRuns, evidenceIds: uniqueEvidence, supportCount: uniqueRuns.length + uniqueEvidence.length };
}

export async function proposePersonCognitivePattern(input: {
  ownerId: string;
  dimension: unknown;
  category: unknown;
  statement: string;
  operationalMeaning?: string | null;
  useCases?: string[];
  conditions?: string[];
  counterSignals?: string[];
  supportingRunIds?: string[];
  supportingEvidenceIds?: string[];
  selfDeclared?: boolean;
  confidence?: number;
}) {
  const dimension = normalizeDimension(input.dimension);
  const category = normalizeCategory(input.category);
  const statement = text(input.statement);
  if (!dimension || !category || !statement) return { ok: false as const, error: 'PERSON_CT_PATTERN_DIMENSION_CATEGORY_STATEMENT_REQUIRED' };

  const support = await verifyOwnedSupport(input.ownerId, strings(input.supportingRunIds), strings(input.supportingEvidenceIds));
  const sourceClass: PersonPatternSourceClass = input.selfDeclared === true ? 'SELF_DECLARED' : 'OBSERVED_RECURRENT';
  if (sourceClass === 'OBSERVED_RECURRENT' && support.supportCount < 2) {
    return {
      ok: false as const,
      error: 'PERSON_CT_PATTERN_RECURRENCE_SUPPORT_REQUIRED',
      minimumDistinctSupportRefs: 2,
      observedSupportRefs: support.supportCount,
    };
  }

  const normalizedStatement = statement.replace(/\s+/g, ' ').trim();
  const patternHash = sha256(`${input.ownerId}|${dimension}|${category}|${normalizedStatement.toLowerCase()}`);
  const patternId = `person-ct-pattern:${patternHash.slice(0, 24)}`;
  const db = createServiceSupabaseClient();
  const existing = await db.from('epistemic_events')
    .select('event_id,event_name,payload,occurred_at')
    .eq('event_name', 'SFI_PERSON_CT_PATTERN_CANDIDATE_RECORDED')
    .eq('payload->>ownerId', input.ownerId)
    .eq('payload->>patternId', patternId)
    .order('sequence', { ascending: false })
    .limit(1);
  if (existing.error) throw new Error(`PERSON_CT_PATTERN_DUPLICATE_CHECK_FAILED:${existing.error.message}`);
  if ((existing.data ?? []).length) {
    return { ok: true as const, idempotent: true as const, patternId, eventId: String(existing.data?.[0]?.event_id ?? '') };
  }

  const confidence = sourceClass === 'SELF_DECLARED'
    ? Math.min(0.7, clamp01(input.confidence, 0.6))
    : Math.min(0.85, clamp01(input.confidence, Math.min(0.5 + support.supportCount * 0.08, 0.82)));
  const event = await appendEpistemicEvent({
    eventName: 'SFI_PERSON_CT_PATTERN_CANDIDATE_RECORDED',
    epistemicClass: sourceClass === 'SELF_DECLARED' ? 'declared' : 'inferred',
    confidence,
    payload: {
      contract: SFI_PERSON_CT_PATTERN_CONTRACT,
      ownerId: input.ownerId,
      patternId,
      dimension,
      category,
      statement: normalizedStatement,
      operationalMeaning: text(input.operationalMeaning),
      useCases: strings(input.useCases, 20),
      conditions: strings(input.conditions, 20),
      counterSignals: strings(input.counterSignals, 20),
      sourceClass,
      status: 'CANDIDATE',
      confidence,
      support,
      institutionalInheritance: 'DENIED_BY_DEFAULT',
      epistemicBoundary: sourceClass === 'SELF_DECLARED'
        ? 'This is a person-declared operating description. Declaration is authoritative as a declaration, not proof that the pattern predicts behavior.'
        : 'This pattern is an inference over recurrent owner-scoped support. It remains a candidate until the person confirms or rejects it; it never becomes institutional state by inheritance.',
    },
    occurredAt: new Date().toISOString(),
    source: { sourceId: input.ownerId, sourceType: 'person_ct_pattern_intake' },
    logbookId: `person-ct:${input.ownerId}`,
    lineage: [...support.runIds, ...support.evidenceIds],
  });
  return event.ok
    ? { ok: true as const, idempotent: false as const, patternId, eventId: String(event.data.event_id ?? ''), event: event.data }
    : { ok: false as const, error: event.error };
}

async function readPatternCandidate(ownerId: string, patternId: string) {
  const db = createServiceSupabaseClient();
  const result = await db.from('epistemic_events')
    .select('event_id,event_name,epistemic_class,confidence,payload,lineage,occurred_at,hash_self')
    .eq('event_name', 'SFI_PERSON_CT_PATTERN_CANDIDATE_RECORDED')
    .eq('payload->>ownerId', ownerId)
    .eq('payload->>patternId', patternId)
    .order('sequence', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) throw new Error(`PERSON_CT_PATTERN_READ_FAILED:${result.error.message}`);
  return result.data ? row(result.data) : null;
}

async function readPatternTerminal(ownerId: string, patternId: string) {
  const db = createServiceSupabaseClient();
  const result = await db.from('epistemic_events')
    .select('event_id,event_name,payload,occurred_at')
    .in('event_name', ['SFI_PERSON_CT_PATTERN_CONFIRMED', 'SFI_PERSON_CT_PATTERN_REJECTED'])
    .eq('payload->>ownerId', ownerId)
    .eq('payload->>patternId', patternId)
    .order('sequence', { ascending: false })
    .limit(1);
  if (result.error) throw new Error(`PERSON_CT_PATTERN_TERMINAL_READ_FAILED:${result.error.message}`);
  return (result.data ?? [])[0] ? row(result.data?.[0]) : null;
}

export async function resolvePersonCognitivePattern(input: {
  ownerId: string;
  patternId: string;
  disposition: 'CONFIRMED' | 'REJECTED';
  note?: string | null;
}) {
  const patternId = text(input.patternId);
  if (!patternId) return { ok: false as const, error: 'PERSON_CT_PATTERN_ID_REQUIRED' };
  const terminal = await readPatternTerminal(input.ownerId, patternId);
  if (terminal) {
    const state = terminal.event_name === 'SFI_PERSON_CT_PATTERN_CONFIRMED' ? 'CONFIRMED' : 'REJECTED';
    if (state === input.disposition) return { ok: true as const, idempotent: true as const, state, eventId: String(terminal.event_id ?? '') };
    return { ok: false as const, error: 'PERSON_CT_PATTERN_ALREADY_TERMINAL', terminalState: state, terminalEventId: String(terminal.event_id ?? '') };
  }
  const candidate = await readPatternCandidate(input.ownerId, patternId);
  if (!candidate) return { ok: false as const, error: 'PERSON_CT_PATTERN_NOT_FOUND' };
  const candidatePayload = payload(candidate);
  const confirmed = input.disposition === 'CONFIRMED';
  const event = await appendEpistemicEvent({
    eventName: confirmed ? 'SFI_PERSON_CT_PATTERN_CONFIRMED' : 'SFI_PERSON_CT_PATTERN_REJECTED',
    epistemicClass: confirmed ? 'derived' : 'rejected',
    confidence: confirmed ? 1 : 1,
    payload: {
      contract: SFI_PERSON_CT_PATTERN_CONTRACT,
      ownerId: input.ownerId,
      patternId,
      dimension: candidatePayload.dimension ?? null,
      category: candidatePayload.category ?? null,
      candidateEventId: String(candidate.event_id ?? ''),
      status: input.disposition,
      note: text(input.note),
      resolvedAt: new Date().toISOString(),
      institutionalInheritance: 'DENIED_BY_DEFAULT',
      epistemicBoundary: confirmed
        ? 'Person confirmation means this representation is accepted for the owner-scoped Cognitive Twin. It does not prove universality, permanence or institutional applicability.'
        : 'Person rejection prevents this representation from being used as an accepted owner-scoped pattern while preserving its audit trace.',
    },
    occurredAt: new Date().toISOString(),
    source: { sourceId: input.ownerId, sourceType: 'person_ct_pattern_resolution' },
    logbookId: `person-ct:${input.ownerId}`,
    lineage: [String(candidate.event_id ?? '')],
  });
  return event.ok
    ? { ok: true as const, idempotent: false as const, state: input.disposition, eventId: String(event.data.event_id ?? ''), event: event.data }
    : { ok: false as const, error: event.error };
}

export async function readPersonCognitivePatterns(ownerId: string, limit = 120) {
  const db = createServiceSupabaseClient();
  const result = await db.from('epistemic_events')
    .select('event_id,event_name,epistemic_class,confidence,payload,lineage,occurred_at,hash_self')
    .in('event_name', [
      'SFI_PERSON_CT_PATTERN_CANDIDATE_RECORDED',
      'SFI_PERSON_CT_PATTERN_CONFIRMED',
      'SFI_PERSON_CT_PATTERN_REJECTED',
    ])
    .eq('payload->>ownerId', ownerId)
    .order('sequence', { ascending: false })
    .limit(Math.max(30, Math.min(400, limit * 3)));
  if (result.error) return { ok: false as const, patterns: [], warnings: [result.error.message] };
  const events = (result.data ?? []).map((item) => row(item));
  const terminalByPattern = new Map<string, Row>();
  for (const event of events) {
    if (!['SFI_PERSON_CT_PATTERN_CONFIRMED', 'SFI_PERSON_CT_PATTERN_REJECTED'].includes(String(event.event_name ?? ''))) continue;
    const patternId = text(payload(event).patternId);
    if (patternId && !terminalByPattern.has(patternId)) terminalByPattern.set(patternId, event);
  }
  const patterns = events
    .filter((event) => event.event_name === 'SFI_PERSON_CT_PATTERN_CANDIDATE_RECORDED')
    .map((candidate) => {
      const candidatePayload = payload(candidate);
      const patternId = text(candidatePayload.patternId) ?? 'unknown';
      const terminal = terminalByPattern.get(patternId) ?? null;
      const terminalState = terminal?.event_name === 'SFI_PERSON_CT_PATTERN_CONFIRMED' ? 'CONFIRMED'
        : terminal?.event_name === 'SFI_PERSON_CT_PATTERN_REJECTED' ? 'REJECTED'
          : 'CANDIDATE';
      return {
        patternId,
        dimension: candidatePayload.dimension ?? null,
        category: candidatePayload.category ?? null,
        statement: candidatePayload.statement ?? null,
        operationalMeaning: candidatePayload.operationalMeaning ?? null,
        useCases: candidatePayload.useCases ?? [],
        conditions: candidatePayload.conditions ?? [],
        counterSignals: candidatePayload.counterSignals ?? [],
        sourceClass: candidatePayload.sourceClass ?? null,
        status: terminalState as PersonPatternStatus,
        confidence: candidate.confidence ?? candidatePayload.confidence ?? null,
        support: candidatePayload.support ?? null,
        candidateEventId: candidate.event_id ?? null,
        terminalEventId: terminal?.event_id ?? null,
        recordedAt: candidate.occurred_at ?? null,
        institutionalInheritance: 'DENIED_BY_DEFAULT',
      };
    })
    .slice(0, limit);
  return {
    ok: true as const,
    patterns,
    byDimension: {
      COGNITION: patterns.filter((pattern) => pattern.dimension === 'COGNITION'),
      OBSERVATION: patterns.filter((pattern) => pattern.dimension === 'OBSERVATION'),
    },
    warnings: [] as string[],
    boundary: 'PERSON_CT patterns are owner-scoped representations. They cannot enter institutional Cognitive Spine by inheritance; the separate Person→Institution gate remains mandatory.',
  };
}

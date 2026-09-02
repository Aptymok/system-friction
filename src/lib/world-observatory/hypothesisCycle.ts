import 'server-only';
import { createHash } from 'crypto';
import { runLlmTask } from '@/lib/ai/providerRouter';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { clamp01 } from '@/lib/sfi/math';
import { WORLD_METHODOLOGY_VERSION } from './worldCycle';

type Row = Record<string, unknown>;
type ReadingRow = Row & {
  id: string;
  observation_id: string;
  systemic_friction: number;
  interaction_density: number;
  friction_gradient: number;
  systemic_coherence: number;
  tension: Row;
  pain_map: Row;
  field_drivers: Row;
  permissions: Row;
  trajectory: Row;
  minimum_viable_perturbation: Row | null;
  created_at: string;
};

type ObservationRow = Row & {
  id: string;
  source_id: string;
  source_family: string;
  publisher: string;
  title: string;
  summary: string | null;
  observed_at: string | null;
  latitude: number | null;
  longitude: number | null;
  affected_systems: string[];
  actors: string[];
  confidence: number | null;
  source_url: string | null;
  payload: Row;
};

type ClusterItem = { observation: ObservationRow; reading: ReadingRow };
type AiProposal = {
  decision: 'PROPOSE' | 'NO_HYPOTHESIS';
  statement: string | null;
  relationClass: 'CAUSAL_CANDIDATE' | 'COUPLING' | 'COMMON_CAUSE' | 'SEQUENCE' | 'CORRELATION' | 'UNKNOWN';
  mechanism: string | null;
  affectedObservationIds: string[];
  affectedSystems: string[];
  expectedSignals: string[];
  contradictionSignals: string[];
  horizonHours: number;
  consequenceChain: Array<{ from: string; to: string; relation: string; basisEvidenceIds: string[] }>;
  rivalHypotheses: string[];
  uncertainties: string[];
  confidence: number;
  reason: string;
};

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function strings(value: unknown, max = 20): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()))].slice(0, max)
    : [];
}

function text(value: unknown, max = 6000): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

function hash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function hoursBetween(a: string | null, b: string | null) {
  const aa = a ? Date.parse(a) : Number.NaN;
  const bb = b ? Date.parse(b) : Number.NaN;
  return Number.isFinite(aa) && Number.isFinite(bb) ? Math.abs(aa - bb) / 3_600_000 : null;
}

function structuralBasis(a: ObservationRow, b: ObservationRow) {
  const sharedSystems = a.affected_systems.filter((item) => b.affected_systems.includes(item));
  const sharedActors = a.actors.filter((item) => b.actors.includes(item));
  const sameFamily = a.source_family === b.source_family;
  const temporalDistanceHours = hoursBetween(a.observed_at, b.observed_at);
  const temporallyNear = temporalDistanceHours !== null && temporalDistanceHours <= 18;
  const connected = sharedSystems.length > 0 || sharedActors.length > 0 || (sameFamily && temporallyNear);
  return { connected, sharedSystems, sharedActors, sameFamily, temporalDistanceHours };
}

function buildClusters(items: ClusterItem[]) {
  const seen = new Set<string>();
  const clusters: ClusterItem[][] = [];
  for (const seed of items) {
    const related = items
      .filter((candidate) => candidate.observation.id !== seed.observation.id)
      .map((candidate) => ({ candidate, basis: structuralBasis(seed.observation, candidate.observation) }))
      .filter((entry) => entry.basis.connected)
      .sort((a, b) => {
        const aOverlap = a.basis.sharedSystems.length * 3 + a.basis.sharedActors.length * 2 + Number(a.basis.sameFamily);
        const bOverlap = b.basis.sharedSystems.length * 3 + b.basis.sharedActors.length * 2 + Number(b.basis.sameFamily);
        return bOverlap - aOverlap;
      })
      .slice(0, 7)
      .map((entry) => entry.candidate);
    const cluster = [seed, ...related];
    const key = cluster.map((item) => item.observation.id).sort().join(':');
    if (seen.has(key)) continue;
    seen.add(key);
    clusters.push(cluster);
  }
  return clusters.slice(0, 12);
}

function parseProposal(value: string): AiProposal | null {
  try {
    const clean = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = row(JSON.parse(clean));
    const decision = text(parsed.decision, 40)?.toUpperCase();
    if (decision !== 'PROPOSE' && decision !== 'NO_HYPOTHESIS') return null;
    const allowedRelation = new Set(['CAUSAL_CANDIDATE', 'COUPLING', 'COMMON_CAUSE', 'SEQUENCE', 'CORRELATION', 'UNKNOWN']);
    const relationCandidate = text(parsed.relationClass, 80)?.toUpperCase() ?? 'UNKNOWN';
    const rawConfidence = Number(parsed.confidence);
    const confidence = Number.isFinite(rawConfidence) ? clamp01(rawConfidence > 1 ? rawConfidence / 100 : rawConfidence) : 0.5;
    const consequenceChain = Array.isArray(parsed.consequenceChain)
      ? parsed.consequenceChain.slice(0, 12).flatMap((value) => {
          const item = row(value);
          const from = text(item.from, 300);
          const to = text(item.to, 300);
          const relation = text(item.relation, 500);
          if (!from || !to || !relation) return [];
          return [{ from, to, relation, basisEvidenceIds: strings(item.basisEvidenceIds, 20) }];
        })
      : [];
    return {
      decision: decision as AiProposal['decision'],
      statement: text(parsed.statement, 5000),
      relationClass: allowedRelation.has(relationCandidate) ? relationCandidate as AiProposal['relationClass'] : 'UNKNOWN',
      mechanism: text(parsed.mechanism, 5000),
      affectedObservationIds: strings(parsed.affectedObservationIds, 30),
      affectedSystems: strings(parsed.affectedSystems, 30),
      expectedSignals: strings(parsed.expectedSignals, 20),
      contradictionSignals: strings(parsed.contradictionSignals, 20),
      horizonHours: Math.max(6, Math.min(720, Number(parsed.horizonHours) || 48)),
      consequenceChain,
      rivalHypotheses: strings(parsed.rivalHypotheses, 10),
      uncertainties: strings(parsed.uncertainties, 20),
      confidence: Math.min(0.8, confidence),
      reason: text(parsed.reason, 5000) ?? 'No reason supplied.',
    };
  } catch {
    return null;
  }
}

async function inferHypothesis(cluster: ClusterItem[]) {
  const observations = cluster.map(({ observation, reading }) => ({
    id: observation.id,
    sourceId: observation.source_id,
    sourceFamily: observation.source_family,
    publisher: observation.publisher,
    title: observation.title,
    summary: observation.summary,
    observedAt: observation.observed_at,
    geography: observation.latitude !== null && observation.longitude !== null
      ? { lat: observation.latitude, lng: observation.longitude }
      : null,
    affectedSystems: observation.affected_systems,
    actors: observation.actors,
    sourceConfidence: observation.confidence,
    sourceUrl: observation.source_url,
    payload: observation.payload,
    metrics: {
      systemicFriction: reading.systemic_friction,
      interactionDensity: reading.interaction_density,
      frictionGradient: reading.friction_gradient,
      systemicCoherence: reading.systemic_coherence,
    },
  }));
  const derivedRelations = [] as Row[];
  for (let i = 0; i < observations.length; i += 1) {
    for (let j = i + 1; j < observations.length; j += 1) {
      const a = cluster[i].observation;
      const b = cluster[j].observation;
      const basis = structuralBasis(a, b);
      if (!basis.connected) continue;
      derivedRelations.push({
        from: a.id,
        to: b.id,
        relation: 'STRUCTURAL_COINCIDENCE',
        epistemicClass: 'DERIVED',
        basis,
      });
    }
  }

  const llm = await runLlmTask({
    task: 'deep_report',
    system: [
      'You are the governed hypothesis generator for the System Friction Institute World Observatory.',
      'Use ONLY the supplied observations, source metadata, derived SFI metrics, and structural relations.',
      'Do not turn source claims into facts. Do not infer causality merely from temporal order, shared topic, geography, or correlation.',
      'A hypothesis is useful only if it creates a discriminating future test with both expected and contradiction signals.',
      'Trace how hypothesis A could affect observation/system nodes B, F, etc. Every inferred consequence edge must name the evidence ids that motivated it.',
      'If the supplied material is insufficient for a non-trivial falsifiable hypothesis, return NO_HYPOTHESIS.',
      'Write statements and explanations in Spanish, concise but substantive.',
      'Return ONLY JSON with this schema: {"decision":"PROPOSE|NO_HYPOTHESIS","statement":string|null,"relationClass":"CAUSAL_CANDIDATE|COUPLING|COMMON_CAUSE|SEQUENCE|CORRELATION|UNKNOWN","mechanism":string|null,"affectedObservationIds":string[],"affectedSystems":string[],"expectedSignals":string[],"contradictionSignals":string[],"horizonHours":number,"consequenceChain":[{"from":string,"to":string,"relation":string,"basisEvidenceIds":string[]}],"rivalHypotheses":string[],"uncertainties":string[],"confidence":number,"reason":string}.',
    ].join('\n'),
    prompt: JSON.stringify({
      methodology: WORLD_METHODOLOGY_VERSION,
      observations,
      derivedRelations,
      epistemicBoundary: 'OBSERVATIONS are source records; SFI metrics/relations are DERIVED; the model output is INFERENCE only.',
    }).slice(0, 30000),
    fallbackResult: '{"decision":"NO_HYPOTHESIS","statement":null,"relationClass":"UNKNOWN","mechanism":null,"affectedObservationIds":[],"affectedSystems":[],"expectedSignals":[],"contradictionSignals":[],"horizonHours":48,"consequenceChain":[],"rivalHypotheses":[],"uncertainties":["governed_model_unavailable"],"confidence":0,"reason":"No governed model produced a hypothesis."}',
    requirements: { reasoning: true, structuredOutput: true, priority: 'quality' },
    maxTokens: 1800,
  });

  if (!llm.ok) return { ok: false as const, proposal: null, warning: llm.warnings.join('; ') || 'governed_model_unavailable', provider: null, model: null, derivedRelations };
  const proposal = parseProposal(llm.result);
  if (!proposal) return { ok: false as const, proposal: null, warning: 'invalid_ai_hypothesis_schema', provider: llm.provider, model: llm.model, derivedRelations };
  return { ok: true as const, proposal, warning: null, provider: llm.provider, model: llm.model, derivedRelations };
}

export async function runWorldHypothesisCycle() {
  const db = createServiceSupabaseClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: readings, error } = await db
    .from('world_friction_readings')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(160);

  if (error) return { ok: false, created: 0, considered: 0, error: error.message };
  const readingRows = (readings ?? []) as ReadingRow[];
  const observationIds = [...new Set(readingRows.map((reading) => reading.observation_id).filter(Boolean))];
  if (!observationIds.length) return { ok: true, created: 0, considered: 0, clusters: 0, warnings: ['no_recent_observations'], generatedAt: new Date().toISOString() };

  const observationsResult = await db
    .from('world_source_observations')
    .select('id,source_id,source_family,publisher,title,summary,observed_at,latitude,longitude,affected_systems,actors,confidence,source_url,payload')
    .in('id', observationIds);
  if (observationsResult.error) return { ok: false, created: 0, considered: readingRows.length, error: observationsResult.error.message };

  const observations = new Map(((observationsResult.data ?? []) as ObservationRow[]).map((item) => [item.id, item]));
  const items = readingRows.flatMap((reading) => {
    const observation = observations.get(reading.observation_id);
    return observation ? [{ observation, reading }] : [];
  });
  const clusters = buildClusters(items);
  let created = 0;
  const warnings: string[] = [];
  const results: Row[] = [];

  for (const cluster of clusters) {
    const evidenceIds = cluster.map((item) => item.observation.id).sort();
    const phenomenonKey = `ai-field:${hash(evidenceIds).slice(0, 32)}`;
    const { data: existing } = await db
      .from('world_hypotheses')
      .select('id')
      .eq('phenomenon_key', phenomenonKey)
      .in('status', ['OPEN', 'AWAITING_OUTCOME'])
      .maybeSingle();
    if (existing) continue;

    const inferred = await inferHypothesis(cluster);
    if (!inferred.ok || !inferred.proposal || inferred.proposal.decision !== 'PROPOSE') {
      if (inferred.warning) warnings.push(inferred.warning);
      results.push({ phenomenonKey, state: 'NO_HYPOTHESIS', warning: inferred.warning ?? null });
      continue;
    }
    const proposal = inferred.proposal;
    if (!proposal.statement || !proposal.expectedSignals.length || !proposal.contradictionSignals.length) {
      results.push({ phenomenonKey, state: 'INSUFFICIENT_DISCRIMINATION' });
      continue;
    }

    const allowedEvidence = new Set(evidenceIds);
    const affectedObservationIds = proposal.affectedObservationIds.filter((id) => allowedEvidence.has(id));
    const cutoff = new Date();
    const validationStartsAt = new Date(cutoff.getTime() + 60 * 60 * 1000);
    const validationEndsAt = new Date(cutoff.getTime() + proposal.horizonHours * 60 * 60 * 1000);
    const graphNodes = cluster.map(({ observation }) => ({
      id: observation.id,
      kind: 'OBSERVATION',
      title: observation.title,
      sourceFamily: observation.source_family,
      publisher: observation.publisher,
      observedAt: observation.observed_at,
      affectedSystems: observation.affected_systems,
      actors: observation.actors,
      geography: observation.latitude !== null && observation.longitude !== null ? { lat: observation.latitude, lng: observation.longitude } : null,
      epistemicClass: 'SOURCE_RECORD',
    }));
    const systemNodes = proposal.affectedSystems.map((system) => ({ id: `system:${system}`, kind: 'SYSTEM', label: system, epistemicClass: 'DECLARED_OR_INFERRED_TARGET' }));
    const inferredEdges = proposal.consequenceChain.map((edge) => ({
      ...edge,
      epistemicClass: 'INFERRED',
      basisEvidenceIds: edge.basisEvidenceIds.filter((id) => allowedEvidence.has(id)),
    }));

    const { data: inserted, error: insertError } = await db.from('world_hypotheses').insert({
      phenomenon_key: phenomenonKey,
      graph_snapshot: {
        nodes: [...graphNodes, ...systemNodes],
        derivedRelations: inferred.derivedRelations,
        inferredRelations: inferredEdges,
        aiInference: {
          provider: inferred.provider,
          model: inferred.model,
          relationClass: proposal.relationClass,
          mechanism: proposal.mechanism,
          affectedObservationIds,
          affectedSystems: proposal.affectedSystems,
          consequenceChain: inferredEdges,
          rivalHypotheses: proposal.rivalHypotheses,
          uncertainties: proposal.uncertainties,
          reason: proposal.reason,
          authority: 'INFERENCE_ONLY',
        },
        epistemicBoundary: 'Source records remain distinct from derived structural relations and AI-inferred mechanism/consequence edges.',
      },
      cutoff_at: cutoff.toISOString(),
      statement: proposal.statement,
      predicted_trajectory: {
        relationClass: proposal.relationClass,
        mechanism: proposal.mechanism,
        affectedObservationIds,
        affectedSystems: proposal.affectedSystems,
        consequenceChain: inferredEdges,
        rivalHypotheses: proposal.rivalHypotheses,
        uncertainties: proposal.uncertainties,
        horizonHours: proposal.horizonHours,
      },
      expected_signals: proposal.expectedSignals,
      contradiction_signals: proposal.contradictionSignals,
      validation_starts_at: validationStartsAt.toISOString(),
      validation_ends_at: validationEndsAt.toISOString(),
      initial_confidence: proposal.confidence,
      current_confidence: proposal.confidence,
      methodology_version: WORLD_METHODOLOGY_VERSION,
      evidence_ids: evidenceIds,
      status: 'AWAITING_OUTCOME',
    }).select('id').single();

    if (insertError || !inserted) {
      warnings.push(`hypothesis_insert:${insertError?.message ?? 'unknown'}`);
      continue;
    }
    created += 1;
    results.push({ hypothesisId: inserted.id, phenomenonKey, state: 'CREATED', evidenceCount: evidenceIds.length, affectedObservationIds, affectedSystems: proposal.affectedSystems, provider: inferred.provider, model: inferred.model });
  }

  return {
    ok: warnings.length === 0 || created > 0,
    created,
    considered: items.length,
    clusters: clusters.length,
    warnings: [...new Set(warnings)].slice(0, 20),
    results,
    generatedAt: new Date().toISOString(),
    rule: 'New world hypotheses are governed AI inferences over persisted source records and derived structural relations. No canned directional statement or friction threshold creates a hypothesis.',
  };
}

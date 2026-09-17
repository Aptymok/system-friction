import 'server-only';
import { createHash } from 'crypto';
import { runLlmTask } from '@/lib/ai/providerRouter';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { clamp01 } from '@/lib/sfi/math';
import { WORLD_METHODOLOGY_VERSION } from './worldCycle';
import {
  SFI_HYPOTHESIS_TEST_CONTRACT,
  parseHypothesisTestContract,
  type HypothesisTestContract,
} from './hypothesisTestContract';
import {
  readWorldHypothesisLearningProfile,
  type WorldHypothesisLearningProfile,
} from './hypothesisLearningProfile';

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
  testContract: HypothesisTestContract | null;
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
    const testContract = parseHypothesisTestContract(parsed.testContract);
    if (decision === 'PROPOSE' && !testContract) return null;
    const expectedSignals = testContract?.expectedCriteria.map((criterion) => criterion.signal) ?? strings(parsed.expectedSignals, 20);
    const contradictionSignals = testContract?.contradictionCriteria.map((criterion) => criterion.signal) ?? strings(parsed.contradictionSignals, 20);
    return {
      decision: decision as AiProposal['decision'],
      statement: text(parsed.statement, 5000),
      relationClass: allowedRelation.has(relationCandidate) ? relationCandidate as AiProposal['relationClass'] : 'UNKNOWN',
      mechanism: text(parsed.mechanism, 5000),
      affectedObservationIds: strings(parsed.affectedObservationIds, 30),
      affectedSystems: strings(parsed.affectedSystems, 30),
      expectedSignals,
      contradictionSignals,
      testContract,
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

async function inferHypothesis(cluster: ClusterItem[], learningProfile: WorldHypothesisLearningProfile) {
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
      'Use ONLY the supplied observations, source metadata, derived SFI metrics, structural relations and bounded method-feedback profile.',
      'Do not turn source claims into facts. Do not infer causality merely from temporal order, shared topic, geography, correlation or prior model outcomes.',
      'A hypothesis is useful only if it preregisters a discriminating future test before observing the RETURN.',
      'Every PROPOSE result MUST include testContract.contract = SFI-HYPOTHESIS-TEST-1.0, an explicit horizonBasis, minimum evidence/source diversity, expectedCriteria and contradictionCriteria.',
      'Each criterion must identify a signal, operator and, for numeric operators, a numeric threshold. PRESENCE/ABSENCE may use threshold null.',
      'The validation horizon must follow the claim. Do not shorten a long-horizon claim merely to fit a software default.',
      'Meta-learning may tighten future test discrimination, but it cannot change attractors, create evidence, promote truth/canon, or make prior hypotheses newly true.',
      'When learningProfile.tightenDiscrimination is true, prefer fewer hypotheses, sharper expected-versus-contradiction separation, stronger source diversity and NO_HYPOTHESIS over vague partial testability.',
      'Trace how hypothesis A could affect observation/system nodes B, F, etc. Every inferred consequence edge must name the evidence ids that motivated it.',
      'If the supplied material is insufficient for a non-trivial falsifiable hypothesis or measurable criteria, return NO_HYPOTHESIS.',
      'Write statements and explanations in Spanish, concise but substantive.',
      'Return ONLY JSON with this schema: {"decision":"PROPOSE|NO_HYPOTHESIS","statement":string|null,"relationClass":"CAUSAL_CANDIDATE|COUPLING|COMMON_CAUSE|SEQUENCE|CORRELATION|UNKNOWN","mechanism":string|null,"affectedObservationIds":string[],"affectedSystems":string[],"testContract":{"contract":"SFI-HYPOTHESIS-TEST-1.0","horizonHours":number,"horizonBasis":string,"minimumEvidenceCount":number,"minimumSourceFamilies":number,"expectedCriteria":[{"id":string,"signal":string,"metric":string|null,"operator":"GT|GTE|LT|LTE|EQ|DELTA_GTE|DELTA_LTE|COUNT_GTE|PRESENCE|ABSENCE","threshold":number|null,"unit":string|null,"required":boolean,"minimumObservations":number,"sourceFamilies":string[]}],"contradictionCriteria":[{"id":string,"signal":string,"metric":string|null,"operator":"GT|GTE|LT|LTE|EQ|DELTA_GTE|DELTA_LTE|COUNT_GTE|PRESENCE|ABSENCE","threshold":number|null,"unit":string|null,"required":boolean,"minimumObservations":number,"sourceFamilies":string[]}],"passRule":string,"failRule":string,"inconclusiveRule":string},"consequenceChain":[{"from":string,"to":string,"relation":string,"basisEvidenceIds":string[]}],"rivalHypotheses":string[],"uncertainties":string[],"confidence":number,"reason":string}.',
    ].join('\n'),
    prompt: JSON.stringify({
      methodology: WORLD_METHODOLOGY_VERSION,
      testContract: SFI_HYPOTHESIS_TEST_CONTRACT,
      learningProfile: {
        sampleSize: learningProfile.sampleSize,
        classificationCounts: learningProfile.classificationCounts,
        partialValidationRate: learningProfile.partialValidationRate,
        decisiveRate: learningProfile.decisiveRate,
        inconclusiveRate: learningProfile.inconclusiveRate,
        tightenDiscrimination: learningProfile.tightenDiscrimination,
        topMissingVariables: learningProfile.topMissingVariables,
        generationGuidance: learningProfile.generationGuidance,
        boundaries: learningProfile.boundaries,
      },
      observations,
      derivedRelations,
      epistemicBoundary: 'OBSERVATIONS are source records; SFI metrics/relations and historical method feedback are DERIVED; model output is INFERENCE only.',
    }).slice(0, 30000),
    fallbackResult: '{"decision":"NO_HYPOTHESIS","statement":null,"relationClass":"UNKNOWN","mechanism":null,"affectedObservationIds":[],"affectedSystems":[],"testContract":null,"consequenceChain":[],"rivalHypotheses":[],"uncertainties":["governed_model_unavailable"],"confidence":0,"reason":"No governed model produced a hypothesis."}',
    requirements: { reasoning: true, structuredOutput: true, priority: 'quality' },
    maxTokens: 2600,
  });

  if (!llm.ok) return { ok: false as const, proposal: null, warning: llm.warnings.join('; ') || 'governed_model_unavailable', provider: null, model: null, derivedRelations };
  const proposal = parseProposal(llm.result);
  if (!proposal) return { ok: false as const, proposal: null, warning: 'invalid_or_non_discriminating_ai_hypothesis_schema', provider: llm.provider, model: llm.model, derivedRelations };
  return { ok: true as const, proposal, warning: null, provider: llm.provider, model: llm.model, derivedRelations };
}

export async function runWorldHypothesisCycle() {
  const db = createServiceSupabaseClient();
  const learningProfile = await readWorldHypothesisLearningProfile();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: readings, error } = await db
    .from('world_friction_readings')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(160);

  if (error) return { ok: false, created: 0, considered: 0, error: error.message, metaLearning: learningProfile };
  const readingRows = (readings ?? []) as ReadingRow[];
  const observationIds = [...new Set(readingRows.map((reading) => reading.observation_id).filter(Boolean))];
  if (!observationIds.length) return {
    ok: true,
    created: 0,
    considered: 0,
    clusters: 0,
    warnings: ['no_recent_observations', ...learningProfile.warnings],
    metaLearning: learningProfile,
    generatedAt: new Date().toISOString(),
  };

  const observationsResult = await db
    .from('world_source_observations')
    .select('id,source_id,source_family,publisher,title,summary,observed_at,latitude,longitude,affected_systems,actors,confidence,source_url,payload')
    .in('id', observationIds);
  if (observationsResult.error) return { ok: false, created: 0, considered: readingRows.length, error: observationsResult.error.message, metaLearning: learningProfile };

  const observations = new Map(((observationsResult.data ?? []) as ObservationRow[]).map((item) => [item.id, item]));
  const items = readingRows.flatMap((reading) => {
    const observation = observations.get(reading.observation_id);
    return observation ? [{ observation, reading }] : [];
  });
  const clusters = buildClusters(items);
  let created = 0;
  const warnings: string[] = [...learningProfile.warnings];
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

    const inferred = await inferHypothesis(cluster, learningProfile);
    if (!inferred.ok || !inferred.proposal || inferred.proposal.decision !== 'PROPOSE') {
      if (inferred.warning) warnings.push(inferred.warning);
      results.push({ phenomenonKey, state: 'NO_HYPOTHESIS', warning: inferred.warning ?? null });
      continue;
    }
    const proposal = inferred.proposal;
    if (!proposal.statement || !proposal.testContract || !proposal.expectedSignals.length || !proposal.contradictionSignals.length) {
      results.push({ phenomenonKey, state: 'INSUFFICIENT_DISCRIMINATION' });
      continue;
    }

    const allowedEvidence = new Set(evidenceIds);
    const affectedObservationIds = proposal.affectedObservationIds.filter((id) => allowedEvidence.has(id));
    const cutoff = new Date();
    const validationStartsAt = new Date(cutoff.getTime() + 60 * 60 * 1000);
    const validationEndsAt = new Date(cutoff.getTime() + proposal.testContract.horizonHours * 60 * 60 * 1000);
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
          testContract: proposal.testContract,
          methodFeedback: {
            sampleSize: learningProfile.sampleSize,
            partialValidationRate: learningProfile.partialValidationRate,
            decisiveRate: learningProfile.decisiveRate,
            tightenDiscrimination: learningProfile.tightenDiscrimination,
          },
          authority: 'INFERENCE_ONLY',
        },
        epistemicBoundary: 'Source records remain distinct from derived structural relations, historical method feedback and AI-inferred mechanism/consequence edges.',
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
        horizonHours: proposal.testContract.horizonHours,
        horizonBasis: proposal.testContract.horizonBasis,
        minimumEvidenceCount: proposal.testContract.minimumEvidenceCount,
        minimumSourceFamilies: proposal.testContract.minimumSourceFamilies,
        expectedCriteria: proposal.testContract.expectedCriteria,
        contradictionCriteria: proposal.testContract.contradictionCriteria,
        testContract: proposal.testContract,
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
    results.push({
      hypothesisId: inserted.id,
      phenomenonKey,
      state: 'CREATED',
      evidenceCount: evidenceIds.length,
      affectedObservationIds,
      affectedSystems: proposal.affectedSystems,
      testContract: proposal.testContract,
      methodFeedbackApplied: learningProfile.tightenDiscrimination,
      provider: inferred.provider,
      model: inferred.model,
    });
  }

  return {
    ok: warnings.length === 0 || created > 0,
    created,
    considered: items.length,
    clusters: clusters.length,
    warnings: [...new Set(warnings)].slice(0, 20),
    results,
    metaLearning: {
      sampleSize: learningProfile.sampleSize,
      classificationCounts: learningProfile.classificationCounts,
      partialValidationRate: learningProfile.partialValidationRate,
      decisiveRate: learningProfile.decisiveRate,
      inconclusiveRate: learningProfile.inconclusiveRate,
      tightenDiscrimination: learningProfile.tightenDiscrimination,
      topMissingVariables: learningProfile.topMissingVariables,
      boundaries: learningProfile.boundaries,
    },
    generatedAt: new Date().toISOString(),
    rule: 'New world hypotheses are governed AI inferences over persisted source records and derived structural relations. A PROPOSE result must preregister measurable expected/contradiction criteria, evidence coverage and a claim-derived validation horizon before RETURN is observed. Historical outcomes may tighten future test discrimination but cannot change attractors or promote truth.',
  };
}

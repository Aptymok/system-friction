import 'server-only';

import { readContinuityDashboard } from '@/lib/continuity/runtime';
import { createActionProposal, recordValue, sha256, stringValue } from '@/lib/operational/common';
import { getPredictiveEngineHealth } from '@/lib/predictive-engine/service';
import { readObservedSfiCognitiveRuntime } from '@/lib/sfi/cognitive-runtime/observedRuntime';
import { buildWorldVectorOperationalState } from '@/lib/world-vector/operationalState';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import type { refreshInstitutionalAttractorTrajectory } from './institutionalAttractor';

export const SFI_INSTITUTIONAL_EVOLUTION_CONTRACT = 'SFI-INSTITUTIONAL-EVOLUTION-1.1' as const;
export const SFI_INSTITUTIONAL_MUTATION_PROPOSAL_TYPE = 'institutional_mutation_candidate' as const;

const SYSTEM_ACTOR = 'SYSTEM_FRICTION_INSTITUTE';
const MAX_NEW_PROPOSALS_PER_CYCLE = 4;
const CANDIDATE_FINGERPRINT_CONTRACT = 'SFI-INSTITUTIONAL-EVOLUTION-CANDIDATE-1.0';
const DEDUP_PROPOSAL_STATUSES = new Set(['draft', 'proposed', 'waiting_evidence', 'design_approved', 'queued', 'conflicted', 'frozen']);
const REENTRY_PROPOSAL_STATUSES = new Set(['draft', 'proposed', 'waiting_evidence', 'design_approved', 'queued', 'conflicted']);

type AttractorRefresh = Awaited<ReturnType<typeof refreshInstitutionalAttractorTrajectory>>;
type EvolutionKind =
  | 'CAPABILITY_REPAIR'
  | 'ROUTINE_MUTATION'
  | 'EVIDENCE_ACQUISITION'
  | 'GOVERNANCE_REVIEW'
  | 'PREDICTIVE_CALIBRATION'
  | 'PREDICTIVE_RETURN_RECONCILIATION'
  | 'NEW_MODULE_CANDIDATE';

type EvolutionCandidate = {
  kind: EvolutionKind;
  target: string;
  title: string;
  objective: string;
  priority: number;
  reasons: string[];
  evidenceRefs: string[];
  ownerResolution: 'REPAIR_EXISTING_OWNER' | 'ABSORB_IN_EXISTING_OWNER' | 'NO_EXISTING_OWNER';
};

type PersistedProposal = {
  id: string;
  fingerprint: string;
  status: string;
};

export type OpenInstitutionalEvolutionWork = {
  proposalId: string;
  title: string;
  objective: string;
  kind: EvolutionKind;
  target: string;
  priority: number;
  ownerResolution: EvolutionCandidate['ownerResolution'];
  status: string;
  reasons: string[];
  evidenceRefs: string[];
  executionAuthorized: false;
  externalEffectAllowed: false;
  founderInterruption: 'ONLY_IF_SOVEREIGN_BOUNDARY';
};

function rows(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : [];
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))];
}

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function fingerprintPayload(candidate: EvolutionCandidate, contract: string) {
  return {
    contract,
    kind: candidate.kind,
    target: candidate.target,
    reasons: [...candidate.reasons].sort(),
    ownerResolution: candidate.ownerResolution,
  };
}

function proposalFingerprint(candidate: EvolutionCandidate) {
  return sha256(fingerprintPayload(candidate, CANDIDATE_FINGERPRINT_CONTRACT));
}

function legacyProposalFingerprints(candidate: EvolutionCandidate) {
  return [
    sha256(fingerprintPayload(candidate, 'SFI-INSTITUTIONAL-EVOLUTION-1.0')),
    sha256(fingerprintPayload(candidate, 'SFI-INSTITUTIONAL-EVOLUTION-1.1')),
  ];
}

async function queryEvolutionProposals(limit: number, sourceCutoff?: string) {
  const service = createServiceSupabaseClient();
  let query = service
    .from('action_proposals')
    .select('*')
    .eq('expected_field_delta->>proposalType', SFI_INSTITUTIONAL_MUTATION_PROPOSAL_TYPE)
    .order('created_at', { ascending: false });
  if (sourceCutoff) query = query.lte('created_at', sourceCutoff);
  const { data, error } = await query.limit(limit);
  return { data: data ?? [], error: error?.message ?? null };
}

function existingEvolutionProposals(value: unknown[]): PersistedProposal[] {
  return value.flatMap((rowValue) => {
    const row = recordValue(rowValue);
    const expected = recordValue(row.expected_field_delta);
    const payload = recordValue(expected.payload);
    const fingerprint = stringValue(payload.fingerprint);
    const id = stringValue(row.id);
    const status = stringValue(row.status);
    if (!fingerprint || !id || !status || !DEDUP_PROPOSAL_STATUSES.has(status)) return [];
    return [{ id, fingerprint, status }];
  });
}

function openEvolutionWorkFromRows(value: unknown, limit: number): OpenInstitutionalEvolutionWork[] {
  return rows(value).flatMap((row) => {
    const id = stringValue(row.id);
    const title = stringValue(row.title);
    const status = stringValue(row.status);
    const expected = recordValue(row.expected_field_delta);
    const payload = recordValue(expected.payload);
    const contract = stringValue(payload.contract);
    const kind = stringValue(payload.kind) as EvolutionKind | null;
    const target = stringValue(payload.target);
    const objective = stringValue(expected.objective) ?? stringValue(row.description) ?? title;
    const ownerResolution = stringValue(payload.ownerResolution) as EvolutionCandidate['ownerResolution'] | null;
    const priority = Number(payload.priority);
    if (!id || !title || !status || !kind || !target || !ownerResolution) return [];
    if (contract !== SFI_INSTITUTIONAL_EVOLUTION_CONTRACT && contract !== 'SFI-INSTITUTIONAL-EVOLUTION-1.0') return [];
    if (!REENTRY_PROPOSAL_STATUSES.has(status)) return [];
    if (!['REPAIR_EXISTING_OWNER', 'ABSORB_IN_EXISTING_OWNER', 'NO_EXISTING_OWNER'].includes(ownerResolution)) return [];
    return [{
      proposalId: id,
      title,
      objective: objective ?? title,
      kind,
      target,
      priority: Number.isFinite(priority) ? Math.max(0, Math.min(1, priority)) : 0.5,
      ownerResolution,
      status,
      reasons: strings(payload.reasons),
      evidenceRefs: strings(payload.evidenceRefs),
      executionAuthorized: false as const,
      externalEffectAllowed: false as const,
      founderInterruption: 'ONLY_IF_SOVEREIGN_BOUNDARY' as const,
    }];
  }).sort((a, b) => b.priority - a.priority || a.proposalId.localeCompare(b.proposalId)).slice(0, limit);
}

export async function readOpenInstitutionalEvolutionWork(limit = 12, sourceCutoff = new Date().toISOString()) {
  const boundedLimit = Math.max(1, Math.min(24, limit));
  const current = await queryEvolutionProposals(Math.max(50, boundedLimit * 4), sourceCutoff);
  const work = openEvolutionWorkFromRows(current.data, boundedLimit);
  return {
    ok: !current.error,
    contract: SFI_INSTITUTIONAL_EVOLUTION_CONTRACT,
    authority: 'PROPOSED_NON_EXECUTING' as const,
    sourceCutoff,
    work,
    proposalRefs: work.map((item) => item.proposalId),
    warning: current.error ?? null,
    boundary: 'Eligible non-frozen evolution work recorded at or before the declared source cutoff may be consumed by the next institutional cycle for owner reconciliation. Consumption does not approve execution, canon change or external effects.',
  };
}

function runtimeCandidates(runtime: Awaited<ReturnType<typeof readObservedSfiCognitiveRuntime>>): EvolutionCandidate[] {
  const missing = runtime.agents.filter((agent) => agent.status === 'missing');
  const degraded = runtime.agents.filter((agent) => agent.status === 'degraded');
  const result: EvolutionCandidate[] = [];

  if (missing.length) {
    result.push({
      kind: 'CAPABILITY_REPAIR',
      target: 'cognitive-runtime',
      title: `Reparar ${missing.length} capacidades cognitivas registradas sin ejecución suficiente`,
      objective: 'Restaurar o enlazar las capacidades ya registradas antes de proponer agentes o módulos nuevos.',
      priority: 0.92,
      reasons: missing.map((agent) => `${agent.id}:missing`).sort(),
      evidenceRefs: runtime.eventGraph.recentEvents.slice(0, 20).map((event) => event.eventId),
      ownerResolution: 'REPAIR_EXISTING_OWNER',
    });
  }

  if (degraded.length) {
    result.push({
      kind: 'CAPABILITY_REPAIR',
      target: 'cognitive-runtime-degraded',
      title: `Reconciliar ${degraded.length} capacidades cognitivas degradadas`,
      objective: 'Reducir degradación del runtime mediante el propietario existente y conservar el problema como capacidad incompleta, no como justificación automática de un módulo nuevo.',
      priority: 0.82,
      reasons: degraded.map((agent) => `${agent.id}:degraded`).sort(),
      evidenceRefs: runtime.eventGraph.recentEvents.slice(0, 20).map((event) => event.eventId),
      ownerResolution: 'REPAIR_EXISTING_OWNER',
    });
  }

  return result;
}

function attractorCandidates(attractor: AttractorRefresh): EvolutionCandidate[] {
  const result: EvolutionCandidate[] = [];
  if (attractor.contradictedDimensions.length) {
    result.push({
      kind: 'GOVERNANCE_REVIEW',
      target: 'institutional-attractor',
      title: `Contrastar ${attractor.contradictedDimensions.length} dimensiones conflictivas del atractor`,
      objective: 'Resolver contradicciones del atractor con evidencia y RETURN antes de ampliar intervención, arquitectura o autoridad.',
      priority: 0.9,
      reasons: attractor.contradictedDimensions.map((dimension) => `contradicted:${dimension}`).sort(),
      evidenceRefs: unique(attractor.dimensions.flatMap((dimension) => dimension.contradictionRefs)),
      ownerResolution: 'ABSORB_IN_EXISTING_OWNER',
    });
  }

  if (attractor.missingDimensions.length) {
    result.push({
      kind: 'EVIDENCE_ACQUISITION',
      target: 'institutional-attractor-evidence',
      title: `Adquirir evidencia para ${attractor.missingDimensions.length} dimensiones sin soporte del atractor`,
      objective: 'Buscar y clasificar evidencia trazable para dimensiones faltantes sin interpretar ausencia de evidencia como ausencia del fenómeno.',
      priority: 0.76,
      reasons: attractor.missingDimensions.map((dimension) => `missing:${dimension}`).sort(),
      evidenceRefs: unique(attractor.dimensions.flatMap((dimension) => dimension.evidenceRefs)),
      ownerResolution: 'ABSORB_IN_EXISTING_OWNER',
    });
  }

  return result;
}

function continuityCandidates(continuity: Awaited<ReturnType<typeof readContinuityDashboard>>): EvolutionCandidate[] {
  const incidents = rows(continuity.incidents);
  if (!incidents.length) return [];
  const nonFounder = incidents.filter((incident) => incident.requires_founder !== true);
  if (!nonFounder.length) return [];
  return [{
    kind: 'ROUTINE_MUTATION',
    target: 'continuity-runtime',
    title: `Absorber ${nonFounder.length} incidentes operativos que no requieren autoridad del fundador`,
    objective: 'Reducir dependencia del fundador moviendo trabajo operativo repetible al propietario de continuidad existente, sin tocar decisiones soberanas.',
    priority: 0.86,
    reasons: nonFounder.map((incident) => `${String(incident.capability_id ?? 'unknown')}:${String(incident.error_code ?? 'incident')}`).sort(),
    evidenceRefs: nonFounder.map((incident) => String(incident.id ?? '')).filter(Boolean),
    ownerResolution: 'ABSORB_IN_EXISTING_OWNER',
  }];
}

function predictiveCandidates(health: Awaited<ReturnType<typeof getPredictiveEngineHealth>>): EvolutionCandidate[] {
  const result: EvolutionCandidate[] = [];
  const drift = health.calibration.filter((item) => item.status === 'DRIFT_WARNING');
  if (drift.length) {
    result.push({
      kind: 'PREDICTIVE_CALIBRATION',
      target: 'predictive-engine',
      title: `Recalibrar ${drift.length} modelos predictivos con drift observado`,
      objective: 'Reconciliar outcomes verificables y revisar features/modelo antes de usar proyecciones con deriva como base de una decisión.',
      priority: 0.88,
      reasons: drift.map((item) => `${item.scope}:${item.modelKey}:v${item.version}:drift`).sort(),
      evidenceRefs: [],
      ownerResolution: 'REPAIR_EXISTING_OWNER',
    });
  }
  if (health.dueRuns > 0) {
    result.push({
      kind: 'PREDICTIVE_RETURN_RECONCILIATION',
      target: 'predictive-return',
      title: `Cerrar RETURN de ${health.dueRuns} predicciones vencidas`,
      objective: 'Buscar outcomes verificables de predicciones cuyo período de retorno ya venció antes de producir nuevas conclusiones o aprendizaje.',
      priority: 0.84,
      reasons: [`due_runs:${health.dueRuns}`, `verified_outcomes:${health.verifiedOutcomes}`, `learning_events:${health.appliedLearningEvents}`],
      evidenceRefs: [],
      ownerResolution: 'ABSORB_IN_EXISTING_OWNER',
    });
  }
  return result;
}

function worldContext(world: Awaited<ReturnType<typeof buildWorldVectorOperationalState>>) {
  return {
    observedAt: world.today.observation.observed_at,
    status: world.today.observation.status,
    dominantSignal: world.today.observation.dominant_signal,
    interpretation: world.today.observation.interpretation,
    confidence: world.today.observation.confidence,
    sourceSnapshotId: world.today.observation.source_snapshot_id,
    warnings: world.agent_audit.warnings,
    blocked: world.agent_audit.blocked,
  };
}

async function persistCandidates(candidates: EvolutionCandidate[], context: Record<string, unknown>) {
  const current = await queryEvolutionProposals(150);
  const open = existingEvolutionProposals(current.data as unknown[]);
  const openByFingerprint = new Map(open.map((item) => [item.fingerprint, item]));
  const ordered = [...candidates].sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title));
  const results: Array<{ proposalId: string; fingerprint: string; created: boolean; kind: EvolutionKind; target: string }> = [];
  let newCount = 0;

  for (const candidate of ordered) {
    const fingerprint = proposalFingerprint(candidate);
    const candidateFingerprints = [fingerprint, ...legacyProposalFingerprints(candidate)];
    const existing = candidateFingerprints.map((item) => openByFingerprint.get(item)).find(Boolean);
    if (existing) {
      results.push({ proposalId: existing.id, fingerprint: existing.fingerprint, created: false, kind: candidate.kind, target: candidate.target });
      continue;
    }
    if (newCount >= MAX_NEW_PROPOSALS_PER_CYCLE) continue;

    const inserted = await createActionProposal({
      proposalType: SFI_INSTITUTIONAL_MUTATION_PROPOSAL_TYPE,
      actorId: SYSTEM_ACTOR,
      title: candidate.title,
      objective: candidate.objective,
      status: 'proposed',
      seed: fingerprint,
      payload: {
        contract: SFI_INSTITUTIONAL_EVOLUTION_CONTRACT,
        fingerprint,
        candidateFingerprintContract: CANDIDATE_FINGERPRINT_CONTRACT,
        kind: candidate.kind,
        target: candidate.target,
        priority: candidate.priority,
        reasons: candidate.reasons,
        evidenceRefs: candidate.evidenceRefs,
        ownerResolution: candidate.ownerResolution,
        moduleCandidateAllowed: candidate.ownerResolution === 'NO_EXISTING_OWNER',
        executionAuthorized: false,
        canonicalPromotionAllowed: false,
        externalEffectAllowed: false,
        founderInterruption: 'ONLY_IF_SOVEREIGN_BOUNDARY',
        evolutionRule: 'ABSORB_OR_REPAIR_EXISTING_OWNER_FIRST',
        context,
      },
    });
    if (!inserted.ok) continue;
    const proposalId = stringValue(recordValue(inserted.data).id);
    if (!proposalId) continue;
    newCount += 1;
    results.push({ proposalId, fingerprint, created: true, kind: candidate.kind, target: candidate.target });
  }

  return { results, lookupError: current.error, newCount };
}

export async function runInstitutionalEvolutionObservation(input: {
  attractorRefresh: AttractorRefresh;
  observedAt?: string;
  declaredTarget?: unknown;
}) {
  const observedAt = input.observedAt ?? new Date().toISOString();
  const [runtime, continuity, predictive, world] = await Promise.all([
    readObservedSfiCognitiveRuntime(),
    readContinuityDashboard(),
    getPredictiveEngineHealth(),
    buildWorldVectorOperationalState(),
  ]);

  const candidates = [
    ...runtimeCandidates(runtime),
    ...attractorCandidates(input.attractorRefresh),
    ...continuityCandidates(continuity),
    ...predictiveCandidates(predictive),
  ];

  const context = {
    observedAt,
    world: worldContext(world),
    attractor: {
      key: input.attractorRefresh.attractorKey,
      declaredTarget: input.declaredTarget ?? null,
      evidenceCoverage: input.attractorRefresh.evidenceCoverage,
      supportedDimensions: input.attractorRefresh.supportedDimensions,
      contradictedDimensions: input.attractorRefresh.contradictedDimensions,
      missingDimensions: input.attractorRefresh.missingDimensions,
      targetRule: 'Declared convergence target is strategic context, not evidence of attainment. Evidence coverage remains distinct from geographic or institutional readiness.',
    },
    runtime: {
      status: runtime.status,
      summary: runtime.summary,
      operational: runtime.agents.filter((agent) => agent.status === 'operational').length,
      gated: runtime.agents.filter((agent) => agent.status === 'gated').length,
      degraded: runtime.agents.filter((agent) => agent.status === 'degraded').length,
      missing: runtime.agents.filter((agent) => agent.status === 'missing').length,
    },
    continuity: {
      openIncidents: continuity.incidents.length,
      pendingFounderDecisions: continuity.decisions.length,
      errors: continuity.errors,
    },
    predictive: {
      ok: predictive.ok,
      openRuns: predictive.openRuns,
      dueRuns: predictive.dueRuns,
      verifiedOutcomes: predictive.verifiedOutcomes,
      appliedLearningEvents: predictive.appliedLearningEvents,
      driftModels: predictive.calibration.filter((item) => item.status === 'DRIFT_WARNING').map((item) => `${item.scope}:${item.modelKey}:v${item.version}`),
    },
  };

  const persistence = await persistCandidates(candidates, context);
  const proposalRefs = persistence.results.map((item) => item.proposalId);
  const founderRequiredOnly = rows(continuity.decisions).length;

  return {
    ok: runtime.eventGraph.warnings.length === 0 && continuity.errors.length === 0 && predictive.ok,
    contract: SFI_INSTITUTIONAL_EVOLUTION_CONTRACT,
    observedAt,
    candidates,
    proposals: persistence.results,
    proposalRefs,
    createdCount: persistence.newCount,
    reusedCount: persistence.results.filter((item) => !item.created).length,
    context,
    founderDependency: {
      pendingSovereignDecisions: founderRequiredOnly,
      routineWorkRequiresFounder: false,
      rule: 'Routine observation, evidence acquisition, calibration, owner reconciliation and proposal formation continue autonomously. Founder interruption is reserved for explicit sovereign boundaries.',
    },
    warnings: unique([
      ...runtime.eventGraph.warnings,
      ...continuity.errors,
      ...predictive.warnings,
      ...world.agent_audit.warnings,
      persistence.lookupError,
    ]),
    boundary: 'Evolution proposals are DERIVED work objects. Eligible non-frozen proposals may re-enter the next cycle as bounded execution requests for owner reconciliation; they do not execute themselves, change canon, publish, spend, grant access or create external effects.',
  };
}

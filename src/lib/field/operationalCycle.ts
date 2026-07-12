import 'server-only';

import { createHash } from 'node:crypto';
import { linkCaseEvidence, registerReferenceCase } from '@/lib/amv/referenceBank';
import { runMophAgent } from '@/lib/agents/sfiAgents';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export type FieldVerificationWindow = '72h' | '7d' | '30d';

export type CreateFieldCycleInput = {
  title: string;
  domain: string;
  stuckSystem: string;
  objective: string;
  attempts: string;
  evidence: string;
  consequence: string;
  declaredAttractor: string;
  evidenceSource: string;
  evidenceUri?: string | null;
  reliability: number;
  verificationWindow: FieldVerificationWindow;
  consent: boolean;
};

export type ReturnFieldCycleInput = {
  evidenceNote: string;
  evidenceSource: string;
  evidenceUri?: string | null;
  reliability: number;
  actualOutcome: number;
  interventionFidelity: number;
  observedAt?: string | null;
};

type Row = Record<string, unknown>;

type WorldContext = {
  worldspect: Row | null;
  worldVector: Row | null;
  observedAt: string | null;
  confidence: number | null;
  warnings: string[];
};

type FieldCaseWithRelations = Row & {
  status: string;
  hypothesis: Row | null;
  intervention: Row | null;
  return: Row | null;
  outcome: Row | null;
  latestMihm: Row | null;
  evidence: Row[];
};

const FORMULA_VERSION = 'FIELD_MIHM_EVIDENCE_PROXY_V1';
const OPEN_RETURN_STATUS = 'WAITING_RETURN';

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : [];
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function clamp01(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0;
}

function nullableNumber(value: unknown) {
  if (value === null || typeof value === 'undefined' || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function iso(value?: string | null) {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
}

function windowHours(window: FieldVerificationWindow) {
  return window === '72h' ? 72 : window === '7d' ? 168 : 720;
}

function windowLabel(window: FieldVerificationWindow) {
  return window === '72h' ? '72 horas' : window === '7d' ? '7 días' : '30 días';
}

function dueAt(window: FieldVerificationWindow) {
  return new Date(Date.now() + windowHours(window) * 60 * 60 * 1000).toISOString();
}

function tokens(value: string) {
  return new Set(
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/[^a-z0-9]+/)
      .filter((item) => item.length >= 4)
      .slice(0, 240),
  );
}

function overlap(left: string, right: string) {
  const a = tokens(left);
  const b = tokens(right);
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const item of a) if (b.has(item)) shared += 1;
  return shared / Math.max(a.size, b.size);
}

function specificity(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(0, Math.min(1, words / 45));
}

function metric(input: {
  key: string;
  label: string;
  value: number | null;
  source: string;
  confidence: number | null;
  explanation: string;
}) {
  return {
    key: input.key,
    label: input.label,
    value: input.value,
    status: input.value === null ? 'MISSING' : 'DERIVED_PROXY',
    source: input.source,
    confidence: input.confidence,
    explanation: input.explanation,
    formulaVersion: FORMULA_VERSION,
    canonicalCalibration: false,
  };
}

function baselineMihm(input: CreateFieldCycleInput, world: WorldContext) {
  const required = [input.stuckSystem, input.objective, input.attempts, input.evidence, input.consequence];
  const coverage = required.filter((item) => item.trim().length >= 8).length / required.length;
  const traceability = clamp01(
    (input.evidence.trim().length >= 24 ? 0.45 : 0.1)
      + (input.evidenceSource.trim() ? 0.25 : 0)
      + (input.evidenceUri ? 0.2 : 0)
      + clamp01(input.reliability) * 0.1,
  );
  const coherence = clamp01(
    overlap(input.objective, `${input.stuckSystem} ${input.evidence}`) * 0.45
      + specificity(input.objective) * 0.25
      + coverage * 0.15
      + traceability * 0.15,
  );
  const phi = clamp01(coherence * 0.55 + coverage * 0.25 + traceability * 0.2);

  return {
    status: 'PARTIAL',
    formulaVersion: FORMULA_VERSION,
    canonicalCalibration: false,
    coverage,
    traceability,
    metrics: [
      metric({ key: 'C_s', label: 'Structural coherence proxy', value: coherence, source: 'declared objective + baseline evidence', confidence: 0.45, explanation: 'Lexical alignment, specificity, coverage and traceability. This is an auditable FIELD proxy, not historically calibrated MIHM.' }),
      metric({ key: 'D_i', label: 'Internal dispersion', value: null, source: 'return evidence required', confidence: null, explanation: 'Cannot be estimated before a comparable return observation exists.' }),
      metric({ key: 'E_r', label: 'Residual energy', value: null, source: 'return evidence required', confidence: null, explanation: 'Requires an observed outcome after the intervention window.' }),
      metric({ key: 'G_f', label: 'Field gradient proxy', value: world.confidence, source: 'latest WorldSpect / World Vector context', confidence: world.confidence, explanation: 'Uses only persisted world-context confidence; it is not a domain-specific causal estimate.' }),
      metric({ key: 'D_cog', label: 'Cognitive discontinuity', value: null, source: 'not inferred', confidence: null, explanation: 'FIELD does not infer undisclosed psychological state from participant text.' }),
      metric({ key: 'Phi', label: 'Evidence coherence flow proxy', value: phi, source: 'baseline evidence contract', confidence: 0.42, explanation: 'Combines structural coherence, required-field coverage and traceability.' }),
      metric({ key: 'F_s', label: 'Structural friction', value: null, source: 'insufficient multimodal evidence', confidence: null, explanation: 'No canonical multimodal measurement is available at intake.' }),
      metric({ key: 'V_i', label: 'Intervention variability', value: null, source: 'intervention not executed', confidence: null, explanation: 'Requires return evidence and intervention fidelity.' }),
      metric({ key: 'I_mc', label: 'Micro-coherence index', value: null, source: 'insufficient repeated observations', confidence: null, explanation: 'Requires multiple comparable observations.' }),
    ],
    tensions: [
      coverage < 1 ? 'BASELINE_FIELDS_INCOMPLETE' : null,
      traceability < 0.55 ? 'EVIDENCE_TRACEABILITY_THIN' : null,
      world.warnings.length ? 'WORLD_CONTEXT_DEGRADED' : null,
    ].filter((item): item is string => Boolean(item)),
  };
}

function returnMihm(input: ReturnFieldCycleInput, expectedValue: number, baseline: Row, world: WorldContext) {
  const actual = clamp01(input.actualOutcome);
  const fidelity = clamp01(input.interventionFidelity);
  const reliability = clamp01(input.reliability);
  const residual = expectedValue - actual;
  const dispersion = Math.abs(residual);
  const remaining = 1 - actual;
  const baselineMetrics = rows(baseline.metrics);
  const baselineCoherence = clamp01(baselineMetrics.find((item) => item.key === 'C_s')?.value);
  const coherence = clamp01(baselineCoherence * 0.35 + reliability * 0.25 + fidelity * 0.25 + (1 - dispersion) * 0.15);
  const phi = clamp01(coherence * 0.5 + (1 - dispersion) * 0.3 + reliability * 0.2);

  return {
    status: 'PARTIAL_RETURN',
    formulaVersion: FORMULA_VERSION,
    canonicalCalibration: false,
    expectedValue,
    actualValue: actual,
    residual,
    absoluteError: dispersion,
    metrics: [
      metric({ key: 'C_s', label: 'Structural coherence proxy', value: coherence, source: 'baseline + return evidence', confidence: 0.55, explanation: 'Combines baseline coherence, source reliability, intervention fidelity and prediction alignment.' }),
      metric({ key: 'D_i', label: 'Outcome dispersion proxy', value: dispersion, source: 'expected versus observed outcome', confidence: 0.58, explanation: 'Absolute difference between the sealed provisional expectation and the observed return value.' }),
      metric({ key: 'E_r', label: 'Residual unresolved friction proxy', value: remaining, source: 'observed outcome', confidence: reliability * 0.7, explanation: 'Normalized unresolved portion after the return window; not a physical energy measurement.' }),
      metric({ key: 'G_f', label: 'Field gradient proxy', value: world.confidence, source: 'return-time WorldSpect / World Vector context', confidence: world.confidence, explanation: 'Context confidence at return time; no causal attribution is made.' }),
      metric({ key: 'D_cog', label: 'Cognitive discontinuity', value: null, source: 'not inferred', confidence: null, explanation: 'FIELD does not infer a private psychological state.' }),
      metric({ key: 'Phi', label: 'Evidence coherence flow proxy', value: phi, source: 'return evidence contract', confidence: 0.52, explanation: 'Combines coherence, prediction alignment and source reliability.' }),
      metric({ key: 'F_s', label: 'Structural friction proxy', value: dispersion, source: 'prediction error proxy', confidence: 0.48, explanation: 'Provisional observed-deviation proxy; not a calibrated cross-domain MIHM value.' }),
      metric({ key: 'V_i', label: 'Intervention variability proxy', value: 1 - fidelity, source: 'operator-declared intervention fidelity', confidence: reliability * 0.65, explanation: 'Higher value indicates lower fidelity to the sealed intervention.' }),
      metric({ key: 'I_mc', label: 'Micro-coherence index', value: null, source: 'repeated returns required', confidence: null, explanation: 'One return does not establish repeated micro-coherence.' }),
    ],
    tensions: [
      reliability < 0.55 ? 'RETURN_SOURCE_RELIABILITY_LOW' : null,
      fidelity < 0.6 ? 'INTERVENTION_FIDELITY_LOW' : null,
      dispersion > 0.35 ? 'PREDICTION_DEVIATION_HIGH' : null,
      world.warnings.length ? 'WORLD_CONTEXT_DEGRADED' : null,
    ].filter((item): item is string => Boolean(item)),
  };
}

function deriveWorldspectRegime(wsi: number | null, nti: number | null) {
  if (wsi === null && nti === null) return 'MISSING';
  if ((nti ?? 0) >= 0.7) return 'HIGH_TENSION';
  if ((wsi ?? 0) >= 0.65 && (nti ?? 0) >= 0.4) return 'PERSISTENT_TENSION';
  if ((wsi ?? 0) >= 0.65) return 'PERSISTENT';
  if ((nti ?? 0) >= 0.4) return 'ELEVATED_TENSION';
  return 'LOW_SIGNAL';
}

async function readWorldContext(): Promise<WorldContext> {
  const service = createServiceSupabaseClient();
  const [worldspect, vector] = await Promise.all([
    service
      .from('worldspect_snapshots')
      .select('id,observed_at,source_state,confidence,wsi,nti,sources,raw_payload,source_health,degraded_sources,ingest_mode')
      .order('observed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    service
      .from('world_vector_observations')
      .select('id,observed_at,status,confidence,sector,dominant_signal,domain_values,warnings,interpretation,source_snapshot_id')
      .order('observed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const warnings = [
    worldspect.error ? `WORLDSPECT:${worldspect.error.message}` : null,
    vector.error ? `WORLD_VECTOR:${vector.error.message}` : null,
  ].filter((item): item is string => Boolean(item));

  const rawWs = worldspect.data ? record(worldspect.data) : null;
  const wsi = nullableNumber(rawWs?.wsi);
  const nti = nullableNumber(rawWs?.nti);
  const ws: Row | null = rawWs ? {
    ...rawWs,
    regime: deriveWorldspectRegime(wsi, nti),
    wsi,
    nti,
    sourceCoverage: rows(rawWs.sources).length,
    degradedSources: stringArray(rawWs.degraded_sources),
  } : null;
  const wv = vector.data ? record(vector.data) : null;
  const confidenceValues = [nullableNumber(ws?.confidence), nullableNumber(wv?.confidence)]
    .filter((item): item is number => item !== null);

  return {
    worldspect: ws,
    worldVector: wv,
    observedAt: text(wv?.observed_at) || text(ws?.observed_at) || null,
    confidence: confidenceValues.length ? confidenceValues.reduce((sum, item) => sum + item, 0) / confidenceValues.length : null,
    warnings,
  };
}

function objectClass(domain: string) {
  const normalized = domain.toLowerCase();
  if (normalized.includes('organiz')) return 'organization';
  if (normalized.includes('instit')) return 'institution';
  if (normalized.includes('company') || normalized.includes('empresa')) return 'company';
  if (normalized.includes('cultural')) return 'cultural_signal';
  return 'other';
}

function returnHash(payload: Row) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function interventionForWindow(base: string, window: FieldVerificationWindow) {
  const label = windowLabel(window);
  const normalized = base
    .replace(/72\s*horas/gi, label)
    .replace(/72-hour/gi, label)
    .trim();
  return `${normalized || 'Ejecuta una sola acción reversible.'} Mantén una sola variable primaria durante ${label} y registra evidencia antes y después.`;
}

async function audit(actorId: string, action: string, targetId: string, afterState: Row) {
  const service = createServiceSupabaseClient();
  const result = await service.from('sfi_audit_events').insert({
    actor_id: actorId,
    action,
    target_type: 'field_case',
    target_id: targetId,
    after_state: afterState,
    context: { surface: 'field', version: 'FIELD_OPERATIONAL_CYCLE_V1' },
  });
  if (result.error) throw new Error(`FIELD_AUDIT_FAILED:${result.error.message}`);
}

export async function createFieldCycle(ownerId: string, input: CreateFieldCycleInput) {
  if (!input.consent) throw new Error('FIELD_CONSENT_REQUIRED');
  if (input.title.trim().length < 3) throw new Error('FIELD_TITLE_REQUIRED');
  if (input.stuckSystem.trim().length < 12) throw new Error('FIELD_SYSTEM_REQUIRED');
  if (input.objective.trim().length < 8) throw new Error('FIELD_OBJECTIVE_REQUIRED');
  if (input.evidence.trim().length < 8) throw new Error('FIELD_BASELINE_EVIDENCE_REQUIRED');

  const service = createServiceSupabaseClient();
  const world = await readWorldContext();
  const moph = await runMophAgent({
    stuckSystem: input.stuckSystem,
    objective: input.objective,
    attempts: input.attempts,
    evidence: input.evidence,
    consequence: input.consequence,
    accountId: ownerId,
  });
  const baseline = baselineMihm(input, world);
  const openedAt = new Date().toISOString();
  const expectedAt = dueAt(input.verificationWindow);
  const minimumChange = interventionForWindow(moph.minimal_perturbation, input.verificationWindow);

  const caseInsert = await service.from('field_cases').insert({
    owner_id: ownerId,
    title: input.title.trim(),
    domain: input.domain.trim() || 'other',
    declared_attractor: input.declaredAttractor.trim() || input.objective.trim(),
    baseline: input.stuckSystem.trim(),
    consent: true,
    visibility: 'private',
    verification_window: input.verificationWindow,
    status: 'BUILDING',
    metadata: {
      objective: input.objective.trim(),
      attempts: input.attempts.trim(),
      consequence: input.consequence.trim(),
      workflowVersion: 'FIELD_OPERATIONAL_CYCLE_V1',
      worldAtT0: world,
    },
  }).select('*').single();
  if (caseInsert.error || !caseInsert.data) throw new Error(`FIELD_CASE_CREATE_FAILED:${caseInsert.error?.message ?? 'unknown'}`);
  const fieldCase = record(caseInsert.data);
  const caseId = String(fieldCase.id);

  const evidenceInsert = await service.from('field_case_evidence').insert({
    case_id: caseId,
    owner_id: ownerId,
    evidence_type: 'declared_baseline',
    label: 'T0 baseline evidence',
    source: input.evidenceSource.trim() || 'participant_declared',
    reliability: clamp01(input.reliability),
    uri: input.evidenceUri?.trim() || null,
    visibility: 'private',
    payload: {
      note: input.evidence.trim(),
      epistemicClass: input.evidenceUri ? 'observed' : 'declared',
      objective: input.objective.trim(),
      observedBeforeIntervention: true,
    },
    observed_at: openedAt,
  }).select('*').single();
  if (evidenceInsert.error || !evidenceInsert.data) throw new Error(`FIELD_EVIDENCE_CREATE_FAILED:${evidenceInsert.error?.message ?? 'unknown'}`);
  const evidenceRow = record(evidenceInsert.data);
  const evidenceId = String(evidenceRow.id);

  const mophInsert = await service.from('field_moph_runs').insert({
    case_id: caseId,
    owner_id: ownerId,
    status: 'COMPLETED_PROVISIONAL',
    input: {
      stuckSystem: input.stuckSystem,
      objective: input.objective,
      attempts: input.attempts,
      consequence: input.consequence,
      verificationWindow: input.verificationWindow,
    },
    output: { ...moph, minimal_perturbation: minimumChange },
    evidence_ids: [evidenceId],
    started_at: openedAt,
    completed_at: new Date().toISOString(),
  }).select('*').single();
  if (mophInsert.error || !mophInsert.data) throw new Error(`FIELD_MOPH_CREATE_FAILED:${mophInsert.error?.message ?? 'unknown'}`);

  const mihmInsert = await service.from('field_mihm_readings').insert({
    case_id: caseId,
    owner_id: ownerId,
    status: baseline.status,
    metrics: baseline.metrics,
    tensions: baseline.tensions,
    formula_version: FORMULA_VERSION,
    evidence_ids: [evidenceId],
  }).select('*').single();
  if (mihmInsert.error || !mihmInsert.data) throw new Error(`FIELD_MIHM_CREATE_FAILED:${mihmInsert.error?.message ?? 'unknown'}`);

  const expectedValue = clamp01(
    moph.confidence * 0.55
      + clamp01(baseline.coverage) * 0.25
      + clamp01(input.reliability) * 0.2,
  );
  const hypothesisInsert = await service.from('field_hypotheses').insert({
    case_id: caseId,
    owner_id: ownerId,
    statement: moph.friction_reading,
    target: input.objective.trim(),
    expected_signal: `Observable normalized movement near ${expectedValue.toFixed(3)} after the sealed minimal intervention.`,
    verification_window: input.verificationWindow,
    confidence: moph.confidence,
    status: 'SEALED_PROVISIONAL',
    evidence_ids: [evidenceId],
  }).select('*').single();
  if (hypothesisInsert.error || !hypothesisInsert.data) throw new Error(`FIELD_HYPOTHESIS_CREATE_FAILED:${hypothesisInsert.error?.message ?? 'unknown'}`);
  const hypothesis = record(hypothesisInsert.data);

  const interventionInsert = await service.from('field_interventions').insert({
    case_id: caseId,
    owner_id: ownerId,
    hypothesis_id: String(hypothesis.id),
    minimum_change: minimumChange,
    prohibited_effects: [
      'Do not change more than one primary variable.',
      'Do not expose private evidence.',
      'Do not continue if legal, medical, safety or irreversible risk appears.',
    ],
    status: 'READY_FOR_EXECUTION',
    started_at: openedAt,
    evidence_ids: [evidenceId],
  }).select('*').single();
  if (interventionInsert.error || !interventionInsert.data) throw new Error(`FIELD_INTERVENTION_CREATE_FAILED:${interventionInsert.error?.message ?? 'unknown'}`);
  const intervention = record(interventionInsert.data);

  const sealPayload = {
    caseId,
    ownerId,
    openedAt,
    expectedAt,
    verificationWindow: input.verificationWindow,
    hypothesisId: hypothesis.id,
    interventionId: intervention.id,
    expectedValue,
    evidenceId,
    worldObservedAt: world.observedAt,
  };
  const seal = returnHash(sealPayload);

  const returnInsert = await service.from('field_returns').insert({
    case_id: caseId,
    owner_id: ownerId,
    intervention_id: String(intervention.id),
    verification_window: input.verificationWindow,
    expected_at: expectedAt,
    status: OPEN_RETURN_STATUS,
    evidence_ids: [evidenceId],
    payload: { seal, sealPayload },
  }).select('*').single();
  if (returnInsert.error || !returnInsert.data) throw new Error(`FIELD_RETURN_CREATE_FAILED:${returnInsert.error?.message ?? 'unknown'}`);
  const returnRow = record(returnInsert.data);

  const caseUpdate = await service.from('field_cases').update({
    status: OPEN_RETURN_STATUS,
    metadata: {
      ...record(fieldCase.metadata),
      objective: input.objective.trim(),
      attempts: input.attempts.trim(),
      consequence: input.consequence.trim(),
      workflowVersion: 'FIELD_OPERATIONAL_CYCLE_V1',
      returnHash: seal,
      expectedValue,
      expectedAt,
      worldAtT0: world,
      mophRunId: mophInsert.data.id,
      mihmReadingId: mihmInsert.data.id,
      hypothesisId: hypothesis.id,
      interventionId: intervention.id,
      returnId: returnRow.id,
    },
  }).eq('id', caseId).eq('owner_id', ownerId).eq('status', 'BUILDING').select('*').single();
  if (caseUpdate.error || !caseUpdate.data) throw new Error(`FIELD_CASE_SEAL_FAILED:${caseUpdate.error?.message ?? 'unknown'}`);

  const warnings = [...world.warnings, ...moph.warnings];
  try {
    const reference = await registerReferenceCase({
      caseCode: `FIELD-${caseId.slice(0, 8)}`,
      objectId: caseId,
      objectClass: objectClass(input.domain),
      title: input.title,
      manifestation: 'moph_operational_cycle',
      cohort: input.domain || 'field',
      prospective: true,
      status: 'WAITING_OUTCOME',
      openedAt,
      t0Cutoff: openedAt,
      phaseStatus: {
        phase0: 'READY',
        phase1: 'PARTIAL_FIELD_PROXY',
        phase2: 'DECLARED_BASELINE',
        phase3: 'PROVISIONAL_NO_HISTORICAL_CALIBRATION',
        phase4: 'SEALED_READY',
        phase5: 'WAITING_RETURN',
        phase6: 'NOT_CALIBRATED',
      },
      fieldsDocumented: ['field.baseline', 'field.objective', 'field.moph', 'field.hypothesis', 'field.intervention'],
      missingFields: ['field.return_evidence', 'field.outcome'],
      operatorId: ownerId,
      consentRequired: objectClass(input.domain) === 'organization',
      consentEvidenceId: objectClass(input.domain) === 'organization' ? evidenceId : null,
      metadata: { fieldCaseId: caseId, returnHash: seal, expectedAt, expectedValue, verificationWindow: input.verificationWindow },
    });
    await Promise.all([
      linkCaseEvidence({ caseId: String(reference.id), evidenceSource: 'field_case_evidence', evidenceId, relationType: 'SUPPORTS', createdBy: ownerId }),
      linkCaseEvidence({ caseId: String(reference.id), evidenceSource: 'field_hypotheses', evidenceId: String(hypothesis.id), relationType: 'CONTEXTUALIZES', createdBy: ownerId }),
      linkCaseEvidence({ caseId: String(reference.id), evidenceSource: 'field_interventions', evidenceId: String(intervention.id), relationType: 'DOCUMENTS_INTERVENTION', createdBy: ownerId }),
    ]);
  } catch (error) {
    warnings.push(`REFERENCE_BANK_DEGRADED:${error instanceof Error ? error.message : String(error)}`);
  }

  await audit(ownerId, 'field.cycle.sealed', caseId, { returnHash: seal, expectedAt, expectedValue, hypothesisId: hypothesis.id, interventionId: intervention.id });

  return {
    case: caseUpdate.data,
    baselineEvidence: evidenceRow,
    moph: { ...moph, minimal_perturbation: minimumChange },
    mihm: baseline,
    hypothesis,
    intervention,
    return: returnRow,
    seal,
    expectedAt,
    expectedValue,
    world,
    warnings,
  };
}

export async function submitFieldReturn(ownerId: string, caseId: string, input: ReturnFieldCycleInput) {
  if (input.evidenceNote.trim().length < 12) throw new Error('FIELD_RETURN_EVIDENCE_REQUIRED');
  const service = createServiceSupabaseClient();

  const caseResult = await service.from('field_cases').select('*').eq('id', caseId).eq('owner_id', ownerId).maybeSingle();
  if (caseResult.error || !caseResult.data) throw new Error('FIELD_CASE_NOT_FOUND');
  const fieldCase = record(caseResult.data);
  if (text(fieldCase.status) !== OPEN_RETURN_STATUS) throw new Error('FIELD_RETURN_ALREADY_CLOSED_OR_NOT_READY');

  const metadata = record(fieldCase.metadata);
  const expectedValue = clamp01(metadata.expectedValue);
  const world = await readWorldContext();

  const [hypothesisResult, interventionResult, returnResult, baselineResult, existingOutcome] = await Promise.all([
    service.from('field_hypotheses').select('*').eq('case_id', caseId).eq('owner_id', ownerId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    service.from('field_interventions').select('*').eq('case_id', caseId).eq('owner_id', ownerId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    service.from('field_returns').select('*').eq('case_id', caseId).eq('owner_id', ownerId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    service.from('field_mihm_readings').select('*').eq('case_id', caseId).eq('owner_id', ownerId).order('created_at', { ascending: true }).limit(1).maybeSingle(),
    service.from('field_outcomes').select('id').eq('case_id', caseId).eq('owner_id', ownerId).limit(1).maybeSingle(),
  ]);
  if (!hypothesisResult.data || !interventionResult.data || !returnResult.data) throw new Error('FIELD_CYCLE_INCOMPLETE');
  if (text(returnResult.data.status) !== OPEN_RETURN_STATUS || existingOutcome.data) throw new Error('FIELD_RETURN_ALREADY_CLOSED_OR_NOT_READY');

  const observedAt = iso(input.observedAt);
  const evidenceInsert = await service.from('field_case_evidence').insert({
    case_id: caseId,
    owner_id: ownerId,
    evidence_type: 'return_observation',
    label: 'Return-window evidence',
    source: input.evidenceSource.trim() || 'participant_return',
    reliability: clamp01(input.reliability),
    uri: input.evidenceUri?.trim() || null,
    visibility: 'private',
    payload: {
      note: input.evidenceNote.trim(),
      epistemicClass: input.evidenceUri ? 'observed' : 'declared',
      actualOutcome: clamp01(input.actualOutcome),
      interventionFidelity: clamp01(input.interventionFidelity),
      sealedHash: metadata.returnHash ?? null,
    },
    observed_at: observedAt,
  }).select('*').single();
  if (evidenceInsert.error || !evidenceInsert.data) throw new Error(`FIELD_RETURN_EVIDENCE_CREATE_FAILED:${evidenceInsert.error?.message ?? 'unknown'}`);
  const evidence = record(evidenceInsert.data);
  const evidenceId = String(evidence.id);

  const returnReading = returnMihm(input, expectedValue, record(baselineResult.data), world);
  const readingInsert = await service.from('field_mihm_readings').insert({
    case_id: caseId,
    owner_id: ownerId,
    status: returnReading.status,
    metrics: returnReading.metrics,
    tensions: returnReading.tensions,
    formula_version: FORMULA_VERSION,
    evidence_ids: [evidenceId],
  }).select('*').single();
  if (readingInsert.error || !readingInsert.data) throw new Error(`FIELD_RETURN_MIHM_FAILED:${readingInsert.error?.message ?? 'unknown'}`);

  const actualValue = clamp01(input.actualOutcome);
  const delta = actualValue - expectedValue;
  const accepted = clamp01(input.reliability) >= 0.55 && input.evidenceNote.trim().length >= 12;
  const verified = Boolean(input.evidenceUri) && clamp01(input.reliability) >= 0.75 && clamp01(input.interventionFidelity) >= 0.6;
  const learned = !accepted
    ? 'La evidencia se conserva como declarada, pero no alcanza el umbral operativo de aceptación.'
    : Math.abs(delta) <= 0.15
      ? 'El resultado observado quedó dentro del rango operativo esperado; requiere más casos antes de calibrar.'
      : delta > 0
        ? 'El resultado superó la expectativa provisional. Revisar qué parte de la intervención y del campo explica la diferencia.'
        : 'El resultado quedó por debajo de la expectativa provisional. Revisar fidelidad, evidencia faltante y cambio de campo.';

  const outcomeInsert = await service.from('field_outcomes').insert({
    case_id: caseId,
    owner_id: ownerId,
    intervention_id: interventionResult.data.id,
    expected: `normalized movement ${expectedValue.toFixed(3)}`,
    actual: `normalized movement ${actualValue.toFixed(3)}`,
    delta,
    verified,
    learned,
    evidence_ids: [evidenceId],
  }).select('*').single();
  if (outcomeInsert.error || !outcomeInsert.data) throw new Error(`FIELD_OUTCOME_CREATE_FAILED:${outcomeInsert.error?.message ?? 'unknown'}`);
  const outcome = record(outcomeInsert.data);

  const returnUpdate = await service.from('field_returns').update({
    returned_at: observedAt,
    status: accepted ? 'RETURN_ACCEPTED' : 'RETURN_RECORDED_UNVERIFIED',
    evidence_ids: [evidenceId],
    payload: {
      ...record(returnResult.data.payload),
      actualValue,
      expectedValue,
      delta,
      accepted,
      verified,
      reliability: clamp01(input.reliability),
      interventionFidelity: clamp01(input.interventionFidelity),
      worldAtReturn: world,
    },
  }).eq('id', returnResult.data.id).eq('owner_id', ownerId).eq('status', OPEN_RETURN_STATUS);
  if (returnUpdate.error) throw new Error(`FIELD_RETURN_CLOSE_FAILED:${returnUpdate.error.message}`);

  const caseClose = await service.from('field_cases').update({
    status: verified ? 'CLOSED_VERIFIED' : accepted ? 'CLOSED_OBSERVED' : 'CLOSED_UNVERIFIED',
    metadata: {
      ...metadata,
      returnedAt: observedAt,
      returnEvidenceId: evidenceId,
      fieldOutcomeId: outcome.id,
      actualValue,
      delta,
      accepted,
      verified,
      worldAtReturn: world,
    },
  }).eq('id', caseId).eq('owner_id', ownerId).eq('status', OPEN_RETURN_STATUS);
  if (caseClose.error) throw new Error(`FIELD_CASE_CLOSE_FAILED:${caseClose.error.message}`);

  await Promise.all([
    service.from('field_interventions').update({
      status: 'COMPLETED',
      completed_at: observedAt,
      evidence_ids: [evidenceId],
    }).eq('id', interventionResult.data.id).eq('owner_id', ownerId),
    service.from('field_hypotheses').update({
      status: verified ? 'VERIFIED_RETURN' : accepted ? 'OBSERVED_RETURN' : 'UNVERIFIED_RETURN',
      evidence_ids: [evidenceId],
    }).eq('id', hypothesisResult.data.id).eq('owner_id', ownerId),
    service.from('field_lessons').insert({
      case_id: caseId,
      owner_id: ownerId,
      outcome_id: outcome.id,
      statement: learned,
      evidence_ids: [evidenceId],
    }),
  ]);

  try {
    const referenceResult = await service.from('sfi_reference_cases').select('id,metadata').eq('object_id', caseId).maybeSingle();
    if (referenceResult.data?.id) {
      const referenceUpdate = await service.from('sfi_reference_cases').update({
        status: verified || accepted ? 'CLOSED' : 'UNVERIFIABLE',
        closed_at: observedAt,
        phase_status: {
          phase0: 'READY',
          phase1: 'PARTIAL_FIELD_PROXY',
          phase2: accepted ? 'RETURN_EVIDENCE_ACCEPTED' : 'RETURN_EVIDENCE_THIN',
          phase3: 'PROVISIONAL_NO_HISTORICAL_CALIBRATION',
          phase4: 'EXECUTED',
          phase5: verified ? 'VERIFIED' : accepted ? 'OBSERVED' : 'UNVERIFIABLE',
          phase6: 'ACCUMULATING_CALIBRATION_CORPUS',
        },
        missing_fields: accepted ? [] : ['field.verified_return_source'],
        metadata: {
          ...record(referenceResult.data.metadata),
          fieldCaseId: caseId,
          fieldOutcomeId: outcome.id,
          returnHash: metadata.returnHash,
          expectedValue,
          actualValue,
          delta,
          accepted,
          verified,
        },
      }).eq('id', referenceResult.data.id);
      if (referenceUpdate.error) throw new Error(referenceUpdate.error.message);
      await Promise.all([
        linkCaseEvidence({
          caseId: String(referenceResult.data.id),
          evidenceSource: 'field_case_evidence',
          evidenceId,
          relationType: 'VERIFIES_OUTCOME',
          createdBy: ownerId,
        }),
        linkCaseEvidence({
          caseId: String(referenceResult.data.id),
          evidenceSource: 'field_outcomes',
          evidenceId: String(outcome.id),
          relationType: 'VERIFIES_OUTCOME',
          createdBy: ownerId,
        }),
      ]);
    }
  } catch {
    // Reference Bank degradation must not erase a valid participant return.
  }

  await audit(ownerId, 'field.cycle.returned', caseId, { evidenceId, fieldOutcomeId: outcome.id, actualValue, expectedValue, delta, accepted, verified });

  return {
    caseId,
    evidence,
    mihm: returnReading,
    expectedValue,
    actualValue,
    delta,
    accepted,
    verified,
    explanation: learned,
    nextStep: !accepted
      ? 'Add a traceable source or a clearer observed result; the current return remains preserved but unverified.'
      : Math.abs(delta) > 0.25
        ? 'Open a second controlled cycle with only one revised variable and preserve this case as the baseline.'
        : 'Close this cycle and decide whether the intervention should be retained, reverted or tested in another comparable case.',
    world,
    outcome,
  };
}

export async function listFieldCycles(ownerId: string) {
  const service = createServiceSupabaseClient();
  const caseResult = await service.from('field_cases').select('*').eq('owner_id', ownerId).is('deleted_at', null).order('updated_at', { ascending: false }).limit(50);
  if (caseResult.error) throw new Error(`FIELD_CASE_LIST_FAILED:${caseResult.error.message}`);
  const cases = rows(caseResult.data);
  const ids = cases.map((item) => String(item.id));
  if (!ids.length) return { cases: [], summary: { total: 0, waitingReturn: 0, closed: 0, verified: 0 }, warnings: [] as string[] };

  const [hypotheses, interventions, returns, outcomes, readings, evidence] = await Promise.all([
    service.from('field_hypotheses').select('*').eq('owner_id', ownerId).in('case_id', ids).order('created_at', { ascending: false }),
    service.from('field_interventions').select('*').eq('owner_id', ownerId).in('case_id', ids).order('created_at', { ascending: false }),
    service.from('field_returns').select('*').eq('owner_id', ownerId).in('case_id', ids).order('created_at', { ascending: false }),
    service.from('field_outcomes').select('*').eq('owner_id', ownerId).in('case_id', ids).order('recorded_at', { ascending: false }),
    service.from('field_mihm_readings').select('*').eq('owner_id', ownerId).in('case_id', ids).order('created_at', { ascending: false }),
    service.from('field_case_evidence').select('id,case_id,evidence_type,label,source,reliability,uri,observed_at,created_at').eq('owner_id', ownerId).in('case_id', ids).order('created_at', { ascending: false }),
  ]);
  const warnings = [hypotheses.error, interventions.error, returns.error, outcomes.error, readings.error, evidence.error]
    .filter(Boolean)
    .map((item) => item?.message ?? 'field_source_failed');

  function latest(collection: Row[], caseId: string) {
    return collection.find((item) => String(item.case_id) === caseId) ?? null;
  }

  const hypothesisRows = rows(hypotheses.data);
  const interventionRows = rows(interventions.data);
  const returnRows = rows(returns.data);
  const outcomeRows = rows(outcomes.data);
  const readingRows = rows(readings.data);
  const evidenceRows = rows(evidence.data);

  const items: FieldCaseWithRelations[] = cases.map((item) => {
    const caseId = String(item.id);
    return {
      ...item,
      status: text(item.status) || 'UNKNOWN',
      hypothesis: latest(hypothesisRows, caseId),
      intervention: latest(interventionRows, caseId),
      return: latest(returnRows, caseId),
      outcome: latest(outcomeRows, caseId),
      latestMihm: latest(readingRows, caseId),
      evidence: evidenceRows.filter((row) => String(row.case_id) === caseId),
    };
  });

  return {
    cases: items,
    summary: {
      total: items.length,
      waitingReturn: items.filter((item) => item.status === OPEN_RETURN_STATUS).length,
      closed: items.filter((item) => item.status.startsWith('CLOSED')).length,
      verified: items.filter((item) => item.status === 'CLOSED_VERIFIED').length,
    },
    warnings,
  };
}

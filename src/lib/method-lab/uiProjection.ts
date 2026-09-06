import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import {
  METHOD_LAB_EXPERIMENT_CONTRACT_VERSION,
  METHOD_LAB_EXPERIMENT_TYPES,
  assertMethodLabExperimentPreregistration,
  type MethodLabExperimentPreregistration,
  type MethodLabExperimentType,
} from './experimentContract';
import { persistMethodLabExperimentPreregistration } from './experimentPersistence';

export const METHOD_LAB_UI_CONTRACT_VERSION = 'SFI-METHOD-LAB-UI-1.0' as const;
export const METHOD_LAB_UI_EXECUTABLE_TYPES = ['SIMULATION'] as const;

export type MethodLabUiPreregistrationInput = {
  experimentId: string;
  experimentType: MethodLabExperimentType;
  caseRef: string;
  evidenceRefs: string[];
  twinStateRef: string | null;
  hypothesis: string;
  nullHypothesis: string | null;
  t0Cutoff: string;
  timezone: string | null;
  methodDescription: string;
  controlDescription: string;
  variantDescriptions: string[];
  expectedSignal: string;
  expectedMeasures: string[];
  falsificationCondition: string;
  stoppingCondition: string;
  maxExecutions: number | null;
  returnWindow: { opensAt: string; closesAt: string; required: boolean };
};

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function iso(value: string, field: string) {
  if (!value || Number.isNaN(Date.parse(value))) throw new Error(`METHOD_LAB_UI_${field.toUpperCase()}_INVALID`);
  return new Date(value).toISOString();
}

async function requireOwnedCase(ownerId: string, caseRef: string) {
  const db = createServiceSupabaseClient();
  const result = await db.from('field_cases')
    .select('id,title,domain,status,created_at,updated_at')
    .eq('id', caseRef)
    .eq('owner_id', ownerId)
    .is('deleted_at', null)
    .maybeSingle();
  if (result.error) throw new Error(`METHOD_LAB_UI_CASE_READ_FAILED:${result.error.message}`);
  if (!result.data) throw new Error('METHOD_LAB_UI_CASE_OWNER_SCOPE_REQUIRED');
  return result.data as Row;
}

async function requireOwnedEvidence(ownerId: string, caseRef: string, evidenceRefs: string[]) {
  if (!evidenceRefs.length) return [] as Row[];
  const db = createServiceSupabaseClient();
  const result = await db.from('field_case_evidence')
    .select('id,case_id,evidence_type,label,source,reliability,observed_at,created_at')
    .eq('owner_id', ownerId)
    .eq('case_id', caseRef)
    .in('id', evidenceRefs);
  if (result.error) throw new Error(`METHOD_LAB_UI_EVIDENCE_READ_FAILED:${result.error.message}`);
  const found = rows(result.data);
  const foundIds = new Set(found.map((item) => String(item.id)));
  const missing = evidenceRefs.filter((id) => !foundIds.has(id));
  if (missing.length) throw new Error(`METHOD_LAB_UI_EVIDENCE_OWNER_SCOPE_REQUIRED:${missing.join(',')}`);
  return found;
}

async function requireOwnedTwinState(ownerId: string, twinStateRef: string | null) {
  if (!twinStateRef) return null;
  const db = createServiceSupabaseClient();
  const result = await db.from('sfi_cognitive_twin_runs')
    .select('id,case_id,task_id,status,provider,model,evidence_refs,input_snapshot,output_envelope,started_at,finished_at,created_at')
    .eq('id', twinStateRef)
    .eq('owner_id', ownerId)
    .maybeSingle();
  if (result.error) throw new Error(`METHOD_LAB_UI_TWIN_STATE_READ_FAILED:${result.error.message}`);
  if (!result.data) throw new Error('METHOD_LAB_UI_TWIN_STATE_OWNER_SCOPE_REQUIRED');
  return result.data as Row;
}

function projectExperimentAnalysis(item: Row) {
  const raw = row(item.raw_analysis);
  const preregistration = row(raw.preregistration);
  const run = row(raw.run);
  return {
    id: text(item.id),
    caseId: text(item.case_id) || null,
    mode: text(item.mode),
    dataMode: text(item.data_mode),
    createdAt: text(item.created_at) || null,
    limitations: strings(item.limitations),
    phase: text(raw.phase) || null,
    contractVersion: text(raw.contractVersion) || null,
    definitionHash: text(raw.definitionHash) || text(raw.preregistrationHash) || null,
    preregistration: Object.keys(preregistration).length ? preregistration : null,
    run: Object.keys(run).length ? run : null,
    canonicalMutation: raw.canonicalMutation === false ? false : null,
  };
}

export async function readMethodLabUiProjection(ownerId: string) {
  const db = createServiceSupabaseClient();
  const [cases, evidence, twinStates, analyses] = await Promise.all([
    db.from('field_cases')
      .select('id,title,domain,status,created_at,updated_at')
      .eq('owner_id', ownerId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(60),
    db.from('field_case_evidence')
      .select('id,case_id,evidence_type,label,source,reliability,observed_at,created_at')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(120),
    db.from('sfi_cognitive_twin_runs')
      .select('id,case_id,task_id,status,objective,provider,model,evidence_refs,started_at,finished_at,created_at')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(60),
    db.from('sfi_lab_analyses')
      .select('id,case_id,mode,data_mode,limitations,raw_analysis,created_at')
      .eq('owner_id', ownerId)
      .or('mode.eq.experiment_preregistration,mode.like.experiment_run:%')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  const warnings = [
    cases.error ? `field_cases:${cases.error.message}` : null,
    evidence.error ? `field_case_evidence:${evidence.error.message}` : null,
    twinStates.error ? `sfi_cognitive_twin_runs:${twinStates.error.message}` : null,
    analyses.error ? `sfi_lab_analyses:${analyses.error.message}` : null,
  ].filter((item): item is string => Boolean(item));

  const projected = rows(analyses.data).map(projectExperimentAnalysis);
  return {
    contractVersion: METHOD_LAB_UI_CONTRACT_VERSION,
    experimentContractVersion: METHOD_LAB_EXPERIMENT_CONTRACT_VERSION,
    experimentTypes: METHOD_LAB_EXPERIMENT_TYPES,
    executableTypes: METHOD_LAB_UI_EXECUTABLE_TYPES,
    generatedAt: new Date().toISOString(),
    ownerScope: ownerId,
    privacyBoundary: 'PRIVATE_TWIN_CASE_STATE_REQUIRES_OWNER_ID_MATCH',
    authorityBoundary: 'UI_ACTION_NEVER_PROMOTES_CANON',
    observationBoundary: 'SIMULATION_AND_REENTRY_NEVER_INHERIT_OBSERVED',
    cases: cases.data ?? [],
    evidence: evidence.data ?? [],
    twinStates: twinStates.data ?? [],
    preregistrations: projected.filter((item) => item.phase === 'PREREGISTERED'),
    runs: projected.filter((item) => item.phase === 'EXECUTED'),
    warnings,
  };
}

export async function persistMethodLabUiPreregistration(input: {
  ownerId: string;
  definition: MethodLabUiPreregistrationInput;
}) {
  const definition = input.definition;
  if (!METHOD_LAB_EXPERIMENT_TYPES.includes(definition.experimentType)) throw new Error('METHOD_LAB_UI_EXPERIMENT_TYPE_INVALID');
  const experimentId = definition.experimentId.trim();
  const caseRef = definition.caseRef.trim();
  const hypothesis = definition.hypothesis.trim();
  if (!experimentId || !caseRef || !hypothesis) throw new Error('METHOD_LAB_UI_EXPERIMENT_CASE_HYPOTHESIS_REQUIRED');

  const t0Cutoff = iso(definition.t0Cutoff, 't0');
  const opensAt = iso(definition.returnWindow.opensAt, 'return_opens_at');
  const closesAt = iso(definition.returnWindow.closesAt, 'return_closes_at');
  if (Date.parse(closesAt) < Date.parse(opensAt)) throw new Error('METHOD_LAB_UI_RETURN_WINDOW_INVALID');
  const evidenceRefs = unique(definition.evidenceRefs);
  const variants = unique(definition.variantDescriptions);
  const expectedMeasures = unique(definition.expectedMeasures);
  if (!variants.length) throw new Error('METHOD_LAB_UI_VARIANT_REQUIRED');
  if (!expectedMeasures.length) throw new Error('METHOD_LAB_UI_EXPECTED_MEASURE_REQUIRED');

  const [ownedCaseRow, ownedEvidenceRows, twinState] = await Promise.all([
    requireOwnedCase(input.ownerId, caseRef),
    requireOwnedEvidence(input.ownerId, caseRef, evidenceRefs),
    requireOwnedTwinState(input.ownerId, definition.twinStateRef?.trim() || null),
  ]);

  for (const evidence of ownedEvidenceRows) {
    const observedAt = text(evidence.observed_at) || text(evidence.created_at);
    if (observedAt && Date.parse(observedAt) > Date.parse(t0Cutoff)) {
      throw new Error(`METHOD_LAB_UI_T0_FUTURE_EVIDENCE_FORBIDDEN:${String(evidence.id)}`);
    }
  }
  if (twinState) {
    const twinCreatedAt = text(twinState.started_at) || text(twinState.created_at);
    if (twinCreatedAt && Date.parse(twinCreatedAt) > Date.parse(t0Cutoff)) {
      throw new Error('METHOD_LAB_UI_T0_FUTURE_TWIN_STATE_FORBIDDEN');
    }
  }

  const twinStateRef = definition.twinStateRef?.trim() || null;
  const frozenInputRefs = unique([caseRef, ...evidenceRefs, ...(twinStateRef ? [twinStateRef] : [])]);
  const preregistration: MethodLabExperimentPreregistration = {
    contractVersion: METHOD_LAB_EXPERIMENT_CONTRACT_VERSION,
    experimentId,
    experimentType: definition.experimentType,
    METHOD: {
      methodId: `method-lab-ui:${definition.experimentType.toLowerCase()}`,
      version: METHOD_LAB_UI_CONTRACT_VERSION,
      description: definition.methodDescription.trim() || `Method Lab UI configuration for ${definition.experimentType}.`,
    },
    HYPOTHESIS: {
      statement: hypothesis,
      nullStatement: definition.nullHypothesis?.trim() || null,
    },
    T0: {
      cutoff: t0Cutoff,
      timezone: definition.timezone?.trim() || null,
      frozenInputRefs,
    },
    POPULATION_SYSTEM: {
      kind: 'SYSTEM',
      ref: caseRef,
      description: `Owner-scoped case: ${text(ownedCaseRow.title) || caseRef}`,
    },
    INPUTS: [
      { ref: caseRef, role: 'CONTEXT', epistemicClass: 'DECLARED' },
      ...ownedEvidenceRows.map((evidence) => ({ ref: String(evidence.id), role: 'EVIDENCE' as const, epistemicClass: 'OBSERVED' as const })),
      ...(twinStateRef ? [{ ref: twinStateRef, role: 'TWIN_STATE' as const, epistemicClass: 'DERIVED' as const }] : []),
    ],
    CONTROL: {
      kind: 'CONTROL',
      description: definition.controlDescription.trim() || 'Owner-scoped frozen T0 control.',
      inputRefs: frozenInputRefs,
    },
    VARIANTS: variants.map((description, index) => ({
      variantId: `variant-${index + 1}`,
      description,
      changes: { declaredByUi: true },
    })),
    EXPECTED_SIGNAL: {
      description: definition.expectedSignal.trim() || 'Declared experimental signal.',
      measures: expectedMeasures,
    },
    FALSIFICATION: {
      condition: definition.falsificationCondition.trim() || 'The declared expected signal is not observed under the preregistered comparison.',
      requiredEvidence: evidenceRefs,
    },
    STOPPING_RULE: {
      condition: definition.stoppingCondition.trim(),
      maxExecutions: definition.maxExecutions,
    },
    RETURN_WINDOW: {
      opensAt,
      closesAt,
      required: definition.returnWindow.required,
    },
    preregisteredAt: new Date().toISOString(),
    preregisteredBy: input.ownerId,
    canonicalMutation: false,
  };

  assertMethodLabExperimentPreregistration(preregistration);
  const persisted = await persistMethodLabExperimentPreregistration({
    preregistration,
    ownerId: input.ownerId,
  });
  return {
    ...persisted,
    preregistration,
    externalRegistrationClaim: false as const,
    canonicalMutation: false as const,
  };
}

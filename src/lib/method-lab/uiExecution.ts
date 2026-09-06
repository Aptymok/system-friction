import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { runPersonalLab } from '@/lib/sfi/personal/cognitiveWorkspace';
import {
  assertMethodLabExperimentPreregistration,
  type MethodLabExperimentPreregistration,
  type MethodLabExperimentRun,
} from './experimentContract';
import {
  hashMethodLabPreregistration,
  methodLabPreregistrationId,
  persistMethodLabExperimentRun,
} from './experimentPersistence';

export type MethodLabUiSimulationProtocol = 'sociotechnical_simulation' | 'economic_simulation';

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function sha256(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

async function readOwnedPreregistration(ownerId: string, experimentId: string) {
  const db = createServiceSupabaseClient();
  const preregistrationRef = methodLabPreregistrationId(experimentId);
  const found = await db.from('sfi_lab_analyses')
    .select('id,owner_id,mode,source,raw_analysis')
    .eq('id', preregistrationRef)
    .eq('owner_id', ownerId)
    .eq('mode', 'experiment_preregistration')
    .maybeSingle();
  if (found.error) throw new Error(`METHOD_LAB_UI_PREREGISTRATION_READ_FAILED:${found.error.message}`);
  if (!found.data) throw new Error('METHOD_LAB_UI_PREREGISTRATION_OWNER_SCOPE_REQUIRED');
  const raw = row(found.data.raw_analysis);
  const preregistration = assertMethodLabExperimentPreregistration(row(raw.preregistration) as MethodLabExperimentPreregistration);
  if (raw.definitionHash !== hashMethodLabPreregistration(preregistration)) throw new Error('METHOD_LAB_UI_PREREGISTRATION_IMMUTABILITY_CHECK_FAILED');
  return { preregistrationRef, preregistration };
}

async function assertStoppingRuleAvailable(ownerId: string, preregistrationRef: string, preregistration: MethodLabExperimentPreregistration) {
  const maxExecutions = preregistration.STOPPING_RULE.maxExecutions;
  if (maxExecutions === null) return;
  const db = createServiceSupabaseClient();
  const count = await db.from('sfi_lab_analyses')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
    .eq('source', preregistrationRef)
    .eq('mode', 'experiment_run:simulation');
  if (count.error) throw new Error(`METHOD_LAB_UI_EXECUTION_COUNT_READ_FAILED:${count.error.message}`);
  if ((count.count ?? 0) >= maxExecutions) throw new Error('METHOD_LAB_UI_STOPPING_RULE_REACHED');
}

export async function executeMethodLabUiSimulation(input: {
  ownerId: string;
  experimentId: string;
  protocolId: MethodLabUiSimulationProtocol;
}) {
  const experimentId = input.experimentId.trim();
  if (!experimentId) throw new Error('METHOD_LAB_UI_EXPERIMENT_ID_REQUIRED');
  const { preregistrationRef, preregistration } = await readOwnedPreregistration(input.ownerId, experimentId);
  if (preregistration.experimentType !== 'SIMULATION') throw new Error('METHOD_LAB_UI_EXECUTION_TYPE_NOT_ALLOWED');
  if (preregistration.canonicalMutation !== false) throw new Error('METHOD_LAB_UI_CANONICAL_MUTATION_FORBIDDEN');
  await assertStoppingRuleAvailable(input.ownerId, preregistrationRef, preregistration);

  const evidenceRefs = preregistration.INPUTS.filter((item) => item.role === 'EVIDENCE').map((item) => item.ref);
  const twinStateRef = preregistration.INPUTS.find((item) => item.role === 'TWIN_STATE')?.ref ?? null;
  if (!evidenceRefs.length) throw new Error('METHOD_LAB_UI_SIMULATION_EVIDENCE_REQUIRED');

  const startedAt = new Date().toISOString();
  const underlying = await runPersonalLab({
    ownerId: input.ownerId,
    protocolId: input.protocolId,
    caseId: preregistration.POPULATION_SYSTEM.ref,
    evidenceIds: evidenceRefs,
    objective: preregistration.HYPOTHESIS.statement,
    parameters: {
      experimentId: preregistration.experimentId,
      preregistrationRef,
      frozenT0: preregistration.T0.cutoff,
      frozenInputRefs: preregistration.T0.frozenInputRefs,
      canonicalMutation: false,
    },
  });
  const finishedAt = new Date().toISOString();
  const preregistrationHash = hashMethodLabPreregistration(preregistration);
  const runId = randomUUID();
  const resultPayload = {
    executionOwner: 'runPersonalLab',
    underlyingLabAnalysisId: underlying.labAnalysisId,
    protocolId: underlying.protocolId,
    simulations: underlying.simulations,
    automations: underlying.automations,
    boundaries: {
      simulationIsObservation: false,
      resultIsCanon: false,
      uiCanPromoteCanon: false,
    },
  };
  const resultHash = sha256(resultPayload);
  const executorRefs = [...new Set(underlying.automations.map((item) => item.automationId))];
  const run: MethodLabExperimentRun = {
    contractVersion: preregistration.contractVersion,
    artifacts: {
      PREREGISTERED: {
        preregistrationRef,
        preregistrationHash,
      },
      EXECUTED: {
        runId,
        experimentId: preregistration.experimentId,
        experimentType: 'SIMULATION',
        startedAt,
        finishedAt,
        provider: 'deterministic:sfi-cognitive-runtime',
        model: 'cognitive_automations_v1',
        passportRef: null,
        twinStateRef,
        seed: null,
      },
      RESULT: {
        epistemicClass: 'SIMULATED',
        payload: resultPayload,
        evidenceRefs,
        resultHash,
      },
      CONTRAST: {
        status: preregistration.RETURN_WINDOW.required ? 'PENDING_RETURN' : 'NOT_APPLICABLE',
        payload: null,
        realityReturn: null,
      },
      LIMITATIONS: [
        ...underlying.limitations,
        'This Method Lab UI execution is an experiment receipt over the existing simulation owner; it does not create observation or canonical authority.',
      ],
      REPRODUCIBILITY_RECEIPT: {
        contractVersion: preregistration.contractVersion,
        codeRef: 'src/lib/sfi/personal/cognitiveWorkspace.ts#runPersonalLab',
        preregistrationHash,
        inputHash: sha256({
          t0: preregistration.T0,
          inputs: preregistration.INPUTS,
          control: preregistration.CONTROL,
          variants: preregistration.VARIANTS,
          protocolId: input.protocolId,
        }),
        resultHash,
        executorRefs,
        createdAt: finishedAt,
      },
    },
    canonicalMutation: false,
    observationBoundary: 'SIMULATION_NEVER_INHERITS_OBSERVED',
  };

  const persisted = await persistMethodLabExperimentRun({
    preregistration,
    run,
    ownerId: input.ownerId,
  });
  return {
    ok: underlying.ok,
    experimentId: preregistration.experimentId,
    runId,
    underlyingLabAnalysisId: underlying.labAnalysisId,
    experimentAnalysisId: persisted.analysisId,
    resultHash,
    epistemicClass: 'SIMULATED' as const,
    canonicalMutation: false as const,
    observationBoundary: 'SIMULATION_NEVER_INHERITS_OBSERVED' as const,
  };
}

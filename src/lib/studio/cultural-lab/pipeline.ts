import { randomUUID } from 'crypto';
import type {
  CulturalArtifactInput,
  StudioPipelineTrace,
  StudioStageResult,
  InputArchaeologyResult,
  MihmDeepElement,
  WorldSpectrumPlacement,
  EmergentHypothesis,
  ProjectionScenario,
  InterventionCandidate,
  ImplementationTargetValues,
  StudioSimulationResult,
} from './types';
import { inputArchaeologyAgent, worldSpectrumAgent } from './agents/worldSpectrumAgent';
import { mihmAgent } from './agents/mihmAgent';
import { emergenceAgent } from './agents/emergenceAgent';
import { projectionAgent } from './agents/projectionAgent';
import { interventionAgent } from './agents/interventionAgent';
import { simulationAgent } from './agents/simulationAgent';
import { implementationAgent } from './agents/implementationAgent';
import { narrativeAgent } from './agents/narrativeAgent';

function stageResult<T>(props: Omit<StudioStageResult<T>, 'outputRefs'>, outputRefs: string[]): StudioStageResult<T> {
  return { ...props, outputRefs };
}

async function runStage<T>(
  id: StudioStageResult['id'],
  label: string,
  fn: () => Promise<T>,
  provenance: {
    inputRefs: string[];
    basedOn: string[];
    mode: StudioStageResult['mode'];
    why: string[];
    whatIf: string[];
    thenWhat: string[];
    how: string[];
    limits: string[];
  },
): Promise<StudioStageResult<T>> {
  try {
    const data = await fn();
    return stageResult({
      id,
      label,
      status: 'complete',
      mode: provenance.mode,
      inputRefs: provenance.inputRefs,
      explanation: `Stage ${label} completed with provenance traced.`,
      confidence: 0.72,
      data,
      basedOn: provenance.basedOn,
      why: provenance.why,
      whatIf: provenance.whatIf,
      thenWhat: provenance.thenWhat,
      how: provenance.how,
      limits: provenance.limits,
    }, [id]);
  } catch (error) {
    return stageResult({
      id,
      label,
      status: 'error',
      mode: provenance.mode,
      inputRefs: provenance.inputRefs,
      explanation: error instanceof Error ? error.message : 'stage_execution_failed',
      confidence: null,
      data: null as T,
      basedOn: provenance.basedOn,
      why: provenance.why,
      whatIf: provenance.whatIf,
      thenWhat: provenance.thenWhat,
      how: provenance.how,
      limits: provenance.limits,
    }, [id]);
  }
}

export async function runStudioCulturalPipeline(input: CulturalArtifactInput): Promise<StudioPipelineTrace> {
  const runId = randomUUID();
  const createdAt = new Date().toISOString();
  const artifactId = `${input.kind}:${(input.title || 'untitled').slice(0, 32)}`;
  const sourceOrigin = input.sourceUrl ? 'connector' : 'manual_input';
  const warnings: string[] = [];

  const archaeology = await runStage<InputArchaeologyResult>(
    'input_archaeology',
    'Input Archaeology',
    async () => inputArchaeologyAgent(input),
    {
      inputRefs: [artifactId],
      basedOn: ['artifact metadata', 'title', 'text', 'notes'],
      mode: 'local_heuristic',
      why: ['Establish symbolic and narrative foundations of the artifact.'],
      whatIf: ['What if the core archetype shifts?'],
      thenWhat: ['Continue to deep MIHM evaluation with traced patterns.'],
      how: ['Analyze title, text, and metadata for latent structures.'],
      limits: ['Heuristic extraction from available input; no full external signal.'],
    },
  );
  if (archaeology.status !== 'complete') warnings.push('input_archaeology_incomplete');

  const mihm = await runStage<MihmDeepElement[]>(
    'mihm_deep_evaluation',
    'MIHM Deep Evaluation',
    async () => mihmAgent(input, archaeology.data as InputArchaeologyResult),
    {
      inputRefs: archaeology.outputRefs,
      basedOn: archaeology.basedOn,
      mode: 'scorefriction',
      why: ['Estimate friction, narrative torsion and intervention latency.'],
      whatIf: ['What if the artifact already contains its own counter-signal?'],
      thenWhat: ['Place artifact in World Spectrum field.'],
      how: ['Use MIHM-oriented local scoring over extracted structures.'],
      limits: ['Scores are provisional until external validation.'],
    },
  );
  if (mihm.status !== 'complete') warnings.push('mihm_deep_evaluation_incomplete');

  const spectrum = await runStage<WorldSpectrumPlacement>(
    'world_spectrum_comparison',
    'World Spectrum Comparison',
    async () => worldSpectrumAgent(input, mihm.data as MihmDeepElement[]),
    {
      inputRefs: mihm.outputRefs,
      basedOn: mihm.basedOn,
      mode: 'worldspect',
      why: ['Compare artifact vector against current WorldSpect field.'],
      whatIf: ['What if the field is degraded or unavailable?'],
      thenWhat: ['Identify emergent hypotheses.'],
      how: ['Map artifact point, nearby artifacts, opposing artifacts and tensions.'],
      limits: ['WorldSpect state can degrade; fallback marks uncertainty.'],
    },
  );
  if (spectrum.status !== 'complete') warnings.push('world_spectrum_comparison_incomplete');

  const emergence = await runStage<EmergentHypothesis[]>(
    'emergence_identification',
    'Emergence Identification',
    async () => emergenceAgent(input, mihm.data as MihmDeepElement[], spectrum.data as WorldSpectrumPlacement),
    {
      inputRefs: spectrum.outputRefs,
      basedOn: spectrum.basedOn,
      mode: 'local_heuristic',
      why: ['Convert MIHM and WorldSpect tensions into hypotheses.'],
      whatIf: ['What if the strongest signal is actually a false attractor?'],
      thenWhat: ['Project scenarios.'],
      how: ['Generate traceable hypotheses from prior stage outputs.'],
      limits: ['Hypotheses are not verified outcomes.'],
    },
  );
  if (emergence.status !== 'complete') warnings.push('emergence_identification_incomplete');

  const projections = await runStage<ProjectionScenario[]>(
    'projection_registry',
    'Projection Registry',
    async () => projectionAgent(input, emergence.data as EmergentHypothesis[]),
    {
      inputRefs: emergence.outputRefs,
      basedOn: emergence.basedOn,
      mode: 'simulation',
      why: ['Create explicit future scenarios before intervention.'],
      whatIf: ['What if the intervention amplifies fracture instead of trust?'],
      thenWhat: ['Design minimal interventions.'],
      how: ['Project stabilized, fractured and adaptive paths.'],
      limits: ['Scenario probabilities are provisional.'],
    },
  );
  if (projections.status !== 'complete') warnings.push('projection_registry_incomplete');

  const interventions = await runStage<InterventionCandidate[]>(
    'intervention_design',
    'Intervention Design',
    async () => interventionAgent(input, projections.data as ProjectionScenario[]),
    {
      inputRefs: projections.outputRefs,
      basedOn: projections.basedOn,
      mode: 'local_heuristic',
      why: ['Select minimal reversible changes that could shift target vectors.'],
      whatIf: ['What if minimal change is insufficient?'],
      thenWhat: ['Simulate candidate interventions.'],
      how: ['Generate interventions by symbolic, narrative, structural and distribution layers.'],
      limits: ['Requires human review before implementation.'],
    },
  );
  if (interventions.status !== 'complete') warnings.push('intervention_design_incomplete');

  const simulation = await runStage<StudioSimulationResult>(
    'simulation_engine',
    'Simulation Engine',
    async () => simulationAgent(input, interventions.data as InterventionCandidate[], projections.data as ProjectionScenario[]),
    {
      inputRefs: interventions.outputRefs,
      basedOn: interventions.basedOn,
      mode: 'simulation',
      why: ['Estimate directional vector shift before implementation.'],
      whatIf: ['What if projected risk dominates expected shift?'],
      thenWhat: ['Prepare implementation target values.'],
      how: ['Aggregate expected vector shifts across intervention candidates.'],
      limits: ['Simulation is not field evidence.'],
    },
  );
  if (simulation.status !== 'complete') warnings.push('simulation_engine_incomplete');

  const implementation = await runStage<ImplementationTargetValues>(
    'implementation_console',
    'Implementation Console',
    async () => implementationAgent(input, interventions.data as InterventionCandidate[], simulation.data as StudioSimulationResult),
    {
      inputRefs: simulation.outputRefs,
      basedOn: simulation.basedOn,
      mode: 'manual',
      why: ['Translate simulation into operational steps.'],
      whatIf: ['What if implementation should be paused?'],
      thenWhat: ['Forecast outcome windows.'],
      how: ['Build steps, evidence requirements and guardrails.'],
      limits: ['Implementation must remain reversible unless reviewed.'],
    },
  );
  if (implementation.status !== 'complete') warnings.push('implementation_console_incomplete');

  const forecast = await runStage<Record<string, unknown>>(
    'outcome_forecast',
    'Outcome Forecast',
    async () => narrativeAgent(input, implementation.data as ImplementationTargetValues, simulation.data as StudioSimulationResult),
    {
      inputRefs: implementation.outputRefs,
      basedOn: implementation.basedOn,
      mode: 'local_heuristic',
      why: ['Summarize the full intervention chain into forecasted outcomes.'],
      whatIf: ['What if execution is delayed or evidence changes?'],
      thenWhat: ['Provide next observation window and verification criteria.'],
      how: ['Create a narrative forecast rooted in prior stage outputs.'],
      limits: ['Forecast remains conditional and open to new evidence.'],
    },
  );
  if (forecast.status !== 'complete') warnings.push('outcome_forecast_incomplete');

  return {
    runId,
    artifactId,
    createdAt,
    sourceOrigin,
    stages: [archaeology, mihm, spectrum, emergence, projections, interventions, simulation, implementation, forecast],
    warnings,
  };
}

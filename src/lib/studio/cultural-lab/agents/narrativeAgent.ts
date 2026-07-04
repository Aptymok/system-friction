import type { CulturalArtifactInput, ImplementationTargetValues, StudioSimulationResult } from '../types';

export async function narrativeAgent(
  input: CulturalArtifactInput,
  implementation: ImplementationTargetValues,
  simulation: StudioSimulationResult,
) {
  return {
    summary: `The ${input.kind} "${input.title || 'untitled'}" can be treated as an intervention object. The current forecast is conditional, not verified.`,
    forecast: implementation.targetValues,
    scenarioOutcomes: simulation.scenarios.map((scenario) => ({
      id: String(scenario.id),
      title: scenario.title,
      confidence: scenario.confidence,
    })),
    nextObservationWindow: '72h after intervention, then 7d / 30d / 90d if implementation proceeds',
    verificationCriteria: [
      'observable audience response',
      'change in target vector',
      'absence or presence of predicted fracture',
      'traceable artifact revision',
    ],
  };
}

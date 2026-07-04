import type { CulturalArtifactInput, InterventionCandidate, ProjectionScenario, StudioSimulationResult } from '../types';

export async function simulationAgent(
  input: CulturalArtifactInput,
  interventions: InterventionCandidate[],
  scenarios: ProjectionScenario[],
): Promise<StudioSimulationResult> {
  const forecast = interventions.reduce<Record<string, number>>((acc, intervention) => {
    Object.entries(intervention.expectedVectorShift).forEach(([key, value]) => {
      acc[key] = Number(((acc[key] ?? 0) + value).toFixed(3));
    });
    return acc;
  }, {});

  return {
    scenarios,
    interventions,
    forecast,
    risks: [
      `${input.kind} may not have enough external signal for non-local validation.`,
      ...interventions.filter((item) => item.risk !== 'low').map((item) => `${item.id}:${item.risk}`),
    ],
  };
}

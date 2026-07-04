import type { CulturalArtifactInput, ProjectionScenario, InterventionCandidate } from '../types';

const CHANGE_TYPES: InterventionCandidate['type'][] = ['lyrical', 'narrative', 'structural', 'symbolic', 'production', 'policy', 'distribution'];

export async function interventionAgent(input: CulturalArtifactInput, scenarios: ProjectionScenario[]): Promise<InterventionCandidate[]> {
  return scenarios.flatMap((scenario, index) => {
    const type = CHANGE_TYPES[index % CHANGE_TYPES.length];
    return [{
      id: `intervention-${scenario.id}`,
      type,
      minimalChange: `Adjust ${type} emphasis in ${input.kind} to shift ${scenario.title}.`,
      expectedVectorShift: { hope: 0.1 * (index + 1), trust: index === 1 ? -0.05 : 0.1, polarization: index === 1 ? -0.2 : 0.05 },
      risk: index === 2 ? 'medium' : 'low',
      evidenceRequired: ['artifact narrative review', 'target audience signal', 'WorldSpect trend alignment'],
      reversible: index !== 1,
    }];
  });
}

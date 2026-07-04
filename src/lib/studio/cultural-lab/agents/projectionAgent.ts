import type { CulturalArtifactInput, EmergentHypothesis, ProjectionScenario } from '../types';

const SCENARIOS: Array<{ id: 'A' | 'B' | 'C'; title: string }> = [
  { id: 'A', title: 'Stabilized resonance' },
  { id: 'B', title: 'Amplified fracture' },
  { id: 'C', title: 'Adaptive convergence' },
];

export async function projectionAgent(input: CulturalArtifactInput, emergence: EmergentHypothesis[]): Promise<ProjectionScenario[]> {
  return SCENARIOS.map((scenario, index) => ({
    id: scenario.id,
    title: scenario.title,
    probability: 0.3 + index * 0.15,
    confidence: 0.45 + index * 0.1,
    drivers: [emergence[index]?.drivers[0] ?? 'artifact structural driver', 'external pressure vector'],
    affectedVectors: { trust: index === 0 ? 0.2 : index === 1 ? -0.1 : 0.1, polarization: index === 1 ? 0.25 : -0.05 },
    narrative: `Scenario ${scenario.id} projects ${scenario.title} from ${input.title || 'the artifact'} and existing emergence indicators.`,
    trace: emergence.slice(0, 2).flatMap((item) => item.trace),
  }));
}

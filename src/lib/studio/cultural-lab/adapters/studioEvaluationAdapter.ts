import type { StudioArtifactInput } from '../types';

export async function studioEvaluationAdapter(input: StudioArtifactInput) {
  return {
    source: 'studio-evaluation-adapter',
    artifact: input.title,
    status: 'wrapped',
  };
}

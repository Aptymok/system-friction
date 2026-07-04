import type { StudioArtifactInput } from '../types';

export async function scorefrictionAdapter(input: StudioArtifactInput) {
  return {
    source: 'scorefriction-adapter',
    artifact: input.title,
    status: 'available',
  };
}

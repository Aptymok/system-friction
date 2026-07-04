import type { StudioPipelineTrace } from './types';

export function formatStudioNarrative(trace: StudioPipelineTrace) {
  return `${trace.artifactId} · ${trace.stages.length} stages · ${trace.warnings.length} warnings`;
}

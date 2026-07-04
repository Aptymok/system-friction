import type { StudioPipelineTrace } from './types';

export function summarizeTrace(trace: StudioPipelineTrace) {
  return {
    runId: trace.runId,
    artifactId: trace.artifactId,
    completed: trace.stages.filter((stage) => stage.status === 'complete').length,
    errors: trace.stages.filter((stage) => stage.status === 'error').length,
    warnings: trace.warnings,
  };
}

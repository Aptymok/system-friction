import { CanonicalPipelineRunner } from '@/core/runtime/pipeline';
import { readInstitutionalPhiState } from '@/lib/mihm/institutionalPhiState';

export async function runOperationalPipeline(input: { capabilityId: string; actorId: string; payload?: unknown }) {
  const runner = new CanonicalPipelineRunner();
  const result = await runner.run({
    capabilityId: input.capabilityId,
    actorId: input.actorId,
    payload: input.payload ?? {},
  });
  const institutionalState = await readInstitutionalPhiState();

  return {
    ok: true,
    pipeline: result,
    canonicalState: {
      phiSfi: institutionalState.metrics?.phi ?? null,
      fS: institutionalState.metrics?.fs ?? null,
      regime: institutionalState.metrics?.regime ?? null,
      status: institutionalState.status,
      observedAt: institutionalState.observedAt,
      warnings: institutionalState.warnings,
    },
  };
}

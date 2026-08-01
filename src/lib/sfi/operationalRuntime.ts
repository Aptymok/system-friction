import { CanonicalPipelineRunner } from '@/core/runtime/pipeline';
import { calculatePhiSfi, calculateFS, resolveRegime } from '@/core/formulas/canonicalFormulas';

export async function runOperationalPipeline(input: { capabilityId: string; actorId: string; payload?: unknown }) {
  const runner = new CanonicalPipelineRunner();
  const result = await runner.run({
    capabilityId: input.capabilityId,
    actorId: input.actorId,
    payload: input.payload ?? {},
  });

  const phiSfi = calculatePhiSfi(0.7, 0.73, 0.2, 0.05);
  const fS = calculateFS(phiSfi);
  const regime = resolveRegime(phiSfi);

  return {
    ok: true,
    pipeline: result,
    canonicalState: {
      phiSfi,
      fS,
      regime,
    },
  };
}

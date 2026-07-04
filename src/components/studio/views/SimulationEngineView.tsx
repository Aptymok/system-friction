'use client';

import type { StudioPipelineTrace } from '@/lib/studio/cultural-lab/types';

export function SimulationEngineView({ trace }: { trace: StudioPipelineTrace | null }) {
  const stage = trace?.stages.find((item) => item.id === 'simulation_engine');
  return (
    <section className="rounded-[2rem] border border-[#2d2a28] bg-[#080706]/90 p-5">
      <div className="text-xs uppercase tracking-[0.22em] text-[#9c8c70]">SimulationEngineView</div>
      <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap text-xs leading-5 text-[#b8ad98]">{JSON.stringify(stage?.data ?? null, null, 2)}</pre>
    </section>
  );
}

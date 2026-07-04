'use client';

import type { ProjectionScenario, StudioPipelineTrace } from '@/lib/studio/cultural-lab/types';

export function StudioScenarioCanvas({ trace }: { trace: StudioPipelineTrace | null }) {
  const scenarios = (trace?.stages.find((stage) => stage.id === 'projection_registry')?.data ?? []) as ProjectionScenario[];

  return (
    <section className="rounded-[2rem] border border-[#2d2a28] bg-[#080706]/90 p-5">
      <div className="mb-4 text-xs uppercase tracking-[0.22em] text-[#9c8c70]">Scenario Canvas</div>
      <div className="grid gap-3">
        {scenarios.map((scenario) => (
          <div key={scenario.id} className="rounded-2xl border border-[#2d2a28] bg-[#0b0a08] p-4">
            <div className="flex justify-between gap-4">
              <b className="text-sm uppercase tracking-[0.12em] text-[#f1dfb1]">{scenario.id} · {scenario.title}</b>
              <span className="text-xs text-[#d7bd73]">{Math.round(scenario.confidence * 100)}%</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#b8ad98]">{scenario.narrative}</p>
          </div>
        ))}
        {scenarios.length === 0 ? <p className="text-sm text-[#8d826f]">Scenarios appear after projection registry stage.</p> : null}
      </div>
    </section>
  );
}

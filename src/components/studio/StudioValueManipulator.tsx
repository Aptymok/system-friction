'use client';

import type { StudioPipelineTrace } from '@/lib/studio/cultural-lab/types';

export function StudioValueManipulator({ trace }: { trace: StudioPipelineTrace | null }) {
  const simulation = trace?.stages.find((stage) => stage.id === 'simulation_engine')?.data as { forecast?: Record<string, number> } | undefined;
  const values = simulation?.forecast ?? {};

  return (
    <section className="rounded-[2rem] border border-[#2d2a28] bg-[#080706]/90 p-5">
      <div className="mb-4 text-xs uppercase tracking-[0.22em] text-[#9c8c70]">Value Manipulator</div>
      <div className="grid gap-3">
        {Object.entries(values).map(([key, value]) => (
          <div key={key}>
            <div className="mb-1 flex justify-between text-xs uppercase tracking-[0.12em] text-[#b8ad98]"><span>{key}</span><span>{value.toFixed(2)}</span></div>
            <div className="h-2 rounded-full bg-[#191613]"><div className="h-2 rounded-full bg-[#d7bd73]" style={{ width: `${Math.min(100, Math.abs(value) * 100)}%` }} /></div>
          </div>
        ))}
        {Object.keys(values).length === 0 ? <p className="text-sm text-[#8d826f]">Vector shifts appear after simulation.</p> : null}
      </div>
    </section>
  );
}

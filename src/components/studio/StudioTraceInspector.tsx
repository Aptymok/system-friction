'use client';

import type { StudioStageResult } from '@/lib/studio/cultural-lab/types';

export function StudioTraceInspector({ stage }: { stage: StudioStageResult | null }) {
  if (!stage) {
    return <section className="rounded-[2rem] border border-[#2d2a28] bg-[#080706]/90 p-5 text-sm text-[#8d826f]">No stage selected.</section>;
  }

  return (
    <section className="rounded-[2rem] border border-[#2d2a28] bg-[#080706]/90 p-5">
      <div className="mb-4 text-xs uppercase tracking-[0.22em] text-[#9c8c70]">Trace Inspector</div>
      <h3 className="text-lg text-[#f1dfb1]">{stage.label}</h3>
      <p className="mt-2 text-sm leading-6 text-[#b8ad98]">{stage.explanation}</p>

      <div className="mt-4 grid gap-3 text-sm text-[#d0c6b0]">
        <div><b className="text-[#d7bd73]">Based on:</b> {stage.basedOn.join(', ')}</div>
        <div><b className="text-[#d7bd73]">Why:</b> {stage.why.join(' ')}</div>
        <div><b className="text-[#d7bd73]">What if:</b> {stage.whatIf.join(' ')}</div>
        <div><b className="text-[#d7bd73]">Then what:</b> {stage.thenWhat.join(' ')}</div>
        <div><b className="text-[#d7bd73]">Limits:</b> {stage.limits.join(' ')}</div>
      </div>
    </section>
  );
}

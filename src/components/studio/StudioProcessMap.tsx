'use client';

import type { StudioPipelineTrace } from '@/lib/studio/cultural-lab/types';

export function StudioProcessMap({ trace }: { trace: StudioPipelineTrace | null }) {
  const stages = trace?.stages ?? [];
  return (
    <section className="relative min-h-[420px] overflow-hidden rounded-[2rem] border border-[#2d2a28] bg-[#050504] p-5">
      <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_center,rgba(215,189,115,.16),transparent_35%),linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:100%_100%,32px_32px,32px_32px]" />
      <div className="relative z-10 mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-[#9c8c70]">Transformation Chain</div>
          <h2 className="mt-2 text-2xl text-[#f1dfb1]">INPUT → OUTCOME FORECAST</h2>
        </div>
        <span className="rounded-full border border-[#d7bd73]/40 px-3 py-1 text-xs uppercase tracking-[0.16em] text-[#d7bd73]">{stages.length || 0} stages</span>
      </div>

      <div className="relative z-10 grid grid-cols-3 gap-3">
        {stages.map((stage, index) => (
          <div key={stage.id} className="rounded-3xl border border-[#3a3328] bg-black/35 p-4">
            <span className="text-[10px] uppercase tracking-[0.18em] text-[#7f735d]">{String(index + 1).padStart(2, '0')} · {stage.mode}</span>
            <b className="mt-2 block text-sm uppercase tracking-[0.12em] text-[#f1dfb1]">{stage.label}</b>
            <p className="mt-2 line-clamp-3 text-xs leading-5 text-[#b8ad98]">{stage.explanation}</p>
          </div>
        ))}
        {stages.length === 0 ? <div className="col-span-3 rounded-3xl border border-[#3a3328] bg-black/35 p-6 text-[#8d826f]">No trace yet. Submit an artifact to build the transformation map.</div> : null}
      </div>
    </section>
  );
}

'use client';

import type { StudioPipelineTrace, StudioStageId } from '@/lib/studio/cultural-lab/types';

export function StudioPipelineRail({ trace, activeStage, onStageChange }: { trace: StudioPipelineTrace | null; activeStage: StudioStageId; onStageChange: (stage: StudioStageId) => void }) {
  const stages = trace?.stages ?? [];
  return (
    <aside className="rounded-[2rem] border border-[#2d2a28] bg-[#080706]/90 p-4">
      <div className="mb-4 text-xs uppercase tracking-[0.22em] text-[#9c8c70]">Pipeline</div>
      <div className="grid gap-2">
        {stages.map((stage, index) => (
          <button
            key={stage.id}
            type="button"
            onClick={() => onStageChange(stage.id)}
            className={`rounded-2xl border px-3 py-3 text-left transition ${activeStage === stage.id ? 'border-[#d7bd73] bg-[#201a0f] text-[#f1dfb1]' : 'border-[#2d2a28] bg-[#0b0a08] text-[#b8ad98]'}`}
          >
            <span className="block text-[10px] uppercase tracking-[0.18em] text-[#7f735d]">{String(index + 1).padStart(2, '0')} · {stage.status}</span>
            <b className="mt-1 block text-xs uppercase tracking-[0.12em]">{stage.label}</b>
          </button>
        ))}
        {stages.length === 0 ? <p className="text-sm text-[#8d826f]">Run the pipeline to populate the intervention chain.</p> : null}
      </div>
    </aside>
  );
}

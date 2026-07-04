'use client';

import type { StudioPipelineTrace } from '@/lib/studio/cultural-lab/types';

export function StudioAgentConsole({ trace }: { trace: StudioPipelineTrace | null }) {
  const agents = [
    'input archaeology',
    'mihm',
    'world spectrum',
    'emergence',
    'projection',
    'intervention',
    'simulation',
    'implementation',
    'narrative',
  ];

  return (
    <section className="rounded-[2rem] border border-[#2d2a28] bg-[#080706]/90 p-5">
      <div className="mb-4 text-xs uppercase tracking-[0.22em] text-[#9c8c70]">Agent Console</div>
      <div className="grid grid-cols-2 gap-2">
        {agents.map((agent, index) => (
          <div key={agent} className="rounded-2xl border border-[#2d2a28] bg-[#0b0a08] p-3">
            <span className="text-[10px] uppercase tracking-[0.16em] text-[#7f735d]">A{index + 1}</span>
            <b className="mt-1 block text-xs uppercase tracking-[0.12em] text-[#d0c6b0]">{agent}</b>
            <span className="mt-2 block text-[10px] uppercase tracking-[0.12em] text-[#8fae5a]">{trace ? 'ready' : 'idle'}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

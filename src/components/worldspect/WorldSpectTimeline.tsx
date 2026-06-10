'use client';

import type { WorldSpectVectorSnapshot } from '@/lib/worldspect/vector-contract';

export function WorldSpectTimeline({ snapshots, className = '' }: { snapshots: WorldSpectVectorSnapshot[]; className?: string }) {
  if (snapshots.length === 0) {
    return <div className={`border border-[#b8505033] p-4 font-mono text-[10px] uppercase tracking-[0.16em] text-[#b85050] ${className}`}>worldspect_unavailable</div>;
  }

  return (
    <div className={`border border-[#c8a95118] bg-[#060605] p-4 ${className}`}>
      <div className="mb-3 font-mono text-[9px] uppercase tracking-[0.2em] text-[#6b5820]">WorldSpect Timeline</div>
      <div className="space-y-2">
        {snapshots.map((snapshot) => (
          <div key={snapshot.id} className="grid grid-cols-[150px_1fr_64px] items-center gap-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[#8a8678]">
            <span>{new Date(snapshot.observed_at).toISOString().slice(0, 10)}</span>
            <div className="h-1.5 bg-[#1a1710]">
              <div className="h-full bg-[#c8a951]" style={{ width: `${Math.max(2, Math.min(100, snapshot.wsi * 100))}%` }} />
            </div>
            <span className="text-right text-[#c8a951]">{snapshot.regime}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

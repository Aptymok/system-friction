'use client';

import { WORLDSPECT_DOMAINS, type WorldSpectVectorSnapshot } from '@/lib/worldspect/vector-contract';

export function WorldSpectPolygon({ snapshot, className = '' }: { snapshot: WorldSpectVectorSnapshot | null; className?: string }) {
  if (!snapshot) {
    return <div className={`border border-[#b8505033] p-4 font-mono text-[10px] uppercase tracking-[0.16em] text-[#b85050] ${className}`}>worldspect_unavailable</div>;
  }

  const center = 120;
  const max = 96;
  const points = WORLDSPECT_DOMAINS.map((domain, index) => {
    const vector = snapshot.vectors.find((item) => item.domain === domain);
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / WORLDSPECT_DOMAINS.length;
    const radius = max * (vector?.value ?? 0);
    return `${center + Math.cos(angle) * radius},${center + Math.sin(angle) * radius}`;
  }).join(' ');

  return (
    <figure className={`relative border border-[#c8a95118] bg-[#060605] p-4 ${className}`}>
      <svg viewBox="0 0 240 240" className="h-full min-h-[240px] w-full">
        {[0.25, 0.5, 0.75, 1].map((ratio) => (
          <circle key={ratio} cx={center} cy={center} r={max * ratio} fill="none" stroke="rgba(200,169,81,.08)" />
        ))}
        {WORLDSPECT_DOMAINS.map((domain, index) => {
          const angle = -Math.PI / 2 + (Math.PI * 2 * index) / WORLDSPECT_DOMAINS.length;
          const x = center + Math.cos(angle) * max;
          const y = center + Math.sin(angle) * max;
          return <line key={domain} x1={center} y1={center} x2={x} y2={y} stroke="rgba(200,169,81,.08)" />;
        })}
        <polygon points={points} fill="rgba(200,169,81,.16)" stroke="#c8a951" strokeWidth="1.4" />
      </svg>
      <figcaption className="mt-3 flex justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-[#8a8678]">
        <span>{snapshot.regime}</span>
        <span>WSI {snapshot.wsi.toFixed(3)} / NTI {snapshot.nti.toFixed(3)}</span>
      </figcaption>
    </figure>
  );
}

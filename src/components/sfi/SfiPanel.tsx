import type { ReactNode } from 'react';

export function SfiPanel({
  title,
  topo,
  className = '',
  children,
}: {
  title: string;
  topo?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`sfi-panel ${className}`}>
      <div className="sfi-panel-label">{title}</div>
      {topo ? (
        <div className="absolute right-2 top-2 z-10 font-mono text-[9px] uppercase tracking-[0.2em] text-[#4a4a45]">
          {topo}
        </div>
      ) : null}
      <div className="relative z-10 h-full w-full">{children}</div>
    </section>
  );
}

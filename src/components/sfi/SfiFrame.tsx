import type { ReactNode } from 'react';
import { SfiMark } from './SfiMark';

export function SfiFrame({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={`sfi-screen min-h-screen ${className}`}>
      <header className="fixed left-0 right-0 top-0 z-40 flex h-[var(--sfi-header-height)] items-center border-b border-[#c8a95114] bg-[#060605]/95 px-3">
        <SfiMark className="mr-3 h-4 w-4" />
        <div className="sfi-title text-[9px] text-[#c8a951]">{title}</div>
        {subtitle ? <div className="ml-auto font-mono text-[9px] uppercase tracking-[0.16em] text-[#4a4a45]">{subtitle}</div> : null}
      </header>
      <div className="pt-[var(--sfi-header-height)]">{children}</div>
    </main>
  );
}

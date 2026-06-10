import type { ReactNode } from 'react';

export function SfiNodeCard({
  superLabel,
  title,
  children,
  onClose,
}: {
  superLabel: string;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed left-1/2 top-1/2 z-[80] max-h-[72vh] w-[min(560px,92vw)] -translate-x-1/2 -translate-y-1/2 overflow-auto border border-[#6b5820] bg-[#050507]/95 shadow-[0_30px_90px_rgba(0,0,0,.85)]">
      <div className="flex items-start justify-between border-b border-[#1a1a20] p-4">
        <div>
          <div className="font-mono text-[8px] uppercase tracking-[0.4em] text-[#6b5820]">{superLabel}</div>
          <div className="font-serif text-2xl italic tracking-wide text-[#e8e4d8]">{title}</div>
        </div>
        <button onClick={onClose} className="border border-[#1a1a20] px-2 py-1 font-mono text-[10px] text-[#4a4840] hover:border-[#c9a84c] hover:text-[#c9a84c]">
          cerrar
        </button>
      </div>
      <div className="p-5 font-serif text-[15px] leading-7 text-[#9a9580]">{children}</div>
    </div>
  );
}

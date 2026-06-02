'use client';

import type { VisorContextKey } from './visorTypes';
import { VISOR_CONTEXTS } from './visorTypes';

export function VisorSidebar({
  activeContext,
  onSelect,
}: {
  activeContext: VisorContextKey;
  onSelect: (context: VisorContextKey) => void;
}) {
  return (
    <aside className="absolute left-0 top-0 z-[80] h-full w-60 border-r border-white/10 bg-black/80 px-3 py-14 opacity-20 backdrop-grayscale transition-opacity duration-200 hover:opacity-95 focus-within:opacity-95">
      <div className="mb-5 border-b border-white/10 pb-3 font-mono text-[9px] uppercase tracking-[0.22em] text-white/45">
        Visor Index
      </div>
      <div className="space-y-4 overflow-y-auto pr-1">
        {VISOR_CONTEXTS.map((section) => (
          <section key={section.key}>
            <button
              type="button"
              onClick={() => onSelect(section.key)}
              className={`w-full text-left font-mono text-[10px] uppercase tracking-[0.16em] transition ${
                activeContext === section.key ? 'text-[#d4af37]' : 'text-white/55 hover:text-white/85'
              }`}
            >
              {section.label}
            </button>
            <div className="mt-1 space-y-1 border-l border-white/10 pl-3">
              {section.children.map((child) => (
                <button
                  key={child}
                  type="button"
                  onClick={() => onSelect(section.key)}
                  className="block font-mono text-[9px] uppercase tracking-[0.12em] text-white/30 transition hover:text-white/70"
                >
                  {child}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}

'use client';

import { useState } from 'react';
import type { PanelItem, Tone } from './rootConsoleAdapters';
import { statusTone, toneClass } from './rootConsoleAdapters';

export function Indicator({ label, value, source, tone }: { label: string; value: string; source: string; tone: Tone }) {
  return (
    <section className="rc-panel p-3 relative overflow-hidden">
      <div className="pointer-events-none absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-current opacity-70" style={{ color: 'inherit' }} />
      <span className="block font-mono text-[8px] uppercase tracking-[0.14em] text-[#847a63]">{label}</span>
      <b className={`${toneClass(tone)} mt-2 block text-3xl font-medium leading-none`}>{value}</b>
      <div className="mt-2 h-px w-full bg-[#3b321e]" />
      <em className="mt-2 block break-words font-mono text-[8px] not-italic leading-4 tracking-[0.04em] text-[#847a63]">{source}</em>
    </section>
  );
}

function CopySourceButton({ source }: { source: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="shrink-0 border border-[#3b321e] px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-[0.1em] text-[#847a63] hover:border-[#c8a951] hover:text-[#f1d27b]"
      title="Copy exact source path"
      onClick={(event) => {
        event.stopPropagation();
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText(source).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1400);
          }).catch(() => undefined);
        }
      }}
    >
      {copied ? 'copied' : 'src'}
    </button>
  );
}

function ContextRow({ item }: { item: PanelItem }) {
  const [expanded, setExpanded] = useState(false);
  const tone = statusTone(item.status);
  const gated = tone === 'watch' || tone === 'bad';
  return (
    <article className="border-b border-[#2f2a1e] pb-2">
      <button type="button" className="flex w-full items-start justify-between gap-2 text-left" onClick={() => setExpanded((prev) => !prev)} aria-expanded={expanded}>
        <div className="flex min-w-0 items-center gap-2">
          <span className={`${toneClass(tone)} h-1.5 w-1.5 flex-shrink-0 rounded-full bg-current`} style={{ boxShadow: '0 0 6px currentColor' }} />
          <b className="min-w-0 break-words text-[10px] font-medium leading-tight text-[#e9dfc8]">{item.label}</b>
        </div>
        <span className={`${toneClass(tone)} flex-shrink-0 font-mono text-[7px] uppercase tracking-[0.08em]`}>{item.status}</span>
      </button>
      <p className={`mt-1 text-[10px] leading-4 text-[#bdb195] ${expanded ? '' : 'line-clamp-2'}`}>{item.body}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <small className="min-w-0 break-words font-mono text-[8px] tracking-[0.04em] text-[#847a63]">{item.source}</small>
        <CopySourceButton source={item.source} />
      </div>
      {gated ? <p className="mt-1 font-mono text-[7px] uppercase tracking-[0.08em] text-[#d8b651]">no synthetic value shown — use RUN action to force real generation</p> : null}
    </article>
  );
}

export function ContextPanel({ title, items }: { title: string; items: PanelItem[] }) {
  return (
    <section className="rc-panel p-3">
      <header className="mb-3 flex items-start justify-between gap-3 border-b border-[#3b321e] pb-3">
        <b className="font-mono text-[9px] font-medium uppercase tracking-[0.13em] text-[#f1d27b]">{title}</b>
        <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#847a63]">{items.length} source rows</span>
      </header>
      <div className="sfi-hidden-scrollbar grid max-h-[52vh] gap-2 overflow-y-auto pr-1">
        {items.slice(0, 24).map((item) => <ContextRow key={item.id} item={item} />)}
        {items.length === 0 ? <p className="text-[10px] leading-4 text-[#847a63]">PENDING: no records returned by the current ROOT source. This is not a rendering error — the operational point has not arrived.</p> : null}
      </div>
      {items.length > 24 ? <p className="mt-2 font-mono text-[7px] uppercase tracking-[0.08em] text-[#847a63]">+{items.length - 24} more rows in source, truncated for HUD density</p> : null}
    </section>
  );
}

export function ReadingPanel({ title, dataClass, textValue }: { title: string; dataClass: string; textValue: string }) {
  return (
    <section className="rc-panel p-3">
      <header className="mb-3 flex items-start justify-between gap-3 border-b border-[#3b321e] pb-3">
        <b className="font-mono text-[9px] font-medium uppercase tracking-[0.13em] text-[#f1d27b]">{title}</b>
        <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#847a63]">{dataClass}</span>
      </header>
      <p className="text-[10px] leading-4 text-[#bdb195]">{textValue}</p>
    </section>
  );
}

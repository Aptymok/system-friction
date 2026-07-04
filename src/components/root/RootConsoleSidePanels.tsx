import type { PanelItem, Tone } from './rootConsoleAdapters';
import { statusTone, toneClass } from './rootConsoleAdapters';

export function Indicator({ label, value, source, tone }: { label: string; value: string; source: string; tone: Tone }) {
  return <section className="rc-panel p-3"><span className="block font-mono text-[8px] uppercase tracking-[0.14em] text-[#817660]">{label}</span><b className={`${toneClass(tone)} mt-3 block text-3xl font-medium leading-none`}>{value}</b><em className="mt-3 block break-words font-mono text-[8px] not-italic leading-4 tracking-[0.04em] text-[#817660]">{source}</em></section>;
}

export function ContextPanel({ title, items }: { title: string; items: PanelItem[] }) {
  return <section className="rc-panel p-3"><header className="mb-3 flex items-start justify-between gap-3 border-b border-[#3b321e] pb-3"><b className="font-mono text-[9px] font-medium uppercase tracking-[0.13em] text-[#f1d27b]">{title}</b><span className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#817660]">{items.length} source rows</span></header><div className="grid gap-2">{items.slice(0, 5).map((item) => <article key={item.id} className="border-b border-[#2f2a1e] pb-2"><div className="flex items-center gap-2"><span className={`${toneClass(statusTone(item.status))} h-1.5 w-1.5 rounded-full bg-current`} /><b className="min-w-0 break-words text-[10px] font-medium leading-tight text-[#e9dfc8]">{item.label}</b></div><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#bdb195]">{item.body}</p><small className="mt-1 block break-words font-mono text-[8px] tracking-[0.04em] text-[#817660]">{item.source}</small></article>)}{items.length === 0 ? <p className="text-[10px] leading-4 text-[#817660]">PENDING: no records returned by the current ROOT source.</p> : null}</div></section>;
}

export function ReadingPanel({ title, dataClass, textValue }: { title: string; dataClass: string; textValue: string }) {
  return <section className="rc-panel p-3"><header className="mb-3 flex items-start justify-between gap-3 border-b border-[#3b321e] pb-3"><b className="font-mono text-[9px] font-medium uppercase tracking-[0.13em] text-[#f1d27b]">{title}</b><span className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#817660]">{dataClass}</span></header><p className="text-[10px] leading-4 text-[#bdb195]">{textValue}</p></section>;
}

import type { ReactNode } from 'react'

export function PanelFrame({ title, topo, className = '', children }: { title: string; topo: string; className?: string; children: ReactNode }) {
  return (
    <section className={`relative h-full shrink-0 overflow-hidden border-r border-[#d8b64a22] bg-[#060605] p-4 ${className}`}>
      <div className="pointer-events-none absolute left-4 top-3 z-10 font-mono text-[9px] uppercase tracking-[0.26em] text-[#d8b64a99]">{title}</div>
      <div className="pointer-events-none absolute right-4 top-3 z-10 font-mono text-[8px] uppercase tracking-[0.18em] text-[#6f6658]">{topo}</div>
      <div className="relative h-full pt-8">{children}</div>
    </section>
  )
}

export function MiniReadout({ label, value, hot = false }: { label: string; value: string; hot?: boolean }) {
  return (
    <div className="border border-[#d8b64a24] bg-[#0b0a08] px-3 py-2">
      <div className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#6f6658]">{label}</div>
      <div className={hot ? 'mt-1 font-mono text-sm text-[#d05c52]' : 'mt-1 font-mono text-sm text-[#e0c46c]'}>{value}</div>
    </div>
  )
}

import type { ReactNode } from 'react'

export function PanelFrame({ title, topo, className = '', children }: { title: string; topo: string; className?: string; children: ReactNode }) {
  return (
    <section
      className={`group relative h-full min-h-0 min-w-0 overflow-hidden border border-[#d8b64a1f] bg-[#060605] shadow-[inset_0_0_42px_rgba(200,169,81,.025)] ${className}`}
      style={{ width: '100%' }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(216,182,74,.032)_1px,transparent_1px),linear-gradient(90deg,rgba(216,182,74,.026)_1px,transparent_1px)] [background-size:34px_34px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(216,182,74,.055),transparent_58%)]" />
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex h-9 items-center justify-between border-b border-[#d8b64a16] bg-[#060605]/88 px-3 backdrop-blur-sm">
        <div className="min-w-0 truncate font-mono text-[9px] uppercase tracking-[0.22em] text-[#e0c46ccc]">{title}</div>
        <div className="ml-3 shrink-0 font-mono text-[8px] uppercase tracking-[0.18em] text-[#6f6658]">{topo}</div>
      </div>
      <div className="relative z-10 h-full min-h-0 overflow-hidden pt-9">{children}</div>
    </section>
  )
}

export function MiniReadout({ label, value, hot = false }: { label: string; value: string; hot?: boolean }) {
  return (
    <div className="min-w-0 border border-[#d8b64a20] bg-[#0b0a08]/85 px-2.5 py-2 shadow-[inset_0_0_18px_rgba(200,169,81,.025)]">
      <div className="truncate font-mono text-[8px] uppercase tracking-[0.14em] text-[#6f6658]">{label}</div>
      <div className={hot ? 'mt-1 truncate font-mono text-sm text-[#d05c52]' : 'mt-1 truncate font-mono text-sm text-[#e0c46c]'}>{value}</div>
    </div>
  )
}

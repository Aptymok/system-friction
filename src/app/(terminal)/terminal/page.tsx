'use client'

import { useEffect } from 'react'
import { AMVChat } from '@/observatory/components/terminal/AMVChat'
import { ConsoleColumn } from '@/observatory/components/terminal/ConsoleColumn'
import { MemoryColumn } from '@/observatory/components/terminal/MemoryColumn'
import { PhasePanel } from '@/observatory/components/terminal/PhasePanel'
import { StateColumn } from '@/observatory/components/terminal/StateColumn'
import { TerminalSidebar } from '@/observatory/components/terminal/TerminalSidebar'
import { TerminalTimeline } from '@/observatory/components/terminal/TerminalTimeline'
import { useTelemetryPulse } from '@/observatory/hooks/useTelemetryPulse'
import { useNodeStore } from '@/observatory/store/nodeStore'

export default function TerminalPage() {
  useTelemetryPulse()
  const bootstrap = useNodeStore((state) => state.bootstrap)

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070707] text-paper">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.12),transparent_24%),radial-gradient(circle_at_80%_20%,rgba(74,122,170,0.1),transparent_28%),#070707]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:48px_48px] opacity-10" />
      <div className="scanline fixed inset-0" />

      <div className="relative mx-auto grid min-h-screen max-w-[1880px] grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1.15fr)_380px] 2xl:grid-cols-[320px_minmax(0,1.25fr)_360px_400px] xl:px-6">
        <TerminalSidebar />

        <section className="flex min-h-[calc(100vh-56px)] flex-col gap-4">
          <ConsoleColumn />
          <TerminalTimeline />
        </section>

        <aside className="flex min-h-[calc(100vh-56px)] flex-col gap-4">
          <AMVChat />
          <MemoryColumn />
          <PhasePanel />
        </aside>

        <aside className="flex min-h-[calc(100vh-56px)] flex-col gap-4 xl:col-span-3 2xl:col-span-1">
          <StateColumn />
        </aside>
      </div>
    </main>
  );
}

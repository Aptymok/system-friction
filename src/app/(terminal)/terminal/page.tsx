'use client'

import { AMVChat } from '@/components/terminal/AMVChat'
import { ConsoleColumn } from '@/components/terminal/ConsoleColumn'
import { TerminalSidebar } from '@/components/terminal/TerminalSidebar'
import { TerminalTimeline } from '@/components/terminal/TerminalTimeline'
import { useTelemetryPulse } from '@/lib/hooks/useTelemetryPulse'

export default function TerminalPage() {
  useTelemetryPulse()

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070707] text-paper">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.04),transparent_18%)] opacity-30" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:48px_48px] opacity-10" />

      <div className="relative mx-auto grid min-h-screen max-w-[1680px] grid-cols-[320px_minmax(1fr,1.5fr)_420px] gap-4 px-4 py-4 xl:px-6">
        <TerminalSidebar />

        <section className="flex min-h-[calc(100vh-56px)] flex-col gap-4">
          <ConsoleColumn />
          <TerminalTimeline />
        </section>

        <aside className="flex min-h-[calc(100vh-56px)] flex-col gap-4">
          <AMVChat />
        </aside>
      </div>
    </main>
  );
}
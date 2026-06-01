// src/components/root/RootDashboardClient.tsx
'use client';
import { CognitiveConsole } from '@/observatory/components/dashboard/CognitiveConsole';
import { SystemOverridePanel } from '@/observatory/components/root/SystemOverridePanel';
import { GlobalMetricsView } from '@/observatory/components/root/GlobalMetricsView';
import { OperationalActivationPanel } from '@/observatory/components/root/OperationalActivationPanel';
import { LiturgiaDiagnosticPanel } from '@/observatory/components/root/LiturgiaDiagnosticPanel';
import { AcpProposalConsole } from '@/observatory/components/root/AcpProposalConsole';
import { AcpAgentRegistryPanel } from '@/observatory/components/root/AcpAgentRegistryPanel';

export function RootDashboardClient() {
  return (
    <div className="min-h-screen bg-[#060605] text-[#ccc8bc]">
      <header className="fixed inset-x-0 top-0 z-50 flex h-12 items-center border-b border-[#2e2c24] bg-[#060605]/95 backdrop-blur-xl">
        <div className="border-r border-[#2e2c24] px-5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#c8a951]">SFI Observatory</div>
        <div className="hidden h-full items-center border-r border-[#1e1c17] px-5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#7a7568] md:flex">Vista derivada por autenticación</div>
        <div className="h-full border-r border-[#1e1c17] px-5 pt-4 font-mono text-[9px] uppercase tracking-[0.14em] text-[#c8a951]">ACP · Nodo raíz</div>
        <div className="flex-1" />
        <div className="flex h-full items-center gap-2 border-l border-[#1e1c17] px-5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#7a7568]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#c8a951]" />Governance activa</div>
      </header>

      <main className="grid min-h-screen grid-cols-1 bg-[#0a0a09] pt-12 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-h-[calc(100vh-48px)] border-r border-[#1e1c17]">
          <div className="flex h-9 items-center border-b border-[#1e1c17] bg-[#0e0d0b] font-mono text-[9px] uppercase tracking-[0.12em] text-[#35312a]">
            <div className="border-r border-[#1e1c17] px-4">Twin <span className="ml-2 text-[#c8a951]">constitucional</span></div>
            <div className="border-r border-[#1e1c17] px-4">MIHM <span className="ml-2 text-[#6ab88a]">observed</span></div>
            <div className="ml-auto px-4">Kernel <span className="ml-2 text-[#c8a951]">gobernado</span></div>
          </div>

          <div className="relative min-h-[300px] overflow-hidden border-b border-[#1e1c17] bg-[#0a0a09]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(200,169,81,0.08),transparent_45%)]" />
            <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(#c8a951_1px,transparent_1px),linear-gradient(90deg,#c8a951_1px,transparent_1px)] [background-size:140px_92px]" />
            <div className="relative flex min-h-[300px] items-center justify-center p-8">
              <div className="rounded-full border border-[#c8a951] bg-[#c8a951]/5 px-12 py-10 text-center shadow-[0_0_70px_rgba(200,169,81,0.12)]">
                <div className="font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-[#c8a951]">ACP</div>
                <div className="mt-2 font-mono text-[8px] uppercase tracking-[0.14em] text-[#8a7035]">asiento cognitivo primario</div>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4">
            <OperationalActivationPanel />
            <AcpProposalConsole />
            <CognitiveConsole />
          </div>
        </section>

        <aside className="bg-[#0e0d0b]">
          <div className="border-b border-[#1e1c17] p-4">
            <div className="mb-2 font-mono text-[8px] uppercase tracking-[0.2em] text-[#8a7035]">Lectura de campo</div>
            <div className="font-serif text-[13px] italic leading-7 text-[#7a7568]">Campo raíz con propuestas gobernadas, memoria operativa y superficie multiagente. La vista no se selecciona manualmente; emerge del estado autenticado.</div>
          </div>
          <div className="space-y-4 p-4">
            <GlobalMetricsView />
            <AcpAgentRegistryPanel />
            <SystemOverridePanel />
          </div>
        </aside>
      </main>

      <LiturgiaDiagnosticPanel />
    </div>
  );
}

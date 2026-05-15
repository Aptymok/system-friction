'use client'

import { ConsoleColumn } from '@/components/terminal/ConsoleColumn';
import { MetricsPanel } from '@/components/terminal/MetricsPanel';
import { MemoryColumn } from '@/components/terminal/MemoryColumn';
import { useNodeStore } from '@/lib/store/nodeStore';

export default function TerminalPage() {
  const { status } = useNodeStore();

  return (
    <main className="flex h-screen bg-black text-green-500 overflow-hidden">
      {/* Plano Izquierdo: Archivo y Proyectos */}
      <section className="w-1/4 border-r border-green-900/30 p-4 opacity-70">
        <MemoryColumn />
      </section>

      {/* Plano Central: Comando y Confrontación */}
      <section className="flex-1 flex flex-col relative">
        {status === 'frozen' && (
          <div className="absolute inset-0 z-50 bg-red-950/20 backdrop-blur-sm flex items-center justify-center">
            <h2 className="text-red-500 text-2xl font-bold animate-pulse">SISTEMA CONGELADO</h2>
          </div>
        )}
        <ConsoleColumn />
      </section>

      {/* Plano Derecho: Instrumentación y Spectrums */}
      <section className="w-1/3 border-l border-green-900/30 p-4">
        <MetricsPanel />
      </section>
    </main>
  );
}
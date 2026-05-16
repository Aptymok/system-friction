// src/components/root/RootDashboardClient.tsx
'use client';
import { CognitiveConsole } from '@/observatory/components/dashboard/CognitiveConsole';
import { SystemOverridePanel } from '@/observatory/components/root/SystemOverridePanel';
import { GlobalMetricsView } from '@/observatory/components/root/GlobalMetricsView';
import { OperationalActivationPanel } from '@/observatory/components/root/OperationalActivationPanel';

export function RootDashboardClient() {
  return (
    <div className="flex flex-col h-screen bg-void text-paper">
      <header className="border-b border-gold/20 p-4 bg-ink/50">
        <h1 className="font-display text-xl text-gold">System Friction – Nodo Raíz</h1>
        <p className="text-xs text-zinc-400">Control total del sistema. Acceso a todos los módulos y sobreescritura.</p>
      </header>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 overflow-auto">
        <div className="lg:col-span-2">
          <OperationalActivationPanel />
          <CognitiveConsole />
        </div>
        <div className="space-y-4">
          <GlobalMetricsView />
          <SystemOverridePanel />
        </div>
      </div>
    </div>
  );
}

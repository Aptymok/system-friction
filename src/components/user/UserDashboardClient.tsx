// src/components/user/UserDashboardClient.tsx
'use client';
import { useModuleAccess } from '@/lib/hooks/useModuleAccess';
import { CognitiveConsole } from '@/components/dashboard/CognitiveConsole';
import { ModuleGate } from '@/components/dashboard/ModuleGate';

export function UserDashboardClient() {
  const { modules } = useModuleAccess();

  return (
    <div className="flex flex-col h-screen bg-void text-paper">
      <header className="border-b border-gold/20 p-4">
        <h1 className="font-display text-xl">System Friction – Panel de Usuario</h1>
        <p className="text-xs text-zinc-500">Módulos activos: {Object.keys(modules).filter(k => modules[k]).join(', ') || 'ninguno'}</p>
      </header>
      <div className="flex-1 p-4">
        <CognitiveConsole />
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <ModuleGate moduleKey="planner">
            <div className="terminal-panel p-4">Planificador activo</div>
          </ModuleGate>
          <ModuleGate moduleKey="simulator">
            <div className="terminal-panel p-4">Simulador disponible</div>
          </ModuleGate>
          <ModuleGate moduleKey="executor">
            <div className="terminal-panel p-4">Ejecutor listo</div>
          </ModuleGate>
          <ModuleGate moduleKey="social">
            <div className="terminal-panel p-4">Módulo de redes sociales</div>
          </ModuleGate>
        </div>
      </div>
    </div>
  );
}

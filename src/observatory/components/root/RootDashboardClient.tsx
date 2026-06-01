// src/components/root/RootDashboardClient.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { CognitiveConsole } from '@/observatory/components/dashboard/CognitiveConsole';
import { SystemOverridePanel } from '@/observatory/components/root/SystemOverridePanel';
import { GlobalMetricsView } from '@/observatory/components/root/GlobalMetricsView';
import { OperationalActivationPanel } from '@/observatory/components/root/OperationalActivationPanel';
import { LiturgiaDiagnosticPanel } from '@/observatory/components/root/LiturgiaDiagnosticPanel';
import { AcpProposalConsole } from '@/observatory/components/root/AcpProposalConsole';
import { AcpAgentRegistryPanel } from '@/observatory/components/root/AcpAgentRegistryPanel';
import { NodeClusterSurface } from '@/observatory/components/root/NodeClusterSurface';
import { TwinInteractionPanel } from '@/observatory/components/root/TwinInteractionPanel';
import { ArtifactRoutingPanel } from '@/observatory/components/root/ArtifactRoutingPanel';

type ModuleId = 'campo' | 'grafo' | 'twin' | 'propuestas' | 'perturbaciones' | 'artefactos' | 'agentes' | 'evidencia' | 'diagnostico';

type TwinState = {
  ok?: boolean;
  data?: {
    seed?: {
      nodeCatalog?: unknown[];
      documentCatalog?: unknown[];
      patternCatalog?: unknown[];
      mihmRuntimeMatrix?: {
        sourceState?: string;
        ihg?: number;
        nti?: number;
        ldi?: number;
        phi?: number;
        regime?: string;
      };
    };
  };
};

const MODULES: Array<{ id: ModuleId; label: string; badge: string }> = [
  { id: 'campo', label: 'Campo', badge: 'lectura' },
  { id: 'grafo', label: 'Grafo', badge: 'clusters' },
  { id: 'twin', label: 'Twin', badge: 'respuesta' },
  { id: 'propuestas', label: 'Propuestas', badge: 'ACP' },
  { id: 'perturbaciones', label: 'Perturbaciones', badge: 'sandbox' },
  { id: 'artefactos', label: 'Atlas · Cuadernillo · Sobre Negro', badge: 'PCP' },
  { id: 'agentes', label: 'Agentes', badge: 'multi' },
  { id: 'evidencia', label: 'Evidencia', badge: 'hub' },
  { id: 'diagnostico', label: 'Diagnóstico', badge: 'loop' },
];

const LAYERS = ['Observación', 'Contradicción', 'Energía', 'Validación', 'Temporalidad', 'Gobernanza', 'Memoria', 'Evidencia'];

const EVIDENCE = [
  ['SFI-CORE', 'formalización', 'live'],
  ['Nodo AGS', 'caso empírico', 'live'],
  ['Archivo de casos', 'repetibilidad', 'live'],
  ['DIOL-SF', 'instrumento', 'draft'],
  ['SFI-QOM', 'instrumento', 'draft'],
  ['CIMPS 2026', 'validación académica', 'pending'],
  ['Unipres', 'piloto institucional', 'pending'],
];

function valueOrDash(value?: number) {
  return typeof value === 'number' ? value.toFixed(3) : '—';
}

function ModuleButton({ active, label, badge, onClick }: { active: boolean; label: string; badge: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative h-full shrink-0 border-r border-[#1e1c17] px-4 font-mono text-[9px] uppercase tracking-[0.14em] transition ${
        active ? 'bg-[#c8a951]/5 text-[#c8a951]' : 'text-[#35312a] hover:bg-[#c8a951]/[0.03] hover:text-[#7a7568]'
      }`}
    >
      {label}
      <span className="ml-2 border border-current px-1.5 py-px text-[7px] opacity-60">{badge}</span>
      {active ? <span className="absolute inset-x-0 bottom-0 h-px bg-[#c8a951]" /> : null}
    </button>
  );
}

function RootReading({ twin }: { twin: TwinState | null }) {
  const matrix = twin?.data?.seed?.mihmRuntimeMatrix;
  return (
    <div className="border-b border-[#1e1c17] p-4">
      <div className="mb-2 font-mono text-[8px] uppercase tracking-[0.2em] text-[#8a7035]">Lectura ACP del campo</div>
      <div className="font-serif text-[13px] italic leading-7 text-[#7a7568]">
        El observatorio raíz no es una vista de membresía. Es una superficie de decisión: lee campo, conserva memoria, acepta perturbaciones propuestas y exige evidencia antes de permitir ejecución.
      </div>
      <div className="mt-4 grid grid-cols-2 gap-1 font-mono text-[9px]">
        <div className="bg-[#131210] p-2"><span className="text-[#35312a]">IHG</span><br /><span className="text-[#c8a951]">{valueOrDash(matrix?.ihg)}</span></div>
        <div className="bg-[#131210] p-2"><span className="text-[#35312a]">NTI</span><br /><span className="text-[#c8a951]">{valueOrDash(matrix?.nti)}</span></div>
        <div className="bg-[#131210] p-2"><span className="text-[#35312a]">LDI</span><br /><span className="text-[#c8a951]">{valueOrDash(matrix?.ldi)}</span></div>
        <div className="bg-[#131210] p-2"><span className="text-[#35312a]">Φ</span><br /><span className="text-[#c8a951]">{valueOrDash(matrix?.phi)}</span></div>
      </div>
    </div>
  );
}

function PerturbationPanel() {
  return (
    <section className="border border-[#1e1c17] bg-[#0e0d0b]">
      <div className="border-b border-[#1e1c17] px-4 py-3">
        <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-[#8a7035]">Perturbation Sandbox</p>
        <h2 className="mt-1 font-serif text-lg text-[#c8a951]">Perturbaciones propuestas</h2>
      </div>
      <div className="grid grid-cols-1 gap-1 p-3 lg:grid-cols-3">
        {[
          ['P-Δ01', 'Reducir explicación. Aumentar evidencia verificable. Cierre menor a 25 minutos.', 'bajo'],
          ['P-Δ02', 'Mover anomalía sin clasificación al Sobre Negro durante 24h antes de integrarla.', 'medio'],
          ['P-Δ03', 'Forzar contraste entre propuesta Twin y evidencia documental antes de aprobar.', 'bajo'],
        ].map(([id, body, risk]) => (
          <article key={id} className="border border-[#1e1c17] bg-[#131210] p-3">
            <div className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#6a9ac8]">{id}</div>
            <p className="mt-2 text-xs leading-6 text-[#7a7568]">{body}</p>
            <div className="mt-3 flex gap-1">
              <span className="border border-[#2e2c24] px-2 py-px font-mono text-[8px] uppercase text-[#7a7568]">riesgo {risk}</span>
              <button type="button" className="ml-auto border border-[#2a5a3a] px-2 py-px font-mono text-[8px] uppercase text-[#6ab88a]">proponer</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function EvidenceHub() {
  return (
    <section className="border border-[#1e1c17] bg-[#0e0d0b]">
      <div className="border-b border-[#1e1c17] px-4 py-3">
        <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-[#8a7035]">Evidence Hub</p>
        <h2 className="mt-1 font-serif text-lg text-[#c8a951]">Autoridad verificable</h2>
      </div>
      <div className="grid grid-cols-1 gap-1 p-3 md:grid-cols-2 xl:grid-cols-3">
        {EVIDENCE.map(([name, type, state]) => (
          <div key={name} className="border border-[#1e1c17] bg-[#131210] p-3 font-mono text-[9px]">
            <div className="text-[#c8a951]">{name}</div>
            <div className="mt-1 text-[#7a7568]">{type}</div>
            <div className={state === 'live' ? 'mt-2 text-[#6ab88a]' : state === 'draft' ? 'mt-2 text-[#8a7035]' : 'mt-2 text-[#c87060]'}>{state}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function RootDashboardClient() {
  const [activeModule, setActiveModule] = useState<ModuleId>('campo');
  const [twin, setTwin] = useState<TwinState | null>(null);

  useEffect(() => {
    fetch(`/api/twin/state?ts=${Date.now()}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setTwin(data))
      .catch(() => setTwin(null));
  }, []);

  const counts = useMemo(() => {
    const seed = twin?.data?.seed;
    return {
      nodes: seed?.nodeCatalog?.length ?? 0,
      docs: seed?.documentCatalog?.length ?? 0,
      patterns: seed?.patternCatalog?.length ?? 0,
      source: seed?.mihmRuntimeMatrix?.sourceState ?? '—',
      regime: seed?.mihmRuntimeMatrix?.regime ?? '—',
    };
  }, [twin]);

  return (
    <div className="min-h-screen bg-[#060605] text-[#ccc8bc]">
      <header className="fixed inset-x-0 top-0 z-50 flex h-12 items-center border-b border-[#2e2c24] bg-[#060605]/95 backdrop-blur-xl">
        <div className="border-r border-[#2e2c24] px-5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#c8a951]">SFI Observatory</div>
        <div className="hidden h-full items-center border-r border-[#1e1c17] px-5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#7a7568] md:flex">ACP · raíz autenticada</div>
        <div className="flex h-full min-w-0 flex-1 overflow-x-auto">
          {MODULES.map((module) => (
            <ModuleButton key={module.id} active={activeModule === module.id} label={module.label} badge={module.badge} onClick={() => setActiveModule(module.id)} />
          ))}
        </div>
        <div className="hidden h-full items-center gap-2 border-l border-[#1e1c17] px-5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#7a7568] lg:flex"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#c8a951]" />Governance activa</div>
      </header>

      <main className="grid min-h-screen grid-cols-1 bg-[#0a0a09] pt-12 lg:grid-cols-[220px_minmax(0,1fr)_320px]">
        <aside className="border-r border-[#1e1c17] bg-[#0e0d0b] lg:min-h-[calc(100vh-48px)]">
          <div className="border-b border-[#1e1c17] px-4 py-3 font-mono text-[8px] uppercase tracking-[0.2em] text-[#35312a]">Field Layers <span className="float-right text-[#8a7035]">{LAYERS.length}</span></div>
          <div className="grid grid-cols-2 gap-1 p-3 lg:flex lg:flex-col">
            {LAYERS.map((layer) => (
              <button key={layer} type="button" className="flex items-center gap-2 border border-[#1e1c17] bg-[#131210] px-3 py-2 text-left font-mono text-[9px] uppercase tracking-[0.12em] text-[#7a7568] hover:border-[#8a7035] hover:text-[#c8a951]"><span className="h-1.5 w-1.5 rounded-full bg-current" />{layer}</button>
            ))}
          </div>
          <div className="border-y border-[#1e1c17] px-4 py-3 font-mono text-[8px] uppercase tracking-[0.2em] text-[#35312a]">Catálogo <span className="float-right text-[#8a7035]">observed</span></div>
          <div className="grid grid-cols-2 gap-1 p-3 font-mono text-[9px] lg:grid-cols-1">
            <div className="border border-[#1e1c17] bg-[#131210] p-2"><span className="text-[#35312a]">nodos</span><br /><span className="text-[#c8a951]">{counts.nodes || '—'}</span></div>
            <div className="border border-[#1e1c17] bg-[#131210] p-2"><span className="text-[#35312a]">patrones</span><br /><span className="text-[#c8a951]">{counts.patterns || '—'}</span></div>
            <div className="border border-[#1e1c17] bg-[#131210] p-2"><span className="text-[#35312a]">documentos</span><br /><span className="text-[#c8a951]">{counts.docs || '—'}</span></div>
            <div className="border border-[#1e1c17] bg-[#131210] p-2"><span className="text-[#35312a]">fuente</span><br /><span className="text-[#c8a951]">{counts.source}</span></div>
          </div>
        </aside>

        <section className="min-h-[calc(100vh-48px)] border-r border-[#1e1c17]">
          <div className="flex min-h-9 flex-wrap items-center border-b border-[#1e1c17] bg-[#0e0d0b] font-mono text-[9px] uppercase tracking-[0.12em] text-[#35312a]">
            <div className="border-r border-[#1e1c17] px-4 py-2">Twin <span className="ml-2 text-[#c8a951]">constitucional</span></div>
            <div className="border-r border-[#1e1c17] px-4 py-2">MIHM <span className="ml-2 text-[#6ab88a]">{counts.source}</span></div>
            <div className="border-r border-[#1e1c17] px-4 py-2">Régimen <span className="ml-2 text-[#c8a951]">{counts.regime}</span></div>
            <div className="ml-auto px-4 py-2">Kernel <span className="ml-2 text-[#c8a951]">gobernado</span></div>
          </div>

          {(activeModule === 'campo' || activeModule === 'grafo') ? <NodeClusterSurface twin={twin} /> : null}

          <div className="space-y-4 p-4">
            {activeModule === 'campo' ? (
              <>
                <TwinInteractionPanel />
                <OperationalActivationPanel />
              </>
            ) : null}
            {activeModule === 'grafo' ? <CognitiveConsole /> : null}
            {activeModule === 'twin' ? <TwinInteractionPanel /> : null}
            {activeModule === 'propuestas' ? <AcpProposalConsole /> : null}
            {activeModule === 'perturbaciones' ? <PerturbationPanel /> : null}
            {activeModule === 'artefactos' ? <ArtifactRoutingPanel /> : null}
            {activeModule === 'agentes' ? <AcpAgentRegistryPanel /> : null}
            {activeModule === 'evidencia' ? <EvidenceHub /> : null}
            {activeModule === 'diagnostico' ? <LiturgiaDiagnosticPanel /> : null}
          </div>
        </section>

        <aside className="bg-[#0e0d0b] lg:min-h-[calc(100vh-48px)]">
          <RootReading twin={twin} />
          <div className="space-y-4 p-4">
            {activeModule === 'agentes' ? <SystemOverridePanel /> : null}
            {activeModule !== 'agentes' && activeModule !== 'diagnostico' ? <AcpAgentRegistryPanel /> : null}
            <GlobalMetricsView />
            <SystemOverridePanel />
          </div>
        </aside>
      </main>
    </div>
  );
}

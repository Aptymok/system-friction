// src/components/root/RootDashboardClient.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { SystemOverridePanel } from '@/observatory/components/root/SystemOverridePanel';
import { LiturgiaDiagnosticPanel } from '@/observatory/components/root/LiturgiaDiagnosticPanel';
import { AcpProposalConsole } from '@/observatory/components/root/AcpProposalConsole';
import { AcpAgentRegistryPanel } from '@/observatory/components/root/AcpAgentRegistryPanel';
import { TwinInteractionPanel } from '@/observatory/components/root/TwinInteractionPanel';
import { ArtifactRoutingPanel } from '@/observatory/components/root/ArtifactRoutingPanel';
import { AcpFieldRegimeView } from '@/observatory/components/root/AcpFieldRegimeView';

type ModuleId = 'campo' | 'propuestas' | 'artefactos' | 'diagnostico' | 'control';
type RightPanel = 'chat' | 'propuestas' | 'artefactos' | 'agentes' | 'control';

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

const MODULES: Array<{ id: ModuleId; label: string }> = [
  { id: 'campo', label: 'Campo Vivo' },
  { id: 'propuestas', label: 'Propuestas' },
  { id: 'artefactos', label: 'Atlas / Cuad / SN' },
  { id: 'diagnostico', label: 'Diagnóstico' },
  { id: 'control', label: 'Root' },
];

const FIELD_TOOLS = [
  { id: 'observacion', label: 'OBS', title: 'Observación', hint: 'Muestra nodos con evidencia observada.' },
  { id: 'contradiccion', label: 'CON', title: 'Contradicción', hint: 'Enfoca tensión entre intención, evidencia y ejecución.' },
  { id: 'energia', label: 'ENE', title: 'Energía', hint: 'Enfoca presión, consumo y transferencia entre nodos.' },
  { id: 'validacion', label: 'VAL', title: 'Validación', hint: 'Enfoca loops de aprobación y evidencia insuficiente.' },
  { id: 'temporalidad', label: 'TMP', title: 'Temporalidad', hint: 'Enfoca señales que requieren seguimiento.' },
  { id: 'gobernanza', label: 'GOV', title: 'Gobernanza', hint: 'Enfoca propuestas, cierre y control ACP.' },
  { id: 'memoria', label: 'MEM', title: 'Memoria', hint: 'Enfoca Atlas, Cuadernillo y Sobre Negro.' },
  { id: 'atractores', label: 'ATT', title: 'Atractores', hint: 'Proyecta dirección y estabilidad del campo.' },
];

function fmt(value?: number) {
  return typeof value === 'number' ? value.toFixed(3) : '—';
}

function MetricChip({ label, value, tone = 'gold' }: { label: string; value: string | number; tone?: 'gold' | 'green' | 'red' | 'muted' }) {
  const color = tone === 'green' ? 'text-[#6ab88a]' : tone === 'red' ? 'text-[#c87060]' : tone === 'muted' ? 'text-[#7a7568]' : 'text-[#c8a951]';
  return (
    <div className="border-l border-[#1e1c17] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.12em]">
      <span className="text-[#35312a]">{label}</span> <span className={color}>{value}</span>
    </div>
  );
}

function ModuleButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative h-full shrink-0 border-r border-[#1e1c17] px-4 font-mono text-[9px] uppercase tracking-[0.14em] transition ${
        active ? 'bg-[#c8a951]/5 text-[#c8a951]' : 'text-[#35312a] hover:bg-[#c8a951]/[0.03] hover:text-[#7a7568]'
      }`}
    >
      {label}
      {active ? <span className="absolute inset-x-0 bottom-0 h-px bg-[#c8a951]" /> : null}
    </button>
  );
}

function FieldToolButton({ tool, active, onClick }: { tool: (typeof FIELD_TOOLS)[number]; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title={`${tool.title}: ${tool.hint}`}
      onClick={onClick}
      className={`group relative h-10 w-10 rounded-full border font-mono text-[8px] uppercase tracking-[0.08em] transition ${
        active ? 'border-[#c8a951] bg-[#2e2410] text-[#c8a951]' : 'border-[#1e1c17] bg-[#0e0d0b]/90 text-[#7a7568] hover:border-[#8a7035] hover:text-[#c8a951]'
      }`}
    >
      {tool.label}
      <span className="pointer-events-none absolute left-12 top-1/2 z-30 hidden w-56 -translate-y-1/2 border border-[#1e1c17] bg-[#060605] p-2 text-left text-[8px] normal-case leading-4 tracking-normal text-[#8a7568] group-hover:block">
        <b className="block uppercase tracking-[0.14em] text-[#c8a951]">{tool.title}</b>{tool.hint}
      </span>
    </button>
  );
}

function Accordion({ title, open, onClick, children }: { title: string; open: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <section className="border-b border-[#1e1c17]">
      <button type="button" onClick={onClick} className="flex w-full items-center justify-between px-3 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#8a7035] hover:bg-[#131210]">
        {title}<span className="text-[#35312a]">{open ? '−' : '+'}</span>
      </button>
      {open ? <div className="max-h-[48vh] overflow-y-auto p-3">{children}</div> : null}
    </section>
  );
}

export function RootDashboardClient() {
  const [activeModule, setActiveModule] = useState<ModuleId>('campo');
  const [activeTool, setActiveTool] = useState('observacion');
  const [openPanel, setOpenPanel] = useState<RightPanel>('chat');
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
      ihg: seed?.mihmRuntimeMatrix?.ihg,
      nti: seed?.mihmRuntimeMatrix?.nti,
      ldi: seed?.mihmRuntimeMatrix?.ldi,
      phi: seed?.mihmRuntimeMatrix?.phi,
    };
  }, [twin]);

  return (
    <div className="h-screen overflow-hidden bg-[#060605] text-[#ccc8bc]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#2e2c24] bg-[#060605]/95 backdrop-blur-xl">
        <div className="flex h-9 items-center">
          <div className="px-4 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#c8a951]">SFI · ACP ROOT</div>
          <MetricChip label="IHG" value={fmt(counts.ihg)} tone="red" />
          <MetricChip label="NTI" value={fmt(counts.nti)} />
          <MetricChip label="LDI" value={fmt(counts.ldi)} />
          <MetricChip label="Φ" value={fmt(counts.phi)} tone="green" />
          <MetricChip label="MIHM" value={counts.source} tone="green" />
          <MetricChip label="Régimen" value={counts.regime} />
          <MetricChip label="Nodos" value={counts.nodes || '—'} tone="muted" />
          <div className="ml-auto hidden items-center gap-2 px-4 font-mono text-[9px] uppercase tracking-[0.14em] text-[#7a7568] md:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#c8a951]" /> activo
          </div>
        </div>
        <div className="flex h-9 min-w-0 overflow-x-auto border-t border-[#1e1c17]">
          {MODULES.map((module) => (
            <ModuleButton key={module.id} active={activeModule === module.id} label={module.label} onClick={() => setActiveModule(module.id)} />
          ))}
        </div>
      </header>

      <main className="grid h-screen grid-cols-1 bg-[#080808] pt-[72px] lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="relative min-h-0 overflow-hidden border-r border-[#1e1c17]">
          <div className="absolute left-3 top-3 z-20 flex flex-col gap-2">
            {FIELD_TOOLS.map((tool) => (
              <FieldToolButton key={tool.id} tool={tool} active={activeTool === tool.id} onClick={() => setActiveTool(tool.id)} />
            ))}
          </div>

          {activeModule === 'campo' ? (
            <div className="h-full overflow-y-auto">
              <AcpFieldRegimeView twin={twin} focusMode={activeTool} />
            </div>
          ) : null}
          {activeModule === 'propuestas' ? <div className="h-full overflow-y-auto p-4"><AcpProposalConsole /></div> : null}
          {activeModule === 'artefactos' ? <div className="h-full overflow-y-auto p-4"><ArtifactRoutingPanel /></div> : null}
          {activeModule === 'diagnostico' ? <div className="h-full overflow-y-auto p-4"><LiturgiaDiagnosticPanel /></div> : null}
          {activeModule === 'control' ? <div className="h-full overflow-y-auto p-4"><SystemOverridePanel /></div> : null}

          <div className="pointer-events-none absolute bottom-3 left-3 z-20 border border-[#1e1c17] bg-[#060605]/85 px-3 py-2 font-mono text-[8px] uppercase tracking-[0.12em] text-[#8a7035]">
            filtro activo: {FIELD_TOOLS.find((tool) => tool.id === activeTool)?.title}
          </div>
        </section>

        <aside className="min-h-0 overflow-hidden bg-[#0e0d0b]">
          <div className="flex h-full flex-col">
            <Accordion title="Chat Twin" open={openPanel === 'chat'} onClick={() => setOpenPanel(openPanel === 'chat' ? 'propuestas' : 'chat')}>
              <TwinInteractionPanel compact />
            </Accordion>
            <Accordion title="Propuestas" open={openPanel === 'propuestas'} onClick={() => setOpenPanel(openPanel === 'propuestas' ? 'chat' : 'propuestas')}>
              <AcpProposalConsole compact />
            </Accordion>
            <Accordion title="Atlas / Cuad / SN" open={openPanel === 'artefactos'} onClick={() => setOpenPanel(openPanel === 'artefactos' ? 'chat' : 'artefactos')}>
              <ArtifactRoutingPanel compact />
            </Accordion>
            <Accordion title="Agentes" open={openPanel === 'agentes'} onClick={() => setOpenPanel(openPanel === 'agentes' ? 'chat' : 'agentes')}>
              <AcpAgentRegistryPanel compact />
            </Accordion>
            <Accordion title="Root" open={openPanel === 'control'} onClick={() => setOpenPanel(openPanel === 'control' ? 'chat' : 'control')}>
              <SystemOverridePanel />
            </Accordion>
          </div>
        </aside>
      </main>
    </div>
  );
}

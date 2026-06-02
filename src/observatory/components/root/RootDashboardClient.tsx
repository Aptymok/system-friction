'use client';

import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Archive, BrainCircuit, CheckCircle2, Clock3, Compass, Eye, GitBranch, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { SystemOverridePanel } from '@/observatory/components/root/SystemOverridePanel';
import { AcpProposalConsole } from '@/observatory/components/root/AcpProposalConsole';
import { AcpAgentRegistryPanel } from '@/observatory/components/root/AcpAgentRegistryPanel';
import { TwinInteractionPanel } from '@/observatory/components/root/TwinInteractionPanel';
import { ArtifactRoutingPanel } from '@/observatory/components/root/ArtifactRoutingPanel';
import { AcpFieldRegimeView } from '@/observatory/components/root/AcpFieldRegimeView';
import { AcpFreeNodesView } from '@/observatory/components/root/AcpFreeNodesView';

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

const FIELD_TOOLS: Array<{ id: string; title: string; hint: string; Icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }> = [
  { id: 'observacion', title: 'Observacion', hint: 'Nodos observados, relaciones disponibles y evidencia visible.', Icon: Eye },
  { id: 'libres', title: 'Nodos libres', hint: 'Todos los nodos sueltos, flotando, sin anclaje por cluster; útil para ver fricción dispersa.', Icon: Sparkles },
  { id: 'contradiccion', title: 'Contradiccion', hint: 'Alta degradacion con evidencia incompleta.', Icon: GitBranch },
  { id: 'energia', title: 'Energia', hint: 'Flujos, grosor de edges y presion acumulada.', Icon: Zap },
  { id: 'validacion', title: 'Validacion', hint: 'Lo que falta aprobar, preparar o cerrar.', Icon: CheckCircle2 },
  { id: 'temporalidad', title: 'Temporalidad', hint: 'Latencia, senales viejas y seguimiento pendiente.', Icon: Clock3 },
  { id: 'gobernanza', title: 'Gobernanza', hint: 'ACP, propuestas, bloqueos y autorizaciones.', Icon: ShieldCheck },
  { id: 'memoria', title: 'Memoria', hint: 'Atlas, Cuadernillo, Sobre Negro y documentos.', Icon: Archive },
  { id: 'atractores', title: 'Atractores', hint: 'Direccion, tension y alineacion del campo.', Icon: Compass },
];

function fmt(value?: number) {
  return typeof value === 'number' ? value.toFixed(3) : '-';
}

function MetricChip({ label, value, tone = 'gold' }: { label: string; value: string | number; tone?: 'gold' | 'green' | 'red' | 'muted' }) {
  const color = tone === 'green' ? 'text-[#6ab88a]' : tone === 'red' ? 'text-[#c87060]' : tone === 'muted' ? 'text-[#7a7568]' : 'text-[#c8a951]';
  return (
    <div className="border-l border-[#1e1c17] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.12em]">
      <span className="text-[#35312a]">{label}</span> <span className={color}>{value}</span>
    </div>
  );
}

function FieldToolButton({ tool, active, onClick }: { tool: (typeof FIELD_TOOLS)[number]; active: boolean; onClick: () => void }) {
  const Icon = tool.Icon;
  return (
    <button
      type="button"
      title={`${tool.title}: ${tool.hint}`}
      onClick={onClick}
      className={`group relative grid h-10 w-10 place-items-center rounded-full border transition ${
        active ? 'border-[#c8a951] bg-[#2e2410] text-[#c8a951]' : 'border-[#1e1c17] bg-[#0e0d0b]/90 text-[#7a7568] hover:border-[#8a7035] hover:text-[#c8a951]'
      }`}
    >
      <Icon size={15} strokeWidth={1.7} />
      <span className="pointer-events-none absolute left-12 top-1/2 z-30 hidden w-56 -translate-y-1/2 border border-[#1e1c17] bg-[#060605] p-2 text-left font-mono text-[8px] normal-case leading-4 tracking-normal text-[#8a7568] group-hover:block">
        <b className="block uppercase tracking-[0.14em] text-[#c8a951]">{tool.title}</b>{tool.hint}
      </span>
    </button>
  );
}

function Accordion({ title, open, onClick, children }: { title: string; open: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <section className="min-h-0 border-b border-[#1e1c17]">
      <button type="button" onClick={onClick} className="flex w-full items-center justify-between px-3 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#8a7035] hover:bg-[#131210]">
        {title}<span className="text-[#35312a]">{open ? '-' : '+'}</span>
      </button>
      {open ? <div className="max-h-[54vh] overflow-y-auto p-3">{children}</div> : null}
    </section>
  );
}

export function RootDashboardClient() {
  const [activeTool, setActiveTool] = useState('observacion');
  const [openPanel, setOpenPanel] = useState<RightPanel>('chat');
  const [selectedNodeLabel, setSelectedNodeLabel] = useState<string | null>(null);
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
      source: seed?.mihmRuntimeMatrix?.sourceState ?? '-',
      regime: seed?.mihmRuntimeMatrix?.regime ?? '-',
      ihg: seed?.mihmRuntimeMatrix?.ihg,
      nti: seed?.mihmRuntimeMatrix?.nti,
      ldi: seed?.mihmRuntimeMatrix?.ldi,
      phi: seed?.mihmRuntimeMatrix?.phi,
    };
  }, [twin]);

  return (
    <div className="h-screen overflow-hidden bg-[#060605] text-[#ccc8bc]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#2e2c24] bg-[#060605]/95 backdrop-blur-xl">
        <div className="flex h-9 items-center overflow-x-auto">
          <div className="flex shrink-0 items-center gap-2 px-4 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#c8a951]">
            <BrainCircuit size={14} strokeWidth={1.8} /> SFI / ACP ROOT
          </div>
          <MetricChip label="IHG" value={fmt(counts.ihg)} tone="red" />
          <MetricChip label="NTI" value={fmt(counts.nti)} />
          <MetricChip label="LDI" value={fmt(counts.ldi)} />
          <MetricChip label="PHI" value={fmt(counts.phi)} tone="green" />
          <MetricChip label="MIHM" value={counts.source} tone="green" />
          <MetricChip label="Regimen" value={counts.regime} />
          <MetricChip label="Nodos" value={counts.nodes || '-'} tone="muted" />
          <MetricChip label="Docs" value={counts.docs || '-'} tone="muted" />
          <MetricChip label="Patrones" value={counts.patterns || '-'} tone="muted" />
          <div className="ml-auto hidden shrink-0 items-center gap-2 px-4 font-mono text-[9px] uppercase tracking-[0.14em] text-[#7a7568] md:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#c8a951]" /> campo activo
          </div>
        </div>
      </header>

      <main className="grid h-screen grid-cols-1 bg-[#080808] pt-9 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="relative min-h-0 overflow-hidden border-r border-[#1e1c17]">
          <div className="absolute left-3 top-3 z-20 flex flex-col gap-2">
            {FIELD_TOOLS.map((tool) => (
              <FieldToolButton key={tool.id} tool={tool} active={activeTool === tool.id} onClick={() => setActiveTool(tool.id)} />
            ))}
          </div>

          {activeTool === 'libres' ? (
            <AcpFreeNodesView
              twin={twin}
              onOpenTwin={(node) => {
                setSelectedNodeLabel(node?.label ?? null);
                setOpenPanel('chat');
              }}
            />
          ) : (
            <AcpFieldRegimeView
              twin={twin}
              focusMode={activeTool}
              onOpenTwin={(node) => {
                setSelectedNodeLabel(node?.label ?? null);
                setOpenPanel('chat');
              }}
            />
          )}

          <div className="pointer-events-none absolute bottom-3 left-3 z-20 border border-[#1e1c17] bg-[#060605]/85 px-3 py-2 font-mono text-[8px] uppercase tracking-[0.12em] text-[#8a7035]">
            lente: {FIELD_TOOLS.find((tool) => tool.id === activeTool)?.title}
          </div>
        </section>

        <aside className="min-h-0 overflow-hidden bg-[#0e0d0b]">
          <div className="flex h-full flex-col">
            <Accordion title="Chat Twin" open={openPanel === 'chat'} onClick={() => setOpenPanel(openPanel === 'chat' ? 'propuestas' : 'chat')}>
              <TwinInteractionPanel compact selectedNodeLabel={selectedNodeLabel} onArtifactIntent={() => setOpenPanel('artefactos')} />
            </Accordion>
            <Accordion title="Propuestas" open={openPanel === 'propuestas'} onClick={() => setOpenPanel(openPanel === 'propuestas' ? 'chat' : 'propuestas')}>
              <AcpProposalConsole compact />
            </Accordion>
            <Accordion title="Atlas / Cuadernillo / Sobre Negro" open={openPanel === 'artefactos'} onClick={() => setOpenPanel(openPanel === 'artefactos' ? 'chat' : 'artefactos')}>
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

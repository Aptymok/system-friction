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
import { AcpAttractorFieldView } from '@/observatory/components/root/AcpAttractorFieldView';
import { RootOperationsConsole } from '@/observatory/components/root/RootOperationsConsole';
import { RootObservatoryIndex } from '@/observatory/components/root/RootObservatoryIndex';
import { RootLogbookConsole } from '@/observatory/components/root/RootLogbookConsole';
import { VisorMode } from '@/observatory/components/root/VisorMode';
import { useVisorMode } from '@/observatory/components/root/visorHooks';
import { buildRootAttractorState } from '@/lib/root/rootAttractorState';
import { buildRootFieldState } from '@/lib/root/rootFieldState';
import { translateRootMihm } from '@/lib/root/rootMihmTranslator';
import { translateRootWsv } from '@/lib/root/rootWsvTranslator';

type RightPanel = 'chat' | 'propuestas' | 'artefactos' | 'agentes' | 'control';

type TwinState = {
  ok?: boolean;
  data?: {
    worldspect?: unknown;
    mihmRuntimeMatrix?: unknown;
    kernel?: unknown;
    proposals?: unknown[];
    amvScopes?: Array<{
      scope: string;
      label: string;
      state: string;
      sourceTrust: string;
      latestReading?: { label?: string; summary?: string; observedAt?: string } | null;
      evidenceCount: number;
      canFeedRegime: boolean;
      canSupportAttractor: boolean;
      warnings: string[];
    }>;
    warnings?: string[];
    seed?: {
      nodeCatalog?: unknown[];
      documentCatalog?: unknown[];
      patternCatalog?: unknown[];
      executionCatalog?: unknown[];
      recentEvents?: unknown[];
      latestWorldSpect?: unknown;
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

const FIELD_TOOL_IDS = FIELD_TOOLS.map((tool) => tool.id);
const RIGHT_PANEL_IDS: RightPanel[] = ['chat', 'propuestas', 'artefactos', 'agentes', 'control'];

function readVisualSessionValue<T extends string>(key: string, fallback: T, allowed: readonly T[]) {
  if (typeof window === 'undefined') return fallback;
  const stored = window.sessionStorage.getItem(key) as T | null;
  return stored && allowed.includes(stored) ? stored : fallback;
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

function shortText(value: string, max = 58) {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function FieldStateItem({ question, answer, detail }: { question: string; answer: string; detail: string }) {
  return (
    <div title={`${question}: ${detail}`} className="min-w-[210px] border-l border-[#1e1c17] px-3 py-2">
      <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#4d4639]">{question}</div>
      <div className="mt-1 truncate text-[11px] leading-4 text-[#c8a951]">{shortText(answer)}</div>
    </div>
  );
}

export function RootDashboardClient() {
  const [activeTool, setActiveTool] = useState(() => readVisualSessionValue('root:active-tool', 'observacion', FIELD_TOOL_IDS));
  const [isAttractorConsolidation, setIsAttractorConsolidation] = useState(() => readVisualSessionValue('root:active-tool', 'observacion', FIELD_TOOL_IDS) === 'atractores');
  const [openPanel, setOpenPanel] = useState<RightPanel>(() => readVisualSessionValue('root:open-panel', 'chat', RIGHT_PANEL_IDS));
  const [continuityNotice, setContinuityNotice] = useState('Continuidad de observacion: activa.');
  const [selectedNodeLabel, setSelectedNodeLabel] = useState<string | null>(null);
  const [twin, setTwin] = useState<TwinState | null>(null);
  const visor = useVisorMode();

  useEffect(() => {
    fetch(`/api/twin/state?ts=${Date.now()}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setTwin(data))
      .catch(() => setTwin(null));
  }, []);

  const fieldState = useMemo(() => buildRootFieldState(twin ?? {}), [twin]);
  const attractorState = useMemo(() => buildRootAttractorState(twin ?? {}), [twin]);
  const wsvReading = useMemo(() => translateRootWsv(twin?.data?.worldspect ?? twin?.data?.seed?.latestWorldSpect), [twin]);
  const mihmReading = useMemo(() => translateRootMihm(twin?.data?.mihmRuntimeMatrix ?? twin?.data?.seed?.mihmRuntimeMatrix), [twin]);

  useEffect(() => {
    window.sessionStorage.setItem('root:active-tool', activeTool);
  }, [activeTool]);

  useEffect(() => {
    window.sessionStorage.setItem('root:open-panel', openPanel);
    if (openPanel === 'control') visor.setEnabled(false);
  }, [openPanel]);

  useEffect(() => {
    return () => visor.setEnabled(false);
  }, []);

  useEffect(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (navigation?.type === 'reload') {
      setContinuityNotice('Continuidad de observacion: interrumpida por recarga. ROOT recargo porque la sesion cambio, expiro o el navegador recargo la pagina.');
    }

    const onVisibilityChange = () => {
      window.sessionStorage.setItem('root:last-visibility', document.visibilityState);
      if (document.visibilityState === 'visible') {
        setContinuityNotice('Continuidad de observacion: activa.');
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  const continuityActive = continuityNotice.includes('activa');

  return (
    <div className={`h-screen overflow-hidden bg-[#060605] text-[#ccc8bc] ${visor.enabled ? 'sfi-visor-freeze' : ''}`}>
      <style>{`
        .sfi-visor-freeze * {
          animation-play-state: paused !important;
          transition-duration: 0ms !important;
        }
      `}</style>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#2e2c24] bg-[#060605]/95 backdrop-blur-xl">
        <div className="flex h-9 items-center overflow-x-auto">
          <div className="flex shrink-0 items-center gap-2 px-4 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#c8a951]">
            <BrainCircuit size={14} strokeWidth={1.8} /> SFI / ACP ROOT
          </div>
          <MetricChip label="Sistema" value={fieldState.regime.label} />
          <MetricChip label="WSV" value={wsvReading.state.label} tone={wsvReading.state.severity === 'warning' ? 'red' : 'green'} />
          <MetricChip label="MIHM" value={mihmReading.decisionGrade ? mihmReading.state.label : 'MIHM basal · Aptymok / n_0'} tone={mihmReading.decisionGrade ? 'green' : 'muted'} />
          <MetricChip label="Atractor" value={attractorState.sufficient ? attractorState.directionalWeight : 'sin lectura'} tone={attractorState.sufficient ? 'green' : 'muted'} />
          <MetricChip label="Eyectores" value={attractorState.ejectors.length || '-'} tone={attractorState.ejectors.length ? 'red' : 'muted'} />
          <MetricChip label="Cerrar" value={fieldState.openMutations.length || '-'} tone={fieldState.openMutations.length ? 'red' : 'muted'} />
          <MetricChip label="RCE" value="sin lectura suficiente" tone="muted" />
          <MetricChip label="Continuidad" value={continuityActive ? 'activa' : 'interrumpida'} tone={continuityActive ? 'green' : 'red'} />
          <MetricChip label="Archivo" value={fieldState.layerCounts.sfi_archive || '-'} tone="muted" />
          <MetricChip label="Vivo" value={fieldState.layerCounts.living_observatory || '-'} tone="muted" />
          <MetricChip label="Sandbox" value={fieldState.layerCounts.sandbox || '-'} tone="muted" />
          <div className="ml-auto hidden shrink-0 items-center gap-2 px-4 font-mono text-[9px] uppercase tracking-[0.14em] text-[#7a7568] md:flex">
            <span className={`h-1.5 w-1.5 rounded-full ${visor.enabled ? 'bg-white/30' : 'animate-pulse bg-[#c8a951]'}`} /> {visor.enabled ? 'campo congelado' : 'campo activo'}
          </div>
          <button
            type="button"
            className={`mr-2 shrink-0 border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition ${
              visor.enabled ? 'border-[#d4af37] bg-[#d4af37]/10 text-[#f2d16b]' : 'border-white/15 bg-transparent text-white/45 hover:border-[#d4af37]/45 hover:text-[#d4af37]'
            }`}
            onClick={visor.toggle}
          >
            {visor.enabled ? 'VISOR MODE: ON' : 'VISOR MODE: OFF'}
          </button>
          <button
            type="button"
            className="mr-3 shrink-0 border border-[#d4af7d]/40 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em]"
            style={{ background: 'transparent', color: isAttractorConsolidation ? '#fff' : 'rgba(212, 175, 125, 0.6)' }}
            onClick={() => {
              const nextState = !isAttractorConsolidation;
              setIsAttractorConsolidation(nextState);
              setActiveTool(nextState ? 'atractores' : 'libres');
            }}
          >
            {isAttractorConsolidation ? 'T-ATTRACTOR CONSOLIDATION: ON' : 'ATRACTOR: OFF'}
          </button>
        </div>
        <div className="flex h-14 items-stretch overflow-x-auto border-t border-[#1e1c17] bg-[#090806]">
          {fieldState.answers.map((item) => (
            <FieldStateItem key={item.question} question={item.question} answer={item.answer} detail={item.detail} />
          ))}
        </div>
      </header>

      <main className="relative grid h-screen grid-cols-1 bg-[#080808] pt-[92px] lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className={`relative min-h-0 overflow-hidden border-r border-[#1e1c17] ${visor.enabled ? 'grayscale' : ''}`}>
          <div className="absolute left-3 top-3 z-20 flex flex-col gap-2">
            {FIELD_TOOLS.map((tool) => (
              <FieldToolButton key={tool.id} tool={tool} active={activeTool === tool.id} onClick={() => {
                setActiveTool(tool.id);
                setIsAttractorConsolidation(tool.id === 'atractores');
              }} />
            ))}
          </div>

          {activeTool === 'atractores' ? (
            <AcpAttractorFieldView
              twin={twin}
              onBackToCognitive={() => {
                setIsAttractorConsolidation(false);
                setActiveTool('libres');
              }}
            />
          ) : activeTool === 'libres' ? (
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
            <div>lente: {FIELD_TOOLS.find((tool) => tool.id === activeTool)?.title}</div>
            <div className={continuityActive ? 'text-[#6ab88a]' : 'text-[#c87060]'}>{continuityNotice}</div>
          </div>
        </section>

        <aside className={`min-h-0 overflow-hidden bg-[#0e0d0b] ${visor.enabled ? 'grayscale' : ''}`}>
          <div className="flex h-full flex-col">
            <Accordion title="AMV" open={openPanel === 'chat'} onClick={() => setOpenPanel(openPanel === 'chat' ? 'propuestas' : 'chat')}>
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
              <RootObservatoryIndex scopes={twin?.data?.amvScopes} />
              <div className="mt-3">
                <RootLogbookConsole />
              </div>
              <RootOperationsConsole />
              <div className="mt-3">
                <SystemOverridePanel />
              </div>
            </Accordion>
          </div>
        </aside>
        <VisorMode enabled={visor.enabled} twin={twin} onEnable={() => visor.setEnabled(true)} onDisable={() => visor.setEnabled(false)} />
      </main>
    </div>
  );
}

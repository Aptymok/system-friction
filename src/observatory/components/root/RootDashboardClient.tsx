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

type ModuleId = 'campo' | 'grafo' | 'twin' | 'propuestas' | 'perturbaciones' | 'artefactos' | 'agentes' | 'evidencia';

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
  { id: 'grafo', label: 'Grafo', badge: 'nodos' },
  { id: 'twin', label: 'Twin', badge: 'respuesta' },
  { id: 'propuestas', label: 'Propuestas', badge: 'ACP' },
  { id: 'perturbaciones', label: 'Perturbaciones', badge: 'sandbox' },
  { id: 'artefactos', label: 'Atlas · Cuadernillo · Sobre Negro', badge: 'PCP' },
  { id: 'agentes', label: 'Agentes', badge: 'multi' },
  { id: 'evidencia', label: 'Evidencia', badge: 'hub' },
];

const CORE_NODES = [
  ['ACP', 'Asiento Cognitivo Primario', 50, 14, 'alta'],
  ['PERC', 'Percepción', 25, 30, 'alta'],
  ['CULT', 'Cultura', 73, 29, 'media'],
  ['INF', 'Información', 80, 52, 'media'],
  ['AGT', 'Agencia', 64, 76, 'baja'],
  ['ECON', 'Economía', 25, 76, 'media'],
  ['BIO', 'Biología', 14, 55, 'baja'],
  ['DIG', 'Digital', 50, 90, 'alta'],
  ['INST', 'Institución', 88, 18, 'media'],
  ['MIHM', 'Matriz Runtime', 50, 50, 'alta'],
] as const;

const LAYERS = ['Observación', 'Contradicción', 'Energía', 'Validación', 'Temporalidad', 'Gobernanza', 'Memoria', 'Evidencia'];

const ARTIFACTS = [
  {
    title: 'Atlas',
    subtitle: 'baja entropía · patrones estabilizados',
    function: 'Recibe lo que ya puede organizarse: conceptos, mapas, nodos, taxonomías, evidencias y relaciones verificadas.',
    action: 'Agregar patrón / consolidar nodo / ordenar evidencia',
  },
  {
    title: 'Cuadernillo',
    subtitle: 'bifurcación · trabajo activo',
    function: 'Recibe lo que todavía está en proceso: preguntas, hipótesis, fricciones vivas, tensiones que necesitan trabajo manual.',
    action: 'Abrir ciclo / formular pregunta / cerrar acción mínima',
  },
  {
    title: 'Sobre Negro',
    subtitle: 'sumidero · residuo no metabolizado',
    function: 'Recibe lo que no debe ordenar el sistema todavía: ruido, dolor, anomalía, contradicción sin clasificación, material sin destino.',
    action: 'Depositar residuo / diferir clasificación / revisar en ciclo',
  },
];

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
      className={`relative h-full border-r border-[#1e1c17] px-4 font-mono text-[9px] uppercase tracking-[0.14em] transition ${
        active ? 'bg-[#c8a951]/5 text-[#c8a951]' : 'text-[#35312a] hover:bg-[#c8a951]/[0.03] hover:text-[#7a7568]'
      }`}
    >
      {label}
      <span className="ml-2 border border-current px-1.5 py-px text-[7px] opacity-60">{badge}</span>
      {active ? <span className="absolute inset-x-0 bottom-0 h-px bg-[#c8a951]" /> : null}
    </button>
  );
}

function FieldGraph({ totalNodes }: { totalNodes: number }) {
  return (
    <div className="relative min-h-[460px] overflow-hidden border-b border-[#1e1c17] bg-[#0a0a09]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(200,169,81,0.09),transparent_47%)]" />
      <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(#c8a951_1px,transparent_1px),linear-gradient(90deg,#c8a951_1px,transparent_1px)] [background-size:140px_92px]" />
      <svg className="relative h-[460px] w-full" viewBox="0 0 700 460" role="img" aria-label="SFI ACP field graph">
        <defs>
          <radialGradient id="sfi-node-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#c8a951" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#c8a951" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g stroke="#c8a951" strokeOpacity="0.28">
          {CORE_NODES.filter((node) => node[0] !== 'MIHM').map((node) => (
            <line key={`edge-${node[0]}`} x1="350" y1="230" x2={(node[2] / 100) * 700} y2={(node[3] / 100) * 460} strokeWidth={node[4] === 'alta' ? 0.9 : node[4] === 'media' ? 0.55 : 0.35} strokeDasharray={node[4] === 'baja' ? '3 7' : undefined} />
          ))}
        </g>
        <circle cx="350" cy="230" r="62" fill="url(#sfi-node-glow)" stroke="#c8a951" strokeOpacity="0.45" strokeWidth="1" />
        <circle cx="350" cy="230" r="8" fill="#c8a951" opacity="0.9" />
        <text x="350" y="222" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="10" fill="#c8a951" fontWeight="700">MIHM</text>
        <text x="350" y="240" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="7" fill="#8a7035">runtime matrix</text>
        {CORE_NODES.filter((node) => node[0] !== 'MIHM').map(([id, label, x, y, pressure]) => (
          <g key={id}>
            <circle cx={(x / 100) * 700} cy={(y / 100) * 460} r={pressure === 'alta' ? 19 : pressure === 'media' ? 15 : 12} fill="rgba(200,169,81,.055)" stroke="#c8a951" strokeOpacity={pressure === 'alta' ? 0.85 : 0.55} strokeWidth={pressure === 'alta' ? 1 : 0.65} />
            <text x={(x / 100) * 700} y={(y / 100) * 460 - 3} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="7.5" fill="#c8a951">{id}</text>
            <text x={(x / 100) * 700} y={(y / 100) * 460 + 10} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="5.5" fill="#8a7035">{label}</text>
          </g>
        ))}
        <rect x="20" y="436" width="300" height="1" fill="#1e1c17" />
        <rect x="20" y="436" width={Math.max(40, Math.min(300, totalNodes * 1.2))} height="1" fill="#c8a951" opacity="0.8" />
        <text x="20" y="454" fontFamily="JetBrains Mono" fontSize="7" fill="#8a7035">catálogo observado · {totalNodes || '—'} nodos</text>
        <text x="250" y="454" fontFamily="JetBrains Mono" fontSize="7" fill="#8a7035">ACP activo · grafo raíz</text>
      </svg>
    </div>
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

function ArtifactPanel() {
  return (
    <section className="border border-[#1e1c17] bg-[#0e0d0b]">
      <div className="border-b border-[#1e1c17] px-4 py-3">
        <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-[#8a7035]">PCP · Personal Field Protocol</p>
        <h2 className="mt-1 font-serif text-lg text-[#c8a951]">Atlas · Cuadernillo · Sobre Negro</h2>
        <p className="mt-1 font-mono text-[9px] tracking-[0.08em] text-[#7a7568]">Tres artefactos. Tres destinos de energía. Ninguno sustituye al otro.</p>
      </div>
      <div className="grid grid-cols-1 gap-1 p-3 xl:grid-cols-3">
        {ARTIFACTS.map((artifact) => (
          <article key={artifact.title} className="border border-[#1e1c17] bg-[#131210] p-4">
            <div className="font-serif text-xl text-[#c8a951]">{artifact.title}</div>
            <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.16em] text-[#8a7035]">{artifact.subtitle}</div>
            <p className="mt-4 text-xs leading-6 text-[#7a7568]">{artifact.function}</p>
            <button type="button" className="mt-4 w-full border border-[#8a7035] bg-[#2e2410] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.16em] text-[#c8a951]">{artifact.action}</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function TwinInteractionPanel() {
  const prompts = [
    '¿Qué parte del campo no estoy viendo?',
    'Propón una perturbación mínima verificable.',
    '¿Qué ruta escogerías tú y por qué?',
    'Clasifica esta anomalía: Atlas, Cuadernillo o Sobre Negro.',
  ];
  return (
    <section className="border border-[#1e1c17] bg-[#0e0d0b]">
      <div className="border-b border-[#1e1c17] px-4 py-3">
        <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-[#8a7035]">Twin Conversacional ACP</p>
        <h2 className="mt-1 font-serif text-lg text-[#c8a951]">Interacción con el campo</h2>
        <p className="mt-1 font-mono text-[9px] tracking-[0.08em] text-[#7a7568]">Debe responder sobre SFI, sobre el campo, sobre tu historia operativa y sobre la decisión siguiente.</p>
      </div>
      <div className="p-3">
        <textarea className="min-h-28 w-full resize-none border border-[#1e1c17] bg-[#060605] p-3 font-mono text-xs text-[#ccc8bc] outline-none placeholder:text-[#35312a] focus:border-[#8a7035]" placeholder="Pregunta al Twin como ACP: describe el campo, solicita dirección, pide perturbación o exige clasificación…" />
        <div className="mt-2 grid grid-cols-1 gap-1 md:grid-cols-2">
          {prompts.map((prompt) => (
            <button key={prompt} type="button" className="border border-[#1e1c17] bg-[#131210] px-3 py-2 text-left font-mono text-[9px] text-[#7a7568] hover:border-[#8a7035] hover:text-[#c8a951]">{prompt}</button>
          ))}
        </div>
        <button type="button" className="mt-3 border border-[#8a7035] bg-[#2e2410] px-4 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#c8a951]">Enviar al Twin</button>
      </div>
    </section>
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
        <aside className="border-r border-[#1e1c17] bg-[#0e0d0b]">
          <div className="border-b border-[#1e1c17] px-4 py-3 font-mono text-[8px] uppercase tracking-[0.2em] text-[#35312a]">Field Layers <span className="float-right text-[#8a7035]">{LAYERS.length}</span></div>
          <div className="flex flex-col gap-1 p-3">
            {LAYERS.map((layer) => (
              <button key={layer} type="button" className="flex items-center gap-2 border border-[#1e1c17] bg-[#131210] px-3 py-2 text-left font-mono text-[9px] uppercase tracking-[0.12em] text-[#7a7568] hover:border-[#8a7035] hover:text-[#c8a951]"><span className="h-1.5 w-1.5 rounded-full bg-current" />{layer}</button>
            ))}
          </div>
          <div className="border-y border-[#1e1c17] px-4 py-3 font-mono text-[8px] uppercase tracking-[0.2em] text-[#35312a]">Catálogo <span className="float-right text-[#8a7035]">observed</span></div>
          <div className="grid grid-cols-1 gap-1 p-3 font-mono text-[9px]">
            <div className="border border-[#1e1c17] bg-[#131210] p-2"><span className="text-[#35312a]">nodos</span><br /><span className="text-[#c8a951]">{counts.nodes || '—'}</span></div>
            <div className="border border-[#1e1c17] bg-[#131210] p-2"><span className="text-[#35312a]">patrones</span><br /><span className="text-[#c8a951]">{counts.patterns || '—'}</span></div>
            <div className="border border-[#1e1c17] bg-[#131210] p-2"><span className="text-[#35312a]">documentos</span><br /><span className="text-[#c8a951]">{counts.docs || '—'}</span></div>
            <div className="border border-[#1e1c17] bg-[#131210] p-2"><span className="text-[#35312a]">fuente</span><br /><span className="text-[#c8a951]">{counts.source}</span></div>
          </div>
        </aside>

        <section className="min-h-[calc(100vh-48px)] border-r border-[#1e1c17]">
          <div className="flex h-9 items-center border-b border-[#1e1c17] bg-[#0e0d0b] font-mono text-[9px] uppercase tracking-[0.12em] text-[#35312a]">
            <div className="border-r border-[#1e1c17] px-4">Twin <span className="ml-2 text-[#c8a951]">constitucional</span></div>
            <div className="border-r border-[#1e1c17] px-4">MIHM <span className="ml-2 text-[#6ab88a]">{counts.source}</span></div>
            <div className="border-r border-[#1e1c17] px-4">Régimen <span className="ml-2 text-[#c8a951]">{counts.regime}</span></div>
            <div className="ml-auto px-4">Kernel <span className="ml-2 text-[#c8a951]">gobernado</span></div>
          </div>

          {(activeModule === 'campo' || activeModule === 'grafo') ? <FieldGraph totalNodes={counts.nodes} /> : null}

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
            {activeModule === 'artefactos' ? <ArtifactPanel /> : null}
            {activeModule === 'agentes' ? <AcpAgentRegistryPanel /> : null}
            {activeModule === 'evidencia' ? <EvidenceHub /> : null}
          </div>
        </section>

        <aside className="bg-[#0e0d0b]">
          <RootReading twin={twin} />
          <div className="space-y-4 p-4">
            {activeModule === 'agentes' ? <SystemOverridePanel /> : null}
            {activeModule !== 'agentes' ? <AcpAgentRegistryPanel /> : null}
            <GlobalMetricsView />
            <SystemOverridePanel />
          </div>
        </aside>
      </main>

      <LiturgiaDiagnosticPanel />
    </div>
  );
}

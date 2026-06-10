'use client';

import { useMemo, useState } from 'react';
import ThresholdAccess from '@/components/auth/ThresholdAccess';
import { SfiFieldCanvas } from '@/components/sfi/SfiFieldCanvas';
import { SfiMark } from '@/components/sfi/SfiMark';
import { SfiMetricRail } from '@/components/sfi/SfiMetricRail';
import { evaluateSfi } from '@/lib/sfi/math';

type AccessNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  radius: number;
  density: number;
  connections: string[];
  text: string;
};

const ACCESS_NODES: AccessNode[] = [
  { id: 'SFI', label: 'SFI', x: 0, y: 0, radius: 34, density: 0.86, connections: ['SFI_OBS_N0', 'SCOREFRICTION', 'ACCESS', 'EVIDENCE_LEDGER'], text: 'Campo institucional raiz. La entrada no abre una pantalla plana: abre un umbral de observacion.' },
  { id: 'SFI_OBS_N0', label: 'SFI-OBS-N0', x: -260, y: -140, radius: 25, density: 0.72, connections: ['AMV', 'MOPH', 'ACCESS'], text: 'Nodo raiz publico. ROOT queda como alias tecnico interno; la topologia visible opera como SFI-OBS-N0.' },
  { id: 'SCOREFRICTION', label: 'ScoreFriction', x: 220, y: 140, radius: 27, density: 0.76, connections: ['WORLDSPECTRUMVECTOR', 'MIHM', 'PHENOMENON_ENGINE'], text: 'Campo cultural conectado a MIHM y WorldSpectrumVector. No es ranking ni panel decorativo.' },
  { id: 'WORLDSPECTRUMVECTOR', label: 'WorldSpectrumVector', x: 360, y: -70, radius: 24, density: 0.68, connections: ['MIHM', 'SCOREFRICTION', 'PHENOMENON_ENGINE'], text: 'Vector rector externo. Lee presion de mundo antes de convertirla en decision interna.' },
  { id: 'MIHM', label: 'MIHM', x: 120, y: -230, radius: 24, density: 0.74, connections: ['WORLDSPECTRUMVECTOR', 'AMV', 'ACCESS'], text: 'Evaluador interno. Comprime IHG, NTI, LDI y perturbacion sin sustituir evidencia.' },
  { id: 'AMV', label: 'AMV', x: -90, y: -300, radius: 22, density: 0.64, connections: ['SFI_OBS_N0', 'MIHM', 'EVIDENCE_LEDGER'], text: 'Agente operativo. Propone lectura solo desde evidencia y declara incertidumbre.' },
  { id: 'MOPH', label: 'MOP-H', x: -330, y: 90, radius: 22, density: 0.60, connections: ['SFI_OBS_N0', 'EVIDENCE_LEDGER'], text: 'Instrumento fenomenologico. La evidencia privada aumenta densidad, no exposicion.' },
  { id: 'EVIDENCE_LEDGER', label: 'Evidence Ledger', x: -80, y: 205, radius: 23, density: 0.70, connections: ['SFI', 'AMV', 'PHENOMENON_ENGINE', 'ACCESS'], text: 'Hashes, resumen publico y referencias privadas. La entrada deja traza minima de umbral.' },
  { id: 'PHENOMENON_ENGINE', label: 'Phenomenon Engine', x: 370, y: 185, radius: 23, density: 0.58, connections: ['SCOREFRICTION', 'WORLDSPECTRUMVECTOR', 'EVIDENCE_LEDGER'], text: 'Promueve fenomenos solo si hay evidencia, tiempo y degradacion declarada.' },
  { id: 'ACCESS', label: 'ACCESS', x: 0, y: 260, radius: 30, density: 0.78, connections: ['SFI', 'SFI_OBS_N0', 'MIHM', 'EVIDENCE_LEDGER'], text: 'Activar este nodo abre el flujo real de autenticacion.' },
];

export function LoginNeuralAccess({ error }: { error?: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const selected = ACCESS_NODES.find((node) => node.id === selectedId) ?? null;
  const byId = useMemo(() => new Map(ACCESS_NODES.map((node) => [node.id, node])), []);
  const metrics = evaluateSfi({ ihg: 0.62, nti: 0.58, ldi: 0.34, xi: 0.04 });

  function move(dx: number, dy: number) {
    setView((current) => ({ ...current, x: current.x + dx, y: current.y + dy }));
  }

  function zoom(delta: number) {
    setView((current) => ({ ...current, scale: Math.max(0.72, Math.min(1.35, current.scale + delta)) }));
  }

  return (
    <main className="sfi-screen relative min-h-screen overflow-hidden bg-[#060605] text-[#c8c4b8]">
      <SfiFieldCanvas className="absolute inset-0 opacity-80" density={0.48} drift={0.42} />
      <header className="fixed left-0 right-0 top-0 z-30 flex h-[30px] items-center border-b border-[#c8a95112] bg-[#060605]/90 px-4 backdrop-blur">
        <SfiMark className="mr-3 h-4 w-4" />
        <div className="sfi-title text-[9px] text-[#c8a951]">SFI</div>
        <div className="ml-4 font-mono text-[9px] uppercase tracking-[0.2em] text-[#4a4a45]">ACCESS FIELD</div>
      </header>

      <FrameNote className="left-5 top-16" text="esto esta vivo" />
      <FrameNote className="right-5 top-16" text="mas de lo que se muestra" />
      <FrameNote className="bottom-8 left-5" text="la evidencia privada aumenta densidad" />
      <FrameNote className="bottom-8 left-1/2 -translate-x-1/2" text="clic en nodo para abrir capa" />

      <section className="absolute inset-0 z-40 pt-[30px]">
        <svg className="pointer-events-none fixed inset-0 h-full w-full overflow-visible" style={{ zIndex: 45 }} viewBox="-640 -360 1280 720" aria-hidden="true">
          <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
            {ACCESS_NODES.flatMap((node) => node.connections.map((targetId) => {
              const target = byId.get(targetId);
              if (!target) return null;
              const active = selectedId === node.id || selectedId === target.id;
              return (
                <line
                  key={`${node.id}-${target.id}`}
                  x1={node.x}
                  y1={node.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={active ? 'rgba(200,169,81,.58)' : 'rgba(200,169,81,.18)'}
                  strokeWidth={active ? 1.8 : 0.9}
                />
              );
            }))}
          </g>
        </svg>

        {ACCESS_NODES.map((node) => {
          const active = selectedId === node.id;
          const size = node.radius * 2.75 * view.scale;
          return (
            <button
              key={node.id}
              aria-label={node.text}
              onClick={() => setSelectedId(node.id)}
              className="fixed -translate-x-1/2 -translate-y-1/2 rounded-full border bg-[#120f08]/95 font-mono uppercase text-[#e8ddc3] shadow-[0_0_42px_rgba(200,169,81,.22)] transition hover:border-[#c8a951] hover:bg-[#1a1408] hover:text-[#fff4cf]"
              style={{
                left: `calc(50% + ${node.x * view.scale + view.x}px)`,
                top: `calc(50% + ${node.y * view.scale + view.y}px)`,
                zIndex: 60,
                width: `${size}px`,
                height: `${size}px`,
                borderColor: active ? '#c8a951' : `rgba(200,169,81,${0.30 + node.density * 0.36})`,
                boxShadow: active ? '0 0 0 8px rgba(200,169,81,.08), 0 0 60px rgba(200,169,81,.28)' : '0 0 42px rgba(200,169,81,.18)',
                fontSize: node.id === 'WORLDSPECTRUMVECTOR' || node.id === 'EVIDENCE_LEDGER' || node.id === 'PHENOMENON_ENGINE' ? '7px' : '9px',
              }}
            >
              {node.label}
            </button>
          );
        })}
      </section>

      <div className="fixed bottom-5 right-[260px] z-40 flex gap-2">
        <button onClick={() => move(0, 28)} className="h-8 w-8 border border-[#c8a95122] font-mono text-[#c8a951]">N</button>
        <button onClick={() => move(0, -28)} className="h-8 w-8 border border-[#c8a95122] font-mono text-[#c8a951]">S</button>
        <button onClick={() => move(28, 0)} className="h-8 w-8 border border-[#c8a95122] font-mono text-[#c8a951]">W</button>
        <button onClick={() => move(-28, 0)} className="h-8 w-8 border border-[#c8a95122] font-mono text-[#c8a951]">E</button>
        <button onClick={() => zoom(0.08)} className="h-8 w-8 border border-[#c8a95122] font-mono text-[#c8a951]">+</button>
        <button onClick={() => zoom(-0.08)} className="h-8 w-8 border border-[#c8a95122] font-mono text-[#c8a951]">-</button>
      </div>

      <SfiMetricRail metrics={metrics} />
      <div className="fixed bottom-[172px] right-5 z-50 w-[220px] border border-[#c8a95114] bg-[#060605]/90 p-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8a8678]">
        <div className="flex justify-between border-b border-[#c8a95110] py-1"><span>WORLD</span><span className="text-[#c8a951]">TENSION</span></div>
        <div className="flex justify-between py-1"><span>EVIDENCE</span><span className="text-[#c8a951]">PRIVATE+DENSE</span></div>
      </div>

      {selected ? (
        <aside className="fixed right-5 top-16 z-[70] max-h-[calc(100vh-260px)] w-[min(520px,calc(100vw-40px))] overflow-auto border border-[#6b5820] bg-[#050507]/95 p-5 shadow-[0_30px_90px_rgba(0,0,0,.8)] backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[8px] uppercase tracking-[0.34em] text-[#6b5820]">Nodo / {selected.id}</p>
              <h1 className="mt-2 font-serif text-3xl italic text-[#e8ddc3]">{selected.label}</h1>
            </div>
            <button onClick={() => setSelectedId(null)} className="border border-[#c8a95122] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#8a8678] hover:border-[#c8a951] hover:text-[#c8a951]">cerrar</button>
          </div>

          {selected.id === 'ACCESS' ? (
            <div className="mt-5">
              <ThresholdAccess error={error} />
            </div>
          ) : (
            <p className="mt-5 font-serif text-[17px] leading-7 text-[#bdb49c]">{selected.text}</p>
          )}
        </aside>
      ) : null}
    </main>
  );
}

function FrameNote({ text, className }: { text: string; className: string }) {
  return (
    <div className={`pointer-events-none fixed z-20 font-mono text-[9px] uppercase tracking-[0.22em] text-[#4a4a45] ${className}`}>
      {text}
    </div>
  );
}

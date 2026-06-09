'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type FoundationNode = {
  id: string;
  label: string;
  category: string;
  position: { x: number; y: number };
  radius: number;
  connections: string[];
  super: string;
  title: string;
  content: {
    source: string;
    summary: string;
    field: string[];
    route?: string;
  };
};

const PENDING = 'contenido institucional pendiente de formalizacion';

const NODES: FoundationNode[] = [
  {
    id: 'manifiesto',
    label: 'Manifiesto',
    category: 'carta',
    position: { x: 0, y: -170 },
    radius: 23,
    connections: ['principios', 'mision', 'ecosistema'],
    super: 'Carta Fundacional',
    title: 'Manifiesto SFI',
    content: {
      source: 'Constitution.md / docs/SFI_PUBLIC_SURFACE_STATUS.md',
      summary: 'SFI se organiza como campo observable: evidencia, friccion, trazabilidad y correccion antes que presentacion decorativa.',
      field: ['No afirma dato vivo sin fuente.', 'El observatorio traduce antes de mostrar.', 'La decision depende de evidencia y linaje.'],
    },
  },
  {
    id: 'principios',
    label: 'Principios',
    category: 'carta',
    position: { x: -170, y: -95 },
    radius: 18,
    connections: ['manifiesto', 'valores', 'metodologias'],
    super: 'Reglas',
    title: 'Principios operativos',
    content: {
      source: 'Constitution.md / docs/OBSERVATION_TRUTH_POLICY.md',
      summary: 'Observable, falseable, trazable, longitudinal y corregible. La interfaz no debe convertir disponibilidad tecnica en verdad.',
      field: ['Separar archivo, vivo, atractor, sandbox y auditoria.', 'No usar simulacion como evidencia.', 'No fortalecer regimen sin accion verificable.'],
    },
  },
  {
    id: 'fundador',
    label: 'Fundador',
    category: 'origen',
    position: { x: 145, y: -112 },
    radius: 17,
    connections: ['root', 'manifiesto', 'mision'],
    super: 'Origen',
    title: 'Aptymok',
    content: {
      source: 'docs/root/ROOT_PHASE_0_ALIGNMENT.md / src/lib/amv/scopes/root/rootDashboardSpec.ts',
      summary: 'ROOT documenta a Aptymok como sujeto raiz del observatorio personal. Mas informacion biografica queda pendiente de formalizacion.',
      field: ['ROOT existe para traducir el sistema raiz de Aptymok.', PENDING],
    },
  },
  {
    id: 'actualidad',
    label: 'Actualidad',
    category: 'estado',
    position: { x: 245, y: 15 },
    radius: 16,
    connections: ['worldspect', 'scorefriction', 'ecosistema'],
    super: 'Estado vivo',
    title: 'Actualidad del campo',
    content: {
      source: 'docs/observatories/SFI_OBSERVATORY_CONNECTION_AUDIT.md',
      summary: 'El ecosistema tiene rutas y endpoints para ScoreFriction, ROOT, WorldSpect, campo, eventos y AMV; cada lectura debe declarar si esta viva, degradada o sin datos.',
      field: ['ScoreFriction lee observaciones y vectores.', 'WorldSpect puede estar medido o missing.', 'AMV articula scopes sin crear chats paralelos.'],
    },
  },
  {
    id: 'mision',
    label: 'Mision',
    category: 'carta',
    position: { x: -70, y: -20 },
    radius: 20,
    connections: ['manifiesto', 'fundador', 'valores', 'ecosistema'],
    super: 'Direccion',
    title: 'Mision operativa',
    content: {
      source: 'Constitution.md / docs/PROCESS_MAP.md',
      summary: 'Construir instrumentos que permitan observar sistemas vivos, distinguir evidencia de inferencia y convertir friccion en decisiones verificables.',
      field: ['Traducir antes de mostrar.', 'Decidir desde linaje.', 'Mantener cada modulo conectado al campo.'],
    },
  },
  {
    id: 'metodologias',
    label: 'Metodologias',
    category: 'metodo',
    position: { x: -250, y: 32 },
    radius: 18,
    connections: ['principios', 'mihm', 'wsv', 'scorefriction'],
    super: 'Metodo',
    title: 'Metodologias SFI',
    content: {
      source: 'docs/MIHM_NODE_SPEC.md / docs/WORLDSPECT_MODEL.md / docs/scorefriction/SCOREFRICTION_OPERATING_GUIDE.md',
      summary: 'MIHM lee estabilidad del objeto, WSV ubica contexto externo y ScoreFriction observa senales culturales como evidencia imperfecta.',
      field: ['MIHM no es calculadora visible.', 'WorldSpect no inventa hechos externos.', 'ScoreFriction no juzga gusto; observa friccion.'],
    },
  },
  {
    id: 'wsv',
    label: 'WSV',
    category: 'modelo',
    position: { x: -120, y: 120 },
    radius: 17,
    connections: ['worldspect', 'metodologias', 'mihm'],
    super: 'Modelo',
    title: 'World Spectrum Vector',
    content: {
      source: 'docs/WORLDSPECT_MODEL.md / docs/root/ROOT_PHASE_9_WSV_MIHM.md',
      summary: 'WSV es lectura del mundo observado. Si no hay snapshot valido, declara lectura pendiente o degradada; no se presenta como OK.',
      field: ['Contexto amplio, social, cultural, semantico, factual, plataforma, riesgo y atencion.', 'Fuente local implica confianza limitada.'],
    },
  },
  {
    id: 'mihm',
    label: 'MIHM',
    category: 'modelo',
    position: { x: 80, y: 122 },
    radius: 17,
    connections: ['wsv', 'metodologias', 'root', 'scorefriction'],
    super: 'Modelo',
    title: 'MIHM',
    content: {
      source: 'docs/MIHM_NODE_SPEC.md',
      summary: 'MIHM mide que sostiene o rompe el sistema. No debe interpretarse sin objeto observado declarado o lectura basal explicita.',
      field: ['Recibe senales del campo.', 'Alimenta patrones y friccion.', 'Registra resultado en bitacora cuando existe soporte.'],
    },
  },
  {
    id: 'valores',
    label: 'Valores',
    category: 'carta',
    position: { x: -210, y: 185 },
    radius: 15,
    connections: ['principios', 'mision', 'ecosistema'],
    super: 'Criterio',
    title: 'Valores verificables',
    content: {
      source: 'Constitution.md / docs/OBSERVATION_TRUTH_POLICY.md',
      summary: 'Verdad operacional, trazabilidad, separacion de capas, evidencia suficiente y lenguaje comprensible.',
      field: ['No mock data.', 'No pantalla aislada.', 'No decision sin origen.'],
    },
  },
  {
    id: 'ecosistema',
    label: 'Ecosistema',
    category: 'campo',
    position: { x: 0, y: 0 },
    radius: 28,
    connections: ['manifiesto', 'mision', 'actualidad', 'scorefriction', 'root', 'worldspect', 'mihm', 'wsv', 'moph'],
    super: 'Indice ontologico',
    title: 'Ecosistema SFI',
    content: {
      source: 'docs/root/ROOT_FULL_ECOSYSTEM_ASSEMBLY_REPORT.md / docs/observatories/SFI_OBSERVATORY_CONNECTION_AUDIT.md',
      summary: 'AMV organiza scopes, observatorios e instrumentos sin hacer que uno pertenezca a otro. ROOT, ScoreFriction, WorldSpect y Atlas se conectan por contrato.',
      field: ['Repositorio como mapa de pertenencia.', 'Observatorios como instrumentos.', 'Modelos como criterio de lectura.'],
    },
  },
  {
    id: 'scorefriction',
    label: 'ScoreFriction',
    category: 'observatorio',
    position: { x: 190, y: 140 },
    radius: 22,
    connections: ['ecosistema', 'mihm', 'actualidad', 'metodologias'],
    super: 'Observatorio cultural',
    title: 'ScoreFriction',
    content: {
      source: 'docs/scorefriction/SCOREFRICTION_OPERATING_GUIDE.md',
      summary: 'Observa senales culturales como evidencia imperfecta: friccion, cobertura, persistencia y posibilidad de protoatractor.',
      field: ['Protoatractores observan convergencias, no preferencias.', 'El Cognitive Twin Cultural observa hipotesis, no gustos musicales.', 'Las propuestas deben verificarse.'],
      route: '/scorefriction',
    },
  },
  {
    id: 'root',
    label: 'ROOT',
    category: 'observatorio',
    position: { x: 205, y: -175 },
    radius: 21,
    connections: ['ecosistema', 'fundador', 'mihm', 'actualidad'],
    super: 'Observatorio raiz',
    title: 'ROOT',
    content: {
      source: 'Constitution.md / docs/root/ROOT_PHASE_0_ALIGNMENT.md',
      summary: 'ROOT traduce el estado del sistema raiz de Aptymok a lenguaje operativo. No es dashboard tecnico ni producto multiusuario.',
      field: ['Que esta pasando.', 'Que sostiene o contamina.', 'Que decision minima sigue.'],
      route: '/root',
    },
  },
  {
    id: 'worldspect',
    label: 'WorldSpect',
    category: 'observatorio',
    position: { x: -35, y: 232 },
    radius: 20,
    connections: ['wsv', 'actualidad', 'ecosistema', 'scorefriction'],
    super: 'Entorno externo',
    title: 'WorldSpect',
    content: {
      source: 'docs/WORLDSPECT_MODEL.md / docs/TICKET_01_WORLDSPECT_DAILY_SNAPSHOTS.md',
      summary: 'WorldSpect/WSV funciona como entorno externo del objeto observado. Puede leer contexto medido o declarar unavailable/missing.',
      field: ['No consulta el mundo por defecto.', 'No hace polling.', 'No inventa hechos externos.'],
    },
  },
  {
    id: 'moph',
    label: 'MOP-H',
    category: 'instrumento',
    position: { x: -300, y: -158 },
    radius: 16,
    connections: ['ecosistema', 'metodologias', 'manifiesto'],
    super: 'Instrumento',
    title: 'MOP-H Field Gate',
    content: {
      source: 'docs/reference/MOP-H.html / docs/amv/AMV_ACCESS_POLICY.md',
      summary: 'Instrumento de observacion humana no clinica. La formalizacion publica se integra como experiencia local sin envio externo automatico.',
      field: ['Observa interaccion.', 'Genera evidencia local.', 'No expone MOP-H privado.'],
      route: '/moph',
    },
  },
];

const CATEGORY_COLOR: Record<string, string> = {
  carta: '#d8bf73',
  origen: '#f1dca0',
  estado: '#9f8f63',
  metodo: '#c8a951',
  modelo: '#d5c58b',
  campo: '#f0d172',
  observatorio: '#b8924b',
  instrumento: '#dfc36f',
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function nodeById(id: string) {
  return NODES.find((node) => node.id === id);
}

export function FoundationFieldRepository() {
  const [selectedId, setSelectedId] = useState('ecosistema');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const selected = nodeById(selectedId) ?? NODES[0];
  const hovered = hoveredId ? nodeById(hoveredId) : null;

  const links = useMemo(() => {
    const pairs: Array<[FoundationNode, FoundationNode]> = [];
    NODES.forEach((node) => {
      node.connections.forEach((targetId) => {
        const target = nodeById(targetId);
        if (target && node.id < target.id) pairs.push([node, target]);
      });
    });
    return pairs;
  }, []);

  function move(dx: number, dy: number) {
    setView((current) => ({ ...current, x: clamp(current.x + dx, -260, 260), y: clamp(current.y + dy, -220, 220) }));
  }

  function zoom(delta: number) {
    setView((current) => ({ ...current, zoom: clamp(current.zoom + delta, 0.72, 1.72) }));
  }

  function selectNode(id: string) {
    setSelectedId(id);
    const target = nodeById(id);
    if (target) setView((current) => ({ ...current, x: clamp(-target.position.x * 0.22, -220, 220), y: clamp(-target.position.y * 0.22, -190, 190) }));
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#050507] text-[#e8e4d8]">
      <section className="relative min-h-screen">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(201,168,76,0.1),transparent_45%),linear-gradient(rgba(201,168,76,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(201,168,76,0.025)_1px,transparent_1px)] bg-[size:auto,42px_42px,42px_42px]" />
        <header className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-6 py-5">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.52em] text-[#c9a84c]">System Friction Institute</p>
            <h1 className="mt-3 font-serif text-3xl font-light tracking-[0.08em] text-[#f0e4c1] md:text-5xl">Repositorio Fundacional</h1>
          </div>
          <nav className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em]">
            <Link href="/" className="border border-[#c9a84c22] px-3 py-2 text-[#8f8155] hover:border-[#c9a84c] hover:text-[#f0d172]">SFI</Link>
            <Link href="/scorefriction" className="border border-[#c9a84c22] px-3 py-2 text-[#8f8155] hover:border-[#c9a84c] hover:text-[#f0d172]">ScoreFriction</Link>
            <Link href="/root" className="border border-[#c9a84c22] px-3 py-2 text-[#8f8155] hover:border-[#c9a84c] hover:text-[#f0d172]">ROOT</Link>
          </nav>
        </header>

        <div className="absolute inset-0 z-10 pt-24">
          <svg className="h-full w-full" viewBox="-420 -300 840 600" role="img" aria-label="Campo nodal del repositorio fundacional">
            <g transform={`translate(${view.x} ${view.y}) scale(${view.zoom})`}>
              {links.map(([from, to]) => {
                const active = selected.connections.includes(to.id) || selected.connections.includes(from.id) || selected.id === from.id || selected.id === to.id;
                return (
                  <line
                    key={`${from.id}-${to.id}`}
                    x1={from.position.x}
                    y1={from.position.y}
                    x2={to.position.x}
                    y2={to.position.y}
                    stroke={active ? '#c9a84c' : '#6b5820'}
                    strokeOpacity={active ? 0.48 : 0.18}
                    strokeWidth={active ? 1.4 : 0.8}
                  />
                );
              })}
              {NODES.map((node) => {
                const active = node.id === selected.id;
                const linked = selected.connections.includes(node.id);
                const fill = CATEGORY_COLOR[node.category] ?? '#c9a84c';
                return (
                  <g key={node.id} onMouseEnter={() => setHoveredId(node.id)} onMouseLeave={() => setHoveredId(null)} onClick={() => selectNode(node.id)} className="cursor-pointer">
                    <circle cx={node.position.x} cy={node.position.y} r={node.radius + 12} fill={fill} opacity={active ? 0.17 : linked ? 0.1 : 0.035} />
                    <circle cx={node.position.x} cy={node.position.y} r={node.radius} fill="#050507" stroke={fill} strokeWidth={active ? 2.2 : 1} opacity={active || linked ? 1 : 0.76} />
                    <circle cx={node.position.x} cy={node.position.y} r={Math.max(3, node.radius * 0.18)} fill={fill} opacity={active ? 1 : 0.62} />
                    <text x={node.position.x} y={node.position.y + node.radius + 18} textAnchor="middle" className="select-none fill-[#d8c27a] font-mono text-[9px] uppercase tracking-[0.18em]">
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        <aside className="absolute bottom-6 left-6 z-20 w-[min(360px,calc(100vw-48px))] border border-[#c9a84c22] bg-[#050507cc] p-4 backdrop-blur">
          <p className="font-mono text-[8px] uppercase tracking-[0.32em] text-[#6b5820]">Orientacion</p>
          <div className="mt-3 h-28 border border-[#c9a84c18] bg-[#080806]">
            <svg viewBox="-360 -260 720 520" className="h-full w-full">
              {NODES.map((node) => (
                <circle key={node.id} cx={node.position.x} cy={node.position.y} r={node.id === selected.id ? 10 : 5} fill={node.id === selected.id ? '#f0d172' : '#6b5820'} opacity={node.id === selected.id ? 1 : 0.55} />
              ))}
            </svg>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => move(0, 32)} className="h-8 w-8 border border-[#c9a84c22] font-mono text-[#c9a84c]">N</button>
            <button onClick={() => move(0, -32)} className="h-8 w-8 border border-[#c9a84c22] font-mono text-[#c9a84c]">S</button>
            <button onClick={() => move(32, 0)} className="h-8 w-8 border border-[#c9a84c22] font-mono text-[#c9a84c]">O</button>
            <button onClick={() => move(-32, 0)} className="h-8 w-8 border border-[#c9a84c22] font-mono text-[#c9a84c]">E</button>
            <button onClick={() => zoom(0.12)} className="h-8 w-8 border border-[#c9a84c22] font-mono text-[#c9a84c]">+</button>
            <button onClick={() => zoom(-0.12)} className="h-8 w-8 border border-[#c9a84c22] font-mono text-[#c9a84c]">-</button>
          </div>
          <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-[#4a4840]">Hover: {hovered?.label ?? 'sin nodo'} / Zoom: {view.zoom.toFixed(2)}</p>
        </aside>

        <article className="absolute right-6 top-28 z-20 max-h-[calc(100vh-156px)] w-[min(520px,calc(100vw-48px))] overflow-auto border border-[#6b5820] bg-[#050507ee] backdrop-blur">
          <div className="flex items-start justify-between border-b border-[#c9a84c14] p-5">
            <div>
              <p className="font-mono text-[8px] uppercase tracking-[0.32em] text-[#6b5820]">{selected.super}</p>
              <h2 className="mt-2 font-serif text-2xl italic text-[#f0e4c1]">{selected.title}</h2>
            </div>
            <button onClick={() => setSelectedId('ecosistema')} className="border border-[#c9a84c22] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#8f8155] hover:border-[#c9a84c] hover:text-[#f0d172]">Centro</button>
          </div>
          <div className="space-y-5 p-5">
            <section>
              <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#c9a84c]">Lectura</p>
              <p className="mt-3 font-serif text-base leading-7 text-[#bdb49c]">{selected.content.summary}</p>
            </section>
            <section>
              <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#c9a84c]">Campo</p>
              <ul className="mt-3 space-y-2 font-mono text-[11px] leading-5 text-[#a79d8c]">
                {selected.content.field.map((item) => <li key={item} className="border-l border-[#6b5820] pl-3">{item}</li>)}
              </ul>
            </section>
            <section>
              <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#c9a84c]">Fuente repo</p>
              <p className="mt-2 font-mono text-[10px] leading-5 text-[#706a5c]">{selected.content.source}</p>
            </section>
            <section>
              <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#c9a84c]">Conexiones</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selected.connections.map((id) => {
                  const target = nodeById(id);
                  if (!target) return null;
                  return (
                    <button key={id} onClick={() => selectNode(id)} className="border border-[#c9a84c22] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#a89469] hover:border-[#c9a84c] hover:text-[#f0d172]">
                      {target.label}
                    </button>
                  );
                })}
              </div>
            </section>
            {selected.content.route ? (
              <Link href={selected.content.route} className="inline-flex border border-[#c9a84c66] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#f0d172] hover:bg-[#c9a84c12]">
                Abrir instrumento
              </Link>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  );
}

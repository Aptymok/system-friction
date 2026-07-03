'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { SfiWorldInterfaceState } from '@/lib/sfi/worldInterfaceState';
import type { LonLat, MapPoint } from '@/lib/sfi/observatory/solarTerminator';
import type { SfiWorldInterpretation } from '@/lib/sfi/observatory/worldInterpretation';

type Props = {
  state: SfiWorldInterfaceState;
  terminator?: MapPoint[];
  subsolar?: LonLat;
  interpretation?: SfiWorldInterpretation;
};

type Indicator = {
  key: string;
  label: string;
  sublabel: string;
  value: number;
  display: string;
  level: string;
  detail: string;
  delta24h: number | null;
};

const WSV_NODES = new Set(['sfi-hq', 'world-vector', 'field', 'system-health', 'scorefriction']);

const NAV_ITEMS = [
  { n: '01', label: 'REPOSITORY', sub: 'Memoria estructural', href: '/repository' },
  { n: '02', label: 'FIELD', sub: 'Mapa del campo', href: '/field' },
  { n: '03', label: 'WORLD VECTOR', sub: 'Vectores globales', href: '/world-vector' },
  { n: '04', label: 'OBSERVATORIO', sub: 'Lectura en tiempo real', href: '/observatory' },
  { n: '05', label: 'ROOT', sub: 'Gobernanza', href: '/root/agents' },
  { n: '06', label: 'CONTACTO', sub: 'Instituto', href: '/contact?offer=SFI-DR01' },
];

function clamp(v: number) {
  return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
}
function sx(v: number) {
  return clamp(v / 100) * 1200;
}
function sy(v: number) {
  return clamp(v / 100) * 600;
}
function level(v: number) {
  if (v >= 0.66) return 'ALTO';
  if (v >= 0.34) return 'MEDIO';
  return 'BAJO';
}
function idx100(v: number) {
  return Number((clamp(v) * 100).toFixed(1));
}
function deltaLabel(delta: number | null) {
  if (delta === null) return 'historial 24h en construcción';
  const points = Number((delta * 100).toFixed(1));
  return `${points > 0 ? '+' : ''}${points} · 24H`;
}
function lonLatToSvg(point: LonLat) {
  return {
    x: ((point.lon + 180) / 360) * 1200,
    y: ((90 - point.lat) / 180) * 600,
  };
}
function terminatorPath(points: MapPoint[] | undefined) {
  if (!points?.length) return '';
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${sx(point.x).toFixed(2)} ${sy(point.y).toFixed(2)}`).join(' ');
}

function GaugeRing({ value, tone }: { value: number; tone: 'gold' | 'red' | 'amber' }) {
  const r = 15.5;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamp(value));
  const stroke = tone === 'red' ? 'var(--r)' : tone === 'amber' ? 'var(--a)' : 'var(--gb)';
  return (
    <svg className="gauge" viewBox="0 0 40 40" aria-hidden="true">
      <circle className="track" cx="20" cy="20" r={r} />
      <circle className="fill" cx="20" cy="20" r={r} style={{ stroke, strokeDasharray: c, strokeDashoffset: offset }} transform="rotate(-90 20 20)" />
    </svg>
  );
}

function GaugeCard({ ind, tone }: { ind: Indicator; tone: 'gold' | 'red' | 'amber' }) {
  return (
    <article className="gcard">
      <header>
        <div>
          <h3>{ind.label}</h3>
          <p>{ind.sublabel}</p>
        </div>
        <GaugeRing value={ind.value} tone={tone} />
      </header>
      <div className="readout">
        <strong>{ind.display}</strong>
        <span>/100</span>
        <em className={`lvl lvl-${ind.level.toLowerCase()}`}>{ind.level}</em>
      </div>
      <p className="delta">{deltaLabel(ind.delta24h)}</p>
      <p className="detail">{ind.detail}</p>
    </article>
  );
}

function Radar({ indicators }: { indicators: Indicator[] }) {
  const c = 90;
  const max = 62;
  const count = indicators.length;
  const poly = indicators
    .map((d, i) => {
      const a = -Math.PI / 2 + (i / count) * Math.PI * 2;
      const r = 12 + d.value * (max - 12);
      return `${c + Math.cos(a) * r},${c + Math.sin(a) * r}`;
    })
    .join(' ');
  return (
    <svg className="radar" viewBox="0 0 180 180" aria-hidden="true">
      {[0.33, 0.66, 1].map((l) => <circle key={l} cx={c} cy={c} r={max * l} />)}
      {indicators.map((d, i) => {
        const a = -Math.PI / 2 + (i / count) * Math.PI * 2;
        return (
          <g key={d.key}>
            <line x1={c} y1={c} x2={c + Math.cos(a) * max} y2={c + Math.sin(a) * max} />
            <text x={c + Math.cos(a) * (max + 16)} y={c + Math.sin(a) * (max + 16)}>{d.label}</text>
          </g>
        );
      })}
      <polygon className="radar-fill" points={poly} />
      <polygon className="radar-edge" points={poly} />
    </svg>
  );
}

export function SfiObservatoryHero({ state, terminator, subsolar, interpretation }: Props) {
  const nodes = useMemo(() => state.nodes.filter((n) => WSV_NODES.has(n.id)).slice(0, 6), [state.nodes]);
  const usableNodes = nodes.length >= 3 ? nodes : state.nodes.slice(0, 5);
  const links = state.connections.filter(
    (c) => usableNodes.some((n) => n.id === c.from) && usableNodes.some((n) => n.id === c.to),
  );
  const [selected, setSelected] = useState(usableNodes[0]?.id ?? 'sfi-hq');
  const [open, setOpen] = useState(false);
  const node = usableNodes.find((n) => n.id === selected) ?? usableNodes[0];
  const { ihg, nti, ldi, wsv } = state.coreIndicators;
  const operational = state.warnings.length === 0 || (!state.warnings.includes('worldspect_snapshot_missing') && ihg.value > 0);
  const termPath = terminatorPath(terminator);
  const sun = subsolar ? lonLatToSvg(subsolar) : null;

  const indicators: Indicator[] = [
    { key: 'ihg', label: 'IHG', sublabel: 'Índice de Gravedad Holística', value: ihg.value, display: idx100(ihg.value).toString(), level: level(ihg.value), detail: state.sfiIndex.detail, delta24h: ihg.delta24h },
    { key: 'nti', label: 'NTI', sublabel: 'Índice de Tensión Neta', value: nti.value, display: idx100(nti.value).toString(), level: level(nti.value), detail: 'Tensión media de nodos WorldSpect visibles', delta24h: nti.delta24h },
    { key: 'ldi', label: 'LDI', sublabel: 'Índice de Desgaste Sistémico', value: ldi.value, display: idx100(ldi.value).toString(), level: level(ldi.value), detail: state.frictionLevel.trend, delta24h: ldi.delta24h },
  ];

  const DOMAIN_LABELS: Record<string, string> = {
    INSTITUTIONAL: 'INSTITUCIONAL',
    TECHNOLOGY_AI_DATA: 'TECNOLÓGICO',
    ECONOMY_MARKET_CAPITAL: 'ECONÓMICO',
    CULTURE_SIGNAL_NARRATIVE: 'CULTURAL',
    SOCIAL_BEHAVIORAL: 'SOCIAL',
    ARCHITECTURE_CITY_SPACE: 'ESPACIAL',
  };
  const domainRadar: Indicator[] = state.domainBreakdown
    .filter((d) => d.value !== null)
    .slice(0, 6)
    .map((d) => ({
      key: d.domain,
      label: DOMAIN_LABELS[d.domain] ?? d.domain,
      sublabel: `${d.source_count} fuente(s)`,
      value: clamp(d.value ?? 0),
      display: idx100(d.value ?? 0).toString(),
      level: level(d.value ?? 0),
      detail: d.confidence !== null ? `confianza ${(d.confidence * 100).toFixed(0)}%` : 'confianza no disponible',
      delta24h: null,
    }));
  const radarIndicators: Indicator[] = domainRadar.length >= 3
    ? domainRadar
    : [...indicators, { key: 'wsv', label: 'WSV', sublabel: 'World Spect Vector', value: wsv.value, display: wsv.value.toFixed(2), level: wsv.value >= 0.5 ? 'INESTABLE' : 'ESTABLE', detail: state.signalState.detail, delta24h: wsv.delta24h }];

  const generated = new Date(state.generatedAt);
  const generatedLabel = Number.isFinite(generated.getTime()) ? `${generated.toISOString().replace('T', ' ').slice(11, 19)} UTC` : 'pending_source';
  const narrative = interpretation?.text ?? node?.interpretation ?? state.signalState.detail;

  return (
    <section id="observatorio" className="sfi-observatory">
      <div className="map" />
      <div className="shade" />

      <div className="top left">
        <span>OBSERVATORIO SFI</span>
        <b>ESTADO OPERATIVO: <em className={operational ? 'ok' : 'warn'}>{operational ? 'ACTIVO' : 'MODO MANUAL'}</em></b>
      </div>
      <div className="brand"><h1>SFI</h1><p>SYSTEM FRICTION INSTITUTE</p></div>
      <div className="top right"><span>SUBSOLAR</span><b>{subsolar ? `LAT ${subsolar.lat.toFixed(2)}° | LON ${subsolar.lon.toFixed(2)}°` : 'PENDING_SOURCE'}</b></div>

      <div className="rail left-rail">
        {indicators.map((ind, i) => <GaugeCard key={ind.key} ind={ind} tone={i === 2 ? 'red' : i === 1 ? 'amber' : 'gold'} />)}
        <article className="gcard wsv-card"><h3>WORLD SPECT VECTOR</h3><div className="readout"><strong>{wsv.value.toFixed(2)}</strong><em className={`lvl lvl-${wsv.value >= 0.5 ? 'alto' : 'bajo'}`}>{wsv.value >= 0.5 ? 'INESTABLE' : 'ESTABLE'}</em></div></article>
        <article className="gcard radar-card"><h3>WSV COMPONENTES</h3><p>{domainRadar.length >= 3 ? 'Composición por dominio observado' : 'Composición base'}</p><Radar indicators={radarIndicators} /></article>
      </div>

      <svg className="field" viewBox="0 0 1200 600" role="img" aria-label="Mapa operacional SFI con terminador día noche y densidad de nodos">
        <defs>
          <filter id="obs-glow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <radialGradient id="density"><stop offset="0%" stopColor="rgba(240,207,120,0.42)" /><stop offset="70%" stopColor="rgba(216,143,61,0.12)" /><stop offset="100%" stopColor="rgba(216,143,61,0)" /></radialGradient>
        </defs>
        {termPath ? <path className="night-shade" d={`${termPath} L1200 600 L0 600 Z`} /> : null}
        {termPath ? <path className="terminator" d={termPath} /> : null}
        {sun ? <g className="sun-badge" transform={`translate(${sun.x} ${sun.y})`}><circle r="9" /><circle r="18" /></g> : null}
        {usableNodes.map((n) => <circle key={`density-${n.id}`} className="density-glow" cx={sx(n.x)} cy={sy(n.y)} r={45 + n.intensity * 90} opacity={0.18 + n.intensity * 0.36} />)}
        {links.map((c) => {
          const a = usableNodes.find((n) => n.id === c.from);
          const b = usableNodes.find((n) => n.id === c.to);
          if (!a || !b) return null;
          const d = `M${sx(a.x)} ${sy(a.y)}Q${(sx(a.x) + sx(b.x)) / 2} ${Math.min(sy(a.y), sy(b.y)) - 70} ${sx(b.x)} ${sy(b.y)}`;
          return <path key={`${c.from}-${c.to}`} className="conn" d={d} />;
        })}
        {usableNodes.map((n) => (
          <g key={n.id} className={`node ${n.state}`} transform={`translate(${sx(n.x)} ${sy(n.y)}) scale(${0.8 + n.intensity})`} onClick={() => { setSelected(n.id); setOpen(true); }}>
            <circle className="halo" r="25" /><circle className="ring" r="15" /><circle className="core" r="5" /><circle className="hit" r="30" />
          </g>
        ))}
      </svg>

      <aside className="reading">
        <header><div><span>LECTURA DEL DÍA</span><b>NARRATIVA DEL CAMPO</b></div><div className="ts"><span>ACTUALIZADO</span><b>{generatedLabel}</b></div></header>
        <p>{narrative}</p>
        <p className={interpretation?.degraded ? 'degraded-text' : 'attribution'}>IA: {interpretation ? `${interpretation.provider}/${interpretation.model}` : 'fallback local'} · interpretación sobre indicadores, no fuente externa.</p>
        {node?.invitation ? <p className="muted">{node.invitation}</p> : null}
        <Link href="/root/agents" className="cta">VER ANÁLISIS COMPLETO →</Link>
      </aside>

      {open && node ? <aside className="popup"><header><span>NODO · SFI · LIVE</span><button type="button" onClick={() => setOpen(false)} aria-label="Cerrar">×</button></header><strong>{node.label}</strong><em>{node.state}</em><p>{node.interpretation}</p></aside> : null}

      <div className="legend-bar"><span>INTENSIDAD DE FRICCIÓN</span><i className="gradient" /><span className="lg-labels"><em>BAJA</em><em>MEDIA</em><em>ALTA</em><em>CRÍTICA</em></span></div>
      <nav className="bottom-nav" aria-label="Navegación SFI">{NAV_ITEMS.map((item) => <Link key={item.n} href={item.href} className={item.label === 'OBSERVATORIO' ? 'active' : undefined}>{item.label === 'OBSERVATORIO' ? <span className="live-badge">EN VIVO</span> : null}<span className="n">{item.n}</span><strong>{item.label}</strong><em>{item.sub}</em></Link>)}</nav>
      <footer className="obs-footer"><span>SFI © {new Date().getFullYear()} System Friction Institute.</span><span><i className="dot" /> DATOS EN TIEMPO REAL · MODELO SFI v3.2</span><span><Link href="/privacy">PRIVACIDAD</Link> · <span>TÉRMINOS</span> · <span>METODOLOGÍA</span></span></footer>

      <style jsx global>{`
        .sfi-observatory { --g:#c8a951; --gb:#f0cf78; --r:#b85050; --a:#d88f3d; position:relative; min-height:max(900px,100svh); overflow:hidden; background:#020201; color:#e7dcc1; font-family:var(--sfi-font-mono),'JetBrains Mono',monospace; }
        .map,.shade { position:absolute; inset:0; pointer-events:none; }
        .map { z-index:0; background:url('/sfi/world-interface/codex-operational-reference.png') center/cover no-repeat; filter:saturate(1.02) contrast(1.04) brightness(.94); opacity:.94; }
        .shade { z-index:1; background:linear-gradient(90deg,rgba(2,2,1,.6),transparent 20%,transparent 80%,rgba(2,2,1,.6)),linear-gradient(180deg,rgba(2,2,1,.72),transparent 16%,transparent 76%,rgba(2,2,1,.78)); }
        .top,.brand,.rail,.field,.reading,.popup,.legend-bar,.bottom-nav,.obs-footer { position:absolute; z-index:10; }
        .top { top:24px; display:grid; gap:6px; text-transform:uppercase; letter-spacing:.14em; font-size:10px; color:rgba(232,221,195,.7); }
        .top.left { left:28px; } .top.right { right:28px; text-align:right; } .top b { color:var(--g); font-size:9px; } .top em { font-style:normal; } .top .ok { color:#8fae5a; } .top .warn { color:var(--a); }
        .brand { top:20px; left:50%; transform:translateX(-50%); text-align:center; pointer-events:none; } .brand h1 { margin:0; font-family:var(--sfi-font-display),'Syncopate',sans-serif; font-size:clamp(2rem,3.4vw,3.4rem); font-weight:400; letter-spacing:.42em; color:var(--gb); } .brand p { margin:8px 0 0; font-size:9px; letter-spacing:.4em; color:rgba(232,221,195,.7); }
        .rail.left-rail { top:84px; left:22px; width:210px; display:grid; gap:12px; bottom:118px; overflow-y:auto; }
        .gcard { border:1px solid rgba(200,169,81,.26); background:linear-gradient(180deg,rgba(12,11,8,.82),rgba(3,3,2,.72)); box-shadow:0 0 30px rgba(0,0,0,.4); padding:12px 14px; }
        .gcard header { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; } .gcard h3 { margin:0; font-size:11px; letter-spacing:.16em; color:var(--gb); font-weight:500; } .gcard p { margin:4px 0 0; font-size:8px; color:rgba(232,221,195,.55); line-height:1.45; }
        .gauge { width:34px; height:34px; flex-shrink:0; } .gauge .track { fill:none; stroke:rgba(200,169,81,.16); stroke-width:3; } .gauge .fill { fill:none; stroke-width:3; stroke-linecap:round; transition:stroke-dashoffset .6s ease; }
        .readout { display:flex; align-items:baseline; gap:8px; margin-top:10px; } .readout strong { font-family:var(--sfi-font-serif),serif; font-size:26px; font-weight:400; color:#e7dcc1; } .readout span { font-size:9px; color:rgba(232,221,195,.45); }
        .lvl { margin-left:auto; font-style:normal; font-size:9px; letter-spacing:.12em; padding:2px 6px; border:1px solid currentColor; } .lvl-alto,.lvl-inestable { color:var(--r); } .lvl-medio { color:var(--a); } .lvl-bajo,.lvl-estable { color:#8fae5a; }
        .delta { margin-top:8px; font-size:9px; color:rgba(232,221,195,.42); } .detail { margin-top:8px; font-size:8px; line-height:1.5; color:rgba(232,221,195,.42); }
        .radar-card .radar { width:100%; height:auto; margin-top:8px; } .radar circle,.radar line { fill:none; stroke:rgba(200,169,81,.22); } .radar text { fill:rgba(232,221,195,.6); font-size:8px; text-anchor:middle; } .radar-fill { fill:rgba(200,169,81,.18); } .radar-edge { fill:none; stroke:var(--gb); stroke-width:1.3; }
        .field { top:90px; right:300px; bottom:150px; left:260px; width:auto; height:auto; max-width:calc(100% - 580px); min-height:360px; z-index:4; overflow:visible; }
        .night-shade { fill:rgba(2,2,1,.48); stroke:none; mix-blend-mode:multiply; } .terminator { fill:none; stroke:rgba(240,207,120,.45); stroke-width:1.2; stroke-dasharray:5 7; } .density-glow { fill:url(#density); filter:url(#obs-glow); pointer-events:none; } .sun-badge circle:first-child { fill:var(--gb); } .sun-badge circle:last-child { fill:none; stroke:rgba(240,207,120,.45); stroke-width:1.2; }
        .conn { fill:none; stroke:rgba(240,207,120,.34); stroke-width:1.1; stroke-dasharray:5 7; filter:url(#obs-glow); } .node { cursor:pointer; } .node .halo { fill:rgba(240,207,120,.08); stroke:rgba(240,207,120,.24); } .node .ring { fill:rgba(2,2,1,.72); stroke:var(--gb); stroke-width:1.6; } .node .core { fill:var(--gb); } .node.critical .ring,.node.degraded .ring { stroke:var(--r); } .node.critical .core,.node.degraded .core { fill:var(--r); } .node .hit { fill:transparent; }
        .reading { right:24px; top:120px; width:260px; max-height:clamp(260px,52vh,520px); overflow-y:auto; overscroll-behavior:contain; scrollbar-width:thin; scrollbar-color:rgba(240,207,120,.34) transparent; border:1px solid rgba(200,169,81,.3); background:rgba(8,7,5,.82); padding:18px; box-shadow:0 0 40px rgba(0,0,0,.45); } .reading::-webkit-scrollbar { width:4px; } .reading::-webkit-scrollbar-track { background:transparent; } .reading::-webkit-scrollbar-thumb { background:rgba(240,207,120,.28); border-radius:999px; } .reading header { display:flex; justify-content:space-between; gap:12px; margin-bottom:14px; } .reading span,.ts span { display:block; font-size:9px; letter-spacing:.16em; color:rgba(232,221,195,.5); } .reading b,.ts b { font-size:10px; color:var(--gb); } .reading p { font-size:12px; line-height:1.75; color:rgba(232,221,195,.76); } .reading .muted,.attribution,.degraded-text { color:rgba(232,221,195,.46); font-size:10px; } .degraded-text { color:var(--a); } .cta { display:inline-block; margin-top:12px; color:var(--gb); font-size:10px; letter-spacing:.14em; text-decoration:none; }
        .popup { right:320px; bottom:190px; width:260px; border:1px solid rgba(200,169,81,.35); background:rgba(8,7,5,.9); padding:16px; box-shadow:0 0 50px rgba(0,0,0,.5); } .popup header { display:flex; justify-content:space-between; color:var(--gb); font-size:9px; letter-spacing:.14em; } .popup button { color:var(--gb); background:transparent; border:0; font-size:22px; cursor:pointer; } .popup strong { display:block; margin-top:10px; color:#fff; } .popup em { display:block; margin-top:4px; color:var(--a); font-size:10px; text-transform:uppercase; } .popup p { font-size:12px; line-height:1.65; color:rgba(232,221,195,.72); }
        .legend-bar { left:280px; right:320px; bottom:118px; display:flex; align-items:center; gap:12px; font-size:9px; letter-spacing:.14em; color:rgba(232,221,195,.62); } .gradient { flex:1; height:5px; background:linear-gradient(90deg,#8fae5a,var(--g),var(--a),var(--r)); box-shadow:0 0 22px rgba(240,207,120,.25); } .lg-labels { display:flex; gap:12px; } .lg-labels em { font-style:normal; }
        .bottom-nav { left:22px; right:22px; bottom:32px; display:grid; grid-template-columns:repeat(6,1fr); gap:8px; } .bottom-nav a { position:relative; min-height:58px; border:1px solid rgba(200,169,81,.22); background:rgba(8,7,5,.78); padding:10px 12px; color:rgba(232,221,195,.76); text-decoration:none; display:grid; gap:3px; } .bottom-nav a.active { border-color:var(--gb); color:var(--gb); } .bottom-nav .n { font-size:9px; color:rgba(232,221,195,.42); } .bottom-nav strong { font-size:10px; letter-spacing:.12em; } .bottom-nav em { font-style:normal; font-size:8px; color:rgba(232,221,195,.45); } .live-badge { position:absolute; top:-9px; right:8px; border:1px solid var(--gb); background:#020201; color:var(--gb); padding:2px 6px; font-size:8px; }
        .obs-footer { left:24px; right:24px; bottom:8px; display:flex; justify-content:space-between; gap:16px; font-size:8px; letter-spacing:.1em; color:rgba(232,221,195,.42); text-transform:uppercase; } .obs-footer a { color:rgba(232,221,195,.6); text-decoration:none; } .dot { display:inline-block; width:6px; height:6px; border-radius:999px; background:#8fae5a; box-shadow:0 0 12px #8fae5a; margin-right:6px; }
        @media (max-width: 980px) { .sfi-observatory { min-height:1300px; } .brand { top:68px; } .top.right { display:none; } .rail.left-rail { left:18px; right:18px; top:150px; width:auto; bottom:auto; grid-template-columns:repeat(2,minmax(0,1fr)); } .field { left:20px; right:20px; top:580px; max-width:none; } .reading { left:18px; right:18px; top:960px; width:auto; max-height:260px; } .legend-bar { left:18px; right:18px; bottom:210px; } .bottom-nav { grid-template-columns:repeat(2,1fr); bottom:48px; } .obs-footer { display:none; } }
      `}</style>
    </section>
  );
}

'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { SfiWorldInterfaceState } from '@/lib/sfi/worldInterfaceState';

type Props = { state: SfiWorldInterfaceState };
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
  { n: '01', label: 'REPOSITORY', sub: 'Memoria estructural del campo', href: '/repository' },
  { n: '02', label: 'FIELD', sub: 'Mapa y dinámicas del campo', href: '/field' },
  { n: '03', label: 'WORLD VECTOR', sub: 'Vectores y métricas globales', href: '/world-vector' },
  { n: '04', label: 'OBSERVATORIO', sub: 'Lectura en tiempo real', href: '/observatory' },
  { n: '05', label: 'ROOT', sub: 'Causas y patrones raíz', href: '/root/agents' },
  { n: '06', label: 'CONTACTO', sub: 'Conecta con el Instituto', href: '/contact?offer=SFI-DR01' },
];

function clamp(v: number) {
  return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
}
function level(v: number) {
  if (v >= 0.66) return 'ALTO';
  if (v >= 0.34) return 'MEDIO';
  return 'BAJO';
}
function idx100(v: number) {
  return Number((clamp(v) * 100).toFixed(1));
}
function sx(v: number) {
  return clamp(v / 100) * 1200;
}
function sy(v: number) {
  return clamp(v / 100) * 600;
}

function deltaLabel(delta: number | null) {
  if (delta === null) return null;
  const points = Number((delta * 100).toFixed(1));
  const sign = points > 0 ? '+' : '';
  return `${sign}${points}`;
}

function GaugeRing({ value, tone }: { value: number; tone: 'gold' | 'red' | 'amber' }) {
  const r = 15.5;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamp(value));
  const stroke = tone === 'red' ? 'var(--r)' : tone === 'amber' ? 'var(--a)' : 'var(--gb)';
  return (
    <svg className="gauge" viewBox="0 0 40 40" aria-hidden="true">
      <circle className="track" cx="20" cy="20" r={r} />
      <circle
        className="fill"
        cx="20"
        cy="20"
        r={r}
        style={{ stroke, strokeDasharray: c, strokeDashoffset: offset }}
        transform="rotate(-90 20 20)"
      />
    </svg>
  );
}

function GaugeCard({ ind, tone }: { ind: Indicator; tone: 'gold' | 'red' | 'amber' }) {
  const dl = deltaLabel(ind.delta24h);
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
      <div className="delta-row">
        {dl !== null ? (
          <span className={dl.startsWith('+') ? 'delta up' : dl.startsWith('-') ? 'delta down' : 'delta flat'}>
            {dl} <em>24H</em>
          </span>
        ) : (
          <span className="delta pending">historial 24h en construcción</span>
        )}
      </div>
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
      {[0.33, 0.66, 1].map((l) => (
        <circle key={l} cx={c} cy={c} r={max * l} />
      ))}
      {indicators.map((d, i) => {
        const a = -Math.PI / 2 + (i / count) * Math.PI * 2;
        return (
          <g key={d.key}>
            <line x1={c} y1={c} x2={c + Math.cos(a) * max} y2={c + Math.sin(a) * max} />
            <text x={c + Math.cos(a) * (max + 16)} y={c + Math.sin(a) * (max + 16)}>
              {d.label}
            </text>
          </g>
        );
      })}
      <polygon className="fill" points={poly} />
      <polygon className="edge" points={poly} />
    </svg>
  );
}

export function SfiObservatoryHero({ state }: Props) {
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

  const indicators: Indicator[] = [
    {
      key: 'ihg',
      label: 'IHG',
      sublabel: 'Índice de Gravedad Holística',
      value: ihg.value,
      display: idx100(ihg.value).toString(),
      level: level(ihg.value),
      detail: state.sfiIndex.detail,
      delta24h: ihg.delta24h,
    },
    {
      key: 'nti',
      label: 'NTI',
      sublabel: 'Índice de Tensión Neta',
      value: nti.value,
      display: idx100(nti.value).toString(),
      level: level(nti.value),
      detail: 'Tensión media de nodos WorldSpect visibles',
      delta24h: nti.delta24h,
    },
    {
      key: 'ldi',
      label: 'LDI',
      sublabel: 'Índice de Desgaste Sistémico',
      value: ldi.value,
      display: idx100(ldi.value).toString(),
      level: level(ldi.value),
      detail: state.frictionLevel.trend,
      delta24h: ldi.delta24h,
    },
  ];

  // Radar: dominios REALES producidos por src/lib/world-vector/deriveObservation.ts
  // (institutional, technology_ai_data, economy_market_capital, culture_signal_narrative,
  // social_behavioral, architecture_city_space) — no una taxonomía PESTEL inventada.
  // Si todavía no hay suficientes dominios observados, cae a los 4 indicadores base.
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
      sublabel: `${d.source_count} fuente(s) observada(s)`,
      value: clamp(d.value ?? 0),
      display: idx100(d.value ?? 0).toString(),
      level: level(d.value ?? 0),
      detail: d.confidence !== null ? `confianza ${(d.confidence * 100).toFixed(0)}%` : 'confianza no disponible',
      delta24h: null,
    }));

  const radarIndicators: Indicator[] =
    domainRadar.length >= 3
      ? domainRadar
      : [
          ...indicators,
          {
            key: 'wsv',
            label: 'WSV',
            sublabel: 'World Spect Vector',
            value: wsv.value,
            display: wsv.value.toFixed(2),
            level: wsv.value >= 0.5 ? 'INESTABLE' : 'ESTABLE',
            detail: state.signalState.detail,
            delta24h: wsv.delta24h,
          },
        ];

  const generated = new Date(state.generatedAt);
  const generatedLabel = Number.isFinite(generated.getTime())
    ? generated.toISOString().replace('T', ' ').slice(11, 19) + ' UTC'
    : 'pending_source';

  const narrative = node?.interpretation ?? state.signalState.detail;

  return (
    <section id="observatorio" className="sfi-observatory">
      <div className="map" />
      <div className="shade" />

      <div className="top left">
        <span>OBSERVATORIO SFI</span>
        <b>
          ESTADO OPERATIVO: <em className={operational ? 'ok' : 'warn'}>{operational ? 'ACTIVO' : 'MODO MANUAL'}</em>
        </b>
      </div>
      <div className="brand">
        <h1>SFI</h1>
        <p>SYSTEM FRICTION INSTITUTE</p>
      </div>
      <div className="top right">
        <span>COORDENADAS GLOBALES</span>
        <b>LAT 0.0000° &nbsp;|&nbsp; LON 0.0000°</b>
      </div>

      <div className="rail left-rail">
        {indicators.map((ind, i) => (
          <GaugeCard key={ind.key} ind={ind} tone={i === 2 ? 'red' : i === 1 ? 'amber' : 'gold'} />
        ))}
        <article className="gcard wsv-card">
          <header>
            <div>
              <h3>WORLD SPECT VECTOR</h3>
              <p>Vector espectral mundial</p>
            </div>
          </header>
          <div className="readout">
            <strong>{wsv.value.toFixed(2)}</strong>
            <em className={`lvl lvl-${wsv.value >= 0.5 ? 'alto' : 'bajo'}`}>
              {wsv.value >= 0.5 ? 'INESTABLE' : 'ESTABLE'}
            </em>
          </div>
        </article>
        <article className="gcard radar-card">
          <header>
            <div>
              <h3>WSV COMPONENTES</h3>
              <p>{domainRadar.length >= 3 ? 'Composición por dominio observado · fuente real' : 'Composición base · IHG · NTI · LDI · WSV'}</p>
            </div>
          </header>
          <Radar indicators={radarIndicators} />
        </article>
      </div>

      <svg className="field" viewBox="0 0 1200 600">
        <defs>
          <filter id="obs-glow">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {links.map((c) => {
          const a = usableNodes.find((n) => n.id === c.from);
          const b = usableNodes.find((n) => n.id === c.to);
          if (!a || !b) return null;
          const d = `M${sx(a.x)} ${sy(a.y)}Q${(sx(a.x) + sx(b.x)) / 2} ${Math.min(sy(a.y), sy(b.y)) - 70} ${sx(b.x)} ${sy(b.y)}`;
          return <path key={`${c.from}-${c.to}`} className="conn" d={d} />;
        })}
        {usableNodes.map((n) => (
          <g
            key={n.id}
            className={`node ${n.state}`}
            transform={`translate(${sx(n.x)} ${sy(n.y)}) scale(${0.8 + n.intensity})`}
            onClick={() => {
              setSelected(n.id);
              setOpen(true);
            }}
          >
            <circle className="halo" r="25" />
            <circle className="ring" r="15" />
            <circle className="core" r="5" />
            <circle className="hit" r="30" />
          </g>
        ))}
      </svg>

      <aside className="reading">
        <header>
          <div>
            <span>LECTURA DEL DÍA</span>
            <b>NARRATIVA DEL CAMPO</b>
          </div>
          <div className="ts">
            <span>ACTUALIZADO</span>
            <b>{generatedLabel}</b>
          </div>
        </header>
        <p>{narrative}</p>
        {node?.invitation ? <p className="muted">{node.invitation}</p> : null}
        <Link href="/root/agents" className="cta">
          VER ANÁLISIS COMPLETO →
        </Link>
      </aside>

      {open && node ? (
        <aside className="popup">
          <header>
            <span>NODO · SFI · LIVE</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar">
              ×
            </button>
          </header>
          <strong>{node.label}</strong>
          <em>{node.state}</em>
          <p>{node.interpretation}</p>
        </aside>
      ) : null}

      <div className="legend-bar">
        <span>INTENSIDAD DE FRICCIÓN</span>
        <i className="gradient" />
        <span className="lg-labels">
          <em>BAJA</em>
          <em>MEDIA</em>
          <em>ALTA</em>
          <em>CRÍTICA</em>
        </span>
      </div>

      <nav className="bottom-nav" aria-label="Navegación SFI">
        {NAV_ITEMS.map((item) => (
          <Link key={item.n} href={item.href} className={item.label === 'OBSERVATORIO' ? 'active' : undefined}>
            {item.label === 'OBSERVATORIO' ? <span className="live-badge">EN VIVO</span> : null}
            <span className="n">{item.n}</span>
            <strong>{item.label}</strong>
            <em>{item.sub}</em>
          </Link>
        ))}
      </nav>

      <footer className="obs-footer">
        <span>SFI © {new Date().getFullYear()} System Friction Institute. Todos los derechos reservados.</span>
        <span className="mid">
          <i className="dot" /> DATOS EN TIEMPO REAL &nbsp;·&nbsp; MODELO SFI v3.2
        </span>
        <span className="links">
          <Link href="/privacy">PRIVACIDAD</Link> · <span>TÉRMINOS</span> · <span>METODOLOGÍA</span>
        </span>
      </footer>

      <style jsx global>{`
        .sfi-observatory {
          --g: #c8a951;
          --gb: #f0cf78;
          --r: #b85050;
          --a: #d88f3d;
          position: relative;
          min-height: max(900px, 100svh);
          overflow: hidden;
          background: #020201;
          color: #e7dcc1;
          font-family: var(--sfi-font-mono), 'JetBrains Mono', monospace;
        }
        .map,
        .shade {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .map {
          z-index: 0;
          background: url('/sfi/world-interface/codex-operational-reference.png') center/cover no-repeat;
          filter: saturate(1.02) contrast(1.04) brightness(0.94);
          opacity: 0.94;
        }
        .shade {
          z-index: 1;
          background: linear-gradient(90deg, rgba(2, 2, 1, 0.6), transparent 20%, transparent 80%, rgba(2, 2, 1, 0.6)),
            linear-gradient(180deg, rgba(2, 2, 1, 0.72), transparent 16%, transparent 76%, rgba(2, 2, 1, 0.78));
        }
        .top,
        .brand,
        .rail,
        .field,
        .reading,
        .popup,
        .legend-bar,
        .bottom-nav,
        .obs-footer {
          position: absolute;
          z-index: 10;
        }
        .top {
          top: 24px;
          display: grid;
          gap: 6px;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          font-size: 10px;
          color: rgba(232, 221, 195, 0.7);
        }
        .top.left { left: 28px; }
        .top.right { right: 28px; text-align: right; }
        .top b { color: var(--g); font-weight: 500; font-size: 9px; letter-spacing: 0.1em; }
        .top em { font-style: normal; }
        .top em.ok { color: #8fae5a; }
        .top em.warn { color: var(--a); }
        .brand { top: 20px; left: 50%; transform: translateX(-50%); text-align: center; pointer-events: none; }
        .brand h1 { margin: 0; font-family: var(--sfi-font-display), 'Syncopate', sans-serif; font-size: clamp(2rem, 3.4vw, 3.4rem); font-weight: 400; letter-spacing: 0.42em; color: var(--gb); }
        .brand p { margin: 8px 0 0; font-size: 9px; letter-spacing: 0.4em; color: rgba(232, 221, 195, 0.7); }

        .rail.left-rail { top: 84px; left: 22px; width: 210px; display: grid; gap: 12px; bottom: 118px; overflow-y: auto; }
        .gcard {
          border: 1px solid rgba(200, 169, 81, 0.26);
          background: linear-gradient(180deg, rgba(12, 11, 8, 0.82), rgba(3, 3, 2, 0.72));
          box-shadow: 0 0 30px rgba(0, 0, 0, 0.4);
          padding: 12px 14px;
        }
        .gcard header { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
        .gcard h3 { margin: 0; font-size: 11px; letter-spacing: 0.16em; color: var(--gb); font-weight: 500; }
        .gcard p { margin: 4px 0 0; font-size: 8px; letter-spacing: 0.04em; color: rgba(232, 221, 195, 0.5); line-height: 1.4; }
        .gauge { width: 34px; height: 34px; flex-shrink: 0; }
        .gauge .track { fill: none; stroke: rgba(200, 169, 81, 0.16); stroke-width: 3; }
        .gauge .fill { fill: none; stroke-width: 3; stroke-linecap: round; transition: stroke-dashoffset 0.6s ease; }
        .readout { display: flex; align-items: baseline; gap: 8px; margin-top: 10px; }
        .readout strong { font-family: var(--sfi-font-serif), serif; font-size: 26px; font-weight: 400; color: #e7dcc1; }
        .readout span { font-size: 9px; color: rgba(232, 221, 195, 0.45); }
        .lvl { margin-left: auto; font-style: normal; font-size: 9px; letter-spacing: 0.12em; padding: 2px 6px; border: 1px solid currentColor; }
        .lvl-alto, .lvl-inestable { color: var(--r); }
        .lvl-medio { color: var(--a); }
        .lvl-bajo, .lvl-estable { color: #8fae5a; }
        .delta-row { margin-top: 8px; }
        .delta { font-size: 10px; letter-spacing: 0.06em; }
        .delta em { font-style: normal; opacity: 0.6; margin-left: 4px; }
        .delta.up { color: var(--r); }
        .delta.down { color: #8fae5a; }
        .delta.flat { color: rgba(232, 221, 195, 0.55); }
        .delta.pending { color: rgba(232, 221, 195, 0.35); font-size: 9px; font-style: italic; }
        .detail { margin-top: 8px; font-size: 8px; line-height: 1.5; color: rgba(232, 221, 195, 0.42); }
        .radar-card .radar { width: 100%; height: auto; margin-top: 8px; }
        .radar circle, .radar line { fill: none; stroke: rgba(200, 169, 81, 0.22); }
        .radar text { fill: rgba(232, 221, 195, 0.6); font-size: 8px; text-anchor: middle; }
        .radar .fill { fill: rgba(200, 169, 81, 0.18); }
        .radar .edge { fill: none; stroke: var(--gb); stroke-width: 1.3; }

        .field { top: 90px; right: 300px; bottom: 150px; left: 260px; width: auto; height: auto; overflow: visible; }
        .conn { fill: none; stroke: rgba(200, 169, 81, 0.7); stroke-width: 1; filter: url('#obs-glow'); }
        .node { cursor: pointer; }
        .node .halo { fill: rgba(200, 169, 81, 0.22); filter: url('#obs-glow'); }
        .node.critical .halo { fill: rgba(184, 80, 80, 0.4); }
        .node.elevated .halo { fill: rgba(216, 143, 61, 0.34); }
        .node .ring { fill: none; stroke: rgba(240, 207, 120, 0.7); stroke-dasharray: 4 5; }
        .node .core { fill: var(--gb); filter: url('#obs-glow'); }
        .node .hit { fill: transparent; }

        .reading { top: 90px; right: 24px; width: 280px; bottom: 150px; border: 1px solid rgba(200, 169, 81, 0.28); background: linear-gradient(180deg, rgba(12, 11, 8, 0.85), rgba(3, 3, 2, 0.78)); padding: 16px; display: flex; flex-direction: column; overflow-y: auto; }
        .reading header { display: flex; justify-content: space-between; gap: 10px; }
        .reading header span { display: block; font-size: 9px; letter-spacing: 0.16em; color: var(--gb); }
        .reading header b { display: block; margin-top: 4px; font-size: 9px; letter-spacing: 0.1em; color: rgba(232, 221, 195, 0.55); font-weight: 400; }
        .reading .ts { text-align: right; }
        .reading .ts span { color: rgba(232, 221, 195, 0.4); }
        .reading .ts b { color: rgba(232, 221, 195, 0.6); }
        .reading p { margin: 14px 0 0; font-size: 11px; line-height: 1.75; color: rgba(232, 221, 195, 0.78); }
        .reading p.muted { color: rgba(232, 221, 195, 0.5); font-size: 10px; }
        .reading .cta { margin-top: auto; display: inline-flex; align-items: center; gap: 8px; padding-top: 14px; border-top: 1px solid rgba(200, 169, 81, 0.16); color: var(--gb); text-decoration: none; font-size: 10px; letter-spacing: 0.12em; }

        .popup { top: 40%; left: 50%; transform: translate(-50%, -50%); z-index: 40; width: min(360px, 80vw); border: 1px solid rgba(200, 169, 81, 0.3); background: rgba(4, 4, 3, 0.94); padding: 16px; }
        .popup header { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 10px; letter-spacing: 0.2em; color: var(--gb); }
        .popup button { border: 1px solid rgba(200, 169, 81, 0.3); background: transparent; color: var(--gb); cursor: pointer; }
        .popup strong { color: #e7dcc1; letter-spacing: 0.14em; }
        .popup em { display: block; margin-top: 4px; color: var(--g); font-style: normal; font-size: 10px; }
        .popup p { margin-top: 10px; font-size: 11px; line-height: 1.6; color: rgba(232, 221, 195, 0.75); }

        .legend-bar { bottom: 92px; left: 50%; transform: translateX(-50%); display: grid; justify-items: center; gap: 6px; }
        .legend-bar > span:first-child { font-size: 9px; letter-spacing: 0.2em; color: rgba(232, 221, 195, 0.55); }
        .legend-bar .gradient { display: block; width: 220px; height: 3px; background: linear-gradient(90deg, rgba(200, 169, 81, 0.25), var(--a), var(--r)); }
        .lg-labels { display: flex; gap: 24px; font-size: 8px; letter-spacing: 0.14em; color: rgba(232, 221, 195, 0.45); }

        .bottom-nav { left: 22px; right: 22px; bottom: 30px; display: grid; grid-template-columns: repeat(6, 1fr); border: 1px solid rgba(200, 169, 81, 0.28); background: rgba(4, 4, 3, 0.78); }
        .bottom-nav a { position: relative; display: grid; gap: 4px; padding: 12px 14px; border-right: 1px solid rgba(200, 169, 81, 0.16); text-decoration: none; color: rgba(232, 221, 195, 0.7); }
        .bottom-nav a:last-child { border-right: 0; }
        .bottom-nav a.active { background: rgba(200, 169, 81, 0.1); }
        .bottom-nav .n { font-size: 9px; color: rgba(200, 169, 81, 0.55); }
        .bottom-nav strong { font-size: 11px; letter-spacing: 0.1em; color: var(--gb); font-weight: 500; }
        .bottom-nav em { font-size: 8px; font-style: normal; color: rgba(232, 221, 195, 0.42); }
        .live-badge { position: absolute; top: -10px; right: 10px; background: var(--gb); color: #050403; font-size: 7px; letter-spacing: 0.1em; padding: 2px 6px; }

        .obs-footer { left: 22px; right: 22px; bottom: 8px; display: flex; justify-content: space-between; font-size: 8px; letter-spacing: 0.08em; color: rgba(200, 169, 81, 0.42); }
        .obs-footer .mid { display: flex; align-items: center; gap: 6px; }
        .obs-footer .dot { width: 5px; height: 5px; border-radius: 999px; background: #8fae5a; display: inline-block; }
        .obs-footer .links a { color: rgba(200, 169, 81, 0.42); text-decoration: none; }

        @media (max-width: 1200px) {
          .sfi-observatory { overflow-y: auto; padding-bottom: 24px; min-height: auto; }
          .top, .brand, .rail, .field, .reading, .legend-bar, .bottom-nav, .obs-footer { position: relative; inset: auto; transform: none; width: auto; }
          .brand { margin: 60px auto 0; }
          .top.right { text-align: left; margin-top: 10px; }
          .rail.left-rail { width: 100%; grid-template-columns: repeat(2, 1fr); margin-top: 16px; max-height: none; overflow: visible; }
          .field { height: 60vw; min-height: 380px; margin-top: 16px; }
          .reading { margin-top: 16px; width: 100%; max-height: none; }
          .legend-bar { margin-top: 20px; }
          .bottom-nav { grid-template-columns: repeat(2, 1fr); margin-top: 16px; }
          .bottom-nav a { border-bottom: 1px solid rgba(200, 169, 81, 0.16); }
          .obs-footer { flex-direction: column; gap: 6px; margin-top: 16px; text-align: center; }
        }
      `}</style>
    </section>
  );
}

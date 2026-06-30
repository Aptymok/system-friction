'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { SfiWorldInterfaceNodeState, SfiWorldInterfaceState } from '@/lib/sfi/worldInterfaceState';

type Props = {
  state: SfiWorldInterfaceState;
};

type MetricBlock = {
  title: string;
  status: string;
  value: string;
  detail: string;
  tone?: SfiWorldInterfaceNodeState;
};

const NAV_LINKS = [
  ['SFI', '#sfi'],
  ['Field', '/field'],
  ['World Vector', '/world-vector'],
  ['Repository', '/repository'],
  ['Quiénes somos', '#quienes'],
  ['Contacto', '/contact?offer=SFI-DR01'],
  ['Iniciar sesión', '/login'],
];

const AMBIENT_POINTS = Array.from({ length: 96 }, (_, index) => {
  const x = 7 + ((index * 37) % 88);
  const y = 10 + ((index * 53) % 75);
  const opacity = 0.08 + ((index * 11) % 34) / 100;
  return { id: `ambient-${index}`, x, y, opacity };
});

const LAND_PATHS = [
  'M97 211 C128 152 208 121 300 132 C356 139 411 163 440 210 C408 232 360 227 319 247 C255 279 184 263 128 247 C106 238 92 226 97 211 Z',
  'M240 278 C282 289 307 331 296 382 C285 433 247 470 210 454 C177 440 161 398 172 357 C183 316 204 288 240 278 Z',
  'M484 179 C528 132 604 124 666 151 C717 173 742 210 722 243 C691 228 650 233 620 259 C582 291 522 294 491 265 C459 235 453 210 484 179 Z',
  'M592 286 C625 272 665 286 685 318 C707 354 697 402 663 431 C626 462 577 437 565 391 C552 343 559 305 592 286 Z',
  'M725 189 C802 122 940 124 1037 175 C1102 210 1095 268 1024 285 C966 299 894 283 849 318 C812 346 758 341 732 302 C705 262 692 218 725 189 Z',
  'M872 354 C913 328 977 333 1016 370 C1050 401 1034 442 985 456 C936 470 874 450 852 412 C840 389 846 370 872 354 Z',
];

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function svgX(value: number) {
  return clamp01(value / 100) * 1200;
}

function svgY(value: number) {
  return clamp01(value / 100) * 520;
}

function formatUtc(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'UTC / pending_source';
  return `UTC / ${date.toISOString().replace('T', ' ').slice(0, 19)}`;
}

function nodeStateLabel(value: SfiWorldInterfaceNodeState) {
  if (value === 'stable') return 'stable';
  if (value === 'active') return 'active';
  if (value === 'elevated') return 'elevated';
  if (value === 'critical') return 'critical';
  if (value === 'degraded') return 'degraded';
  return 'unknown';
}

function metricTone(status: string): SfiWorldInterfaceNodeState {
  const normalized = status.toLowerCase();
  if (normalized.includes('critical') || normalized.includes('failed')) return 'critical';
  if (normalized.includes('elevated') || normalized.includes('degraded') || normalized.includes('thin')) return 'elevated';
  if (normalized.includes('active') || normalized.includes('observed') || normalized.includes('healthy') || normalized.includes('alive')) return 'active';
  if (normalized.includes('manual') || normalized.includes('pending') || normalized.includes('not_available')) return 'degraded';
  return 'stable';
}

function connectionPath(from: { x: number; y: number }, to: { x: number; y: number }) {
  const x1 = svgX(from.x);
  const y1 = svgY(from.y);
  const x2 = svgX(to.x);
  const y2 = svgY(to.y);
  const midX = (x1 + x2) / 2;
  const midY = Math.min(y1, y2) - Math.max(26, Math.abs(x2 - x1) * 0.1);
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} Q ${midX.toFixed(2)} ${midY.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

function SparkCircle({ tone = 'active' }: { tone?: SfiWorldInterfaceNodeState }) {
  return (
    <svg className={`spark-circle tone-${tone}`} viewBox="0 0 78 78" aria-hidden="true">
      <circle className="ring ring-a" cx="39" cy="39" r="32" />
      <circle className="ring ring-b" cx="39" cy="39" r="22" />
      <path className="pulse-line" d="M11 39 L17 38 L20 41 L23 34 L27 45 L31 36 L34 39 L38 37 L42 43 L46 33 L50 41 L54 38 L58 39 L63 36 L67 40" />
      <circle className="core-dot" cx="39" cy="39" r="4.2" />
    </svg>
  );
}

function MiniChart() {
  return (
    <svg className="mini-chart" viewBox="0 0 150 42" aria-hidden="true">
      <path d="M0 30 L8 29 L13 26 L19 32 L24 18 L31 24 L36 21 L42 29 L48 16 L56 18 L63 13 L69 22 L74 19 L80 11 L86 20 L93 15 L99 26 L105 21 L111 29 L118 14 L123 18 L130 8 L137 23 L143 17 L150 20" />
    </svg>
  );
}

function FieldWaveform() {
  return (
    <svg className="field-waveform" viewBox="0 0 420 78" aria-label="visual_placeholder waveform">
      <path className="wave-grid" d="M0 39 H420 M40 0 V78 M80 0 V78 M120 0 V78 M160 0 V78 M200 0 V78 M240 0 V78 M280 0 V78 M320 0 V78 M360 0 V78" />
      <path className="wave-line" d="M0 38 L5 34 L9 42 L13 28 L18 48 L23 36 L29 39 L35 35 L41 44 L47 22 L53 52 L59 37 L66 41 L72 33 L79 47 L86 30 L93 39 L101 35 L109 45 L116 29 L124 51 L131 40 L139 36 L147 44 L155 33 L163 39 L171 37 L179 43 L187 32 L195 46 L204 39 L212 35 L220 44 L229 31 L237 49 L246 39 L254 35 L263 42 L272 30 L280 48 L289 37 L298 40 L306 34 L315 45 L323 29 L332 52 L340 39 L349 36 L358 43 L367 32 L376 47 L385 38 L394 34 L403 44 L412 31 L420 40" />
    </svg>
  );
}

function HudCard({ title, status, value, detail, tone }: MetricBlock) {
  const resolvedTone = tone ?? metricTone(status);
  const isPrediction = title === 'PREDICTIONS';

  return (
    <article className={`hud-card tone-${resolvedTone}${value.length > 10 ? ' compact-value' : ''}`}>
      <div className="hud-title">{title}</div>
      <div className="hud-content">
        <div className="hud-visual">
          {isPrediction ? <MiniChart /> : <SparkCircle tone={resolvedTone} />}
        </div>
        <div className="hud-readout">
          <span>{status}</span>
          <strong>{value}</strong>
        </div>
      </div>
      <p>{detail}</p>
    </article>
  );
}

function WorldField({
  state,
  activeNodeId,
  setHoverNodeId,
  setPinnedNodeId,
}: {
  state: SfiWorldInterfaceState;
  activeNodeId: string;
  setHoverNodeId: (id: string | null) => void;
  setPinnedNodeId: (id: string) => void;
}) {
  const nodeById = useMemo(() => new Map(state.nodes.map((node) => [node.id, node])), [state.nodes]);

  return (
    <svg className="world-svg" viewBox="0 0 1200 520" role="img" aria-label="SFI systemic world field">
      <defs>
        <radialGradient id="sfi-node-gold" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff3b5" stopOpacity="1" />
          <stop offset="34%" stopColor="#c8a951" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#c8a951" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sfi-node-red" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd0a2" stopOpacity="1" />
          <stop offset="42%" stopColor="#b85050" stopOpacity="0.82" />
          <stop offset="100%" stopColor="#b85050" stopOpacity="0" />
        </radialGradient>
        <filter id="soft-glow">
          <feGaussianBlur stdDeviation="3.6" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect className="svg-field-base" x="0" y="0" width="1200" height="520" />

      <g className="orbital-grid">
        <ellipse cx="600" cy="265" rx="420" ry="128" />
        <ellipse cx="600" cy="265" rx="540" ry="176" />
        <ellipse cx="600" cy="265" rx="318" ry="318" transform="rotate(-19 600 265)" />
        <ellipse cx="600" cy="265" rx="470" ry="210" transform="rotate(13 600 265)" />
        <path d="M60 260 H1140 M600 24 V496" />
      </g>

      <g className="ghost-land">
        {LAND_PATHS.map((path) => <path key={path} d={path} />)}
      </g>

      <g className="ambient-stars">
        {AMBIENT_POINTS.map((point) => (
          <circle
            key={point.id}
            cx={svgX(point.x)}
            cy={svgY(point.y)}
            r={point.id.endsWith('0') ? 1.8 : 0.9}
            style={{ opacity: point.opacity }}
          />
        ))}
      </g>

      <g className="connection-layer">
        {state.connections.map((connection) => {
          const from = nodeById.get(connection.from);
          const to = nodeById.get(connection.to);
          if (!from || !to) return null;
          const active = activeNodeId === from.id || activeNodeId === to.id;
          return (
            <path
              key={`${connection.from}-${connection.to}`}
              className={active ? 'connection active' : 'connection'}
              d={connectionPath(from, to)}
              style={{
                opacity: active ? 0.7 : 0.14 + clamp01(connection.strength) * 0.34,
                strokeWidth: active ? 1.35 : 0.45 + clamp01(connection.strength) * 0.75,
              }}
            />
          );
        })}
      </g>

      <g className="node-layer">
        {state.nodes.map((node) => {
          const x = svgX(node.x);
          const y = svgY(node.y);
          const active = activeNodeId === node.id;
          const scale = 0.78 + clamp01(node.intensity) * 1.1;
          return (
            <g
              key={node.id}
              className={`world-node node-${node.state}${active ? ' active' : ''}`}
              role="button"
              tabIndex={0}
              aria-label={`${node.label} ${nodeStateLabel(node.state)}`}
              transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(3)})`}
              onMouseEnter={() => setHoverNodeId(node.id)}
              onMouseLeave={() => setHoverNodeId(null)}
              onFocus={() => setHoverNodeId(node.id)}
              onBlur={() => setHoverNodeId(null)}
              onClick={() => setPinnedNodeId(node.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') setPinnedNodeId(node.id);
              }}
            >
              <circle className="node-halo" r="24" />
              <circle className="node-orbit orbit-a" r="16" />
              <circle className="node-orbit orbit-b" r="9" />
              <circle className="node-core" r="4.8" />
              <circle className="node-hit" r="24" />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export function SfiWorldInterfaceHero({ state }: Props) {
  const initialNodeId = state.nodes[0]?.id ?? 'sfi-hq';
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);
  const [pinnedNodeId, setPinnedNodeId] = useState(initialNodeId);
  const activeNodeId = hoverNodeId ?? pinnedNodeId;
  const activeNode = state.nodes.find((node) => node.id === activeNodeId) ?? state.nodes[0];

  const leftMetrics: MetricBlock[] = [
    {
      title: 'SIGNAL STATE',
      status: state.signalState.status,
      value: state.signalState.value,
      detail: state.signalState.detail,
    },
    {
      title: 'FRICTION LEVEL',
      status: state.frictionLevel.status,
      value: state.frictionLevel.value,
      detail: state.frictionLevel.trend,
    },
    {
      title: 'AMV MEMORY',
      status: state.amvMemory.status,
      value: state.amvMemory.value,
      detail: state.amvMemory.detail,
    },
    {
      title: 'PREDICTIONS',
      status: state.predictions.status,
      value: state.predictions.value,
      detail: state.predictions.detail,
    },
  ];

  const rightMetrics: MetricBlock[] = [
    {
      title: 'ACTIVE INTERACTIONS',
      status: state.activeInteractions.status,
      value: state.activeInteractions.value,
      detail: state.activeInteractions.detail,
    },
    {
      title: 'FIELD COHERENCE',
      status: state.fieldCoherence.status,
      value: state.fieldCoherence.value,
      detail: state.fieldCoherence.trend,
    },
    {
      title: 'SYSTEM STRAIN',
      status: state.systemStrain.status,
      value: state.systemStrain.value,
      detail: state.systemStrain.trend,
    },
    {
      title: 'APPROVAL STATE',
      status: state.approvalState.status,
      value: state.approvalState.value,
      detail: state.approvalState.detail,
      tone: 'stable',
    },
  ];

  return (
    <section id="sfi" className="sfi-world-interface" aria-label="SFI Operational World Interface">
      <span className="corner corner-nw" />
      <span className="corner corner-ne" />
      <span className="corner corner-sw" />
      <span className="corner corner-se" />
      <div className="codex-reference-layer" aria-hidden="true" />

      <div className="top-left">
        <span>SFI OPERATIONAL WORLD INTERFACE</span>
        <strong>LIVE AGENTIC LINK ACTIVE</strong>
      </div>

      <div className="brand-lockup" aria-label="System Friction Institute">
        <h1>SFI</h1>
        <p>SYSTEM FRICTION INSTITUTE</p>
      </div>

      <div className="top-right">
        <span>{formatUtc(state.generatedAt)}</span>
        <strong>NODE SFI-HQ-01 · SIGNAL SECURE</strong>
      </div>

      <nav className="hero-nav" aria-label="Navegación principal SFI">
        {NAV_LINKS.map(([label, href]) => (
          <Link key={label} href={href} className={label === 'Iniciar sesión' ? 'nav-login' : undefined}>
            {label}
          </Link>
        ))}
      </nav>

      <div className="world-stage">
        <div className="world-map-backdrop" />
        <WorldField
          state={state}
          activeNodeId={activeNodeId}
          setHoverNodeId={setHoverNodeId}
          setPinnedNodeId={setPinnedNodeId}
        />
        <div className="world-caption">SYSTEMIC ZONES · VISUAL TOPOLOGY · NOT GEOPOLITICAL DATA</div>

        {activeNode ? (
          <aside className={`node-popup tone-${activeNode.state}`} aria-live="polite">
            <header>
              <span>NODE · SFI · LIVE</span>
              <button type="button" onClick={() => setPinnedNodeId(activeNode.id)} aria-label={`Fijar ${activeNode.label}`}>
                ×
              </button>
            </header>
            <div className="node-meta">
              <strong>{activeNode.label}</strong>
              <span>{nodeStateLabel(activeNode.state)}</span>
            </div>
            <h2>Interpretación</h2>
            <p>{activeNode.interpretation}</p>
            <h2>Invitación</h2>
            <p>{activeNode.invitation}</p>
            <div className="popup-actions">
              <Link href="/login">Iniciar sesión</Link>
              <Link href="/field">Ir al Field</Link>
              <Link href="/contact?offer=SFI-DR01">Solicitar SFI-DR01</Link>
            </div>
          </aside>
        ) : null}
      </div>

      <div className="hud-left" aria-label="HUD izquierdo SFI">
        {leftMetrics.map((metric) => <HudCard key={metric.title} {...metric} />)}
      </div>

      <div className="hud-right" aria-label="HUD derecho SFI">
        {rightMetrics.map((metric) => <HudCard key={metric.title} {...metric} />)}
      </div>

      <div className="bottom-dock">
        <section className="dock-panel field-overview">
          <h2>FIELD OVERVIEW</h2>
          <FieldWaveform />
          <div className="legend-row">
            <span><i className="legend stable" /> stable</span>
            <span><i className="legend elevated" /> elevated</span>
            <span><i className="legend critical" /> critical</span>
          </div>
        </section>

        <section className="dock-panel system-windows">
          <h2>SYSTEM WINDOWS</h2>
          <div className="timeline">
            <span>-24h</span>
            <span>-12h</span>
            <strong>now</strong>
            <span>+12h</span>
            <span>+24h</span>
          </div>
        </section>

        <section className="dock-panel sfi-index">
          <h2>SFI INDEX</h2>
          <strong>{state.sfiIndex.value}</strong>
          <span>{state.sfiIndex.detail}</span>
        </section>

        <section className="dock-panel next-sync">
          <h2>NEXT SYNCHRONIZATION</h2>
          <strong>{state.fieldCoherence.trend.includes('scheduled') ? state.fieldCoherence.trend : 'pending_source'}</strong>
          <span>{state.signalState.detail}</span>
        </section>

        <section className="dock-panel join-network">
          <h2>ÚNETE A LA RED SFI</h2>
          <p>Colabora. Observa. Comprende. Actúa con perspectiva sistémica.</p>
          <Link href="/login?next=%2Ffield">UNIRSE A SFI</Link>
        </section>
      </div>

      <footer className="interface-footer">
        <span>SFI · OBSERVE · UNDERSTAND · ALIGN · ACT</span>
        <strong>NO SINGLE ENTITY · NO CENTRAL AUTHORITY · NO PERMANENT ADVANTAGE</strong>
        <span>{state.warnings.length ? `${state.warnings.length} WARNINGS · MANUAL MODE READY` : 'SYSTEMS THINKING FOR A COMPLEX WORLD'}</span>
      </footer>

      <div id="quienes" className="about-anchor" aria-label="Quiénes somos">
        System Friction Institute convierte señales, evidencia, memoria y predicción en rutas de intervención mínima.
      </div>

      <style jsx global>{`
        .sfi-world-interface {
          --gold: #c8a951;
          --gold-bright: #f0cf78;
          --gold-faint: rgba(200, 169, 81, 0.12);
          --gold-ghost: rgba(200, 169, 81, 0.045);
          --red: #b85050;
          --amber: #d88f3d;
          --muted: rgba(232, 221, 195, 0.62);
          --ink: #030302;
          position: relative;
          min-height: max(900px, 100svh);
          overflow: hidden;
          background:
            radial-gradient(circle at 50% 39%, rgba(200, 169, 81, 0.13), transparent 34%),
            radial-gradient(circle at 74% 43%, rgba(184, 80, 80, 0.13), transparent 21%),
            radial-gradient(circle at 25% 48%, rgba(200, 169, 81, 0.08), transparent 22%),
            linear-gradient(180deg, #050504 0%, #020202 100%);
          color: #e7dcc1;
          font-family: var(--sfi-font-mono), 'JetBrains Mono', monospace;
          isolation: isolate;
        }

        .sfi-world-interface::before,
        .sfi-world-interface::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 1;
        }

        .sfi-world-interface::before {
          background:
            linear-gradient(rgba(200, 169, 81, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(200, 169, 81, 0.025) 1px, transparent 1px),
            radial-gradient(circle at 18% 18%, rgba(255, 224, 134, 0.08) 0 1px, transparent 2px),
            radial-gradient(circle at 82% 15%, rgba(255, 224, 134, 0.09) 0 1px, transparent 2px),
            radial-gradient(circle at 50% 82%, rgba(255, 224, 134, 0.08) 0 1px, transparent 2px);
          background-size: 72px 72px, 72px 72px, 180px 180px, 210px 210px, 260px 260px;
          opacity: 0.35;
          mix-blend-mode: screen;
        }

        .sfi-world-interface::after {
          background:
            linear-gradient(180deg, rgba(255,255,255,0.025), transparent 4%, transparent 96%, rgba(255,255,255,0.02)),
            repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.018) 0 1px, transparent 1px 4px);
          opacity: 0.28;
        }

        .codex-reference-layer {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background:
            linear-gradient(180deg, rgba(3, 3, 2, 0.1), rgba(3, 3, 2, 0.22)),
            url('/sfi/world-interface/codex-operational-reference.png') top center / cover no-repeat;
          filter: saturate(1.08) contrast(1.08) brightness(0.82);
          opacity: 0.48;
          mix-blend-mode: screen;
        }

        .corner {
          position: absolute;
          z-index: 8;
          width: 50px;
          height: 50px;
          border-color: rgba(200, 169, 81, 0.42);
          pointer-events: none;
        }

        .corner-nw {
          top: 28px;
          left: 28px;
          border-left: 1px solid;
          border-top: 1px solid;
        }

        .corner-ne {
          top: 28px;
          right: 28px;
          border-right: 1px solid;
          border-top: 1px solid;
        }

        .corner-sw {
          bottom: 28px;
          left: 28px;
          border-left: 1px solid;
          border-bottom: 1px solid;
        }

        .corner-se {
          right: 28px;
          bottom: 28px;
          border-right: 1px solid;
          border-bottom: 1px solid;
        }

        .top-left,
        .top-right,
        .brand-lockup,
        .hero-nav,
        .hud-left,
        .hud-right,
        .bottom-dock,
        .interface-footer,
        .world-stage {
          position: absolute;
          z-index: 5;
        }

        .top-left,
        .top-right {
          top: 52px;
          display: grid;
          gap: 14px;
          max-width: 330px;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: rgba(232, 221, 195, 0.72);
          font-size: 11px;
          line-height: 1.3;
        }

        .top-left {
          left: 52px;
        }

        .top-right {
          right: 52px;
          text-align: right;
        }

        .top-left strong,
        .top-right strong {
          color: var(--gold);
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.2em;
        }

        .brand-lockup {
          left: 50%;
          top: 26px;
          transform: translateX(-50%);
          text-align: center;
          text-transform: uppercase;
          color: var(--gold);
          text-shadow: 0 0 30px rgba(200, 169, 81, 0.22);
        }

        .brand-lockup h1 {
          margin: 0;
          font-family: var(--sfi-font-display), 'Syncopate', sans-serif;
          font-size: clamp(3.1rem, 5.2vw, 6.4rem);
          font-weight: 400;
          letter-spacing: 0.38em;
          line-height: 0.92;
        }

        .brand-lockup p {
          margin: 16px 0 0;
          font-size: clamp(0.62rem, 0.85vw, 1rem);
          letter-spacing: 0.46em;
          color: rgba(240, 207, 120, 0.78);
        }

        .hero-nav {
          top: 126px;
          left: 50%;
          display: flex;
          max-width: min(980px, calc(100vw - 420px));
          transform: translateX(-50%);
          justify-content: center;
          gap: 8px;
          white-space: nowrap;
        }

        .hero-nav a {
          border: 1px solid rgba(200, 169, 81, 0.18);
          background: rgba(5, 5, 4, 0.42);
          padding: 8px 10px;
          color: rgba(232, 221, 195, 0.62);
          text-decoration: none;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          font-size: 9px;
          transition: border-color 160ms ease, color 160ms ease, background 160ms ease;
        }

        .hero-nav a:hover,
        .hero-nav a:focus-visible {
          border-color: rgba(240, 207, 120, 0.56);
          background: rgba(200, 169, 81, 0.09);
          color: rgba(240, 207, 120, 0.92);
        }

        .hero-nav .nav-login {
          border-color: rgba(240, 207, 120, 0.48);
          background: linear-gradient(180deg, rgba(200, 169, 81, 0.18), rgba(200, 169, 81, 0.05));
          color: rgba(240, 207, 120, 0.94);
        }

        .world-stage {
          top: 156px;
          right: 212px;
          bottom: 166px;
          left: 212px;
          min-height: 470px;
        }

        .world-map-backdrop {
          position: absolute;
          inset: -9% -3% -8%;
          z-index: 0;
          background:
            radial-gradient(circle at 52% 45%, rgba(240, 207, 120, 0.16), transparent 10%),
            radial-gradient(circle at 74% 39%, rgba(184, 80, 80, 0.17), transparent 18%),
            url('/sfi/world-interface/codex-operational-reference.png') center / cover no-repeat;
          filter: saturate(0.98) contrast(1.12) brightness(0.78);
          opacity: 0.34;
          mix-blend-mode: screen;
        }

        .world-map-backdrop::after {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 50% 50%, transparent 34%, rgba(3, 3, 2, 0.62) 76%),
            linear-gradient(90deg, rgba(3, 3, 2, 0.72), transparent 21%, transparent 79%, rgba(3, 3, 2, 0.72));
        }

        .world-caption {
          position: absolute;
          left: 50%;
          bottom: 8px;
          z-index: 2;
          transform: translateX(-50%);
          color: rgba(200, 169, 81, 0.34);
          font-size: 8px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .world-svg {
          position: absolute;
          inset: 0;
          z-index: 1;
          width: 100%;
          height: 100%;
          overflow: visible;
        }

        .svg-field-base {
          fill: transparent;
        }

        .orbital-grid ellipse,
        .orbital-grid path {
          fill: none;
          stroke: rgba(200, 169, 81, 0.12);
          stroke-width: 0.8;
          stroke-dasharray: 3 9;
          vector-effect: non-scaling-stroke;
        }

        .ghost-land path {
          fill: rgba(200, 169, 81, 0.018);
          stroke: rgba(232, 221, 195, 0.1);
          stroke-width: 0.8;
          vector-effect: non-scaling-stroke;
        }

        .ambient-stars circle {
          fill: rgba(240, 207, 120, 0.86);
          filter: url('#soft-glow');
        }

        .connection {
          fill: none;
          stroke: rgba(200, 169, 81, 0.82);
          vector-effect: non-scaling-stroke;
          transition: opacity 160ms ease, stroke-width 160ms ease, stroke 160ms ease;
        }

        .connection.active {
          stroke: rgba(240, 207, 120, 0.96);
          filter: url('#soft-glow');
        }

        .world-node {
          cursor: pointer;
          outline: none;
        }

        .node-hit {
          fill: transparent;
        }

        .node-halo {
          fill: url('#sfi-node-gold');
          opacity: 0.18;
          filter: url('#soft-glow');
        }

        .node-orbit {
          fill: none;
          stroke: rgba(200, 169, 81, 0.55);
          vector-effect: non-scaling-stroke;
        }

        .orbit-a {
          stroke-dasharray: 5 5;
          animation: spin 18s linear infinite;
        }

        .orbit-b {
          stroke-dasharray: 2 4;
          opacity: 0.8;
          animation: spin 12s linear infinite reverse;
        }

        .node-core {
          fill: #f0cf78;
          filter: url('#soft-glow');
        }

        .world-node.active .node-halo {
          opacity: 0.46;
        }

        .world-node.active .node-orbit {
          stroke: rgba(240, 207, 120, 0.95);
        }

        .world-node.active .node-core {
          fill: #fff3b5;
        }

        .node-elevated .node-halo {
          fill: url('#sfi-node-gold');
          opacity: 0.3;
        }

        .node-elevated .node-core,
        .node-elevated .node-orbit {
          fill: var(--amber);
          stroke: rgba(216, 143, 61, 0.82);
        }

        .node-critical .node-halo {
          fill: url('#sfi-node-red');
          opacity: 0.38;
        }

        .node-critical .node-core,
        .node-critical .node-orbit {
          fill: #ff8a66;
          stroke: rgba(184, 80, 80, 0.96);
        }

        .node-degraded .node-halo,
        .node-unknown .node-halo {
          opacity: 0.08;
        }

        .node-degraded .node-core,
        .node-unknown .node-core {
          fill: rgba(180, 176, 160, 0.54);
        }

        .node-degraded .node-orbit,
        .node-unknown .node-orbit {
          stroke: rgba(180, 176, 160, 0.28);
        }

        .hud-left,
        .hud-right {
          top: 160px;
          bottom: 160px;
          display: grid;
          width: 194px;
          align-content: start;
          gap: 12px;
        }

        .hud-left {
          left: 30px;
        }

        .hud-right {
          right: 30px;
        }

        .hud-card {
          position: relative;
          min-height: 142px;
          border: 1px solid rgba(200, 169, 81, 0.22);
          background:
            linear-gradient(180deg, rgba(12, 11, 8, 0.82), rgba(3, 3, 2, 0.72)),
            linear-gradient(90deg, rgba(200, 169, 81, 0.08), transparent 55%);
          box-shadow: inset 0 0 0 1px rgba(255, 239, 190, 0.025), 0 0 26px rgba(0, 0, 0, 0.45);
          padding: 17px 14px 13px;
          overflow: hidden;
        }

        .hud-card::before,
        .dock-panel::before,
        .node-popup::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(rgba(200,169,81,.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(200,169,81,.025) 1px, transparent 1px);
          background-size: 24px 24px;
          opacity: 0.28;
        }

        .hud-title,
        .dock-panel h2 {
          position: relative;
          margin: 0;
          color: rgba(240, 207, 120, 0.92);
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.26em;
          text-transform: uppercase;
        }

        .hud-content {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 72px 1fr;
          align-items: center;
          gap: 10px;
          margin-top: 14px;
        }

        .hud-readout {
          display: grid;
          gap: 6px;
          min-width: 0;
          text-transform: uppercase;
        }

        .hud-readout span {
          color: rgba(232, 221, 195, 0.58);
          font-size: 9px;
          letter-spacing: 0.22em;
          overflow-wrap: anywhere;
        }

        .hud-readout strong {
          color: var(--gold-bright);
          font-size: 18px;
          font-weight: 400;
          line-height: 1.05;
          overflow-wrap: anywhere;
        }

        .hud-card p {
          position: relative;
          z-index: 1;
          margin: 10px 0 0;
          color: rgba(232, 221, 195, 0.52);
          font-size: 9px;
          line-height: 1.65;
          letter-spacing: 0.07em;
          overflow-wrap: anywhere;
        }

        .hud-card.compact-value .hud-readout strong {
          font-size: 12px;
          line-height: 1.28;
          letter-spacing: 0.04em;
        }

        .spark-circle {
          width: 68px;
          height: 68px;
        }

        .spark-circle .ring {
          fill: none;
          stroke: rgba(200, 169, 81, 0.32);
          stroke-width: 1;
        }

        .spark-circle .ring-b {
          stroke-dasharray: 3 4;
          animation: spin 12s linear infinite;
          transform-origin: 39px 39px;
        }

        .spark-circle .pulse-line {
          fill: none;
          stroke: rgba(240, 207, 120, 0.82);
          stroke-width: 1.2;
        }

        .spark-circle .core-dot {
          fill: rgba(240, 207, 120, 0.9);
        }

        .spark-circle.tone-critical .ring,
        .spark-circle.tone-critical .pulse-line {
          stroke: rgba(184, 80, 80, 0.95);
        }

        .spark-circle.tone-critical .core-dot {
          fill: #ff8a66;
        }

        .spark-circle.tone-elevated .ring,
        .spark-circle.tone-elevated .pulse-line {
          stroke: rgba(216, 143, 61, 0.95);
        }

        .spark-circle.tone-degraded .ring,
        .spark-circle.tone-unknown .ring,
        .spark-circle.tone-degraded .pulse-line,
        .spark-circle.tone-unknown .pulse-line {
          stroke: rgba(180, 176, 160, 0.36);
        }

        .mini-chart {
          width: 76px;
          height: 48px;
          border-bottom: 1px solid rgba(200, 169, 81, 0.16);
        }

        .mini-chart path {
          fill: none;
          stroke: rgba(240, 207, 120, 0.78);
          stroke-width: 1.2;
        }

        .node-popup {
          position: absolute;
          z-index: 4;
          top: 43%;
          left: 57%;
          width: min(380px, 38vw);
          border: 1px solid rgba(240, 207, 120, 0.54);
          background:
            linear-gradient(180deg, rgba(10, 9, 7, 0.94), rgba(4, 4, 3, 0.93)),
            radial-gradient(circle at 22% 0%, rgba(200, 169, 81, 0.16), transparent 34%);
          box-shadow: 0 26px 70px rgba(0, 0, 0, 0.62), 0 0 34px rgba(200, 169, 81, 0.12);
          transform: translate(-28%, -10%);
          backdrop-filter: blur(8px);
        }

        .node-popup header {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(200, 169, 81, 0.14);
          padding: 13px 14px;
          color: rgba(240, 207, 120, 0.88);
          font-size: 10px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
        }

        .node-popup header button {
          border: 1px solid rgba(200, 169, 81, 0.28);
          background: rgba(0, 0, 0, 0.22);
          color: rgba(240, 207, 120, 0.76);
          cursor: pointer;
          font: inherit;
          line-height: 1;
          padding: 1px 5px 3px;
        }

        .node-meta {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 18px 0;
          text-transform: uppercase;
        }

        .node-meta strong {
          color: rgba(232, 221, 195, 0.84);
          font-size: 11px;
          letter-spacing: 0.22em;
        }

        .node-meta span {
          color: var(--gold);
          font-size: 9px;
          letter-spacing: 0.2em;
        }

        .node-popup h2 {
          position: relative;
          z-index: 1;
          margin: 18px 18px 7px;
          color: rgba(240, 207, 120, 0.95);
          font-family: var(--sfi-font-serif), serif;
          font-size: 20px;
          font-weight: 400;
          letter-spacing: 0;
        }

        .node-popup p {
          position: relative;
          z-index: 1;
          margin: 0 18px;
          color: rgba(232, 221, 195, 0.72);
          font-size: 12px;
          line-height: 1.8;
          letter-spacing: 0.02em;
        }

        .popup-actions {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
          padding: 20px 18px 18px;
        }

        .popup-actions a {
          display: flex;
          min-height: 42px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(240, 207, 120, 0.34);
          background: rgba(200, 169, 81, 0.06);
          color: rgba(240, 207, 120, 0.88);
          text-decoration: none;
          font-size: 12px;
          letter-spacing: 0.08em;
          transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
        }

        .popup-actions a:first-child {
          background: linear-gradient(90deg, rgba(115, 78, 29, 0.82), rgba(200, 169, 81, 0.64), rgba(115, 78, 29, 0.82));
          color: #140f06;
          font-size: 14px;
        }

        .popup-actions a:hover,
        .popup-actions a:focus-visible {
          border-color: rgba(255, 232, 164, 0.7);
          background: rgba(200, 169, 81, 0.18);
          color: #fff0bf;
        }

        .popup-actions a:first-child:hover,
        .popup-actions a:first-child:focus-visible {
          color: #050403;
        }

        .bottom-dock {
          right: 30px;
          bottom: 42px;
          left: 30px;
          display: grid;
          grid-template-columns: minmax(290px, 1.65fr) minmax(220px, 1fr) 160px minmax(210px, 0.75fr) minmax(230px, 0.72fr);
          gap: 0;
          border: 1px solid rgba(200, 169, 81, 0.28);
          background: rgba(4, 4, 3, 0.76);
          box-shadow: 0 0 46px rgba(0, 0, 0, 0.52);
          backdrop-filter: blur(6px);
        }

        .dock-panel {
          position: relative;
          min-height: 98px;
          border-right: 1px solid rgba(200, 169, 81, 0.17);
          padding: 16px 18px 13px;
          overflow: hidden;
        }

        .dock-panel:last-child {
          border-right: 0;
        }

        .field-waveform {
          position: relative;
          z-index: 1;
          width: 100%;
          height: 42px;
          margin-top: 8px;
        }

        .wave-grid {
          fill: none;
          stroke: rgba(200, 169, 81, 0.08);
          stroke-width: 1;
        }

        .wave-line {
          fill: none;
          stroke: rgba(240, 207, 120, 0.72);
          stroke-width: 1.2;
        }

        .legend-row {
          position: relative;
          z-index: 1;
          display: flex;
          gap: 20px;
          margin-top: 4px;
          color: rgba(232, 221, 195, 0.62);
          font-size: 9px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .legend {
          display: inline-block;
          width: 6px;
          height: 6px;
          margin-right: 8px;
          border-radius: 999px;
        }

        .legend.stable {
          background: #89a14b;
        }

        .legend.elevated {
          background: var(--amber);
        }

        .legend.critical {
          background: var(--red);
        }

        .timeline {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          align-items: end;
          gap: 8px;
          margin-top: 26px;
          color: rgba(232, 221, 195, 0.6);
          font-size: 9px;
          letter-spacing: 0.12em;
          text-align: center;
          text-transform: uppercase;
        }

        .timeline::before {
          content: '';
          position: absolute;
          right: 4%;
          left: 4%;
          top: -11px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(240, 207, 120, 0.54), transparent);
        }

        .timeline strong {
          color: var(--gold-bright);
          font-weight: 500;
        }

        .sfi-index strong,
        .next-sync strong {
          position: relative;
          z-index: 1;
          display: block;
          margin-top: 12px;
          color: var(--gold-bright);
          font-family: var(--sfi-font-serif), serif;
          font-size: 32px;
          font-weight: 400;
          line-height: 1;
        }

        .next-sync strong {
          font-family: var(--sfi-font-mono), monospace;
          font-size: 12px;
          line-height: 1.55;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .sfi-index span,
        .next-sync span {
          position: relative;
          z-index: 1;
          display: block;
          margin-top: 9px;
          color: rgba(232, 221, 195, 0.48);
          font-size: 8px;
          line-height: 1.55;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          overflow-wrap: anywhere;
        }

        .join-network p {
          position: relative;
          z-index: 1;
          margin: 10px 0 12px;
          color: rgba(232, 221, 195, 0.64);
          font-size: 10px;
          line-height: 1.55;
        }

        .join-network a {
          position: relative;
          z-index: 1;
          display: flex;
          width: 100%;
          min-height: 30px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(240, 207, 120, 0.36);
          background: rgba(200, 169, 81, 0.13);
          color: rgba(240, 207, 120, 0.9);
          text-decoration: none;
          font-size: 9px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .interface-footer {
          right: 42px;
          bottom: 13px;
          left: 42px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, 1fr);
          gap: 20px;
          align-items: center;
          color: rgba(200, 169, 81, 0.42);
          font-size: 9px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
        }

        .interface-footer strong {
          color: rgba(200, 169, 81, 0.46);
          font-weight: 400;
          text-align: center;
        }

        .interface-footer span:last-child {
          text-align: right;
        }

        .about-anchor {
          position: absolute;
          left: 52px;
          bottom: 8px;
          z-index: 2;
          width: 1px;
          height: 1px;
          overflow: hidden;
          opacity: 0;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1380px) {
          .world-stage {
            right: 188px;
            left: 188px;
          }

          .hud-left,
          .hud-right {
            width: 172px;
          }

          .hud-content {
            grid-template-columns: 58px 1fr;
          }

          .spark-circle {
            width: 58px;
            height: 58px;
          }

          .bottom-dock {
            grid-template-columns: minmax(250px, 1.35fr) minmax(190px, 0.9fr) 136px minmax(190px, 0.8fr) minmax(210px, 0.72fr);
          }
        }

        @media (max-width: 1100px) {
          .sfi-world-interface {
            min-height: 100svh;
            overflow-y: auto;
            padding: 22px 18px 24px;
          }

          .top-left,
          .top-right,
          .brand-lockup,
          .hero-nav,
          .hud-left,
          .hud-right,
          .bottom-dock,
          .interface-footer,
          .world-stage {
            position: relative;
            inset: auto;
            transform: none;
          }

          .corner {
            display: none;
          }

          .top-left,
          .top-right {
            top: auto;
            right: auto;
            left: auto;
            max-width: none;
            font-size: 9px;
            text-align: left;
          }

          .top-right {
            margin-top: 14px;
            text-align: right;
          }

          .brand-lockup {
            top: auto;
            left: auto;
            margin-top: 22px;
          }

          .brand-lockup h1 {
            font-size: clamp(2.5rem, 16vw, 4.4rem);
          }

          .brand-lockup p {
            font-size: 0.58rem;
            letter-spacing: 0.3em;
          }

          .hero-nav {
            left: auto;
            top: auto;
            max-width: 100%;
            margin-top: 18px;
            overflow-x: auto;
            justify-content: flex-start;
            padding-bottom: 4px;
          }

          .world-stage {
            height: min(78vw, 620px);
            min-height: 390px;
            margin-top: 20px;
          }

          .world-map-backdrop {
            inset: -8% -12%;
          }

          .hud-left,
          .hud-right {
            width: 100%;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            margin-top: 12px;
          }

          .node-popup {
            right: 14px;
            bottom: 12px;
            left: 14px;
            top: auto;
            width: auto;
            transform: none;
          }

          .bottom-dock {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            margin-top: 12px;
          }

          .dock-panel {
            border-right: 1px solid rgba(200, 169, 81, 0.17);
            border-bottom: 1px solid rgba(200, 169, 81, 0.17);
          }

          .join-network {
            grid-column: 1 / -1;
          }

          .interface-footer {
            grid-template-columns: 1fr;
            margin-top: 14px;
            text-align: center;
          }

          .interface-footer span:last-child {
            text-align: center;
          }
        }

        @media (max-width: 680px) {
          .sfi-world-interface {
            padding: 18px 12px 22px;
          }

          .top-left,
          .top-right {
            font-size: 8px;
            letter-spacing: 0.18em;
            text-align: left;
          }

          .brand-lockup h1 {
            letter-spacing: 0.24em;
          }

          .hero-nav a {
            padding: 8px 9px;
            font-size: 8px;
          }

          .world-stage {
            height: 118vw;
            min-height: 430px;
          }

          .world-caption {
            bottom: 4px;
            font-size: 7px;
            white-space: normal;
            text-align: center;
          }

          .node-popup h2 {
            font-size: 18px;
          }

          .node-popup p {
            font-size: 11px;
            line-height: 1.7;
          }

          .popup-actions {
            grid-template-columns: 1fr;
          }

          .hud-left,
          .hud-right,
          .bottom-dock {
            grid-template-columns: 1fr;
          }

          .hud-card {
            min-height: 126px;
          }

          .dock-panel {
            min-height: 86px;
            border-right: 0;
          }

          .legend-row {
            flex-wrap: wrap;
            gap: 12px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .orbit-a,
          .orbit-b,
          .spark-circle .ring-b {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}

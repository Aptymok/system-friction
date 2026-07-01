'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { SfiWorldInterfaceState } from '@/lib/sfi/worldInterfaceState';

type Props = { state: SfiWorldInterfaceState };
type Tone = 'gold' | 'amber' | 'red' | 'green';

const NAV = [
  ['01', 'REPOSITORY', 'Memoria', '/repository'],
  ['02', 'FIELD', 'Campo', '/field'],
  ['03', 'VECTOR', 'WSV', '/world-vector'],
  ['04', 'OBSERVATORY', 'Live', '/observatory'],
  ['05', 'ROOT', 'Interno', '/root/agents'],
  ['06', 'CONTACT', 'Instituto', '/contact?offer=SFI-DR01'],
];

const WSV_NODES = new Set(['sfi-hq', 'world-vector', 'field', 'system-health', 'scorefriction']);

function clamp(v: number) {
  return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
}

function metric(v: string | number | null | undefined) {
  if (typeof v === 'number') return clamp(v > 1 ? v / 100 : v);
  const n = Number(String(v ?? '').replace('%', '').trim());
  return Number.isFinite(n) ? clamp(n > 1 ? n / 100 : n) : 0;
}

function level(v: number) {
  if (v >= 0.66) return 'ALTO';
  if (v >= 0.34) return 'MEDIO';
  return 'BAJO';
}

function idx(v: number) {
  return (clamp(v) * 100).toFixed(1);
}

function sx(v: number) {
  return clamp(v / 100) * 1200;
}

function sy(v: number) {
  return clamp(v / 100) * 600;
}

function series(seed: number, len = 18) {
  return Array.from({ length: len }, (_, i) => clamp(seed + Math.sin(i * 0.62 + seed * 6) * 0.045));
}

function Gauge({ value, tone }: { value: number; tone: Tone }) {
  const r = 15;
  const c = Math.PI * 2 * r;
  return (
    <svg className="gauge" viewBox="0 0 42 42" aria-hidden="true">
      <circle className="gauge-track" cx="21" cy="21" r={r} />
      <circle
        className={`gauge-fill ${tone}`}
        cx="21"
        cy="21"
        r={r}
        style={{ strokeDasharray: c, strokeDashoffset: c * (1 - clamp(value)) }}
        transform="rotate(-90 21 21)"
      />
    </svg>
  );
}

function Spark({ value }: { value: number }) {
  const pts = series(value)
    .map((v, i) => `${(i / 17) * 100},${24 - v * 19}`)
    .join(' ');
  return (
    <svg className="spark" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts} />
    </svg>
  );
}

function Hud({ title, subtitle, value, detail, tone }: { title: string; subtitle: string; value: number; detail: string; tone: Tone }) {
  return (
    <article className={`hud-card ${tone}`}>
      <header>
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <Gauge value={value} tone={tone} />
      </header>
      <div className="number">
        <strong>{idx(value)}</strong>
        <span>/100</span>
        <em className={`level ${tone}`}>{level(value)}</em>
      </div>
      <Spark value={value} />
      <p className="detail">{detail}</p>
    </article>
  );
}

function Radar({ values }: { values: Array<{ label: string; value: number }> }) {
  const c = 82;
  const max = 50;
  const poly = values
    .map((d, i) => {
      const a = -Math.PI / 2 + (i / values.length) * Math.PI * 2;
      const r = 10 + clamp(d.value) * (max - 10);
      return `${c + Math.cos(a) * r},${c + Math.sin(a) * r}`;
    })
    .join(' ');
  return (
    <svg className="radar" viewBox="0 0 164 164" aria-hidden="true">
      {[0.33, 0.66, 1].map((x) => <circle key={x} cx={c} cy={c} r={max * x} />)}
      {values.map((d, i) => {
        const a = -Math.PI / 2 + (i / values.length) * Math.PI * 2;
        return (
          <g key={d.label}>
            <line x1={c} y1={c} x2={c + Math.cos(a) * max} y2={c + Math.sin(a) * max} />
            <text x={c + Math.cos(a) * (max + 13)} y={c + Math.sin(a) * (max + 13)}>{d.label}</text>
          </g>
        );
      })}
      <polygon className="radar-fill" points={poly} />
      <polygon className="radar-line" points={poly} />
    </svg>
  );
}

export function SfiObservatoryHero({ state }: Props) {
  const nodes = useMemo(() => {
    const picked = state.nodes.filter((n) => WSV_NODES.has(n.id)).slice(0, 6);
    return picked.length >= 3 ? picked : state.nodes.slice(0, 6);
  }, [state.nodes]);

  const links = state.connections.filter((c) => nodes.some((n) => n.id === c.from) && nodes.some((n) => n.id === c.to));
  const [selectedId, setSelectedId] = useState(nodes[0]?.id ?? 'world-vector');
  const [open, setOpen] = useState(false);
  const selected = nodes.find((n) => n.id === selectedId) ?? nodes[0];

  const signal = metric(state.signalState.value);
  const ldi = metric(state.frictionLevel.value);
  const nti = nodes.length ? nodes.reduce((sum, n) => sum + clamp(n.intensity), 0) / nodes.length : 0;
  const ihg = metric(state.sfiIndex.value) || clamp((signal + nti + (1 - ldi)) / 3);
  const wsv = clamp((signal + nti + (1 - ldi)) / 3);
  const live = state.warnings.length === 0 || (!state.warnings.includes('worldspect_snapshot_missing') && ihg > 0);
  const generated = new Date(state.generatedAt);
  const timestamp = Number.isFinite(generated.getTime()) ? `${generated.toISOString().slice(11, 19)} UTC` : 'pending_source';
  const narrative = selected?.interpretation || state.signalState.detail || 'El campo permanece bajo observación. No hay lectura completa disponible todavía.';

  return (
    <section className="sfi-observatory" aria-label="Observatorio SFI">
      <div className="world" />
      <div className="veil" />

      <header className="top left"><span>OBSERVATORIO SFI</span><b>ESTADO OPERATIVO: <em className={live ? 'ok' : 'warn'}>{live ? 'ACTIVO' : 'MODO MANUAL'}</em></b></header>
      <div className="brand"><h1>SFI</h1><p>SYSTEM FRICTION INSTITUTE</p></div>
      <header className="top right"><span>COORDENADAS GLOBALES</span><b>LAT 0.0000° | LON 0.0000°</b></header>

      <aside className="left-rail">
        <Hud title="IHG" subtitle="Gravedad holística" value={ihg} detail={state.sfiIndex.detail} tone="gold" />
        <Hud title="NTI" subtitle="Tensión neta" value={nti} detail="Tensión media de nodos visibles del World Spect Vector." tone="amber" />
        <Hud title="LDI" subtitle="Desgaste sistémico" value={ldi} detail={state.frictionLevel.trend} tone="red" />
        <article className="hud-card compact">
          <div><h3>WSV</h3><p>World Spect Vector</p></div>
          <div className="number compact-number"><strong>{wsv.toFixed(2)}</strong><em className={`level ${wsv >= 0.5 ? 'red' : 'green'}`}>{wsv >= 0.5 ? 'INESTABLE' : 'ESTABLE'}</em></div>
        </article>
        <article className="hud-card radar-card"><header><div><h3>RADAR</h3><p>Composición actual</p></div></header><Radar values={[{ label: 'IHG', value: ihg }, { label: 'NTI', value: nti }, { label: 'LDI', value: ldi }, { label: 'WSV', value: wsv }]} /></article>
      </aside>

      <svg className="field" viewBox="0 0 1200 600" aria-hidden="true">
        <defs><filter id="glow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
        {links.map((c) => {
          const a = nodes.find((n) => n.id === c.from);
          const b = nodes.find((n) => n.id === c.to);
          if (!a || !b) return null;
          const d = `M${sx(a.x)} ${sy(a.y)}Q${(sx(a.x) + sx(b.x)) / 2} ${Math.min(sy(a.y), sy(b.y)) - 70} ${sx(b.x)} ${sy(b.y)}`;
          return <path key={`${c.from}-${c.to}`} className="conn" d={d} />;
        })}
        {nodes.map((n) => (
          <g key={n.id} className={`node ${n.state}`} transform={`translate(${sx(n.x)} ${sy(n.y)}) scale(${0.72 + clamp(n.intensity)})`} onClick={() => { setSelectedId(n.id); setOpen(true); }}>
            <circle className="halo" r="25" /><circle className="ring" r="15" /><circle className="core" r="5" /><circle className="hit" r="30" />
          </g>
        ))}
      </svg>

      <aside className="reading">
        <header><div><span>LECTURA DEL DÍA</span><b>NARRATIVA DEL CAMPO</b></div><div className="ts"><span>ACTUALIZADO</span><b>{timestamp}</b></div></header>
        <p>{narrative}</p>
        <p className="muted">{selected?.invitation || state.signalState.detail}</p>
        <Link href="/root/agents" className="cta">VER ANÁLISIS COMPLETO →</Link>
      </aside>

      {open && selected ? <aside className="popup"><header><span>NODO · SFI · LIVE</span><button type="button" onClick={() => setOpen(false)}>×</button></header><strong>{selected.label}</strong><em>{selected.state}</em><p>{selected.interpretation}</p></aside> : null}

      <nav className="bottom-nav" aria-label="Navegación SFI">{NAV.map(([n, label, sub, href]) => <Link key={label} href={href} className={label === 'OBSERVATORY' ? 'active' : undefined}>{label === 'OBSERVATORY' ? <span className="live-badge">LIVE</span> : null}<span>{n}</span><strong>{label}</strong><em>{sub}</em></Link>)}</nav>

      <footer className="obs-footer"><span>SFI © {new Date().getFullYear()} System Friction Institute.</span><span><i /> DATOS EN TIEMPO REAL · MODELO SFI v3.2</span><span><Link href="/privacy">PRIVACIDAD</Link> · TÉRMINOS · METODOLOGÍA</span></footer>

      <style jsx>{`
        .sfi-observatory{--g:#c8a951;--gb:#f0cf78;--r:#b85050;--a:#d88f3d;position:relative;min-height:max(860px,100svh);overflow:hidden;background:#020201;color:#e7dcc1;font-family:var(--sfi-font-mono),'JetBrains Mono',monospace}.world,.veil{position:absolute;inset:0;pointer-events:none}.world{z-index:0;background:url('/sfi/world-interface/codex-operational-reference.png') center/cover no-repeat;filter:saturate(1.05) contrast(1.05) brightness(.92);opacity:.95}.veil{z-index:1;background:linear-gradient(90deg,rgba(2,2,1,.72),transparent 23%,transparent 76%,rgba(2,2,1,.72)),linear-gradient(180deg,rgba(2,2,1,.8),transparent 19%,transparent 76%,rgba(2,2,1,.88))}.top,.brand,.left-rail,.field,.reading,.popup,.bottom-nav,.obs-footer{position:absolute;z-index:10}.top{top:22px;display:grid;gap:6px;text-transform:uppercase;letter-spacing:.14em;font-size:10px;color:rgba(232,221,195,.7)}.top.left{left:28px}.top.right{right:28px;text-align:right}.top b{color:var(--g);font-weight:500;font-size:9px}.ok{color:#8fae5a;font-style:normal}.warn{color:var(--a);font-style:normal}.brand{top:16px;left:50%;transform:translateX(-50%);text-align:center}.brand h1{margin:0;font-family:var(--sfi-font-display),serif;font-size:clamp(2rem,3.1vw,3.25rem);font-weight:400;letter-spacing:.42em;color:var(--gb)}.brand p{margin:7px 0 0;font-size:8px;letter-spacing:.38em;color:rgba(232,221,195,.62)}.left-rail{top:88px;left:24px;bottom:112px;width:232px;display:grid;gap:9px;align-content:start;overflow:hidden}.hud-card{position:relative;border:1px solid rgba(200,169,81,.22);border-left:2px solid rgba(200,169,81,.45);background:linear-gradient(180deg,rgba(10,10,8,.76),rgba(3,3,2,.58));box-shadow:0 14px 28px rgba(0,0,0,.28);padding:10px 12px;backdrop-filter:blur(6px)}.hud-card.gold{border-left-color:var(--gb)}.hud-card.amber{border-left-color:var(--a)}.hud-card.red{border-left-color:var(--r)}.hud-card header{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.hud-card h3{margin:0;font-size:11px;letter-spacing:.18em;color:var(--gb);font-weight:600}.hud-card p{margin:3px 0 0;font-size:7.5px;text-transform:uppercase;letter-spacing:.1em;color:rgba(232,221,195,.45);line-height:1.35}.gauge{width:32px;height:32px;flex-shrink:0}.gauge-track{fill:none;stroke:rgba(200,169,81,.14);stroke-width:3}.gauge-fill{fill:none;stroke-width:3;stroke-linecap:round}.gauge-fill.gold{stroke:var(--gb)}.gauge-fill.amber{stroke:var(--a)}.gauge-fill.red{stroke:var(--r)}.gauge-fill.green{stroke:#8fae5a}.number{display:flex;align-items:baseline;gap:7px;margin-top:8px}.number strong{font-family:var(--sfi-font-serif),serif;font-size:25px;font-weight:400;line-height:1;color:#e7dcc1}.number span{font-size:8px;color:rgba(232,221,195,.42)}.level{margin-left:auto;font-style:normal;font-size:8px;letter-spacing:.12em;padding:2px 5px;border:1px solid currentColor}.level.red{color:var(--r)}.level.amber{color:var(--a)}.level.gold{color:var(--gb)}.level.green{color:#8fae5a}.spark{width:100%;height:18px;margin-top:7px}.spark polyline{fill:none;stroke:rgba(240,207,120,.62);stroke-width:1.15}.detail{margin-top:6px!important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:7.5px!important;color:rgba(232,221,195,.4)!important;text-transform:none!important;letter-spacing:.02em!important}.compact{display:flex;justify-content:space-between;align-items:center;min-height:58px}.compact-number{margin-top:0}.compact-number strong{font-size:24px}.radar-card{padding-bottom:6px}.radar{display:block;width:150px;height:150px;margin:3px auto 0}.radar circle,.radar line{fill:none;stroke:rgba(200,169,81,.18)}.radar text{fill:rgba(232,221,195,.52);font-size:7px;text-anchor:middle}.radar-fill{fill:rgba(200,169,81,.16)}.radar-line{fill:none;stroke:var(--gb);stroke-width:1.15}.field{top:92px;right:318px;bottom:128px;left:286px;width:auto;height:auto;overflow:visible}.conn{fill:none;stroke:rgba(200,169,81,.55);stroke-width:.85;filter:url('#glow')}.node{cursor:pointer}.node .halo{fill:rgba(200,169,81,.2);filter:url('#glow')}.node.critical .halo{fill:rgba(184,80,80,.36)}.node.elevated .halo{fill:rgba(216,143,61,.3)}.node .ring{fill:none;stroke:rgba(240,207,120,.62);stroke-dasharray:4 5}.node .core{fill:var(--gb);filter:url('#glow')}.node .hit{fill:transparent}.reading{top:94px;right:24px;bottom:118px;width:286px;border:1px solid rgba(200,169,81,.24);background:linear-gradient(180deg,rgba(10,9,7,.82),rgba(3,3,2,.72));padding:16px;display:flex;flex-direction:column;overflow-y:auto;backdrop-filter:blur(6px)}.reading header{display:flex;justify-content:space-between;gap:10px}.reading header span{display:block;font-size:8px;letter-spacing:.16em;color:var(--gb)}.reading header b{display:block;margin-top:4px;font-size:8px;letter-spacing:.1em;color:rgba(232,221,195,.55);font-weight:400}.ts{text-align:right}.reading p{margin:14px 0 0;font-size:11px;line-height:1.75;color:rgba(232,221,195,.78)}.reading .muted{color:rgba(232,221,195,.5);font-size:10px}.cta{margin-top:auto;display:inline-flex;padding-top:14px;border-top:1px solid rgba(200,169,81,.16);color:var(--gb);text-decoration:none;font-size:9px;letter-spacing:.12em}.popup{top:40%;left:50%;transform:translate(-50%,-50%);z-index:40;width:min(360px,80vw);border:1px solid rgba(200,169,81,.3);background:rgba(4,4,3,.94);padding:16px}.popup header{display:flex;justify-content:space-between;margin-bottom:10px;font-size:10px;letter-spacing:.2em;color:var(--gb)}.popup button{border:1px solid rgba(200,169,81,.3);background:transparent;color:var(--gb);cursor:pointer}.popup strong{color:#e7dcc1;letter-spacing:.14em}.popup em{display:block;margin-top:4px;color:var(--g);font-style:normal;font-size:10px}.popup p{margin-top:10px;font-size:11px;line-height:1.6;color:rgba(232,221,195,.75)}.bottom-nav{left:50%;right:auto;bottom:34px;transform:translateX(-50%);width:min(920px,calc(100vw - 48px));height:62px;display:grid;grid-template-columns:repeat(6,1fr);border:1px solid rgba(200,169,81,.22);border-radius:999px;background:rgba(4,4,3,.72);backdrop-filter:blur(8px);box-shadow:0 18px 38px rgba(0,0,0,.35);overflow:visible}.bottom-nav:before{content:'';position:absolute;left:42px;right:42px;top:50%;height:1px;background:linear-gradient(90deg,transparent,rgba(200,169,81,.55),transparent);z-index:-1}.bottom-nav a{position:relative;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:2px;text-decoration:none;color:rgba(232,221,195,.62);border-right:1px solid rgba(200,169,81,.1)}.bottom-nav a:first-child{border-top-left-radius:999px;border-bottom-left-radius:999px}.bottom-nav a:last-child{border-right:0;border-top-right-radius:999px;border-bottom-right-radius:999px}.bottom-nav a.active{background:radial-gradient(circle at 50% 50%,rgba(200,169,81,.18),transparent 68%);color:#e7dcc1}.bottom-nav a:after{content:'';position:absolute;top:8px;width:7px;height:7px;border-radius:999px;border:1px solid rgba(200,169,81,.65);background:#060504}.bottom-nav span{font-size:7px;color:rgba(200,169,81,.55)}.bottom-nav strong{font-size:9px;letter-spacing:.12em;color:var(--gb);font-weight:500}.bottom-nav em{font-size:7px;font-style:normal;color:rgba(232,221,195,.38)}.live-badge{position:absolute;top:-15px;right:18px;background:rgba(240,207,120,.92);color:#050403!important;font-size:7px!important;letter-spacing:.1em;padding:2px 6px;border-radius:999px}.obs-footer{left:24px;right:24px;bottom:8px;display:flex;justify-content:space-between;font-size:7.5px;letter-spacing:.08em;color:rgba(200,169,81,.38)}.obs-footer i{width:5px;height:5px;border-radius:999px;background:#8fae5a;display:inline-block}.obs-footer a{color:rgba(200,169,81,.42);text-decoration:none}@media(max-width:1200px){.sfi-observatory{overflow-y:auto;padding:22px;min-height:auto}.top,.brand,.left-rail,.field,.reading,.bottom-nav,.obs-footer{position:relative;inset:auto;transform:none;width:auto}.brand{margin:58px auto 0}.top.right{text-align:left;margin-top:10px}.left-rail{grid-template-columns:repeat(2,minmax(0,1fr));margin-top:16px;max-height:none;overflow:visible}.field{height:58vw;min-height:380px;margin-top:16px}.reading{margin-top:16px;max-height:none}.bottom-nav{grid-template-columns:repeat(2,1fr);height:auto;border-radius:18px;margin-top:16px;overflow:hidden}.bottom-nav a{padding:14px 8px;border-bottom:1px solid rgba(200,169,81,.12)}.bottom-nav a:after,.bottom-nav:before{display:none}.obs-footer{flex-direction:column;gap:6px;margin-top:16px;text-align:center}}@media(max-height:850px) and (min-width:1201px){.left-rail{gap:7px}.hud-card{padding:8px 10px}.detail{display:none}.radar{width:122px;height:122px}.reading{bottom:110px}.bottom-nav{height:56px}}
      `}</style>
    </section>
  );
}

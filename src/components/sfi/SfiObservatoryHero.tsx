'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { SfiWorldInterfaceState } from '@/lib/sfi/worldInterfaceState';

type Props = { state: SfiWorldInterfaceState };
type Tone = 'gold' | 'amber' | 'red' | 'green';

const NAV = [
  ['01', 'REPOSITORY', 'Memoria estructural del campo', '/repository'],
  ['02', 'FIELD', 'Mapa y dinámicas del campo', '/field'],
  ['03', 'WORLD VECTOR', 'Vectores y métricas globales', '/world-vector'],
  ['04', 'OBSERVATORIO', 'Lectura en tiempo real', '/observatory'],
  ['05', 'ROOT', 'Causas y patrones raíz', '/root/agents'],
  ['06', 'CONTACTO', 'Conecta con el Instituto', '/contact?offer=SFI-DR01'],
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

function series(seed: number, len = 24) {
  return Array.from({ length: len }, (_, i) => clamp(seed + Math.sin(i * 0.55 + seed * 6) * 0.06));
}

function Gauge({ value, tone }: { value: number; tone: Tone }) {
  const r = 16;
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
    .map((v, i) => `${(i / 23) * 100},${26 - v * 22}`)
    .join(' ');
  return (
    <svg className="spark" viewBox="0 0 100 26" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts} />
    </svg>
  );
}

function Hud({ title, subtitle, value, detail, tone }: { title: string; subtitle: string; value: number; detail: string; tone: Tone }) {
  return (
    <article className="hud-card">
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
  const c = 90;
  const max = 62;
  const poly = values
    .map((d, i) => {
      const a = -Math.PI / 2 + (i / values.length) * Math.PI * 2;
      const r = 12 + clamp(d.value) * (max - 12);
      return `${c + Math.cos(a) * r},${c + Math.sin(a) * r}`;
    })
    .join(' ');
  return (
    <svg className="radar" viewBox="0 0 180 180" aria-hidden="true">
      {[0.33, 0.66, 1].map((x) => <circle key={x} cx={c} cy={c} r={max * x} />)}
      {values.map((d, i) => {
        const a = -Math.PI / 2 + (i / values.length) * Math.PI * 2;
        return (
          <g key={d.label}>
            <line x1={c} y1={c} x2={c + Math.cos(a) * max} y2={c + Math.sin(a) * max} />
            <text x={c + Math.cos(a) * (max + 16)} y={c + Math.sin(a) * (max + 16)}>{d.label}</text>
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
        <Hud title="IHG" subtitle="Índice de Gravedad Holística" value={ihg} detail={state.sfiIndex.detail} tone="gold" />
        <Hud title="NTI" subtitle="Índice de Tensión Neta" value={nti} detail="Tensión media de nodos visibles del World Spect Vector." tone="amber" />
        <Hud title="LDI" subtitle="Índice de Desgaste Sistémico" value={ldi} detail={state.frictionLevel.trend} tone="red" />
        <article className="hud-card compact"><h3>WORLD SPECT VECTOR</h3><p>Vector espectral mundial</p><div className="number"><strong>{wsv.toFixed(2)}</strong><em className={`level ${wsv >= 0.5 ? 'red' : 'green'}`}>{wsv >= 0.5 ? 'INESTABLE' : 'ESTABLE'}</em></div></article>
        <article className="hud-card radar-card"><h3>WSV COMPONENTES</h3><p>Composición actual</p><Radar values={[{ label: 'IHG', value: ihg }, { label: 'NTI', value: nti }, { label: 'LDI', value: ldi }, { label: 'WSV', value: wsv }]} /></article>
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
          <g key={n.id} className={`node ${n.state}`} transform={`translate(${sx(n.x)} ${sy(n.y)}) scale(${0.75 + clamp(n.intensity)})`} onClick={() => { setSelectedId(n.id); setOpen(true); }}>
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

      <div className="legend"><span>INTENSIDAD DE FRICCIÓN</span><i /><div><em>BAJA</em><em>MEDIA</em><em>ALTA</em><em>CRÍTICA</em></div></div>

      <nav className="bottom-nav" aria-label="Navegación SFI">{NAV.map(([n, label, sub, href]) => <Link key={label} href={href} className={label === 'OBSERVATORIO' ? 'active' : undefined}>{label === 'OBSERVATORIO' ? <span className="live-badge">EN VIVO</span> : null}<span>{n}</span><strong>{label}</strong><em>{sub}</em></Link>)}</nav>

      <footer className="obs-footer"><span>SFI © {new Date().getFullYear()} System Friction Institute.</span><span><i /> DATOS EN TIEMPO REAL · MODELO SFI v3.2</span><span><Link href="/privacy">PRIVACIDAD</Link> · TÉRMINOS · METODOLOGÍA</span></footer>

      <style jsx>{`
        .sfi-observatory{--g:#c8a951;--gb:#f0cf78;--r:#b85050;--a:#d88f3d;position:relative;min-height:max(900px,100svh);overflow:hidden;background:#020201;color:#e7dcc1;font-family:var(--sfi-font-mono),'JetBrains Mono',monospace}.world,.veil{position:absolute;inset:0;pointer-events:none}.world{z-index:0;background:url('/sfi/world-interface/codex-operational-reference.png') center/cover no-repeat;filter:saturate(1.05) contrast(1.05) brightness(.92);opacity:.95}.veil{z-index:1;background:linear-gradient(90deg,rgba(2,2,1,.65),transparent 22%,transparent 78%,rgba(2,2,1,.65)),linear-gradient(180deg,rgba(2,2,1,.78),transparent 18%,transparent 76%,rgba(2,2,1,.82))}.top,.brand,.left-rail,.field,.reading,.popup,.legend,.bottom-nav,.obs-footer{position:absolute;z-index:10}.top{top:24px;display:grid;gap:6px;text-transform:uppercase;letter-spacing:.14em;font-size:10px;color:rgba(232,221,195,.7)}.top.left{left:28px}.top.right{right:28px;text-align:right}.top b{color:var(--g);font-weight:500;font-size:9px}.ok{color:#8fae5a;font-style:normal}.warn{color:var(--a);font-style:normal}.brand{top:18px;left:50%;transform:translateX(-50%);text-align:center}.brand h1{margin:0;font-family:var(--sfi-font-display),serif;font-size:clamp(2rem,3.4vw,3.4rem);font-weight:400;letter-spacing:.42em;color:var(--gb)}.brand p{margin:8px 0 0;font-size:9px;letter-spacing:.4em;color:rgba(232,221,195,.7)}.left-rail{top:84px;left:22px;bottom:118px;width:220px;display:grid;gap:12px;overflow-y:auto}.hud-card{border:1px solid rgba(200,169,81,.26);background:linear-gradient(180deg,rgba(12,11,8,.84),rgba(3,3,2,.72));box-shadow:0 0 30px rgba(0,0,0,.4);padding:12px 14px}.hud-card header{display:flex;justify-content:space-between;gap:10px}.hud-card h3{margin:0;font-size:11px;letter-spacing:.16em;color:var(--gb);font-weight:500}.hud-card p{margin:4px 0 0;font-size:8px;color:rgba(232,221,195,.5);line-height:1.45}.gauge{width:34px;height:34px;flex-shrink:0}.gauge-track{fill:none;stroke:rgba(200,169,81,.16);stroke-width:3}.gauge-fill{fill:none;stroke-width:3;stroke-linecap:round}.gauge-fill.gold{stroke:var(--gb)}.gauge-fill.amber{stroke:var(--a)}.gauge-fill.red{stroke:var(--r)}.gauge-fill.green{stroke:#8fae5a}.number{display:flex;align-items:baseline;gap:8px;margin-top:10px}.number strong{font-family:var(--sfi-font-serif),serif;font-size:26px;font-weight:400;color:#e7dcc1}.number span{font-size:9px;color:rgba(232,221,195,.45)}.level{margin-left:auto;font-style:normal;font-size:9px;letter-spacing:.12em;padding:2px 6px;border:1px solid currentColor}.level.red{color:var(--r)}.level.amber{color:var(--a)}.level.gold{color:var(--gb)}.level.green{color:#8fae5a}.spark{width:100%;height:20px;margin-top:8px}.spark polyline{fill:none;stroke:rgba(240,207,120,.6);stroke-width:1.2}.detail{margin-top:8px!important;font-size:8px!important;color:rgba(232,221,195,.42)!important}.radar{width:100%;height:auto;margin-top:8px}.radar circle,.radar line{fill:none;stroke:rgba(200,169,81,.22)}.radar text{fill:rgba(232,221,195,.6);font-size:8px;text-anchor:middle}.radar-fill{fill:rgba(200,169,81,.18)}.radar-line{fill:none;stroke:var(--gb);stroke-width:1.3}.field{top:90px;right:310px;bottom:150px;left:270px;width:auto;height:auto;overflow:visible}.conn{fill:none;stroke:rgba(200,169,81,.7);stroke-width:1;filter:url('#glow')}.node{cursor:pointer}.node .halo{fill:rgba(200,169,81,.22);filter:url('#glow')}.node.critical .halo{fill:rgba(184,80,80,.4)}.node.elevated .halo{fill:rgba(216,143,61,.34)}.node .ring{fill:none;stroke:rgba(240,207,120,.7);stroke-dasharray:4 5}.node .core{fill:var(--gb);filter:url('#glow')}.node .hit{fill:transparent}.reading{top:90px;right:24px;bottom:150px;width:290px;border:1px solid rgba(200,169,81,.28);background:linear-gradient(180deg,rgba(12,11,8,.86),rgba(3,3,2,.78));padding:16px;display:flex;flex-direction:column;overflow-y:auto}.reading header{display:flex;justify-content:space-between;gap:10px}.reading header span{display:block;font-size:9px;letter-spacing:.16em;color:var(--gb)}.reading header b{display:block;margin-top:4px;font-size:9px;letter-spacing:.1em;color:rgba(232,221,195,.55);font-weight:400}.ts{text-align:right}.reading p{margin:14px 0 0;font-size:11px;line-height:1.75;color:rgba(232,221,195,.78)}.reading .muted{color:rgba(232,221,195,.5);font-size:10px}.cta{margin-top:auto;display:inline-flex;padding-top:14px;border-top:1px solid rgba(200,169,81,.16);color:var(--gb);text-decoration:none;font-size:10px;letter-spacing:.12em}.popup{top:40%;left:50%;transform:translate(-50%,-50%);z-index:40;width:min(360px,80vw);border:1px solid rgba(200,169,81,.3);background:rgba(4,4,3,.94);padding:16px}.popup header{display:flex;justify-content:space-between;margin-bottom:10px;font-size:10px;letter-spacing:.2em;color:var(--gb)}.popup button{border:1px solid rgba(200,169,81,.3);background:transparent;color:var(--gb);cursor:pointer}.popup strong{color:#e7dcc1;letter-spacing:.14em}.popup em{display:block;margin-top:4px;color:var(--g);font-style:normal;font-size:10px}.popup p{margin-top:10px;font-size:11px;line-height:1.6;color:rgba(232,221,195,.75)}.legend{bottom:92px;left:50%;transform:translateX(-50%);display:grid;justify-items:center;gap:6px}.legend>span{font-size:9px;letter-spacing:.2em;color:rgba(232,221,195,.55)}.legend i{display:block;width:220px;height:3px;background:linear-gradient(90deg,rgba(200,169,81,.25),var(--a),var(--r))}.legend div{display:flex;gap:24px;font-size:8px;letter-spacing:.14em;color:rgba(232,221,195,.45)}.bottom-nav{left:22px;right:22px;bottom:30px;display:grid;grid-template-columns:repeat(6,1fr);border:1px solid rgba(200,169,81,.28);background:rgba(4,4,3,.78)}.bottom-nav a{position:relative;display:grid;gap:4px;padding:12px 14px;border-right:1px solid rgba(200,169,81,.16);text-decoration:none;color:rgba(232,221,195,.7)}.bottom-nav a:last-child{border-right:0}.bottom-nav a.active{background:rgba(200,169,81,.1)}.bottom-nav span{font-size:9px;color:rgba(200,169,81,.55)}.bottom-nav strong{font-size:11px;letter-spacing:.1em;color:var(--gb);font-weight:500}.bottom-nav em{font-size:8px;font-style:normal;color:rgba(232,221,195,.42)}.live-badge{position:absolute;top:-10px;right:10px;background:var(--gb);color:#050403!important;font-size:7px!important;letter-spacing:.1em;padding:2px 6px}.obs-footer{left:22px;right:22px;bottom:8px;display:flex;justify-content:space-between;font-size:8px;letter-spacing:.08em;color:rgba(200,169,81,.42)}.obs-footer i{width:5px;height:5px;border-radius:999px;background:#8fae5a;display:inline-block}.obs-footer a{color:rgba(200,169,81,.42);text-decoration:none}@media(max-width:1200px){.sfi-observatory{overflow-y:auto;padding:22px;min-height:auto}.top,.brand,.left-rail,.field,.reading,.legend,.bottom-nav,.obs-footer{position:relative;inset:auto;transform:none;width:auto}.brand{margin:60px auto 0}.top.right{text-align:left;margin-top:10px}.left-rail{grid-template-columns:repeat(2,1fr);margin-top:16px;max-height:none;overflow:visible}.field{height:60vw;min-height:380px;margin-top:16px}.reading{margin-top:16px;max-height:none}.legend{margin-top:20px}.bottom-nav{grid-template-columns:repeat(2,1fr);margin-top:16px}.bottom-nav a{border-bottom:1px solid rgba(200,169,81,.16)}.obs-footer{flex-direction:column;gap:6px;margin-top:16px;text-align:center}}
      `}</style>
    </section>
  );
}

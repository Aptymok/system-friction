'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { SfiWorldInterfaceState } from '@/lib/sfi/worldInterfaceState';

type Props = { state: SfiWorldInterfaceState };
type Indicator = { label: string; value: number; display: string; detail: string };

const NAV = [
  ['SFI', '#sfi'],
  ['Field', '/field'],
  ['World Vector', '/world-vector'],
  ['Repository', '/repository'],
  ['Quiénes somos', '#quienes'],
  ['Contacto', '/contact?offer=SFI-DR01'],
  ['Iniciar sesión', '/login'],
];
const WSV_NODES = new Set(['sfi-hq', 'world-vector', 'field', 'system-health', 'scorefriction']);
const clamp = (v: number) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
const metric = (v: string | number | null | undefined) => {
  if (typeof v === 'number') return clamp(v > 1 ? v / 100 : v);
  const n = Number(String(v ?? '').replace('%', '').trim());
  return Number.isFinite(n) ? clamp(n > 1 ? n / 100 : n) : 0;
};
const pct = (v: number) => `${Number((clamp(v) * 100).toFixed(1))}%`;
const idx = (v: number) => Number((clamp(v) * 100).toFixed(1)).toString();
const sx = (v: number) => clamp(v / 100) * 1200;
const sy = (v: number) => clamp(v / 100) * 600;

function series(seed: number, len = 56) {
  return Array.from({ length: len }, (_, i) => clamp(seed * 0.55 + 0.28 + Math.sin(i * 0.64 + seed * 4) * 0.13 + Math.sin(i * 0.19) * 0.06));
}
function linePath(values: number[], w = 720, h = 140) {
  return values.map((v, i) => `${(i / Math.max(values.length - 1, 1)) * w},${h - clamp(v) * (h - 28) - 12}`).join(' ');
}
function Graph({ values }: { values: number[] }) {
  const points = linePath(values);
  return <svg className="line-graph" viewBox="0 0 720 150"><path className="grid" d="M0 30H720M0 60H720M0 90H720M0 120H720M120 0V150M240 0V150M360 0V150M480 0V150M600 0V150"/><polyline className="trace glow" points={points}/><polyline className="trace" points={points}/></svg>;
}
function Windows({ values }: { values: number[] }) {
  return <svg className="windows" viewBox="0 0 620 150"><path className="axis" d="M28 76H592"/>{['-24h','-12h','now','+12h','+24h'].map((label,i)=>{const x=28+i*141;const r=10+clamp(values[i]??.4)*20;return <g key={label} className={i===2?'slot current':'slot'} transform={`translate(${x} 76)`}><circle r={r}/><line y1="-44" y2="44"/><text y="62">{label}</text></g>})}</svg>;
}
function Radar({ indicators }: { indicators: Indicator[] }) {
  const c=110, max=82, count=indicators.length;
  const poly=indicators.map((d,i)=>{const a=-Math.PI/2+i/count*Math.PI*2;const r=20+d.value*(max-20);return `${c+Math.cos(a)*r},${c+Math.sin(a)*r}`}).join(' ');
  return <svg className="radar" viewBox="0 0 220 220">{[.25,.5,.75,1].map(l=><circle key={l} cx={c} cy={c} r={max*l}/>) }{indicators.map((d,i)=>{const a=-Math.PI/2+i/count*Math.PI*2;return <g key={d.label}><line x1={c} y1={c} x2={c+Math.cos(a)*max} y2={c+Math.sin(a)*max}/><text x={c+Math.cos(a)*104} y={c+Math.sin(a)*104}>{d.label}</text></g>})}<polygon className="fill" points={poly}/><polygon className="edge" points={poly}/></svg>;
}

export function SfiWorldInterfaceTelemetryHero({ state }: Props) {
  const nodes = useMemo(() => state.nodes.filter(n => WSV_NODES.has(n.id)).slice(0, 6), [state.nodes]);
  const usableNodes = nodes.length >= 3 ? nodes : state.nodes.slice(0, 5);
  const links = state.connections.filter(c => usableNodes.some(n => n.id === c.from) && usableNodes.some(n => n.id === c.to));
  const [selected, setSelected] = useState(usableNodes[0]?.id ?? 'sfi-hq');
  const [open, setOpen] = useState(false);
  const node = usableNodes.find(n => n.id === selected) ?? usableNodes[0];
  const signal = metric(state.signalState.value);
  const ldi = metric(state.frictionLevel.value);
  const nti = usableNodes.length ? usableNodes.reduce((s,n)=>s+clamp(n.intensity),0)/usableNodes.length : 0;
  const ihg = metric(state.sfiIndex.value) || clamp((signal + (1-ldi) + nti) / 3);
  const wsv = clamp((signal + nti + (1-ldi)) / 3);
  const indicators: Indicator[] = [
    { label:'IHG', value: ihg, display: idx(ihg), detail: state.sfiIndex.detail },
    { label:'NTI', value: nti, display: pct(nti), detail: 'tensión media de nodos WorldSpect visibles' },
    { label:'LDI', value: ldi, display: pct(ldi), detail: state.frictionLevel.trend },
    { label:'WSV', value: wsv, display: pct(wsv), detail: state.signalState.detail },
  ];
  const graphValues = series(wsv);
  const windowValues = [signal, nti, wsv, 1 - ldi, ihg].map(clamp);
  const generated = new Date(state.generatedAt);
  const generatedLabel = Number.isFinite(generated.getTime()) ? generated.toISOString().replace('T',' ').slice(0,19) : 'pending_source';

  return <section id="sfi" className="sfi-telemetry">
    <div className="map"/><div className="shade"/><div className="brand"><h1>SFI</h1><p>SYSTEM FRICTION INSTITUTE</p></div>
    <div className="top left"><span>SFI OPERATIONAL WORLD INTERFACE</span><b>WORLD SPECT VECTOR ACTIVE</b></div>
    <div className="top right"><span>UTC / {generatedLabel}</span><b>NODE SFI-HQ-01 · SIGNAL SECURE</b></div>
    <nav>{NAV.map(([l,h])=><Link key={l} href={h}>{l}</Link>)}</nav>

    <div className="indicators">{indicators.map(d=><article key={d.label}><header><span>{d.label}</span><b>{d.display}</b></header><i><em style={{width:`${d.value*100}%`}}/></i><p>{d.detail}</p></article>)}</div>
    <aside className="radar-panel"><header><span>RADAR GRAPH</span><b>WSV</b></header><Radar indicators={indicators}/></aside>

    <svg className="field" viewBox="0 0 1200 600">
      <defs><filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      {links.map(c=>{const a=usableNodes.find(n=>n.id===c.from);const b=usableNodes.find(n=>n.id===c.to);if(!a||!b)return null;const d=`M${sx(a.x)} ${sy(a.y)}Q${(sx(a.x)+sx(b.x))/2} ${Math.min(sy(a.y),sy(b.y))-70} ${sx(b.x)} ${sy(b.y)}`;return <path key={`${c.from}-${c.to}`} className="conn" d={d}/>})}
      {usableNodes.map(n=><g key={n.id} className={`node ${n.state}`} transform={`translate(${sx(n.x)} ${sy(n.y)}) scale(${.8+n.intensity})`} onClick={()=>{setSelected(n.id);setOpen(true)}}><circle className="halo" r="25"/><circle className="ring" r="15"/><circle className="core" r="5"/><circle className="hit" r="30"/></g>)}
    </svg>

    {open && node ? <aside className="popup"><header><span>NODE · WSV · LIVE</span><button onClick={()=>setOpen(false)}>×</button></header><strong>{node.label}</strong><em>{node.state}</em><h2>Interpretación</h2><p>{node.interpretation}</p><h2>Invitación</h2><p>{node.invitation}</p><div><Link href="/login">Iniciar sesión</Link><Link href="/field">Ir al Field</Link><Link href="/contact?offer=SFI-DR01">Solicitar SFI-DR01</Link></div></aside> : <button className="launcher" onClick={()=>setOpen(true)}><span>NODE</span><b>{node?.label ?? 'WSV'}</b><em>{node?.state ?? 'active'}</em></button>}

    <section className="dock"><article className="overview"><header><h2>FIELD OVERVIEW</h2><b>{pct(wsv)}</b></header><Graph values={graphValues}/><p>IHG · NTI · LDI · WORLD SPECT VECTOR</p></article><article className="windows-panel"><header><h2>SYSTEM WINDOWS</h2><b>{state.fieldCoherence.trend}</b></header><Windows values={windowValues}/></article><article className="data">{indicators.map(d=><div key={d.label}><span>{d.label}</span><b>{d.display}</b><em>{d.detail}</em></div>)}</article><article className="join"><h2>ÚNETE A LA RED SFI</h2><p>Colabora. Observa. Comprende. Actúa con perspectiva sistémica.</p><Link href="/login?next=%2Ffield">UNIRSE A SFI</Link></article></section>
    <footer>SFI · OBSERVE · UNDERSTAND · ALIGN · ACT <b>NO SINGLE ENTITY · NO CENTRAL AUTHORITY · NO PERMANENT ADVANTAGE</b> {state.warnings.length ? `${state.warnings.length} WARNINGS` : 'SYSTEMS THINKING FOR A COMPLEX WORLD'}</footer>
    <div id="quienes" className="hidden">System Friction Institute convierte señales, evidencia, memoria y predicción en rutas de intervención mínima.</div>
    <style jsx>{`
      .sfi-telemetry{--g:#c8a951;--gb:#f0cf78;--r:#b85050;--a:#d88f3d;position:relative;min-height:max(900px,100svh);overflow:hidden;background:#020201;color:#e7dcc1;font-family:var(--sfi-font-mono),'JetBrains Mono',monospace}.map,.shade{position:absolute;inset:0;pointer-events:none}.map{z-index:0;background:url('/sfi/world-interface/codex-operational-reference.png') center/cover no-repeat;filter:saturate(1.02) contrast(1.04) brightness(.94);opacity:.94}.shade{z-index:1;background:linear-gradient(90deg,rgba(2,2,1,.6),transparent 22%,transparent 78%,rgba(2,2,1,.6)),linear-gradient(180deg,rgba(2,2,1,.8),transparent 18%,transparent 74%,rgba(2,2,1,.72))}.sfi-telemetry:before{content:'';position:absolute;inset:0;z-index:2;pointer-events:none;background:linear-gradient(rgba(200,169,81,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(200,169,81,.018) 1px,transparent 1px);background-size:76px 76px}.brand,.top,nav,.indicators,.radar-panel,.field,.popup,.launcher,.dock,footer{position:absolute;z-index:10}.brand{top:25px;left:50%;transform:translateX(-50%);text-align:center;color:var(--g);pointer-events:none}.brand h1{margin:0;font-family:var(--sfi-font-display),'Syncopate',sans-serif;font-size:clamp(3.1rem,5.2vw,6.4rem);font-weight:400;letter-spacing:.38em;line-height:.92}.brand p{margin:16px 0 0;color:rgba(240,207,120,.78);font-size:clamp(.62rem,.85vw,1rem);letter-spacing:.46em}.top{top:52px;display:grid;gap:14px;max-width:330px;text-transform:uppercase;letter-spacing:.22em;color:rgba(232,221,195,.72);font-size:11px;pointer-events:none}.top b{color:var(--g);font-size:9px;font-weight:500}.left{left:52px}.right{right:52px;text-align:right}nav{top:126px;left:50%;z-index:60;display:flex;gap:8px;transform:translateX(-50%);max-width:min(980px,calc(100vw - 420px));white-space:nowrap}nav a{border:1px solid rgba(200,169,81,.28);background:rgba(5,5,4,.72);padding:8px 10px;color:rgba(232,221,195,.74);text-decoration:none;text-transform:uppercase;letter-spacing:.16em;font-size:9px;backdrop-filter:blur(6px)}nav a:hover{border-color:rgba(240,207,120,.68);color:var(--gb)}.indicators{top:165px;left:30px;width:205px;display:grid;gap:12px}.indicators article,.radar-panel,.dock,.popup,.launcher{border:1px solid rgba(200,169,81,.26);background:linear-gradient(180deg,rgba(12,11,8,.78),rgba(3,3,2,.68));box-shadow:0 0 30px rgba(0,0,0,.45);backdrop-filter:blur(5px)}.indicators article{padding:14px}.indicators header,.radar-panel header,.dock header{display:flex;justify-content:space-between;gap:14px;color:var(--gb);font-size:10px;letter-spacing:.2em;text-transform:uppercase}.indicators header b{font-family:var(--sfi-font-serif),serif;font-size:24px;font-weight:400}.indicators i{display:block;height:2px;margin-top:10px;background:rgba(200,169,81,.13)}.indicators em{display:block;height:100%;background:linear-gradient(90deg,rgba(200,169,81,.35),rgba(240,207,120,.92));animation:live 2.4s ease-in-out infinite}.indicators p{margin:10px 0 0;color:rgba(232,221,195,.54);font-size:9px;line-height:1.55}.radar-panel{top:165px;right:30px;width:236px;padding:14px 12px 8px}.radar{width:100%;height:auto;margin-top:6px}.radar circle,.radar line{fill:none;stroke:rgba(200,169,81,.2)}.radar text{fill:rgba(232,221,195,.56);font-size:9px;text-anchor:middle}.radar .fill{fill:rgba(200,169,81,.16);animation:radar 3.6s ease-in-out infinite}.radar .edge{fill:none;stroke:var(--gb);stroke-width:1.4}.field{top:154px;right:290px;bottom:260px;left:250px;width:auto;height:auto;z-index:8;overflow:visible}.conn{fill:none;stroke:rgba(200,169,81,.75);stroke-width:1;filter:url('#glow')}.node{cursor:pointer}.node .halo{fill:rgba(200,169,81,.23);filter:url('#glow');animation:pulse 3.8s infinite}.node.critical .halo{fill:rgba(184,80,80,.38)}.node.elevated .halo{fill:rgba(216,143,61,.34)}.node .ring{fill:none;stroke:rgba(240,207,120,.72);stroke-dasharray:4 5;animation:spin 18s linear infinite}.node .core{fill:var(--gb);filter:url('#glow')}.node .hit{fill:transparent}.popup{top:40%;left:57%;z-index:40;width:min(380px,38vw);transform:translate(-28%,-10%);padding-bottom:18px}.popup header{display:flex;justify-content:space-between;border-bottom:1px solid rgba(200,169,81,.16);padding:13px 14px;color:var(--gb);font-size:10px;letter-spacing:.26em}.popup button{border:1px solid rgba(200,169,81,.3);background:#0004;color:var(--gb);cursor:pointer}.popup strong,.popup em{display:inline-block;margin:14px 0 0 18px;text-transform:uppercase}.popup strong{color:#e7dcc1;letter-spacing:.2em}.popup em{color:var(--g);font-style:normal;font-size:10px}.popup h2{margin:18px 18px 7px;color:var(--gb);font-family:var(--sfi-font-serif),serif;font-weight:400}.popup p{margin:0 18px;color:rgba(232,221,195,.72);font-size:12px;line-height:1.75}.popup div{display:grid;gap:8px;padding:18px}.popup a,.join a{display:flex;min-height:38px;align-items:center;justify-content:center;border:1px solid rgba(240,207,120,.34);background:rgba(200,169,81,.08);color:var(--gb);text-decoration:none;font-size:12px}.launcher{right:32px;bottom:210px;z-index:42;display:grid;min-width:218px;gap:5px;color:#e7dcc1;cursor:pointer;padding:13px 16px;text-align:left;text-transform:uppercase}.launcher span,.launcher em{font-size:9px;letter-spacing:.25em;color:rgba(232,221,195,.56);font-style:normal}.launcher b{color:var(--gb);font-size:13px;letter-spacing:.16em}.dock{right:30px;bottom:42px;left:30px;display:grid;grid-template-columns:minmax(390px,1.6fr) minmax(320px,1.2fr) minmax(210px,.7fr) minmax(230px,.7fr)}.dock article{position:relative;min-height:172px;border-right:1px solid rgba(200,169,81,.17);padding:16px 18px;overflow:hidden}.dock article:last-child{border-right:0}.dock h2{margin:0;color:var(--gb);font-size:10px;font-weight:500;letter-spacing:.26em;text-transform:uppercase}.dock header b{color:rgba(240,207,120,.84);font-weight:400;font-size:11px;text-align:right}.line-graph,.windows{width:100%;height:120px;margin-top:10px}.grid{fill:none;stroke:rgba(200,169,81,.08)}.trace{fill:none;stroke:var(--gb);stroke-width:1.6;animation:trace 3.6s infinite}.glow{stroke:rgba(184,80,80,.32);stroke-width:5;filter:blur(4px)}.axis{stroke:rgba(240,207,120,.42)}.slot circle{fill:rgba(200,169,81,.08);stroke:rgba(200,169,81,.46);animation:pulse 3.2s infinite}.slot.current circle{fill:rgba(240,207,120,.18);stroke:var(--gb)}.slot line{stroke:rgba(200,169,81,.16)}.slot text{fill:rgba(232,221,195,.56);font-size:10px;text-anchor:middle}.overview p{color:rgba(232,221,195,.6);font-size:9px;letter-spacing:.18em}.data{display:grid;gap:9px}.data div{display:grid;grid-template-columns:46px 1fr;gap:4px 10px;border-bottom:1px solid rgba(200,169,81,.12);padding-bottom:7px}.data span{color:var(--gb);font-size:10px;letter-spacing:.18em}.data b{text-align:right;color:#e7dcc1}.data em{grid-column:1/-1;color:rgba(232,221,195,.48);font-size:8px;font-style:normal}.join p{margin:14px 0 18px;color:rgba(232,221,195,.64);font-size:10px;line-height:1.55}footer{right:42px;bottom:13px;left:42px;display:grid;grid-template-columns:1fr 1.2fr 1fr;gap:20px;color:rgba(200,169,81,.42);font-size:9px;letter-spacing:.24em;text-transform:uppercase}footer b{text-align:center;font-weight:400}.hidden{position:absolute;width:1px;height:1px;overflow:hidden;opacity:0}@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{50%{opacity:.45}}@keyframes live{50%{filter:brightness(1.35)}}@keyframes radar{50%{opacity:.26}}@keyframes trace{50%{stroke-dasharray:6 2;opacity:1}}@media(max-width:1100px){.sfi-telemetry{overflow-y:auto;padding:22px 18px 24px}.top,.brand,nav,.indicators,.radar-panel,.field,.dock,footer{position:relative;inset:auto;transform:none}.top{max-width:none;font-size:9px}.right{text-align:left;margin-top:12px}.brand{left:auto;margin-top:22px}.brand h1{font-size:clamp(2.5rem,16vw,4.4rem)}nav{left:auto;max-width:100%;margin-top:18px;overflow-x:auto;justify-content:flex-start}.field{height:min(78vw,620px);min-height:390px;margin-top:20px}.indicators{width:100%;grid-template-columns:repeat(2,1fr);margin-top:12px}.radar-panel{width:auto;margin-top:12px}.dock{grid-template-columns:1fr;margin-top:12px}.dock article{border-right:0;border-bottom:1px solid rgba(200,169,81,.17)}.popup{position:fixed;inset:auto 14px 14px;transform:none;width:auto}.launcher{position:fixed;right:16px;bottom:16px;z-index:70}footer{grid-template-columns:1fr;margin-top:14px;text-align:center}}@media(max-width:680px){.sfi-telemetry{padding:18px 12px 22px}.indicators{grid-template-columns:1fr}.field{height:118vw;min-height:430px}.dock article{min-height:150px}nav a{font-size:8px;padding:8px 9px}}
    `}</style>
  </section>;
}

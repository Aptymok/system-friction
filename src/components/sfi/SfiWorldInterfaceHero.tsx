'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { SfiWorldInterfaceState } from '@/lib/sfi/worldInterfaceState';
import { SfiLiveWorldMap } from '@/components/sfi/SfiLiveWorldMap';

type Props = { state: SfiWorldInterfaceState };

const NAV_LINKS = [
  ['OBSERVATORY', '/observatory'],
  ['FIELD', '/field'],
  ['STUDIO', '/login?next=%2Fstudio'],
  ['METHOD', '/repository'],
  ['LOGIN', '/login'],
] as const;

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
function x(value: number) { return clamp01(value / 100) * 1200; }
function y(value: number) { return clamp01(value / 100) * 600; }
function utc(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC' : 'timestamp unavailable';
}
function delta(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'Δ unavailable';
  return `Δ24h ${value >= 0 ? '+' : ''}${value.toFixed(3)}`;
}
function path(from: { x: number; y: number }, to: { x: number; y: number }) {
  const x1 = x(from.x), y1 = y(from.y), x2 = x(to.x), y2 = y(to.y);
  const mx = (x1 + x2) / 2;
  const my = Math.min(y1, y2) - Math.max(24, Math.abs(x2 - x1) * 0.08);
  return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
}

function Readout({ title, status, value, detail }: { title: string; status: string; value: string; detail: string }) {
  return (
    <article className="sfi-readout">
      <header><span>{title}</span><em>{status}</em></header>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

export function SfiWorldInterfaceHero({ state }: Props) {
  const firstId = state.nodes[0]?.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(firstId);
  const nodeMap = useMemo(() => new Map(state.nodes.map((node) => [node.id, node])), [state.nodes]);
  const selected = selectedId ? nodeMap.get(selectedId) ?? null : null;
  const warningCount = state.warnings.length;

  return (
    <section className="sfi-world" aria-label="System Friction Institute observed world interface">
      <div className="sfi-map" aria-hidden="true"><SfiLiveWorldMap state={state} /></div>
      <div className="sfi-shade" aria-hidden="true" />

      <header className="sfi-head">
        <div className="sfi-brand">
          <span>SYSTEM FRICTION INSTITUTE</span>
          <strong>SFI</strong>
        </div>
        <div className="sfi-runtime-state">
          <span>PUBLIC OBSERVATION SURFACE</span>
          <strong>{state.signalState.status}</strong>
          <small>{utc(state.generatedAt)}</small>
        </div>
        <nav aria-label="SFI public navigation">
          {NAV_LINKS.map(([label, href]) => <Link key={label} href={href} className={label === 'LOGIN' ? 'login' : ''}>{label}</Link>)}
        </nav>
      </header>

      <aside className="sfi-rail rail-left">
        <Readout title="SIGNAL" status={state.signalState.status} value={state.signalState.value} detail={state.signalState.detail} />
        <Readout title="FRICTION" status={state.frictionLevel.status} value={state.frictionLevel.value} detail={state.frictionLevel.trend} />
        <Readout title="AMV MEMORY" status={state.amvMemory.status} value={state.amvMemory.value} detail={state.amvMemory.detail} />
        <Readout title="PREDICTIONS" status={state.predictions.status} value={state.predictions.value} detail={state.predictions.detail} />
      </aside>

      <div className="sfi-field" aria-label="Derived SFI topology from current runtime state">
        <svg viewBox="0 0 1200 600" role="img" aria-label="SFI runtime topology; positions are interface geometry, not geographic claims">
          <g className="edges">
            {state.connections.map((edge) => {
              const from = nodeMap.get(edge.from), to = nodeMap.get(edge.to);
              if (!from || !to) return null;
              return <path key={`${edge.from}-${edge.to}`} d={path(from, to)} style={{ opacity: 0.12 + clamp01(edge.strength) * 0.38 }} />;
            })}
          </g>
          <g className="nodes">
            {state.nodes.map((node) => (
              <g key={node.id} transform={`translate(${x(node.x)} ${y(node.y)})`} className={selectedId === node.id ? 'selected' : ''}
                role="button" tabIndex={0} onClick={() => setSelectedId(node.id)}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedId(node.id); }}>
                <circle className="halo" r={12 + clamp01(node.intensity) * 15} />
                <circle className="core" r={3.5 + clamp01(node.intensity) * 3} />
              </g>
            ))}
          </g>
        </svg>
        <div className="sfi-field-caption">TOPOLOGICAL PROJECTION · GEOMETRY IS INTERFACE LAYOUT · VALUES AND STATES COME FROM THE RUNTIME</div>
        {selected ? (
          <div className="sfi-node-reading">
            <header><span>SELECTED NODE</span><em>{selected.state}</em></header>
            <strong>{selected.label}</strong>
            <p>{selected.interpretation}</p>
            <small>{selected.invitation}</small>
          </div>
        ) : null}
      </div>

      <aside className="sfi-rail rail-right">
        <Readout title="INTERACTIONS" status={state.activeInteractions.status} value={state.activeInteractions.value} detail={state.activeInteractions.detail} />
        <Readout title="FIELD COHERENCE" status={state.fieldCoherence.status} value={state.fieldCoherence.value} detail={state.fieldCoherence.trend} />
        <Readout title="SYSTEM STRAIN" status={state.systemStrain.status} value={state.systemStrain.value} detail={state.systemStrain.trend} />
        <Readout title="APPROVAL" status={state.approvalState.status} value={state.approvalState.value} detail={state.approvalState.detail} />
      </aside>

      <footer className="sfi-dock">
        <div><span>ΦSFI</span><strong>{state.sfiIndex.value}</strong><small>{state.sfiIndex.detail}</small></div>
        <div><span>IHG</span><strong>{state.coreIndicators.ihg.value.toFixed(3)}</strong><small>{delta(state.coreIndicators.ihg.delta24h)}</small></div>
        <div><span>NTI</span><strong>{state.coreIndicators.nti.value.toFixed(3)}</strong><small>{delta(state.coreIndicators.nti.delta24h)}</small></div>
        <div><span>LDI</span><strong>{state.coreIndicators.ldi.value.toFixed(3)}</strong><small>{delta(state.coreIndicators.ldi.delta24h)}</small></div>
        <div><span>WSV</span><strong>{state.coreIndicators.wsv.value.toFixed(3)}</strong><small>{delta(state.coreIndicators.wsv.delta24h)}</small></div>
        <div><span>PROVENANCE</span><strong>{warningCount ? `${warningCount} WARNINGS` : 'NO RUNTIME WARNINGS'}</strong><small>{state.indicatorHistory.available ? `24h reference ${state.indicatorHistory.referenceCapturedAt ?? 'available'}` : '24h reference unavailable'}</small></div>
      </footer>

      <style jsx global>{`
        .sfi-world{position:relative;min-height:100svh;overflow:hidden;background:#030302;color:#e8ddc1;font-family:var(--sfi-font-mono),ui-monospace,SFMono-Regular,Menlo,monospace}
        .sfi-map{position:absolute;inset:0;opacity:.42}.sfi-shade{position:absolute;inset:0;background:radial-gradient(circle at 50% 45%,rgba(3,3,2,.08),rgba(3,3,2,.53) 58%,#030302 100%),linear-gradient(180deg,rgba(3,3,2,.18),rgba(3,3,2,.36));pointer-events:none}
        .sfi-head{position:absolute;z-index:10;top:0;left:0;right:0;min-height:84px;display:grid;grid-template-columns:230px 1fr auto;align-items:center;gap:20px;padding:14px 22px;border-bottom:1px solid rgba(201,170,84,.22);background:rgba(3,3,2,.78);backdrop-filter:blur(10px)}
        .sfi-brand span,.sfi-runtime-state span,.sfi-dock span{display:block;color:#9b8d69;font-size:8px;letter-spacing:.16em}.sfi-brand strong{display:block;color:#d6bc70;font:500 31px/1 Georgia,serif;margin-top:3px}.sfi-runtime-state{text-align:center}.sfi-runtime-state strong{display:block;margin:5px 0;color:#d9c590;font-size:11px;text-transform:uppercase}.sfi-runtime-state small{color:#6f6859;font-size:8px}
        .sfi-head nav{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.sfi-head nav a{border:1px solid transparent;padding:8px 9px;color:#8f8778;font-size:8px;letter-spacing:.12em;text-decoration:none}.sfi-head nav a:hover{color:#dec579;border-color:#4c4026}.sfi-head nav a.login{border-color:#77602d;color:#dcc06e}
        .sfi-rail{position:absolute;z-index:7;top:104px;bottom:116px;width:210px;display:grid;align-content:center;gap:8px}.rail-left{left:18px}.rail-right{right:18px}
        .sfi-readout{border:1px solid rgba(119,96,45,.28);background:rgba(5,5,3,.76);padding:11px 12px;backdrop-filter:blur(7px)}.sfi-readout header{display:flex;justify-content:space-between;gap:8px;color:#85795e;font-size:7px;letter-spacing:.1em}.sfi-readout header em{font-style:normal;color:#a79b81}.sfi-readout strong{display:block;margin:8px 0 5px;color:#e2cf91;font-size:17px;font-weight:500;word-break:break-word}.sfi-readout p{margin:0;color:#817a6b;font-size:8px;line-height:1.5}
        .sfi-field{position:absolute;z-index:5;inset:98px 236px 116px}.sfi-field svg{width:100%;height:100%}.sfi-field .edges path{fill:none;stroke:#ad9656;stroke-width:.8}.sfi-field .nodes g{cursor:pointer;outline:none}.sfi-field .halo{fill:none;stroke:#b69b52;stroke-width:.7;opacity:.42}.sfi-field .core{fill:#d9bd66;filter:drop-shadow(0 0 8px rgba(217,189,102,.5))}.sfi-field .selected .halo{stroke:#f1d98c;opacity:.95;stroke-width:1.2}.sfi-field .selected .core{fill:#f3df9a}
        .sfi-field-caption{position:absolute;left:50%;bottom:5px;transform:translateX(-50%);white-space:nowrap;color:#5f594e;font-size:7px;letter-spacing:.12em}.sfi-node-reading{position:absolute;left:50%;top:50%;width:min(410px,60%);transform:translate(-50%,-50%);border:1px solid rgba(201,170,84,.36);background:rgba(3,3,2,.88);padding:15px;box-shadow:0 24px 90px rgba(0,0,0,.35);pointer-events:none}.sfi-node-reading header{display:flex;justify-content:space-between;color:#8c7b51;font-size:7px;letter-spacing:.14em}.sfi-node-reading header em{font-style:normal}.sfi-node-reading strong{display:block;margin:9px 0;color:#ead79e;font-size:15px}.sfi-node-reading p{margin:0 0 8px;color:#aaa08b;font-size:10px;line-height:1.6}.sfi-node-reading small{color:#6f6859;font-size:8px}
        .sfi-dock{position:absolute;z-index:9;left:0;right:0;bottom:0;display:grid;grid-template-columns:repeat(6,1fr);min-height:96px;border-top:1px solid rgba(201,170,84,.22);background:rgba(3,3,2,.86);backdrop-filter:blur(10px)}.sfi-dock>div{padding:13px;border-right:1px solid rgba(201,170,84,.12)}.sfi-dock strong{display:block;margin:6px 0;color:#d7c17d;font-size:13px;font-weight:500}.sfi-dock small{display:block;color:#6e675a;font-size:7px;line-height:1.4}
        @media(max-width:1000px){.sfi-head{grid-template-columns:160px 1fr}.sfi-head nav{display:none}.sfi-rail{display:none}.sfi-field{inset:96px 10px 150px}.sfi-dock{grid-template-columns:repeat(3,1fr)}.sfi-dock>div:nth-child(n+4){display:none}}
        @media(max-width:620px){.sfi-head{grid-template-columns:1fr auto;padding:12px}.sfi-brand span{display:none}.sfi-runtime-state span{display:none}.sfi-field{bottom:126px}.sfi-node-reading{width:82%}.sfi-dock{min-height:108px}.sfi-dock>div{padding:10px}.sfi-field-caption{display:none}}
      `}</style>
    </section>
  );
}

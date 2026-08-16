import { readInstitutionalViewState } from '@/lib/sfi/institutionalViewState';

export const dynamic = 'force-dynamic';

function metric(value: number | null, digits = 3) {
  return value === null ? '—' : value.toFixed(digits);
}

function point(index: number, total: number) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1, total);
  const ring = 155 + (index % 3) * 42;
  return { x: 500 + Math.cos(angle) * ring, y: 270 + Math.sin(angle) * ring * 0.72 };
}

export default async function AtlasPage() {
  const state = await readInstitutionalViewState({ entityId: 'atlas', entityType: 'ORGANIZATION', label: 'Atlas institucional' });
  const positions = new Map(state.graph.nodes.map((node, index) => [node.id, point(index, state.graph.nodes.length)]));
  const frictionMax = Math.max(0.001, ...state.friction.nodes.map((item) => item.value));

  return (
    <main className="sfi-atlas">
      <header className="sfi-atlas-head" data-sfi-field-anchor="atlas-state">
        <div><span>SYSTEM FRICTION INSTITUTE · ATLAS</span><h1>Pattern memory.</h1><p>{state.tomography.field}</p></div>
        <dl>
          <div><dt>ΦSFI</dt><dd>{metric(state.metrics.phiSfi)}</dd></div>
          <div><dt>Fₛ</dt><dd>{metric(state.metrics.fS)}</dd></div>
          <div><dt>C_FIELD</dt><dd>{metric(state.metrics.cField)}</dd></div>
          <div><dt>RÉGIMEN</dt><dd>{state.metrics.regime ?? 'NO_VALUE'}</dd></div>
          <div><dt>GRAFO</dt><dd>{state.metrics.graphNodeCount}N / {state.metrics.graphEdgeCount}E</dd></div>
          <div><dt>EVIDENCIA</dt><dd>{state.metrics.evidenceCount}</dd></div>
        </dl>
      </header>

      <section className="sfi-atlas-panel sfi-atlas-graph" data-sfi-field-anchor="atlas-graph">
        <header><span>RELATIONAL MEMORY</span><strong>{state.graph.nodes.length} NODOS · {state.graph.edges.length} RELACIONES</strong></header>
        <svg viewBox="0 0 1000 540" role="img" aria-label="Grafo relacional institucional de Atlas">
          <defs><radialGradient id="atlasCore"><stop offset="0" stopColor="#c8a764" stopOpacity=".24"/><stop offset="1" stopColor="#c8a764" stopOpacity="0"/></radialGradient></defs>
          <circle cx="500" cy="270" r="150" fill="url(#atlasCore)" />
          {state.graph.edges.map((edge) => {
            const from = positions.get(edge.source); const to = positions.get(edge.target);
            if (!from || !to) return null;
            return <g key={edge.id}><line x1={from.x} y1={from.y} x2={to.x} y2={to.y} /><title>{edge.relation}</title></g>;
          })}
          {state.graph.nodes.map((node, index) => {
            const p = positions.get(node.id) ?? point(index, state.graph.nodes.length);
            return <g key={node.id} className="atlas-node"><circle cx={p.x} cy={p.y} r={index % 5 === 0 ? 6 : 4}/><text x={p.x} y={p.y + 17}>{node.label.slice(0, 26)}</text><title>{node.ontologyType} · {node.id}</title></g>;
          })}
          {!state.graph.nodes.length ? <text className="atlas-empty" x="500" y="270">NO PERSISTED GRAPH NODES</text> : null}
        </svg>
      </section>

      <section className="sfi-atlas-grid">
        <article className="sfi-atlas-panel" data-sfi-field-anchor="atlas-friction">
          <header><span>FRICTION FIELD</span><strong>{state.friction.topFriction.toFixed(3)}</strong></header>
          <p>{state.friction.summary}</p>
          <div className="atlas-bars">{state.friction.nodes.slice(0, 12).map((item) => <div key={item.id}><span>{item.label}</span><i><b style={{ width: `${Math.min(100, Math.max(2, item.value / frictionMax * 100))}%` }} /></i><strong>{item.value.toFixed(3)}</strong></div>)}</div>
        </article>

        <article className="sfi-atlas-panel" data-sfi-field-anchor="atlas-attractor">
          <header><span>ATTRACTOR DISTANCE</span><strong>{state.attractor.attractorDistance.toFixed(3)}</strong></header>
          <p>{state.attractor.summary}</p>
          <dl className="atlas-metrics">
            <div><dt>KNOWLEDGE VELOCITY</dt><dd>{state.attractor.knowledgeVelocity.toFixed(3)}</dd></div>
            <div><dt>AUTHORITY</dt><dd>{state.attractor.authorityScore.toFixed(3)}</dd></div>
            <div><dt>MEMORY GROWTH</dt><dd>{state.attractor.memoryGrowth.toFixed(3)}</dd></div>
            <div><dt>PREDICTION ACCURACY</dt><dd>{state.attractor.predictionAccuracy.toFixed(3)}</dd></div>
          </dl>
        </article>
      </section>

      <section className="sfi-atlas-grid">
        <article className="sfi-atlas-panel" data-sfi-field-anchor="atlas-context">
          <header><span>ENTITY CONTEXT</span><strong>{state.entityContext.entityId}</strong></header>
          <div className="atlas-context">{state.entityContext.entitySummary.map((item) => <p key={item}>{item}</p>)}</div>
          <div className="atlas-timeline">{state.entityContext.timeline.map((item, index) => <div key={`${item.step}-${index}`}><b>{String(index + 1).padStart(2, '0')}</b><span>{item.step}</span><strong>{item.value}</strong></div>)}</div>
        </article>

        <article className="sfi-atlas-panel" data-sfi-field-anchor="atlas-tomography">
          <header><span>TOMOGRAPHY</span><strong>{state.tomography.system}</strong></header>
          <div className="atlas-context"><p>{state.tomography.field}</p>{state.tomography.frictions.map((item) => <p key={item}>{item}</p>)}</div>
          <div className="atlas-sections">{state.tomography.sections.map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}</div>
        </article>
      </section>

      <section className="sfi-atlas-panel sfi-atlas-ledger" data-sfi-field-anchor="atlas-ledger">
        <header><span>ACCUMULATED EVIDENCE / PREDICTION / MEMORY</span><strong>{state.ledger.length} RECENT</strong></header>
        <div>{state.ledger.length ? state.ledger.map((item) => <article key={`${item.kind}:${item.identity}`} data-kind={item.kind}><span>{item.kind.toUpperCase()}</span><h2>{item.title}</h2><p>{item.summary}</p><small>{item.createdAt} · {item.identity}</small></article>) : <p className="atlas-none">NO PERSISTED LEDGER ITEMS IN THIS CUT.</p>}</div>
      </section>

      {state.metrics.warnings.length ? <section className="sfi-atlas-warning">{state.metrics.warnings.map((item) => <p key={item}>{item}</p>)}</section> : null}

      <style>{`
        .sfi-atlas{min-height:100vh;padding:72px clamp(18px,4vw,64px) 80px;color:#e8e2d5;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:linear-gradient(180deg,rgba(7,8,6,.54),rgba(7,8,6,.88))}.sfi-atlas-head{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(420px,.85fr);gap:44px;align-items:end;border-bottom:1px solid rgba(232,226,213,.16);padding-bottom:30px}.sfi-atlas-head span,.sfi-atlas-panel header span{font-size:8px;letter-spacing:.19em;color:#c8a764}.sfi-atlas-head h1{font:400 clamp(54px,8vw,118px)/.82 Georgia,serif;letter-spacing:-.055em;margin:14px 0 25px;color:#f5f0e6}.sfi-atlas-head p{max-width:760px;color:#aaa69c;font:15px/1.65 Georgia,serif}.sfi-atlas-head dl{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(232,226,213,.12)}.sfi-atlas-head dl div{background:rgba(7,8,6,.86);padding:14px}.sfi-atlas dt{font-size:7px;letter-spacing:.12em;color:#77736a}.sfi-atlas dd{margin:7px 0 0;color:#f0d397;font-size:14px}.sfi-atlas-panel{margin-top:18px;border:1px solid rgba(232,226,213,.14);background:rgba(9,10,8,.74);backdrop-filter:blur(14px)}.sfi-atlas-panel>header{display:flex;justify-content:space-between;gap:20px;padding:12px 14px;border-bottom:1px solid rgba(232,226,213,.10)}.sfi-atlas-panel>header strong{font-size:9px;color:#aaa69c;font-weight:400}.sfi-atlas-graph{height:min(62vh,680px);min-height:470px}.sfi-atlas-graph svg{width:100%;height:calc(100% - 42px);background-image:linear-gradient(rgba(232,226,213,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(232,226,213,.025) 1px,transparent 1px);background-size:44px 44px}.sfi-atlas-graph line{stroke:rgba(138,127,167,.24);stroke-width:1}.atlas-node circle{fill:#070806;stroke:#c8a764;stroke-width:1.2}.atlas-node text{fill:#aaa69c;font-size:10px;text-anchor:middle}.atlas-empty{fill:#77736a;font-size:13px;text-anchor:middle}.sfi-atlas-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.sfi-atlas-panel>p,.atlas-context{padding:0 16px;color:#aaa69c;font:13px/1.6 Georgia,serif}.atlas-bars{padding:10px 16px 18px;display:grid;gap:10px}.atlas-bars>div{display:grid;grid-template-columns:minmax(90px,180px) 1fr 54px;gap:10px;align-items:center;font-size:8px;color:#aaa69c}.atlas-bars i{height:1px;background:rgba(232,226,213,.12);position:relative}.atlas-bars b{display:block;height:1px;background:#a94c3b;box-shadow:0 0 12px rgba(169,76,59,.3)}.atlas-bars strong{text-align:right;color:#e8e2d5}.atlas-metrics{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:rgba(232,226,213,.10);margin:14px}.atlas-metrics div{background:#080907;padding:15px}.atlas-timeline{margin:14px;display:grid;border-left:1px solid rgba(200,167,100,.25)}.atlas-timeline div{display:grid;grid-template-columns:34px minmax(100px,.6fr) 1fr;gap:10px;padding:9px 12px;border-bottom:1px solid rgba(232,226,213,.07);font-size:8px}.atlas-timeline b{color:#c8a764}.atlas-timeline span{color:#77736a}.atlas-timeline strong{color:#d8d2c5;font-weight:400}.atlas-sections{display:flex;flex-wrap:wrap;gap:6px;padding:14px}.atlas-sections span{border:1px solid rgba(232,226,213,.11);padding:7px 9px;font-size:7px;color:#aaa69c}.sfi-atlas-ledger>div{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1px;background:rgba(232,226,213,.08)}.sfi-atlas-ledger article{padding:16px;background:rgba(7,8,6,.84);min-height:150px}.sfi-atlas-ledger article>span{font-size:7px;letter-spacing:.15em;color:#c8a764}.sfi-atlas-ledger article[data-kind=prediction]>span{color:#8a7fa7}.sfi-atlas-ledger article[data-kind=memory]>span{color:#69a5a4}.sfi-atlas-ledger h2{font:400 18px/1.2 Georgia,serif;color:#f2ecdf;margin:10px 0}.sfi-atlas-ledger p{color:#aaa69c;font:11px/1.5 Georgia,serif}.sfi-atlas-ledger small{color:#67645e;font-size:7px}.atlas-none{padding:25px;color:#77736a}.sfi-atlas-warning{margin-top:18px;border-left:2px solid #a94c3b;padding:8px 14px;color:#c98b7d;font-size:9px}.sfi-atlas-warning p{margin:4px 0}@media(max-width:900px){.sfi-atlas-head,.sfi-atlas-grid{grid-template-columns:1fr}.sfi-atlas-head dl{grid-template-columns:repeat(2,1fr)}.sfi-atlas-graph{min-height:420px}.atlas-node text{display:none}}@media(max-width:600px){.sfi-atlas{padding:80px 14px 60px}.sfi-atlas-head dl{grid-template-columns:1fr 1fr}.atlas-bars>div{grid-template-columns:90px 1fr 44px}.atlas-timeline div{grid-template-columns:28px 1fr}.atlas-timeline strong{grid-column:2}}
      `}</style>
    </main>
  );
}

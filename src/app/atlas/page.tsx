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
      <header className="sfi-atlas-head">
        <div><span>SYSTEM FRICTION INSTITUTE · ATLAS</span><h1>Pattern memory.</h1><p>{state.tomography.field}</p></div>
        <dl>
          <div><dt>ΦSFI</dt><dd>{metric(state.metrics.phiSfi)}</dd></div>
          <div><dt>Fₛ</dt><dd>{metric(state.metrics.fS)}</dd></div>
          <div><dt>C_FIELD</dt><dd>{metric(state.metrics.cField)}</dd></div>
          <div><dt>RÉGIMEN</dt><dd>{state.metrics.regime ?? '—'}</dd></div>
          <div><dt>GRAFO</dt><dd>{state.metrics.graphNodeCount}N / {state.metrics.graphEdgeCount}E</dd></div>
          <div><dt>EVIDENCIA</dt><dd>{state.metrics.evidenceCount}</dd></div>
        </dl>
      </header>

      <section className="panel graph">
        <header><span>RELATIONAL MEMORY</span><strong>{state.graph.nodes.length} NODOS · {state.graph.edges.length} RELACIONES</strong></header>
        <svg viewBox="0 0 1000 540" role="img" aria-label="Grafo relacional institucional de Atlas">
          {state.graph.edges.map((edge) => {
            const from = positions.get(edge.source); const to = positions.get(edge.target);
            return from && to ? <line key={edge.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y}><title>{edge.relation}</title></line> : null;
          })}
          {state.graph.nodes.map((node, index) => {
            const p = positions.get(node.id) ?? point(index, state.graph.nodes.length);
            return <g key={node.id}><circle cx={p.x} cy={p.y} r={5}/><text x={p.x} y={p.y + 17}>{node.label.slice(0, 26)}</text><title>{node.ontologyType} · {node.id}</title></g>;
          })}
          {!state.graph.nodes.length ? <text className="empty" x="500" y="270">NO PERSISTED GRAPH NODES</text> : null}
        </svg>
      </section>

      <section className="grid">
        <article className="panel">
          <header><span>FRICTION FIELD</span><strong>{metric(state.friction.topFriction)}</strong></header>
          <p>{state.friction.summary}</p>
          <div className="bars">{state.friction.nodes.slice(0, 12).map((item) => <div key={item.id}><span>{item.label}</span><i><b style={{ width: `${Math.min(100, Math.max(2, item.value / frictionMax * 100))}%` }} /></i><strong>{item.value.toFixed(3)}</strong></div>)}</div>
        </article>

        <article className="panel">
          <header><span>ATTRACTOR EVIDENCE</span><strong>{metric(state.attractor.evidenceCoverage)}</strong></header>
          <p>{state.attractor.summary}</p>
          <dl className="metrics">
            <div><dt>EVIDENCE COVERAGE</dt><dd>{metric(state.attractor.evidenceCoverage)}</dd></div>
            <div><dt>OBSERVED AT</dt><dd>{state.attractor.observedAt ?? '—'}</dd></div>
            <div><dt>SUPPORTED DIMENSIONS</dt><dd>{state.attractor.supportedDimensions.length}</dd></div>
            <div><dt>CONTRADICTED DIMENSIONS</dt><dd>{state.attractor.contradictedDimensions.length}</dd></div>
          </dl>
          {state.attractor.missingDimensions.length ? <p>Missing: {state.attractor.missingDimensions.join(', ')}</p> : null}
        </article>
      </section>

      <section className="grid">
        <article className="panel"><header><span>ENTITY CONTEXT</span><strong>{state.entityContext.entityId}</strong></header><div className="context">{state.entityContext.entitySummary.map((item) => <p key={item}>{item}</p>)}</div></article>
        <article className="panel"><header><span>TOMOGRAPHY</span><strong>{state.tomography.system}</strong></header><div className="context"><p>{state.tomography.field}</p>{state.tomography.frictions.map((item) => <p key={item}>{item}</p>)}</div></article>
      </section>

      <section className="panel ledger">
        <header><span>ACCUMULATED EVIDENCE / PREDICTION / MEMORY</span><strong>{state.ledger.length} RECENT</strong></header>
        <div>{state.ledger.length ? state.ledger.map((item) => <article key={`${item.kind}:${item.identity}`}><span>{item.kind.toUpperCase()}</span><h2>{item.title}</h2><p>{item.summary}</p><small>{item.createdAt} · {item.identity}</small></article>) : <p>NO PERSISTED LEDGER ITEMS IN THIS CUT.</p>}</div>
      </section>

      {state.metrics.warnings.length ? <section className="warning">{state.metrics.warnings.map((item) => <p key={item}>{item}</p>)}</section> : null}

      <style>{`
        .sfi-atlas{min-height:100vh;padding:72px clamp(18px,4vw,64px) 80px;color:#e8e2d5;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#080907}.sfi-atlas-head{display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:end;border-bottom:1px solid #ffffff20;padding-bottom:28px}.sfi-atlas-head span,.panel header span{font-size:8px;letter-spacing:.18em;color:#c8a764}.sfi-atlas-head h1{font:400 clamp(54px,8vw,110px)/.82 Georgia,serif;margin:14px 0 22px}.sfi-atlas-head p,.panel p,.context{color:#aaa69c;font:13px/1.6 Georgia,serif}.sfi-atlas-head dl,.metrics{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;background:#ffffff18}.sfi-atlas-head dl div,.metrics div{background:#080907;padding:13px}.sfi-atlas dt{font-size:7px;color:#77736a}.sfi-atlas dd{margin:6px 0 0;color:#f0d397;font-size:12px}.panel{margin-top:18px;border:1px solid #ffffff20;background:#090a08}.panel>header{display:flex;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #ffffff14}.panel>header strong{font-size:9px;color:#aaa69c;font-weight:400}.graph{height:min(62vh,680px);min-height:470px}.graph svg{width:100%;height:calc(100% - 42px)}.graph line{stroke:#8a7fa740}.graph circle{fill:#070806;stroke:#c8a764}.graph text{fill:#aaa69c;font-size:10px;text-anchor:middle}.empty{fill:#77736a}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.panel>p,.context{padding:0 16px}.bars{padding:12px 16px}.bars>div{display:grid;grid-template-columns:170px 1fr 55px;gap:10px;align-items:center;font-size:8px;margin:10px 0}.bars i{height:1px;background:#ffffff20}.bars b{display:block;height:1px;background:#a94c3b}.ledger>div{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1px;background:#ffffff12}.ledger article{padding:16px;background:#080907}.ledger h2{font:400 18px Georgia,serif}.ledger small{font-size:7px;color:#77736a}.warning{margin-top:18px;border-left:2px solid #a94c3b;padding:8px 14px;font-size:9px}@media(max-width:900px){.sfi-atlas-head,.grid{grid-template-columns:1fr}.graph{min-height:420px}}`}</style>
    </main>
  );
}

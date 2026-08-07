'use client';

import type { RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';

function displayTime(value: string | null) {
  if (!value) return 'SIN FECHA';
  const date = new Date(value);
  if (!Number.isFinite(date.valueOf())) return value;
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function RootInstitutionalSelfPerception({ state }: { state: RootSovereignState }) {
  const interpretation = state.interpretation;
  return (
    <section className="risp" aria-label="Estado institucional observado por ROOT">
      <header className="risp-head">
        <div>
          <span>ROOT / ESTADO INSTITUCIONAL</span>
          <h1>{interpretation.headline}</h1>
        </div>
        <div className="risp-cut">
          <span>CORTE</span>
          <strong>{displayTime(interpretation.generatedAt)}</strong>
          <small>{interpretation.schemaVersion}</small>
        </div>
      </header>

      <div className="risp-narrative">
        {interpretation.narrative.map((sentence, index) => <p key={`${index}-${sentence}`}>{sentence}</p>)}
      </div>

      <div className="risp-fact-field">
        {interpretation.facts.map((fact) => (
          <article key={fact.id} className="risp-fact" data-status={fact.status}>
            <div className="risp-fact-state" aria-hidden="true"><i /></div>
            <div className="risp-fact-main">
              <span>{fact.label}</span>
              <strong>{fact.value}</strong>
              <p>{fact.explanation}</p>
            </div>
            <div className="risp-fact-trace">
              <b>{fact.status.toUpperCase()}</b>
              <span>{fact.source}</span>
              <time>{displayTime(fact.observedAt)}</time>
              {fact.evidenceIds.length ? <small>{fact.evidenceIds.length} refs</small> : null}
            </div>
          </article>
        ))}
      </div>

      <section className="risp-divergence">
        <header>
          <span>DIVERGENCIAS OBSERVADAS</span>
          <strong>{interpretation.divergences.length}</strong>
        </header>
        {interpretation.divergences.length ? (
          <div className="risp-divergence-list">
            {interpretation.divergences.map((item) => (
              <article key={item.id} data-status={item.status}>
                <i aria-hidden="true" />
                <div><span>{item.status.toUpperCase()}</span><strong>{item.title}</strong><p>{item.observation}</p></div>
                <small>{item.source}</small>
              </article>
            ))}
          </div>
        ) : <p className="risp-none">El runtime no expone divergencias en las fuentes consultadas. Esto no constituye validación total.</p>}
      </section>

      <style jsx>{`
        .risp{margin:0;border-bottom:1px solid rgba(201,170,84,.22);background:#050504;color:#d8d0bd;font-family:var(--sfi-font-mono),ui-monospace,SFMono-Regular,Menlo,monospace}
        .risp-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:28px;padding:28px 30px 24px;border-bottom:1px solid rgba(201,170,84,.18)}
        .risp-head span,.risp-cut span,.risp-divergence header span{color:#a78c4e;font-size:9px;letter-spacing:.16em}.risp-head h1{max-width:1050px;margin:10px 0 0;color:#eadfca;font:400 clamp(22px,2.5vw,38px)/1.2 Georgia,serif;letter-spacing:-.02em}
        .risp-cut{text-align:right;min-width:210px}.risp-cut strong,.risp-cut small{display:block;margin-top:6px}.risp-cut strong{font-size:10px;color:#c4b58f}.risp-cut small{font-size:8px;color:#625d53}
        .risp-narrative{padding:22px 30px;border-bottom:1px solid rgba(201,170,84,.13);max-width:1240px}.risp-narrative p{margin:0 0 7px;color:#9c9587;font-size:11px;line-height:1.7}.risp-narrative p:first-child{color:#d0c3a7;font-size:13px}
        .risp-fact-field{display:grid}.risp-fact{display:grid;grid-template-columns:18px minmax(0,1fr) minmax(220px,330px);gap:18px;align-items:center;padding:14px 30px;border-bottom:1px solid rgba(255,255,255,.045)}
        .risp-fact-state{height:28px;display:grid;place-items:center}.risp-fact-state i{display:block;width:2px;height:100%;background:#4e4b44}.risp-fact[data-status=observed] .risp-fact-state i,.risp-fact[data-status=derived] .risp-fact-state i{background:#b89c58}.risp-fact[data-status=degraded] .risp-fact-state i{background:#a36e3d}.risp-fact[data-status=missing] .risp-fact-state i{background:#7d4141}.risp-fact[data-status=gated] .risp-fact-state i{background:#555f74}
        .risp-fact-main>span{color:#777165;font-size:8px;letter-spacing:.12em}.risp-fact-main strong{display:block;margin:4px 0;color:#e1d5bb;font:400 16px/1.25 Georgia,serif}.risp-fact-main p{margin:0;color:#80796d;font-size:9px;line-height:1.55}.risp-fact-trace{text-align:right}.risp-fact-trace b,.risp-fact-trace span,.risp-fact-trace time,.risp-fact-trace small{display:block;font-size:8px;line-height:1.5}.risp-fact-trace b{color:#b79b59}.risp-fact-trace span,.risp-fact-trace time,.risp-fact-trace small{color:#625e56}
        .risp-divergence{padding:22px 30px 28px}.risp-divergence header{display:flex;align-items:baseline;gap:10px;margin-bottom:14px}.risp-divergence header strong{color:#d8c17b;font-size:20px}.risp-divergence-list{display:grid}.risp-divergence-list article{display:grid;grid-template-columns:10px minmax(0,1fr) minmax(180px,280px);gap:15px;align-items:start;padding:11px 0;border-top:1px solid rgba(255,255,255,.045)}.risp-divergence-list article>i{width:5px;height:5px;margin-top:8px;border-radius:50%;background:#8d6c3f}.risp-divergence-list article[data-status=blocking]>i{background:#a64e4e}.risp-divergence-list article[data-status=degraded]>i{background:#aa743d}.risp-divergence-list span{color:#756d60;font-size:8px;letter-spacing:.12em}.risp-divergence-list strong{display:block;margin:3px 0;color:#cfc3aa;font-size:11px}.risp-divergence-list p{margin:0;color:#81796b;font-size:9px;line-height:1.5}.risp-divergence-list small{text-align:right;color:#5f5a52;font-size:8px}.risp-none{color:#706a60;font-size:9px}
        @media(max-width:760px){.risp-head{grid-template-columns:1fr}.risp-cut{text-align:left}.risp-fact{grid-template-columns:12px 1fr}.risp-fact-trace{grid-column:2;text-align:left}.risp-divergence-list article{grid-template-columns:8px 1fr}.risp-divergence-list small{grid-column:2;text-align:left}}
      `}</style>
    </section>
  );
}

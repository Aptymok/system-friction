'use client';

type Row = Record<string, unknown>;

function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : [];
}

function text(value: unknown, fallback = 'sin datos') {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function pct(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  const safe = Number.isFinite(parsed) ? parsed : 0;
  return `${Math.round(safe * 100)}%`;
}

export function WorldSpectEvidenceTracePanel({ trace }: { trace: unknown }) {
  const root = trace && typeof trace === 'object' && !Array.isArray(trace) ? trace as Row : {};
  const traces = rows(root.traces);

  return (
    <section className="border border-[#d8b64a24] bg-[#080706] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[10px] uppercase tracking-[0.18em] text-[#e0c46c]">Trazabilidad exacta por vector</h2>
          <p className="mt-2 text-[11px] leading-5 text-[#8a8172]">
            Cada vector debe declarar evidencia interna SFI y evidencia externa. Si falta una de las dos, el sistema no puede declarar cierre completo.
          </p>
        </div>
        <div className="text-right text-[10px] text-[#9c9282]">
          snapshot<br />
          <b className="text-[#e0c46c]">{text(root.snapshot_id, 'sin snapshot')}</b>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {traces.map((item, index) => {
          const internal = rows(item.internal_evidence);
          const external = rows(item.external_evidence);
          const complete = Boolean(item.evidence_complete);
          return (
            <article key={`${text(item.vector, 'vector')}-${index}`} className="border border-[#d8b64a18] bg-black/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <b className="text-[11px] uppercase tracking-[0.12em] text-[#f5e7bd]">{text(item.vector)}</b>
                <span className={complete ? 'text-[#d9f99d]' : 'text-[#fca5a5]'}>
                  {complete ? 'complete' : 'incomplete'}
                </span>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-2 text-[9px] text-[#8a8172]">
                <div>trust<br /><b className="text-[#e0c46c]">{pct(item.trust)}</b></div>
                <div>persist<br /><b className="text-[#e0c46c]">{pct(item.persistence)}</b></div>
                <div>degrad<br /><b className="text-[#e0c46c]">{pct(item.degradation)}</b></div>
              </div>

              <div className="mt-3 text-[9px] uppercase tracking-[0.14em] text-[#e0c46c]">externa</div>
              <div className="mt-1 space-y-1">
                {external.length ? external.map((ev, evIndex) => (
                  <div key={evIndex} className="rounded border border-[#d8b64a14] px-2 py-1 text-[9px] text-[#b8ae9d]">
                    {text(ev.provider)} · {text(ev.source_id)}
                  </div>
                )) : <div className="text-[9px] text-[#fca5a5]">falta evidencia externa exacta</div>}
              </div>

              <div className="mt-3 text-[9px] uppercase tracking-[0.14em] text-[#e0c46c]">interna</div>
              <div className="mt-1 space-y-1">
                {internal.length ? internal.map((ev, evIndex) => (
                  <div key={evIndex} className="rounded border border-[#d8b64a14] px-2 py-1 text-[9px] text-[#b8ae9d]">
                    {text(ev.provider)} · {text(ev.evidence_ref)}
                  </div>
                )) : <div className="text-[9px] text-[#fca5a5]">falta evidencia interna exacta</div>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
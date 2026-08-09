'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import type { RootRow } from '@/lib/root/sovereign/rootSovereignState';
import type { RootSelection } from './sovereignTypes';
import { describeRootSelection } from '@/lib/root/sovereign/selectionNarrative';

function displayTime(value: string | null | undefined) {
  if (!value) return 'SIN FECHA';
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.valueOf())) return value;
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}

function rootRow(value: unknown): RootRow {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RootRow : {};
}

function text(value: unknown, fallback = 'MISSING') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function list(value: unknown): RootRow[] {
  return Array.isArray(value)
    ? value.filter((item): item is RootRow => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : [];
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())) : [];
}

function contextualAction(kind: string) {
  const normalized = kind.toLowerCase();
  if (normalized.includes('attractor')) return { href: '/root/attractor', label: 'ABRIR CAMPO DEL ATRACTOR' };
  if (
    normalized.includes('hypothesis') ||
    normalized.includes('prediction') ||
    normalized.includes('proposal')
  ) return { href: '/root/evidence/intake', label: 'VINCULAR EVIDENCIA DE CONTRASTE' };
  if (normalized.includes('evidence') || normalized.includes('ledger')) {
    return { href: '/root/evidence/intake', label: 'VINCULAR EVIDENCIA RELACIONADA' };
  }
  return null;
}

function divergenceTone(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === 'blocking') return 'blocking';
  if (normalized === 'degraded') return 'degraded';
  return 'open';
}

export function RootSemanticInspector({ value, onClose }: { value: RootSelection | null; onClose: () => void }) {
  useEffect(() => {
    if (!value) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [value, onClose]);

  if (!value) return null;

  const data = rootRow(value.data);
  const narrative = describeRootSelection({
    kind: value.kind,
    technicalTitle: value.title,
    data,
    evidenceCount: value.evidenceIds.length,
  });
  const action = contextualAction(value.kind);
  const divergences = list(data.divergences);
  const institutionalNarrative = Array.isArray(data.narrative)
    ? data.narrative.filter((item): item is string => typeof item === 'string')
    : [];
  const systemState = rootRow(data.state);
  const openItems = rootRow(data.openItems);
  const relatedFact = rootRow(data.relatedFact);
  const isSystemItem = value.kind.toLowerCase() === 'system-item';
  const isDivergence = value.kind.toLowerCase() === 'divergence';
  const isInstitutional = ['institutional-position', 'institutional-fact'].includes(value.kind.toLowerCase());
  const isEvidence = value.kind.toLowerCase().includes('evidence') || value.kind.toLowerCase().includes('ledger');
  const payloadEvidence = strings(data.evidenceIds ?? data.evidence_ids ?? data.lineage);
  const evidenceRefs = Array.from(new Set([...value.evidenceIds, ...payloadEvidence]));

  return (
    <div className="rsi-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="rsi-modal" role="dialog" aria-modal="true" aria-labelledby="rsi-title">
        <header>
          <div><span>{value.kind}</span><h2 id="rsi-title">{narrative.title}</h2></div>
          <button type="button" onClick={onClose} aria-label="Cerrar">×</button>
        </header>

        <div className="rsi-scroll">
          <section className="rsi-primary">
            <strong>{narrative.statement}</strong>
            <p>{narrative.meaning}</p>
          </section>

          {isInstitutional && divergences.length ? (
            <section className="rsi-diagnostic">
              <div className="rsi-section-title">DÓNDE ESTÁ LA DIVERGENCIA · {divergences.length}</div>
              <div className="rsi-divergence-grid">
                {divergences.map((entry, index) => {
                  const status = text(entry.status, 'open');
                  return <article key={text(entry.id, `div-${index}`)} data-severity={divergenceTone(status)}>
                    <div><b>{status.toUpperCase()}</b><span>{text(entry.source, 'FUENTE NO DECLARADA')}</span></div>
                    <h3>{text(entry.title, `Divergencia ${index + 1}`)}</h3>
                    <p>{text(entry.observation, 'Sin detalle persistido.')}</p>
                  </article>;
                })}
              </div>
            </section>
          ) : null}

          {isInstitutional && institutionalNarrative.length ? (
            <section className="rsi-diagnostic">
              <div className="rsi-section-title">LECTURA INSTITUCIONAL</div>
              <ol>{institutionalNarrative.map((item) => <li key={item}>{item}</li>)}</ol>
            </section>
          ) : null}

          {isSystemItem ? (
            <section className="rsi-diagnostic">
              <div className="rsi-section-title">LECTURA DEL SISTEMA</div>
              <div className="rsi-system-grid">
                <div><span>SALUD DE LECTURA</span><strong>{text(systemState.status).toUpperCase()}</strong></div>
                <div><span>ESTADO REPORTADO</span><strong>{text(systemState.value)}</strong></div>
                <div><span>ELEMENTOS ABIERTOS</span><strong>{typeof openItems.value === 'number' ? openItems.value : text(openItems.value)}</strong></div>
              </div>
              <p className="rsi-explanation">{text(systemState.explanation, 'Sin explicación persistida.')}</p>
              {text(systemState.warning, '') ? <div className="rsi-cause"><span>CAUSA DE DEGRADACIÓN</span><strong>{text(systemState.warning)}</strong></div> : null}
            </section>
          ) : null}

          {isDivergence ? (
            <section className="rsi-diagnostic">
              <div className="rsi-section-title">DIAGNÓSTICO DE DIVERGENCIA</div>
              <div className="rsi-cause"><span>HUECO OBSERVADO</span><strong>{text(data.observation)}</strong></div>
              {Object.keys(relatedFact).length ? <div className="rsi-related">
                <span>LECTURA RELACIONADA</span>
                <strong>{text(relatedFact.label)} · {text(relatedFact.value)}</strong>
                <small>CLASE · {text(relatedFact.status).toUpperCase()}</small>
              </div> : null}
            </section>
          ) : null}

          {isEvidence ? (
            <section className="rsi-diagnostic">
              <div className="rsi-section-title">PROCEDENCIA / LINAJE</div>
              {evidenceRefs.length ? <div className="rsi-refs">{evidenceRefs.map((ref) => <code key={ref}>{ref}</code>)}</div> : <p className="rsi-empty">Este nodo no expone referencias adicionales. No significa que debas cargar otra evidencia.</p>}
            </section>
          ) : null}

          <section className="rsi-next"><span>QUÉ SIGUE</span><p>{narrative.nextState}</p></section>

          <dl>
            <div><dt>FUENTE</dt><dd>{value.source}</dd></div>
            <div><dt>FECHA</dt><dd>{displayTime(value.observedAt)}</dd></div>
            <div><dt>PROCEDENCIA</dt><dd>{narrative.evidenceLabel}</dd></div>
            {narrative.facts.map((fact) => <div key={`${fact.label}-${fact.value}`}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
          </dl>

          {value.warning ? <p className="rsi-warning">{value.warning}</p> : null}

          <details>
            <summary>DATOS TÉCNICOS</summary>
            <pre>{JSON.stringify({ id: value.id, technicalTitle: value.title, evidenceIds: value.evidenceIds, payload: value.data }, null, 2)}</pre>
          </details>

          {action ? <Link className="rsi-action" href={action.href}>{action.label}</Link> : null}
        </div>
      </section>

      <style jsx global>{`
        .rtf-inspector{display:none!important}.rtf-layout{grid-template-columns:minmax(0,1fr)!important}.rtf-stage{border-right:0!important}
        .rsi-backdrop{position:fixed;z-index:120;inset:0;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:38px 5vw;backdrop-filter:blur(2px)}
        .rsi-modal{width:min(980px,94vw);max-height:min(860px,90vh);background:#070706;border:1px solid rgba(201,170,84,.28);color:#d7cfbd;font-family:var(--sfi-font-mono),ui-monospace,SFMono-Regular,Menlo,monospace;box-shadow:0 28px 90px rgba(0,0,0,.72);display:flex;flex-direction:column}
        .rsi-modal>header{display:flex;justify-content:space-between;gap:18px;padding:20px 24px;border-bottom:1px solid rgba(255,255,255,.06);background:#090908}.rsi-modal>header span,.rsi-section-title,.rsi-next>span{color:#a68d53;font-size:8px;letter-spacing:.16em}.rsi-modal h2{margin:6px 0 0;color:#eadbb7;font:400 25px/1.2 Georgia,serif}.rsi-modal>header button{border:1px solid rgba(201,170,84,.12);background:transparent;color:#887f70;width:32px;height:32px;font-size:20px;cursor:pointer}.rsi-modal>header button:hover{color:#e6d6b2;border-color:rgba(201,170,84,.4)}
        .rsi-scroll{overflow:auto;padding:0 24px 24px;scrollbar-width:thin;scrollbar-color:rgba(200,169,81,.24) transparent}.rsi-primary{padding:22px 0;border-bottom:1px solid rgba(255,255,255,.05)}.rsi-primary strong{display:block;color:#e3c979;font:400 20px/1.4 Georgia,serif}.rsi-primary p,.rsi-next p,.rsi-diagnostic p{color:#9b9281;font-size:11px;line-height:1.75}.rsi-next{padding:18px 0;border-bottom:1px solid rgba(255,255,255,.05)}
        .rsi-diagnostic{padding:19px 0;border-bottom:1px solid rgba(255,255,255,.05)}.rsi-divergence-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}.rsi-divergence-grid article{border:1px solid rgba(201,170,84,.12);background:#0a0a09;padding:13px}.rsi-divergence-grid article[data-severity=blocking]{border-color:rgba(190,72,72,.55)}.rsi-divergence-grid article[data-severity=degraded]{border-color:rgba(201,143,79,.42)}.rsi-divergence-grid article[data-severity=open]{border-color:rgba(201,170,84,.24)}.rsi-divergence-grid article>div{display:flex;justify-content:space-between;gap:12px}.rsi-divergence-grid article b{font-size:7px;color:#c88865}.rsi-divergence-grid article span{font-size:7px;color:#5e594f;text-align:right}.rsi-divergence-grid h3{margin:9px 0 3px;font:400 16px Georgia,serif;color:#d9c8a2}.rsi-divergence-grid p{margin:0;font-size:9px;line-height:1.55}.rsi-diagnostic ol{margin:12px 0 0;padding-left:22px;color:#958c7c;font:12px/1.7 Georgia,serif}.rsi-diagnostic li+li{margin-top:7px}
        .rsi-system-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}.rsi-system-grid>div,.rsi-related{border:1px solid rgba(201,170,84,.1);background:#0a0a09;padding:12px}.rsi-system-grid span,.rsi-related span,.rsi-cause span{display:block;font-size:7px;letter-spacing:.12em;color:#655f53}.rsi-system-grid strong,.rsi-related strong{display:block;margin-top:7px;color:#d4bd7b;font-size:11px}.rsi-related small{display:block;margin-top:5px;color:#7d7465;font-size:7px}.rsi-explanation{margin:12px 0 0}.rsi-cause{margin-top:10px;border-left:2px solid #b86f55;background:rgba(184,111,85,.06);padding:11px 13px}.rsi-cause strong{display:block;margin-top:6px;color:#cba18b;font-size:10px;line-height:1.6;overflow-wrap:anywhere}
        .rsi-refs{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}.rsi-refs code{border:1px solid rgba(95,151,102,.28);background:rgba(69,128,77,.06);color:#7fb786;padding:6px 8px;font-size:8px;overflow-wrap:anywhere}.rsi-empty{font-style:italic}.rsi-modal dl{margin:0}.rsi-modal dl div{display:grid;grid-template-columns:180px 1fr;gap:18px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04)}.rsi-modal dt{color:#5f5a50;font-size:7px;letter-spacing:.09em}.rsi-modal dd{margin:0;color:#aaa08b;font-size:9px;line-height:1.55;overflow-wrap:anywhere}.rsi-warning{color:#c28e70;font-size:9px;line-height:1.6}.rsi-modal details{margin-top:17px;padding-top:14px;border-top:1px solid rgba(201,170,84,.14)}.rsi-modal summary{color:#8d7748;font-size:8px;cursor:pointer}.rsi-modal pre{white-space:pre-wrap;overflow-wrap:anywhere;color:#777168;font-size:8px;line-height:1.55}.rsi-action{display:inline-block;margin-top:18px;border:1px solid #5e5032;padding:10px 12px;color:#c7aa63;text-decoration:none;font-size:8px;letter-spacing:.08em}.rsi-action:hover{border-color:#9b8245;color:#e3c77e}
        @media(max-width:720px){.rsi-backdrop{padding:10px}.rsi-modal{width:100%;max-height:95vh}.rsi-scroll{padding:0 16px 18px}.rsi-modal>header{padding:16px}.rsi-divergence-grid{grid-template-columns:1fr}.rsi-system-grid{grid-template-columns:1fr}.rsi-modal dl div{grid-template-columns:1fr;gap:3px}}
      `}</style>
    </div>
  );
}

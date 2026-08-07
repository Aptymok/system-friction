'use client';

import Link from 'next/link';
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

export function RootSemanticInspector({ value, onClose }: { value: RootSelection | null; onClose: () => void }) {
  if (!value) return null;
  const narrative = describeRootSelection({
    kind: value.kind,
    technicalTitle: value.title,
    data: rootRow(value.data),
    evidenceCount: value.evidenceIds.length,
  });

  return (
    <aside className="rsi-root" aria-live="polite">
      <header>
        <div><span>{value.kind}</span><h2>{narrative.title}</h2></div>
        <button type="button" onClick={onClose}>×</button>
      </header>
      <section className="rsi-primary"><strong>{narrative.statement}</strong><p>{narrative.meaning}</p></section>
      <section className="rsi-next"><span>QUÉ SIGUE</span><p>{narrative.nextState}</p></section>
      <dl>
        <div><dt>FUENTE</dt><dd>{value.source}</dd></div>
        <div><dt>FECHA</dt><dd>{displayTime(value.observedAt)}</dd></div>
        <div><dt>PROCEDENCIA</dt><dd>{narrative.evidenceLabel}</dd></div>
        {narrative.facts.map((fact) => <div key={`${fact.label}-${fact.value}`}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
      </dl>
      {value.warning ? <p className="rsi-warning">{value.warning}</p> : null}
      <details><summary>DATOS TÉCNICOS</summary><pre>{JSON.stringify({ id: value.id, technicalTitle: value.title, evidenceIds: value.evidenceIds, payload: value.data }, null, 2)}</pre></details>
      <Link href="/root/evidence/intake">ADJUNTAR / VINCULAR EVIDENCIA</Link>
      <style jsx global>{`
        .rtf-inspector{display:none!important}.rtf-layout{grid-template-columns:minmax(0,1fr)!important}.rtf-stage{border-right:0!important}
        .rs-console-host.has-semantic-selection .rtf-stage{padding-right:370px}
        .rsi-root{position:fixed;z-index:95;right:0;top:42px;width:min(370px,94vw);height:calc(100vh - 42px);overflow:auto;background:#070706;border-left:1px solid rgba(201,170,84,.2);padding:22px;color:#d7cfbd;font-family:var(--sfi-font-mono),ui-monospace,SFMono-Regular,Menlo,monospace;box-shadow:-18px 0 35px rgba(0,0,0,.22)}
        .rsi-root header{display:flex;justify-content:space-between;gap:12px;padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,.06)}.rsi-root header span,.rsi-next span{color:#8a7547;font-size:8px;letter-spacing:.13em}.rsi-root h2{margin:5px 0 0;color:#ded0ae;font:400 20px/1.25 Georgia,serif}.rsi-root header button{border:0;background:transparent;color:#746d61;font-size:18px;cursor:pointer}.rsi-primary{padding:18px 0;border-bottom:1px solid rgba(255,255,255,.05)}.rsi-primary strong{display:block;color:#e0ca87;font:400 17px/1.35 Georgia,serif}.rsi-primary p,.rsi-next p{color:#918878;font-size:10px;line-height:1.7}.rsi-next{padding:16px 0;border-bottom:1px solid rgba(255,255,255,.05)}.rsi-root dl{margin:0}.rsi-root dl div{padding:9px 0;border-bottom:1px solid rgba(255,255,255,.04)}.rsi-root dt{color:#5f5a50;font-size:7px}.rsi-root dd{margin:4px 0 0;color:#a79d88;font-size:8px;line-height:1.5;overflow-wrap:anywhere}.rsi-warning{color:#b9896d;font-size:9px;line-height:1.6}.rsi-root details{margin-top:16px;padding-top:14px;border-top:1px solid rgba(201,170,84,.14)}.rsi-root summary{color:#8d7748;font-size:8px;cursor:pointer}.rsi-root pre{white-space:pre-wrap;overflow-wrap:anywhere;color:#777168;font-size:7px;line-height:1.55}.rsi-root>a{display:inline-block;margin-top:16px;border:1px solid #5e5032;padding:9px 11px;color:#bca35f;text-decoration:none;font-size:8px}
        @media(max-width:980px){.rs-console-host.has-semantic-selection .rtf-stage{padding-right:0}.rsi-root{position:relative;top:0;width:100%;height:auto;border-left:0;border-top:1px solid rgba(201,170,84,.2)}}
      `}</style>
    </aside>
  );
}

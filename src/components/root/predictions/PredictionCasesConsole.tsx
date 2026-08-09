'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { RootSemanticContextModal } from '@/components/root/sovereign/RootSemanticContextModal';
import type { RootSelection } from '@/components/root/sovereign/sovereignTypes';
import type { RootRow } from '@/lib/root/sovereign/rootSovereignState';
import '@/components/root/sovereign/root-semantic-context.css';

type Item = {
  id: string;
  title: string;
  status: string;
  confidence: number | null;
  createdAt: string | null;
  origin: string;
  source: 'predictive' | 'legacy';
  outcomeCount: number;
  evidenceCount: number;
  raw: RootRow;
};

function text(value: unknown, fallback = '') { return typeof value === 'string' && value.trim() ? value.trim() : fallback; }
function number(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? (parsed > 1 ? parsed / 100 : parsed) : null;
}
function strings(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }
function rec(value: unknown): RootRow { return value && typeof value === 'object' && !Array.isArray(value) ? value as RootRow : {}; }
function when(value: string | null) { if (!value) return 'SIN FECHA'; const date = new Date(value); return Number.isFinite(date.valueOf()) ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(date) : value; }
function pct(value: number | null) { return value === null ? 'MISSING' : `${Math.round(value * 1000) / 10}%`; }

export function PredictionCasesConsole({ runs, legacy, outcomes, attractors }: { runs: RootRow[]; legacy: RootRow[]; outcomes: RootRow[]; attractors: RootRow[] }) {
  const [filter, setFilter] = useState<'all' | 'autonomous' | 'requested' | 'legacy'>('all');
  const [selection, setSelection] = useState<RootSelection | null>(null);
  const attractorByPrediction = useMemo(() => new Map(attractors.map((attractor) => [text(attractor.owner_node_key).replace(/^prediction:/, ''), attractor])), [attractors]);
  const items = useMemo<Item[]>(() => [
    ...runs.map((row) => {
      const id = text(row.id);
      const vector = rec(attractorByPrediction.get(id)?.vector);
      return { id, title: text(row.prediction, text(row.target_key, 'Hipótesis')), status: text(row.status, 'MISSING'), confidence: number(row.confidence), createdAt: text(row.created_at) || null, origin: text(vector.origin, 'REQUESTED_OR_UNKNOWN'), source: 'predictive' as const, outcomeCount: outcomes.filter((outcome) => text(outcome.run_id) === id).length, evidenceCount: strings(row.evidence_refs).length, raw: row };
    }),
    ...legacy.map((row) => {
      const id = text(row.id);
      const vector = rec(attractorByPrediction.get(id)?.vector);
      return { id, title: text(row.prediccion_explicita, text(row.case_label, 'Hipótesis legacy')), status: text(row.estado_observacion ?? row.evidence_state, 'MISSING'), confidence: number(row.probabilidad_estimativa), createdAt: text(row.prediction_registered_at ?? row.created_at) || null, origin: text(vector.origin, 'LEGACY_REGISTRY'), source: 'legacy' as const, outcomeCount: 0, evidenceCount: 0, raw: row };
    }),
  ].sort((a, b) => new Date(b.createdAt ?? 0).valueOf() - new Date(a.createdAt ?? 0).valueOf()), [runs, legacy, outcomes, attractorByPrediction]);
  const visible = items.filter((item) => filter === 'all'
    || (filter === 'legacy' && item.source === 'legacy')
    || (filter === 'autonomous' && item.origin.startsWith('SFI_AUTONOMOUS'))
    || (filter === 'requested' && !item.origin.startsWith('SFI_AUTONOMOUS') && item.source !== 'legacy'));

  return <main className="pc-root"><header><div><span>SFI · ROOT · PREDICTIVE MEMORY</span><h1>PREDICTION CASES</h1><p>Cada caso conserva hipótesis, confianza original, origen, atractor, World Vector del momento, evidencia solicitada, outcome y aprendizaje.</p></div><div className="pc-head-actions"><Link href="/root/predictions/new">NUEVA PREDICCIÓN</Link><Link href="/root">VOLVER A ROOT</Link></div></header>
    <nav>{(['all', 'autonomous', 'requested', 'legacy'] as const).map((value) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{value === 'autonomous' ? 'SFI AUTÓNOMO' : value === 'requested' ? 'ACTOR / REQUESTED' : value.toUpperCase()}</button>)}</nav>
    <section className="pc-grid">{visible.length ? visible.map((item) => <button key={`${item.source}:${item.id}`} onClick={() => setSelection({ kind: 'hypothesis', id: item.id, title: item.title, source: item.source === 'legacy' ? 'legacy prediction registry' : 'predictive engine', observedAt: item.createdAt, confidence: item.confidence, evidenceIds: strings(item.raw.evidence_refs), warning: null, data: item.raw })}><div><span>{item.source.toUpperCase()}</span><b>{item.status}</b></div><h2>{item.title}</h2><p>ORIGEN · {item.origin}</p><footer><strong>{pct(item.confidence)} CONF</strong><span>{item.outcomeCount} outcomes</span><span>{item.evidenceCount} evidence refs</span><time>{when(item.createdAt)}</time></footer></button>) : <p className="empty">No hay Prediction Cases para este filtro.</p>}</section>
    {selection ? <RootSemanticContextModal selection={selection} onClose={() => setSelection(null)} /> : null}
    <style jsx>{`.pc-root{min-height:100vh;background:#050504;color:#c8c0ad;padding:26px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.pc-root>header{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid rgba(200,169,81,.15);padding-bottom:18px}.pc-root>header span{font-size:8px;letter-spacing:.16em;color:#8d794c}.pc-root h1{margin:6px 0;color:#dfcd98;font:400 30px Georgia,serif}.pc-root>header p{margin:0;color:#827a6d;font:13px/1.6 Georgia,serif}.pc-head-actions{display:flex;gap:7px;align-items:flex-start}.pc-head-actions a{border:1px solid rgba(200,169,81,.2);padding:8px 10px;color:#bba462;text-decoration:none;font-size:8px;height:max-content}.pc-root>nav{display:flex;gap:6px;margin:15px 0}.pc-root>nav button{border:1px solid rgba(200,169,81,.14);background:transparent;color:#776d5b;padding:8px 10px;font:8px inherit}.pc-root>nav button.active{border-color:rgba(200,169,81,.45);color:#d0b66b;background:rgba(200,169,81,.04)}.pc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:9px}.pc-grid>button{text-align:left;border:1px solid rgba(200,169,81,.09);background:#080807;padding:14px;color:#aaa195;font:inherit;cursor:pointer}.pc-grid>button:hover{border-color:rgba(200,169,81,.3)}.pc-grid>button>div{display:flex;justify-content:space-between}.pc-grid>button>div span{font-size:7px;color:#75633f}.pc-grid>button>div b{font-size:7px;color:#8e7950}.pc-grid h2{margin:9px 0 8px;color:#d7c493;font:400 16px/1.4 Georgia,serif}.pc-grid p{color:#625d53;font-size:8px}.pc-grid footer{display:flex;gap:8px;flex-wrap:wrap;border-top:1px solid rgba(255,255,255,.04);padding-top:9px}.pc-grid footer strong{color:#8fb18e;font-size:8px}.pc-grid footer span,.pc-grid footer time{color:#5a554d;font-size:7px}.empty{color:#625d54;font:italic 11px Georgia,serif}@media(max-width:650px){.pc-root{padding:15px}.pc-root>header{display:grid}.pc-grid{grid-template-columns:1fr}.pc-head-actions{flex-wrap:wrap}}`}</style></main>;
}

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import './twin-learning.css';

type Row = Record<string, any>;

function rows(value: unknown): Row[] { return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : []; }
function values(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function txt(value: unknown, fallback = '—') { return typeof value === 'string' && value.trim() ? value.trim() : fallback; }
function payload(event: Row) { return event?.payload && typeof event.payload === 'object' && !Array.isArray(event.payload) ? event.payload as Row : {}; }
function short(value: unknown, max = 92) { const text = txt(value, ''); return text.length > max ? `${text.slice(0, max - 1)}…` : text || '—'; }
function date(value: unknown) { if (typeof value !== 'string' || !value) return '—'; const parsed = new Date(value); return Number.isNaN(parsed.valueOf()) ? value : parsed.toLocaleString('es-MX'); }
function renderValue(value: unknown) { return typeof value === 'string' ? value : JSON.stringify(value); }
async function jsonFetch(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: 'no-store', ...init });
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.ok) throw new Error(json?.details || json?.message || json?.error || `${response.status}`);
  return json;
}

function Node({ label, value, state }: { label: string; value: unknown; state?: string }) {
  return <div className={`learningNode ${state ?? ''}`}><span>{label}</span><strong>{short(value, 44)}</strong></div>;
}

export default function TwinLearningPage() {
  const [data, setData] = useState<Row | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setData(await jsonFetch('/api/root/learning')); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const candidates = useMemo(() => rows(data?.candidates), [data?.candidates]);
  const promotions = useMemo(() => rows(data?.promotions), [data?.promotions]);
  const rejections = useMemo(() => rows(data?.rejections), [data?.rejections]);
  const selected = useMemo(() => candidates.find((item) => String(item.event_id) === selectedId) ?? candidates[0] ?? null, [candidates, selectedId]);
  const activeId = selected?.event_id ? String(selected.event_id) : null;
  const selectedPayload = selected ? payload(selected) : {};
  const learning = selectedPayload.learning && typeof selectedPayload.learning === 'object' && !Array.isArray(selectedPayload.learning) ? selectedPayload.learning as Row : {};
  const lineage = selectedPayload.lineage && typeof selectedPayload.lineage === 'object' && !Array.isArray(selectedPayload.lineage) ? selectedPayload.lineage as Row : {};

  useEffect(() => {
    if (!selectedId && candidates[0]?.event_id) setSelectedId(String(candidates[0].event_id));
  }, [selectedId, candidates]);
  useEffect(() => { setNote(''); setReason(''); }, [activeId]);

  const decide = async (action: 'promote' | 'reject') => {
    if (!selected?.event_id) return;
    if (action === 'reject' && !reason.trim()) { setError('El rechazo requiere una razón explícita; SFI no persiste una negativa opaca.'); return; }
    setBusy(action);
    try {
      await jsonFetch('/api/root/learning', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(action === 'promote'
          ? { action, candidateEventId: selected.event_id, reviewNote: note.trim() || null }
          : { action, candidateEventId: selected.event_id, reason: reason.trim() }),
      });
      setNotice(action === 'promote'
        ? 'Aprendizaje promovido con receipt. La promoción no convierte hipótesis en observación ni borra contradicciones.'
        : 'Aprendizaje rechazado con razón explícita y lineage preservado.');
      setSelectedId(null);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(null); }
  };

  return <main className="twinLearning">
    <header className="twinLearningTop">
      <div><Link href="/root">SFI / ROOT</Link><span>COGNITIVE TWIN · LEARNING LINEAGE</span></div>
      <nav><Link href="/twin">SPINE</Link><Link href="/method-lab">METHOD LAB</Link><Link href="/library">LIBRARY</Link><Link href="/root">ROOT</Link></nav>
    </header>

    {(error || notice) && <div className={`learningToast ${error ? 'error' : ''}`}><span>{error || notice}</span><button onClick={() => { setError(null); setNotice(null); }}>×</button></div>}

    <section className="learningHero">
      <div><span>SFI · LEARNING QUARANTINE</span><h1>Qué aprendió, de dónde salió y qué puede decidir ROOT</h1><p>El aprendizaje institucional es append-only. ROOT puede promover/rechazar y registrar la razón. Una modificación sustantiva no sobrescribe el candidato original: requiere AMEND/SUPERSEDE con lineage.</p></div>
      <div className="learningMetrics"><b>{String(data?.summary?.quarantined ?? candidates.length)}</b><span>pendientes</span><b>{String(data?.summary?.eligible ?? 0)}</b><span>elegibles</span><b>{String(data?.summary?.promoted ?? promotions.length)}</b><span>promovidos</span><b>{String(data?.summary?.rejected ?? rejections.length)}</b><span>rechazados</span></div>
    </section>

    <div className="learningLayout">
      <aside className="learningQueue">
        <header><span>CANDIDATOS</span><button onClick={() => void load()}>ACTUALIZAR</button></header>
        {candidates.map((item) => {
          const body = payload(item); const itemLearning = body.learning && typeof body.learning === 'object' ? body.learning as Row : {};
          return <button key={item.event_id} className={activeId === String(item.event_id) ? 'selected' : ''} onClick={() => setSelectedId(String(item.event_id))}>
            <span>{txt(body.classification, 'UNKNOWN')} · {body.eligibleForRootPromotion === true ? 'ELIGIBLE' : txt(body.promotionState, 'QUARANTINED')}</span>
            <strong>{short(itemLearning.learningCandidate ?? itemLearning.primaryHypothesis ?? body.cycleId, 110)}</strong>
            <small>{date(item.occurred_at)}</small>
          </button>;
        })}
        {!candidates.length && <p className="learningEmpty">No hay candidatos de aprendizaje pendientes.</p>}
      </aside>

      <section className="learningDossier">
        {!selected && <div className="learningEmpty">No existe un candidato seleccionado.</div>}
        {selected && <>
          <header><div><span>{txt(selectedPayload.classification, 'UNKNOWN')}</span><h2>{short(learning.learningCandidate ?? learning.primaryHypothesis ?? selectedPayload.cycleId, 180)}</h2><p>{txt(selectedPayload.quarantineReason, 'Sin razón de cuarentena estructurada.')}</p></div><div><b>{selectedPayload.eligibleForRootPromotion === true ? 'ELIGIBLE' : txt(selectedPayload.promotionState, 'QUARANTINED')}</b><small>{selected.event_id}</small></div></header>

          <section className="lineageSection"><h3>LINEAGE GRAPH</h3><div className="learningGraph">
            <Node label="RUN" value={lineage.runEventId} state={lineage.runEventId ? 'observed' : 'missing'}/><i>→</i>
            <Node label="AI SYNTHESIS" value={lineage.aiSynthesisEventId} state={lineage.aiSynthesisEventId ? 'derived' : 'missing'}/><i>→</i>
            <Node label="RETURN" value={lineage.returnEventId} state={lineage.returnEventId ? 'observed' : 'missing'}/><i>→</i>
            <Node label="CONTRAST" value={lineage.contrastEventId} state={lineage.contrastEventId ? 'observed' : 'missing'}/><i>→</i>
            <Node label="CLOSURE" value={lineage.closureEventId} state={lineage.closureEventId ? 'observed' : 'missing'}/><i>→</i>
            <Node label="LEARNING CANDIDATE" value={selected.event_id} state="candidate"/>
          </div></section>

          <section className="learningSection"><h3>COGNITIVO</h3><div className="learningFacts"><span><b>Hipótesis primaria</b>{txt(learning.primaryHypothesis)}</span><span><b>Predicción</b>{txt(learning.prediction)}</span><span><b>RETURN observado</b>{txt(learning.observedReturn)}</span><span><b>Confianza actualizada</b>{learning.updatedConfidence == null ? '—' : String(learning.updatedConfidence)}</span></div></section>

          <section className="learningSection"><h3>SEÑALES Y CONTRADICCIÓN</h3><div className="learningColumns"><div><b>Esperadas</b>{values(learning.expectedSignals).map((item, i) => <p key={`e${i}`}>{renderValue(item)}</p>)}</div><div><b>Contradicción</b>{values(learning.contradictionSignals).map((item, i) => <p key={`c${i}`}>{renderValue(item)}</p>)}</div><div><b>Evidencia faltante</b>{values(learning.missingEvidence).map((item, i) => <p key={`m${i}`}>{renderValue(item)}</p>)}</div></div></section>

          <section className="learningSection"><h3>LÍMITE EPISTÉMICO</h3><p>{txt(selectedPayload.epistemicBoundary)}</p></section>

          <section className="learningDecision">
            <div><label>Nota ROOT para promoción<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Qué aceptas, bajo qué reserva y por qué."/></label><button disabled={Boolean(busy) || selectedPayload.eligibleForRootPromotion !== true} onClick={() => void decide('promote')}>PROMOVER APRENDIZAJE</button></div>
            <div><label>Razón de rechazo<textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Razón obligatoria; se preserva en lineage."/></label><button className="deny" disabled={Boolean(busy)} onClick={() => void decide('reject')}>RECHAZAR</button></div>
            <p><b>Edición sustantiva:</b> no se ejecuta como UPDATE. Debe institucionalizarse como AMEND/SUPERSEDE para conservar genealogía y reversibilidad.</p>
          </section>

          <details className="learningTrace"><summary>TRAZABILIDAD COMPLETA</summary><pre>{JSON.stringify(selected, null, 2)}</pre></details>
        </>}
      </section>
    </div>

    <section className="learningHistory"><details><summary>PROMOVIDOS · {promotions.length}</summary>{promotions.map((item) => <pre key={item.event_id}>{JSON.stringify(item, null, 2)}</pre>)}</details><details><summary>RECHAZADOS · {rejections.length}</summary>{rejections.map((item) => <pre key={item.event_id}>{JSON.stringify(item, null, 2)}</pre>)}</details></section>
  </main>;
}

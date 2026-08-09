'use client';

import { useEffect, useMemo, useState } from 'react';
import type { RootSelection } from './sovereignTypes';

type Row = Record<string, unknown>;

type DomainValue = { domain: string; value: number; confidence?: number | null; source_count?: number };

function rec(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}
function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())) : [];
}
function text(value: unknown, fallback = 'MISSING') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}
function number(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function pct(value: unknown) {
  const parsed = number(value);
  if (parsed === null) return 'MISSING';
  return `${Math.round(Math.max(0, Math.min(1, parsed)) * 1000) / 10}%`;
}
function when(value: unknown) {
  if (typeof value !== 'string') return 'SIN FECHA';
  const date = new Date(value);
  return Number.isFinite(date.valueOf()) ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(date) : value;
}
function domains(value: unknown): DomainValue[] {
  return Array.isArray(value) ? value.filter((item): item is DomainValue => Boolean(item) && typeof item === 'object' && typeof (item as DomainValue).domain === 'string' && typeof (item as DomainValue).value === 'number') : [];
}

function RadarChart({ historical, current }: { historical: DomainValue[]; current: DomainValue[] }) {
  const domainNames = useMemo(() => Array.from(new Set([...historical.map((item) => item.domain), ...current.map((item) => item.domain)])).slice(0, 10), [historical, current]);
  const historicalMap = useMemo(() => new Map(historical.map((item) => [item.domain, item.value])), [historical]);
  const currentMap = useMemo(() => new Map(current.map((item) => [item.domain, item.value])), [current]);
  if (domainNames.length < 3) return <p className="rsc-empty">No hay suficientes dominios World Vector para reconstruir una estrella comparable.</p>;
  const center = 110;
  const radius = 82;
  const point = (index: number, value: number) => {
    const angle = -Math.PI / 2 + (index / domainNames.length) * Math.PI * 2;
    return `${center + Math.cos(angle) * radius * value},${center + Math.sin(angle) * radius * value}`;
  };
  const historicalPoints = domainNames.map((domain, index) => point(index, historicalMap.get(domain) ?? 0)).join(' ');
  const currentPoints = domainNames.map((domain, index) => point(index, currentMap.get(domain) ?? 0)).join(' ');
  const outer = domainNames.map((_, index) => point(index, 1)).join(' ');
  return <div className="rsc-radar-wrap">
    <svg className="rsc-radar" viewBox="0 0 220 220" role="img" aria-label="Comparación World Vector histórica contra actual">
      {[0.25, 0.5, 0.75, 1].map((level) => <polygon key={level} points={domainNames.map((_, index) => point(index, level)).join(' ')} className="grid" />)}
      {domainNames.map((domain, index) => {
        const outerPoint = point(index, 1);
        const [x, y] = outerPoint.split(',').map(Number);
        const labelPoint = point(index, 1.16).split(',').map(Number);
        return <g key={domain}><line x1={center} y1={center} x2={x} y2={y} className="axis" /><text x={labelPoint[0]} y={labelPoint[1]} textAnchor="middle" dominantBaseline="middle">{domain.replaceAll('_', ' ')}</text></g>;
      })}
      <polygon points={outer} className="outer" />
      <polygon points={historicalPoints} className="historical" />
      <polygon points={currentPoints} className="current" />
    </svg>
    <div className="rsc-radar-legend"><span className="historical">● MOMENTO DE LA HIPÓTESIS</span><span className="current">● ACTUAL</span></div>
  </div>;
}

function WorldVectorComparison({ value }: { value: Row }) {
  const historicalSnapshot = rec(value.historicalSnapshot);
  const currentSnapshot = rec(value.currentSnapshot);
  const historicalObservation = rec(value.historicalObservation);
  const currentObservation = rec(value.currentObservation);
  const historicalDomains = domains(historicalObservation.domain_values);
  const currentDomains = domains(currentObservation.domain_values);
  const tensions = historicalDomains.slice().sort((a, b) => b.value - a.value).slice(0, 5);

  return <section className="rsc-block">
    <div className="rsc-title">RETROLONGITUDINAL WORLD VECTOR</div>
    <div className="rsc-world-meta">
      <div><span>MOMENTO</span><strong>{when(historicalSnapshot.observed_at)}</strong></div>
      <div><span>WSI</span><strong>{number(historicalSnapshot.wsi)?.toFixed(3) ?? 'MISSING'}</strong></div>
      <div><span>NTI</span><strong>{number(historicalSnapshot.nti)?.toFixed(3) ?? 'MISSING'}</strong></div>
      <div><span>CONFIANZA DEL SNAPSHOT</span><strong>{pct(historicalSnapshot.confidence)}</strong></div>
      <div><span>ACTUAL WSI</span><strong>{number(currentSnapshot.wsi)?.toFixed(3) ?? 'MISSING'}</strong></div>
      <div><span>ACTUAL NTI</span><strong>{number(currentSnapshot.nti)?.toFixed(3) ?? 'MISSING'}</strong></div>
    </div>
    <p className="rsc-meaning">{text(historicalObservation.interpretation, 'No existe interpretación World Vector reconstruible para esa fecha.')}</p>
    <RadarChart historical={historicalDomains} current={currentDomains} />
    <div className="rsc-tensions">
      <span>TENSIONES / DOMINIOS DOMINANTES EN ESE CORTE</span>
      {tensions.length ? tensions.map((item) => {
        const current = currentDomains.find((candidate) => candidate.domain === item.domain)?.value ?? null;
        const delta = current === null ? null : current - item.value;
        return <div key={item.domain}><b>{item.domain}</b><strong>{item.value.toFixed(3)}</strong><small>{delta === null ? 'actual MISSING' : `${delta >= 0 ? '+' : ''}${delta.toFixed(3)} vs actual`}</small></div>;
      }) : <p className="rsc-empty">MISSING · no se recuperaron dominios para ese snapshot.</p>}
    </div>
  </section>;
}

function PredictionCase({ context }: { context: Row }) {
  const outcomes = rows(context.outcomes);
  const requests = rows(context.evidenceRequests);
  const learning = rows(context.learningEvents);
  const verifications = rows(context.verifications);
  const attractors = rows(context.attractors);
  const world = rec(context.world);
  return <div className="rsc-context">
    <section className="rsc-block prediction">
      <div className="rsc-title">PREDICTION CASE · EXPEDIENTE TEMPORAL</div>
      <h3>{text(context.prediction, 'MISSING · la formulación de la hipótesis no está persistida.')}</h3>
      <div className="rsc-world-meta">
        <div><span>CONFIANZA ORIGINAL</span><strong>{pct(context.confidence)}</strong></div>
        <div><span>ESTADO</span><strong>{text(context.status)}</strong></div>
        <div><span>ORIGEN</span><strong>{text(context.origin)}</strong></div>
        <div><span>REGISTRADA</span><strong>{when(context.createdAt)}</strong></div>
        <div><span>RETORNO ESPERADO</span><strong>{when(context.dueAt)}</strong></div>
        <div><span>OUTCOMES</span><strong>{outcomes.length}</strong></div>
      </div>
      {text(context.interpretation, '') ? <p className="rsc-meaning">{text(context.interpretation)}</p> : null}
      <div className="rsc-phase"><span>HIPÓTESIS</span><i>→</i><span>{requests.length} EVIDENCE REQUESTS</span><i>→</i><span>{outcomes.length || verifications.length} OUTCOMES / VERIFICATIONS</span><i>→</i><span>{learning.length} LEARNING EVENTS</span></div>
    </section>

    <WorldVectorComparison value={world} />

    <section className="rsc-block">
      <div className="rsc-title">ATRACTOR VINCULADO · {attractors.length}</div>
      {attractors.length ? attractors.map((attractor) => {
        const vector = rec(attractor.vector);
        return <article className="rsc-row-card" key={text(attractor.id)}><div><span>{text(attractor.status).toUpperCase()}</span><small>{text(vector.origin)}</small></div><h4>{text(attractor.label)}</h4><p>{text(vector.relationSemantics, 'Dirección declarada asociada a la hipótesis.')}</p><div className="rsc-mini"><b>CONF {pct(attractor.confidence)}</b><b>EVIDENCIA {String(attractor.evidence_count ?? 0)}</b><b>{text(attractor.attractor_key)}</b></div></article>;
      }) : <p className="rsc-empty">MISSING · esta hipótesis no tiene atractor reconciliado. Esto es una inconsistencia institucional, no un estado aceptable.</p>}
    </section>

    <section className="rsc-block">
      <div className="rsc-title">EVIDENCIA REQUERIDA / FALTANTE</div>
      {requests.length ? requests.map((request) => <article className="rsc-row-card" key={text(request.id)}><div><span>{text(request.status)}</span><small>{text(request.priority)}</small></div><h4>{text(request.description, text(request.evidence_key))}</h4><p>{text(request.reason)}</p></article>) : strings(context.missingEvidence).length ? strings(context.missingEvidence).map((item) => <code className="rsc-chip" key={item}>{item}</code>) : <p className="rsc-empty">No hay solicitudes de evidencia persistidas para este caso.</p>}
    </section>

    <section className="rsc-block">
      <div className="rsc-title">OUTCOME / VERIFICACIÓN</div>
      {outcomes.length ? outcomes.map((outcome) => <article className="rsc-row-card outcome" key={text(outcome.id)}><div><span>{text(outcome.evaluation_state)}</span><small>{when(outcome.observed_at)}</small></div><h4>Valor observado · {text(outcome.actual_value)}</h4><p>Fuente: {text(outcome.source_type)} · calidad {text(outcome.source_quality)} · fidelidad {text(outcome.intervention_fidelity)}</p><pre>{JSON.stringify(outcome.outcome_payload ?? {}, null, 2)}</pre></article>) : null}
      {verifications.length ? verifications.map((verification) => <article className="rsc-row-card outcome" key={text(verification.id)}><div><span>{text(verification.verification_state)}</span><small>{when(verification.source_checked_at ?? verification.created_at)}</small></div><h4>{text(verification.evaluation_result, 'Verificación legacy')}</h4><p>{text(verification.verification_notes, text(verification.verification_rule))}</p><div className="rsc-mini"><b>CONF {pct(verification.evaluation_confidence)}</b><b>{text(verification.ground_truth_source_type)}</b></div></article>) : null}
      {!outcomes.length && !verifications.length ? <p className="rsc-empty">MISSING · todavía no existe outcome/ground truth persistido. WAITING_EVIDENCE debe entenderse literalmente.</p> : null}
    </section>

    {learning.length ? <section className="rsc-block"><div className="rsc-title">QUÉ APRENDIÓ SFI</div>{learning.map((event) => <article className="rsc-row-card" key={text(event.id)}><div><span>{text(event.learning_state)}</span><small>{when(event.created_at)}</small></div><h4>{text(event.error_class, 'Learning event')}</h4><p>{text(event.error_analysis)}</p><pre>{JSON.stringify({ before: event.parameter_state_before, delta: event.parameter_delta, after: event.parameter_state_after, amv: event.amv_reflection }, null, 2)}</pre></article>)}</section> : null}
  </div>;
}

function EvidenceContext({ context }: { context: Row }) {
  if (context.missing === true) return <section className="rsc-block"><div className="rsc-title">CONTEXTO DE EVIDENCIA</div><p className="rsc-empty">No fue posible resolver este nodo contra el registro de evidencia persistido.</p></section>;
  const record = rec(context.record);
  const payload = rec(record.payload);
  const metadata = rec(payload.metadata);
  const summary = rec(record.public_summary);
  const edges = rows(context.graphEdges);
  const relatedNodes = rows(context.relatedNodes);
  const attractors = rows(context.attractors);
  return <div className="rsc-context">
    <section className="rsc-block evidence">
      <div className="rsc-title">QUÉ COMUNICA ESTA EVIDENCIA A SFI</div>
      <h3>{text(record.title, text(summary.title, text(record.evidence_kind, 'Evidencia')))}</h3>
      <p className="rsc-meaning">{text(record.content, text(summary.summary, 'Existe un registro de procedencia, pero todavía no hay descripción legible persistida.'))}</p>
      <div className="rsc-world-meta">
        <div><span>TIPO</span><strong>{text(record.evidence_type ?? record.evidence_kind)}</strong></div>
        <div><span>MÓDULO</span><strong>{text(metadata.module ?? record.module)}</strong></div>
        <div><span>CASO</span><strong>{text(metadata.caseId ?? record.case_id)}</strong></div>
        <div><span>FECHA DE LA FUENTE</span><strong>{when(metadata.sourceObservedAt ?? record.observed_at)}</strong></div>
        <div><span>FUENTE</span><strong>{text(metadata.sourceName ?? record.source_name)}</strong></div>
        <div><span>REF PRIVADA</span><strong>{text(metadata.privateRef ?? record.private_ref)}</strong></div>
      </div>
      <div className="rsc-boundary"><span>LÍMITE EPISTÉMICO</span><p>{text(metadata.claimBoundary ?? summary.claimBoundary, 'La existencia del registro no valida automáticamente las afirmaciones internas del artefacto.')}</p></div>
      {text(record.source_url, '') ? <a className="rsc-source-link" href={text(record.source_url)} target="_blank" rel="noreferrer">ABRIR SUPERFICIE / FUENTE ↗</a> : null}
    </section>

    <section className="rsc-block"><div className="rsc-title">RELACIONES PERSISTIDAS · {edges.length}</div>{edges.length ? edges.map((edge, index) => { const other = relatedNodes.find((node) => [edge.source_node_id, edge.target_node_id].includes(node.node_id)); return <article className="rsc-row-card" key={text(edge.id, String(index))}><div><span>{text(edge.relation)}</span><small>{text(edge.relation_type)}</small></div><h4>{text(other?.label, text(edge.target_node_id ?? edge.source_node_id))}</h4><p>Esta relación existe en el grafo; su fuerza/confianza debe leerse por separado de la existencia de los dos objetos.</p></article>; }) : <p className="rsc-empty">Esta pieza está registrada pero AISLADA: no tiene relación persistida con otro artefacto, publicación, caso, hipótesis o atractor. Eso es el hueco relevante; no “cargar evidencia” por defecto.</p>}</section>

    <section className="rsc-block"><div className="rsc-title">ATRACTORES QUE LA UTILIZAN · {attractors.length}</div>{attractors.length ? attractors.map((attractor) => <article className="rsc-row-card" key={text(attractor.id)}><div><span>{text(attractor.status)}</span><small>{text(attractor.module)}</small></div><h4>{text(attractor.label)}</h4><p>{text(rec(attractor.vector).relationSemantics, 'La evidencia aparece referenciada por el vector del atractor.')}</p></article>) : <p className="rsc-empty">No existe un atractor que cite explícitamente esta evidencia. Si metodológicamente debería sostener uno, la relación falta en persistencia.</p>}</section>
  </div>;
}

function AttractorContext({ context }: { context: Row }) {
  if (context.missing === true) return <section className="rsc-block"><p className="rsc-empty">Atractor no resuelto.</p></section>;
  const attractor = rec(context.attractor);
  const vector = rec(context.vector);
  const evidence = rows(context.evidence);
  const prediction = rec(context.prediction);
  return <div className="rsc-context"><section className="rsc-block"><div className="rsc-title">ATRACTOR DECLARADO</div><h3>{text(attractor.label)}</h3><div className="rsc-world-meta"><div><span>ESTADO</span><strong>{text(attractor.status)}</strong></div><div><span>CONFIANZA</span><strong>{pct(attractor.confidence)}</strong></div><div><span>PERSISTENCIA</span><strong>{pct(attractor.persistence)}</strong></div><div><span>TRUST</span><strong>{pct(attractor.trust)}</strong></div><div><span>PRIMERA VEZ</span><strong>{when(attractor.first_seen)}</strong></div><div><span>ÚLTIMA VEZ</span><strong>{when(attractor.last_seen)}</strong></div></div><div className="rsc-boundary"><span>FUNCIÓN</span><p>{text(vector.relationSemantics, 'Dirección de reorganización persistida; no equivale a haber alcanzado esa dirección.')}</p></div></section>{Object.keys(prediction).length ? <section className="rsc-block"><div className="rsc-title">HIPÓTESIS VINCULADA</div><h3>{text(prediction.prediction)}</h3><p className="rsc-meaning">Confianza original {pct(prediction.confidence)} · estado {text(prediction.status)} · creada {when(prediction.created_at)}</p></section> : null}<section className="rsc-block"><div className="rsc-title">EVIDENCIA QUE LO SOSTIENE · {evidence.length}</div>{evidence.length ? evidence.map((item) => <article className="rsc-row-card" key={text(item.id)}><div><span>{text(item.evidence_type ?? item.evidence_kind)}</span><small>{when(item.observed_at ?? item.created_at)}</small></div><h4>{text(item.title, text(item.source_name))}</h4><p>{text(item.content, text(rec(item.public_summary).summary))}</p></article>) : <p className="rsc-empty">MISSING · el atractor está declarado pero no cita evidencia resoluble. Debe tratarse como dirección declarada, no como dirección sostenida.</p>}</section><details className="rsc-vector"><summary>VECTOR / RECREACIÓN TÉCNICA</summary><pre>{JSON.stringify(vector, null, 2)}</pre></details></div>;
}

export function RootSemanticContext({ selection }: { selection: RootSelection }) {
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);
  const relevant = /hypothesis|prediction|outcome|evidence|ledger|attractor/i.test(selection.kind);

  useEffect(() => {
    if (!relevant) { setContext(null); setError(null); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/root/semantic-context?kind=${encodeURIComponent(selection.kind)}&id=${encodeURIComponent(selection.id)}`, { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json().catch(() => null) as Row | null;
        if (!response.ok || !body || body.ok !== true) throw new Error(text(body?.error, `HTTP ${response.status}`));
        if (!cancelled) setContext(rec(body.context));
      })
      .catch((caught) => { if (!cancelled) setError(caught instanceof Error ? caught.message : 'semantic_context_failed'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [relevant, selection.id, selection.kind]);

  if (!relevant) return null;
  if (loading) return <section className="rsc-block"><div className="rsc-title">RECONSTRUYENDO CONTEXTO</div><p className="rsc-empty">Leyendo trayectoria, World Vector, atractores, evidencia y outcomes…</p></section>;
  if (error) return <section className="rsc-block"><div className="rsc-title">CONTEXTO NO DISPONIBLE</div><p className="rsc-error">{error}</p></section>;
  if (!context || !Object.keys(context).length) return null;
  if (context.kind === 'prediction_case') return <PredictionCase context={context} />;
  if (context.kind === 'evidence_context') return <EvidenceContext context={context} />;
  if (context.kind === 'attractor_context') return <AttractorContext context={context} />;
  return null;
}

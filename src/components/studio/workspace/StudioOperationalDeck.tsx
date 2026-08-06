'use client';

import { useEffect, useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { FileUp, FlaskConical, GitBranch, RefreshCw, ShieldCheck } from 'lucide-react';
import type { StudioProductionState, StudioSuggestion } from '@/lib/studio/production/studioProductionTypes';
import { formatMetricValue, metricByKey, statusClass } from './workspaceModel';

type StudioTab = 'REPORTE' | 'SUGERENCIAS' | 'EVIDENCIA' | 'INTERVENCIONES' | 'LONGITUDINAL' | 'TRACE';
type ObjectRow = {
  id: string;
  title?: string;
  object_type?: string;
  mime_type?: string;
  status?: string;
  updated_at?: string;
};

const tabs: StudioTab[] = ['REPORTE', 'SUGERENCIAS', 'EVIDENCIA', 'INTERVENCIONES', 'LONGITUDINAL', 'TRACE'];

function compact(value: unknown) {
  if (value === null || value === undefined || value === '') return 'NO_VALUE';
  if (typeof value === 'number') return Number(value.toFixed(4)).toString();
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function activeObjectId(state: StudioProductionState) {
  return state.activeObject.id ?? '';
}

function useOperation() {
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function run(label: string, action: () => Promise<void>) {
    setPending(label);
    setMessage(null);
    try {
      await action();
      if (typeof window !== 'undefined') window.setTimeout(() => window.location.reload(), 80);
      setMessage(`${label}: COMPLETE`);
    } catch (error) {
      setMessage(`${label}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setPending(null);
    }
  }

  return { pending, message, run };
}

async function checkedJson(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.ok === false) {
    throw new Error(String(body?.error ?? body?.details ?? response.statusText));
  }
  return body as Record<string, unknown>;
}

function ObjectControls({ state }: { state: StudioProductionState }) {
  const { pending, message, run } = useOperation();
  const [objects, setObjects] = useState<ObjectRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/studio/objects', { cache: 'no-store' })
      .then((response) => response.json())
      .then((body) => {
        if (!cancelled && body?.ok && Array.isArray(body.data)) setObjects(body.data as ObjectRow[]);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [state.activeObject.id]);

  const canAnalyze = Boolean(state.activeObject.id);
  return (
    <section className="studio-opbar" aria-label="Studio object operations">
      <div className="studio-opbar__object-picker">
        <label>
          OBJETO ACTIVO
          <select
            value={state.activeObject.id ?? ''}
            onChange={(event) => {
              const id = event.target.value;
              if (id && typeof window !== 'undefined') window.location.assign(`/studio?objectId=${encodeURIComponent(id)}`);
            }}
            aria-label="Selector de objetos recientes"
          >
            <option value="">{state.activeObject.id ? state.activeObject.title : 'NO_OBJECT'}</option>
            {objects.map((item) => <option key={item.id} value={item.id}>{item.title ?? item.id} / {item.object_type ?? 'unknown'}</option>)}
          </select>
        </label>
        <button type="button" disabled={!canAnalyze || pending !== null} title={canAnalyze ? 'Ejecuta el analizador real disponible para el objeto activo.' : 'ACTIVE_OBJECT_REQUIRED'} onClick={() => void run('ANALYZE_OBJECT', async () => {
          await checkedJson(await fetch(`/api/studio/objects/${encodeURIComponent(activeObjectId(state))}/analyze`, { method: 'POST' }));
        })}><RefreshCw size={14} aria-hidden /> ANALIZAR</button>
        <button type="button" disabled={!canAnalyze || pending !== null} title={canAnalyze ? 'Ejecuta sintesis y proyeccion persistidas para crear sugerencias reales.' : 'ACTIVE_OBJECT_REQUIRED'} onClick={() => void run('GENERATE_SUGGESTIONS', async () => {
          await checkedJson(await fetch(`/api/studio/objects/${encodeURIComponent(activeObjectId(state))}/synthesize`, { method: 'POST', body: JSON.stringify({ persist: true }) }));
          await checkedJson(await fetch(`/api/studio/objects/${encodeURIComponent(activeObjectId(state))}/project`, { method: 'POST', body: JSON.stringify({ persist: true }) }));
        })}><FlaskConical size={14} aria-hidden /> GENERAR SUGERENCIAS</button>
      </div>
      {message ? <p className="studio-opbar__message">{message}</p> : null}
    </section>
  );
}

function SuggestionsTab({ state }: { state: StudioProductionState }) {
  const { pending, message, run } = useOperation();
  async function setSuggestionState(suggestion: StudioSuggestion, status: StudioSuggestion['status']) {
    await checkedJson(await fetch(`/api/studio/suggestions/${encodeURIComponent(suggestion.hypothesisId)}/state`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ state: status }),
    }));
  }
  return (
    <section className="studio-tab-surface" aria-label="Sugerencias operativas">
      <header><strong>SUGERENCIAS</strong><span>{state.suggestions.length} persistidas</span></header>
      {!state.suggestions.length ? (
        <div className="studio-empty-action">
          <strong>REQUIRES_EVIDENCE_OR_SYNTHESIS</strong>
          <p>No hay sugerencias persistidas para este objeto. Ejecuta GENERAR SUGERENCIAS; si el motor bloquea, el bloqueo queda en TRACE.</p>
        </div>
      ) : state.suggestions.map((suggestion) => (
        <article key={suggestion.id} className={`studio-suggestion ${statusClass(suggestion.status)}`}>
          <div>
            <strong>{suggestion.suggestion}</strong>
            <span>{suggestion.status} / {suggestion.agentId}</span>
          </div>
          <p>{suggestion.justification}</p>
          <dl>
            <div><dt>Variables</dt><dd>{suggestion.variablesAffected.join(', ')}</dd></div>
            <div><dt>Confianza</dt><dd>{suggestion.confidence.toFixed(3)}</dd></div>
            <div><dt>Ventana</dt><dd>{suggestion.testWindow ?? 'REQUIRES_DECLARATION'}</dd></div>
            <div><dt>Evidencia requerida</dt><dd>{suggestion.evidenceRequired.join(', ')}</dd></div>
          </dl>
          <footer>
            {(['ACCEPTED', 'IN_TEST', 'EVIDENCE_PENDING', 'VERIFIED', 'REJECTED', 'INCONCLUSIVE'] as const).map((status) => (
              <button key={status} type="button" disabled={pending !== null} onClick={() => void run(`SUGGESTION_${status}`, () => setSuggestionState(suggestion, status))}>{status}</button>
            ))}
          </footer>
        </article>
      ))}
      {message ? <p className="studio-opbar__message">{message}</p> : null}
    </section>
  );
}

function EvidenceTab({ state }: { state: StudioProductionState }) {
  const { pending, message, run } = useOperation();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state.activeObject.id) throw new Error('ACTIVE_OBJECT_REQUIRED');
    const form = event.currentTarget;
    const data = new FormData(form);
    await checkedJson(await fetch(`/api/studio/objects/${encodeURIComponent(state.activeObject.id)}/evidence`, { method: 'POST', body: data }));
    form.reset();
  }
  return (
    <section className="studio-tab-surface" aria-label="Evidencia del objeto">
      <header><strong>EVIDENCIA</strong><span>{state.evidence.length} referencias</span></header>
      <form className="studio-evidence-form" onSubmit={(event) => void run('ADD_EVIDENCE', () => submit(event))}>
        <strong>+ AGREGAR EVIDENCIA</strong>
        <select name="evidenceType" aria-label="Tipo de evidencia" defaultValue="field_return">
          <option value="field_return">Retorno de campo</option>
          <option value="calibration">Calibracion</option>
          <option value="measurement">Medicion</option>
          <option value="operator_note">Declaracion</option>
          <option value="external_reference">Referencia externa</option>
        </select>
        <input name="file" type="file" aria-label="Archivo de evidencia" />
        <input name="url" aria-label="URL de evidencia" placeholder="URL" />
        <textarea name="text" aria-label="Texto de evidencia" placeholder="Texto / observacion" />
        <input name="observedAt" aria-label="Fecha observada" type="datetime-local" />
        <input name="sourceName" aria-label="Fuente" placeholder="Fuente" />
        <input name="variable" aria-label="Variable relacionada" placeholder="Variable relacionada" />
        <input name="measurementValue" aria-label="Valor medido" placeholder="Medicion" />
        <input name="confidence" aria-label="Confianza" type="number" min="0" max="1" step="0.01" placeholder="0.0-1.0" />
        <textarea name="contextNote" aria-label="Nota de contexto" placeholder="Nota de contexto" />
        <button type="submit" disabled={!state.activeObject.id || pending !== null} title={state.activeObject.id ? 'Persiste evidencia vinculada por objectId.' : 'ACTIVE_OBJECT_REQUIRED'}><FileUp size={14} aria-hidden /> GUARDAR EVIDENCIA</button>
      </form>
      <div className="studio-dense-list">
        {state.evidence.map((item) => (
          <a key={item.id} href={`/entity/${encodeURIComponent(item.id)}?entityType=EVIDENCE`}>
            <strong>{item.label}</strong><span>{item.source} / {compact(item.reliability)} / {item.observedAt ?? 'NO_TIME'}</span>
          </a>
        ))}
      </div>
      {message ? <p className="studio-opbar__message">{message}</p> : null}
    </section>
  );
}

function InterventionsTab({ state }: { state: StudioProductionState }) {
  const { pending, message, run } = useOperation();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state.activeObject.id) throw new Error('ACTIVE_OBJECT_REQUIRED');
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    await checkedJson(await fetch(`/api/studio/objects/${encodeURIComponent(state.activeObject.id)}/interventions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    }));
    form.reset();
  }
  return (
    <section className="studio-tab-surface" aria-label="Intervenciones del objeto">
      <header><strong>INTERVENCIONES</strong><span>{state.interventions.length} registradas</span></header>
      <form className="studio-evidence-form" onSubmit={(event) => void run('REGISTER_INTERVENTION', () => submit(event))}>
        <strong>REGISTRAR INTERVENCION</strong>
        <input name="title" aria-label="Intervencion" placeholder="Intervencion ejecutada o planificada" required />
        <select name="scope" aria-label="Scope" defaultValue="overview">
          <option value="overview">Overview</option>
          <option value="composition">Composition</option>
          <option value="sound">Sound</option>
          <option value="arrangement">Arrangement</option>
          <option value="mix">Mix</option>
          <option value="master">Master</option>
          <option value="graph">Graph</option>
          <option value="archive">Archive</option>
        </select>
        <select name="state" aria-label="Estado" defaultValue="queued">
          <option value="queued">EVIDENCE_PENDING</option>
          <option value="running">IN_TEST</option>
          <option value="complete">VERIFIED</option>
          <option value="blocked">BLOCKED</option>
          <option value="failed">FAILED</option>
        </select>
        <input name="hypothesisId" aria-label="Suggestion/Hypothesis ID" placeholder="suggestionId/hypothesisId opcional" />
        <input name="window" aria-label="Ventana" placeholder="Ventana de prueba" />
        <input name="expectedEvidence" aria-label="Evidencia esperada" placeholder="Evidencia requerida" />
        <textarea name="operatorNote" aria-label="Nota de operador" placeholder="Nota de operador" />
        <button type="submit" disabled={!state.activeObject.id || pending !== null} title={state.activeObject.id ? 'Persiste intervencion vinculada por objectId.' : 'ACTIVE_OBJECT_REQUIRED'}><GitBranch size={14} aria-hidden /> REGISTRAR</button>
      </form>
      <div className="studio-dense-list">
        {state.interventions.map((item) => (
          <article key={item.id}>
            <strong>{item.title}</strong>
            <span>{item.state} / {item.scope} / impact {compact(item.expectedImpact)} / risk {compact(item.risk)}</span>
          </article>
        ))}
      </div>
      {message ? <p className="studio-opbar__message">{message}</p> : null}
    </section>
  );
}

function LongitudinalTab({ state }: { state: StudioProductionState }) {
  const points = useMemo(() => {
    const metrics = state.metricValues
      .filter((item) => typeof item.value === 'number' && item.observedAt)
      .map((item) => ({
        id: item.key,
        layer: 'STUDIO OBJECTS',
        variable: item.key,
        time: item.observedAt as string,
        value: Math.max(0, Math.min(1, Math.abs(item.value as number) > 1 ? Math.abs(item.value as number) / (Math.abs(item.value as number) + 1) : Math.abs(item.value as number))),
        original: `${item.value}${item.unit ? ` ${item.unit}` : ''}`,
        source: item.source ?? 'NO_SOURCE',
        confidence: item.confidence,
      }));
    const evidence = state.evidence
      .filter((item) => item.observedAt)
      .map((item) => ({ id: item.id, layer: 'EVIDENCE', variable: item.type, time: item.observedAt as string, value: item.reliability, original: String(item.reliability), source: item.source, confidence: item.reliability }));
    const interventions = state.interventions.map((item) => ({ id: item.id, layer: 'INTERVENTIONS', variable: item.scope, time: state.generatedAt, value: item.state === 'complete' ? 1 : item.state === 'failed' ? 0.1 : 0.5, original: item.state, source: item.source, confidence: item.expectedImpact ?? 0.5 }));
    return [...metrics, ...evidence, ...interventions].sort((a, b) => a.time.localeCompare(b.time));
  }, [state]);
  return (
    <section className="studio-tab-surface" aria-label="Longitudinal">
      <header><strong>LONGITUDINAL</strong><span>{points.length} puntos persistidos</span></header>
      <div className="studio-longitudinal-controls">
        {['72H', '7D', '30D', 'ALL'].map((item) => <button key={item} type="button">{item}</button>)}
        {['WORLD', 'CULTURE', 'FIELD', 'STUDIO OBJECTS', 'EVIDENCE', 'INTERVENTIONS', 'PREDICTIONS', 'VERIFICATIONS'].map((item) => <span key={item}>{item}</span>)}
      </div>
      {points.length < 2 ? (
        <div className="studio-empty-action"><strong>REQUIRES_MORE_MEASUREMENTS</strong><p>Faltan reanalisis o evidencia temporal para una evolucion longitudinal comparable.</p></div>
      ) : (
        <div className="studio-longitudinal-chart" role="img" aria-label="Normalized persisted longitudinal points">
          {points.map((point, index) => (
            <span
              key={`${point.layer}-${point.id}-${index}`}
              style={{ '--x': `${(index / Math.max(1, points.length - 1)) * 100}%`, '--y': `${100 - point.value * 100}%` } as CSSProperties}
              title={`${point.layer} / ${point.variable} / ${point.original} / ${point.source} / ${point.time}`}
            />
          ))}
        </div>
      )}
      <div className="studio-dense-list">
        {points.slice(-24).map((point, index) => <article key={`${point.id}-${index}`}><strong>{point.layer} / {point.variable}</strong><span>{point.time} / {point.original} / {point.source} / confidence {point.confidence.toFixed(3)}</span></article>)}
      </div>
    </section>
  );
}

function TraceTab({ state }: { state: StudioProductionState }) {
  const { pending, message, run } = useOperation();
  return (
    <section className="studio-tab-surface" aria-label="Trace">
      <header>
        <strong>TRACE</strong>
        <span>{state.phaseStates.length} etapas / {state.degradedSources.length} degradaciones</span>
        <button type="button" disabled={!state.activeObject.id || pending !== null} title={state.activeObject.id ? 'Ejecuta /api/sfi/execution con evidencia e hipotesis visibles.' : 'ACTIVE_OBJECT_REQUIRED'} onClick={() => void run('COGNITIVE_RUNTIME', async () => {
          await checkedJson(await fetch('/api/sfi/execution', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              capabilityId: 'STUDIO_OBJECT_ANALYSIS',
              payload: {
                objectId: state.activeObject.id,
                objectType: state.activeObject.type,
                evidence: state.evidence.map((item) => ({
                  id: item.id,
                  source: item.source,
                  confidence: item.reliability,
                  payload: { label: item.label, observedAt: item.observedAt, type: item.type },
                })),
                hypotheses: state.suggestions.map((item) => ({
                  id: item.hypothesisId,
                  statement: item.justification,
                  confidence: item.confidence,
                })),
                metadata: {
                  sessionId: state.session.id,
                  generatedAt: state.generatedAt,
                  source: 'studio_trace_tab',
                },
              },
            }),
          }));
        })}><ShieldCheck size={14} aria-hidden /> EJECUTAR AGENTES</button>
      </header>
      <div className="studio-trace-agents">
        {state.phaseStates.map((phase) => (
          <article key={phase.key} className={statusClass(phase.status)}>
            <strong>{phase.label}</strong>
            <span>{phase.status} / {phase.startedAt ?? 'NO_START'} / {phase.completedAt ?? 'NO_END'}</span>
            <p>{phase.details ?? phase.error ?? phase.nextAction ?? phase.requirements.join(', ')}</p>
          </article>
        ))}
        {state.provenance.basedOn.map((item) => <article key={item}><strong>{item}</strong><span>READ_MODEL_SOURCE</span><p>{state.generatedAt}</p></article>)}
      </div>
      {message ? <p className="studio-opbar__message">{message}</p> : null}
    </section>
  );
}

export function StudioOperationalDeck({ state, report }: { state: StudioProductionState; report: ReactNode }) {
  const [activeTab, setActiveTab] = useState<StudioTab>('REPORTE');
  return (
    <>
      <ObjectControls state={state} />
      <nav className="studio-tabbar" aria-label="Studio workspace tabs">
        {tabs.map((tab) => <button key={tab} type="button" aria-pressed={activeTab === tab} onClick={() => setActiveTab(tab)}>{tab}</button>)}
      </nav>
      {activeTab === 'REPORTE' ? report : null}
      {activeTab === 'SUGERENCIAS' ? <SuggestionsTab state={state} /> : null}
      {activeTab === 'EVIDENCIA' ? <EvidenceTab state={state} /> : null}
      {activeTab === 'INTERVENCIONES' ? <InterventionsTab state={state} /> : null}
      {activeTab === 'LONGITUDINAL' ? <LongitudinalTab state={state} /> : null}
      {activeTab === 'TRACE' ? <TraceTab state={state} /> : null}
    </>
  );
}

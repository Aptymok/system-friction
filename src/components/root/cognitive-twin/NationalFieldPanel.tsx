'use client';

import { useEffect, useMemo, useState } from 'react';

type Row = Record<string, unknown>;

type Scenario = {
  id: string;
  label: string;
  question: string;
  lanes: readonly string[];
};

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown, fallback = '—') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function display(value: unknown, fallback = '—') {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value) && value.length) return value.map(String).join(' · ');
  return fallback;
}

function scenariosFrom(value: unknown): Scenario[] {
  return Array.isArray(value) ? value.flatMap((item) => {
    const row = record(item);
    const id = text(row.id, '');
    const label = text(row.label, '');
    const question = text(row.question, '');
    if (!id || !label || !question) return [];
    return [{ id, label, question, lanes: Array.isArray(row.lanes) ? row.lanes.map(String) : [] }];
  }) : [];
}

export function NationalFieldPanel() {
  const [configuration, setConfiguration] = useState<Row | null>(null);
  const [scenarioId, setScenarioId] = useState('');
  const [referenceStart, setReferenceStart] = useState('');
  const [referenceEnd, setReferenceEnd] = useState('');
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/root/cognitive-twin/national-field', { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json().catch(() => null) as Row | null;
        if (!response.ok || !body?.ok) throw new Error(text(body?.error, `HTTP ${response.status}`));
        if (cancelled) return;
        const field = record(body.nationalField);
        setConfiguration(field);
        const first = scenariosFrom(field.scenarios)[0];
        if (first) setScenarioId(first.id);
      })
      .catch((caught) => { if (!cancelled) setError(caught instanceof Error ? caught.message : 'No fue posible leer National Field.'); });
    return () => { cancelled = true; };
  }, []);

  const scenarios = useMemo(() => scenariosFrom(configuration?.scenarios), [configuration]);
  const activeScenario = scenarios.find((item) => item.id === scenarioId) ?? scenarios[0] ?? null;

  async function ingest(includeStates: boolean, includeDenue: boolean) {
    if (running) return;
    setRunning(includeStates ? 'ingest-full' : 'ingest-national');
    setError(null);
    try {
      const response = await fetch('/api/root/cognitive-twin/national-field', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeStates, includeDenue }),
      });
      const body = await response.json().catch(() => null) as Row | null;
      if (!response.ok || !body) throw new Error(text(body?.error, `HTTP ${response.status}`));
      setResult(body);
      if (body.ok !== true) setError(display(record(body.nationalField).warnings, 'La adquisición terminó degradada.'));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible adquirir el campo nacional.');
    } finally { setRunning(null); }
  }

  async function analyze() {
    if (!activeScenario || running) return;
    setRunning('analyze');
    setError(null);
    try {
      const response = await fetch('/api/root/cognitive-twin/national-field/analyze', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: activeScenario.id,
          referenceStart: referenceStart ? new Date(`${referenceStart}T00:00:00`).toISOString() : null,
          referenceEnd: referenceEnd ? new Date(`${referenceEnd}T23:59:59`).toISOString() : null,
        }),
      });
      const body = await response.json().catch(() => null) as Row | null;
      if (!response.ok || !body) throw new Error(text(body?.error, `HTTP ${response.status}`));
      setResult(body);
      if (body.ok !== true) setError(display(body.error, 'El escenario no produjo una ejecución válida.'));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible ejecutar el escenario nacional.');
    } finally { setRunning(null); }
  }

  const fieldResult = record(result?.nationalField);
  const envelope = record(result?.envelope);
  const payload = record(envelope.result);
  const scenarioResult = record(payload.scenario);

  return <section className="ct-national-field">
    <header>
      <div><span>EXTERNAL LEARNING SUBSTRATE · MÉXICO</span><h2>INEGI NATIONAL OBSERVATION FIELD</h2></div>
      <strong>IMPORTED ≠ FRICTION</strong>
    </header>
    <p>El Cognitive Twin puede observar series y agregados oficiales sin convertirlos automáticamente en fricción, causalidad o canon. Tiempo de referencia, publicación y adquisición permanecen separados.</p>

    <div className="ct-national-health">
      <span>INDICADORES <b>{configuration?.indicatorsConfigured === true ? 'CONFIGURADO' : 'TOKEN PENDIENTE'}</b></span>
      <span>DENUE <b>{configuration?.denueConfigured === true ? 'CONFIGURADO' : 'TOKEN PENDIENTE'}</b></span>
      <span>MICRODATOS <b>BATCH / AGREGADOS</b></span>
      <span>PERSON-LEVEL EMBEDDING <b>PROHIBIDO</b></span>
    </div>

    <div className="ct-national-actions">
      <button type="button" disabled={Boolean(running)} onClick={() => void ingest(false, false)}>{running === 'ingest-national' ? 'ADQUIRIENDO…' : 'ADQUIRIR SERIES NACIONALES'}</button>
      <button type="button" disabled={Boolean(running)} onClick={() => void ingest(true, true)}>{running === 'ingest-full' ? 'ADQUIRIENDO…' : 'ADQUIRIR 32 ENTIDADES + DENUE'}</button>
    </div>

    <div className="ct-national-scenario">
      <label>ESCENARIO<select value={activeScenario?.id ?? ''} onChange={(event) => setScenarioId(event.target.value)}>{scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.id} · {scenario.label}</option>)}</select></label>
      <div className="ct-national-window"><label>DESDE<input type="date" value={referenceStart} onChange={(event) => setReferenceStart(event.target.value)} /></label><label>HASTA<input type="date" value={referenceEnd} onChange={(event) => setReferenceEnd(event.target.value)} /></label></div>
      {activeScenario ? <div className="ct-national-question"><b>{activeScenario.question}</b><span>{activeScenario.lanes.join(' + ')}</span></div> : null}
      <button type="button" disabled={Boolean(running) || !activeScenario} onClick={() => void analyze()}>{running === 'analyze' ? 'ANALIZANDO…' : 'EJECUTAR COGNITIVE TWIN SOBRE ESCENARIO'}</button>
    </div>

    {error ? <div className="ct-national-error">{error}</div> : null}
    {result ? <article className="ct-national-result">
      {fieldResult.collected !== undefined ? <div><b>ADQUISICIÓN</b><span>{display(fieldResult.collected, '0')} registros recibidos · {display(fieldResult.persisted, '0')} persistidos</span><span>{display(fieldResult.epistemicClass, 'IMPORTED')} · sin MIHM/fricción automática · sin promoción de hipótesis</span></div> : null}
      {scenarioResult.id ? <div><b>{display(scenarioResult.id)} · {display(scenarioResult.label)}</b><span>{display(result.observationCount, '0')} observaciones admisibles · {display(result.cognitiveExecution)}</span><span>{display(record(result.run).status)} · {display(record(result.llm).provider)}/{display(record(result.llm).model)}</span><pre>{display(payload.synthesis, 'MISSING · no existe síntesis cognitiva válida.')}</pre></div> : null}
    </article> : null}

    <style jsx>{`
      .ct-national-field{border:1px solid #343023;background:#0b0a08;padding:18px;margin-top:12px;color:#d8d0bf;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.ct-national-field header{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid #2a251a;padding-bottom:13px}.ct-national-field header span{font-size:8px;letter-spacing:.16em;color:#8d7b4f}.ct-national-field h2{margin:5px 0 0;font:400 22px Georgia,serif;color:#d9c37e}.ct-national-field header strong{font-size:8px;color:#c59068;border:1px solid #5c4931;padding:6px 8px;height:max-content}.ct-national-field>p{color:#918878;font:12px/1.65 Georgia,serif;max-width:1100px}.ct-national-health{display:flex;flex-wrap:wrap;gap:7px;margin:12px 0}.ct-national-health span{border:1px solid #29251b;padding:7px 9px;color:#6f685d;font-size:8px}.ct-national-health b{color:#ae9c70}.ct-national-actions{display:flex;flex-wrap:wrap;gap:8px}.ct-national-field button{border:1px solid #6b5930;background:transparent;color:#d2b66c;padding:10px 13px;font:9px inherit;cursor:pointer}.ct-national-field button:disabled{opacity:.4}.ct-national-scenario{display:grid;gap:10px;border-top:1px solid #29251b;margin-top:14px;padding-top:14px}.ct-national-scenario label{display:grid;gap:6px;color:#786c4d;font-size:8px;letter-spacing:.11em}.ct-national-scenario select,.ct-national-scenario input{background:#070706;border:1px solid #2f2a1e;color:#c7bda8;padding:9px;font:10px ui-monospace,monospace}.ct-national-window{display:flex;gap:8px}.ct-national-window label{flex:1}.ct-national-question{display:grid;gap:5px;border-left:2px solid #5d4e2e;padding:8px 10px}.ct-national-question b{color:#c7b982;font:13px/1.5 Georgia,serif}.ct-national-question span{color:#70695e;font-size:8px}.ct-national-error{margin-top:10px;color:#d09a7e;font-size:9px}.ct-national-result{margin-top:14px;border-top:1px solid #29251b;padding-top:12px}.ct-national-result>div{display:grid;gap:6px}.ct-national-result b{color:#c8b371}.ct-national-result span{color:#8e8577;font-size:9px}.ct-national-result pre{white-space:pre-wrap;overflow-wrap:anywhere;color:#bbb2a1;font:13px/1.7 Georgia,serif;margin:10px 0 0}@media(max-width:720px){.ct-national-window{display:grid}.ct-national-field header{display:grid}}
    `}</style>
  </section>;
}

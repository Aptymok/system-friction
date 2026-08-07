'use client';

import { useMemo } from 'react';
import type { RootRow, RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';

type SignalState = 'OBSERVED' | 'DERIVED' | 'DEGRADED' | 'MISSING' | 'GATED';
type Metric = {
  id: string;
  label: string;
  value: number | null;
  display: string;
  state: SignalState;
  note: string;
};

type Divergence = {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  detail: string;
};

function num(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function clamp01(value: number | null) {
  if (value === null || !Number.isFinite(value)) return null;
  const normalized = value > 1 ? value / 100 : value;
  return Math.max(0, Math.min(1, normalized));
}

function matrixNumber(state: RootSovereignState, ids: string[]) {
  for (const id of ids) {
    const item = state.system.data.matrix.find((entry) => entry.id === id);
    const parsed = num(item?.state.value);
    if (parsed !== null) return parsed;
  }
  return null;
}

function rowDate(value: RootRow) {
  const raw = value.observed_at ?? value.occurred_at ?? value.executed_at ?? value.updated_at ?? value.created_at ?? value.timestamp;
  if (typeof raw !== 'string' || !raw) return null;
  const date = new Date(raw);
  return Number.isFinite(date.valueOf()) ? date : null;
}

function freshness(value: string | null, now: number) {
  if (!value) return null;
  const date = new Date(value).valueOf();
  if (!Number.isFinite(date)) return null;
  return Math.max(0, now - date);
}

function scoreState(value: number | null, good = 0.8, degraded = 0.5): SignalState {
  if (value === null) return 'MISSING';
  if (value >= good) return 'OBSERVED';
  if (value >= degraded) return 'DEGRADED';
  return 'MISSING';
}

function fmtPercent(value: number | null) {
  return value === null ? 'NO DETERMINADO' : `${Math.round(value * 100)}%`;
}

function canonicalStatus(value: string) {
  const normalized = value.toUpperCase();
  if (normalized === 'OPERATIONAL' || normalized === 'OBSERVED' || normalized === 'DERIVED' || normalized === 'AVAILABLE') return 'OBSERVED' as const;
  if (normalized === 'DEGRADED' || normalized === 'PARTIAL') return 'DEGRADED' as const;
  if (normalized === 'GATED' || normalized === 'BLOCKED') return 'GATED' as const;
  return 'MISSING' as const;
}

function readerHealth(state: RootSovereignState) {
  const sources = [state.system, state.governance, state.agents, state.predictions, state.amv, state.evidence, state.execution, state.telemetry, state.cognitiveRuntime];
  const healthy = sources.filter((source) => !source.error).length;
  return { healthy, total: sources.length, score: healthy / Math.max(1, sources.length) };
}

function traceabilityScore(state: RootSovereignState) {
  const nodes = state.evidence.data.nodes;
  const edges = state.evidence.data.edges;
  const nodeTrace = nodes.length ? nodes.filter((node) => node.evidenceIds.length > 0 || node.lineage.length > 0).length / nodes.length : null;
  const edgeTrace = edges.length ? edges.filter((edge) => edge.evidenceIds.length > 0).length / edges.length : null;
  const evidencePresence = state.evidence.data.entries.length + state.evidence.data.ledger.length > 0 ? 1 : null;
  const parts = [nodeTrace, edgeTrace, evidencePresence].filter((value): value is number => value !== null);
  return parts.length ? parts.reduce((sum, value) => sum + value, 0) / parts.length : null;
}

function executionScore(state: RootSovereignState, now: number) {
  const agents = state.agents.data.agents;
  if (!agents.length) return null;
  const recent = agents.filter((agent) => {
    const age = freshness(agent.lastRun, now);
    return age !== null && age <= 24 * 60 * 60 * 1000;
  }).length;
  return recent / agents.length;
}

function capabilityScore(state: RootSovereignState) {
  const capabilities = state.execution.data.capabilities;
  if (!capabilities.length) return null;
  return capabilities.reduce((sum, capability) => sum + (capability.state === 'available' ? 1 : capability.state === 'partial' ? 0.5 : 0), 0) / capabilities.length;
}

function governanceScore(state: RootSovereignState) {
  if (state.governance.error) return 0;
  const persisted = state.governance.data.audits.length + state.governance.data.events.length + state.governance.data.mutations.length;
  return persisted > 0 ? 1 : null;
}

function cognitiveScore(state: RootSovereignState) {
  const status = canonicalStatus(state.cognitiveRuntime.data.status);
  if (status === 'OBSERVED') return 1;
  if (status === 'DEGRADED') return 0.5;
  if (status === 'GATED') return 0.25;
  return 0;
}

function activityBins(state: RootSovereignState, now: number) {
  const rows = [
    ...state.governance.data.events,
    ...state.governance.data.audits,
    ...state.governance.data.mutations,
    ...state.execution.data.recentActions,
    ...state.predictions.data.runs,
    ...state.predictions.data.outcomes,
    ...state.predictions.data.learningEvents,
    ...state.evidence.data.entries,
    ...state.evidence.data.ledger,
    ...state.amv.data.memories,
  ];
  const bins = Array.from({ length: 12 }, () => 0);
  for (const item of rows) {
    const date = rowDate(item);
    if (!date) continue;
    const age = now - date.valueOf();
    if (age < 0 || age > 24 * 60 * 60 * 1000) continue;
    const index = Math.min(11, Math.floor(age / (2 * 60 * 60 * 1000)));
    bins[11 - index] += 1;
  }
  return bins;
}

function buildNarrative(state: RootSovereignState, metrics: Metric[], divergences: Divergence[]) {
  const health = metrics.find((item) => item.id === 'health');
  const trace = metrics.find((item) => item.id === 'trace');
  const execution = metrics.find((item) => item.id === 'execution');
  const capability = metrics.find((item) => item.id === 'capability');
  const cognitive = metrics.find((item) => item.id === 'cognitive');
  const phi = matrixNumber(state, ['phi_sf', 'phi']);

  const opening = phi === null
    ? 'SFI puede observar su infraestructura, pero todavía no posee una lectura institucional ΦSFI determinable en este corte.'
    : `SFI mantiene una lectura institucional derivada de ${clamp01(phi)?.toFixed(3) ?? '—'}, sin sustituir IHG, NTI ni LDI.`;

  const healthSentence = `La superficie de observación dispone de ${health?.display ?? '—'} lectores sin error; trazabilidad ${trace?.display ?? '—'}; ejecución reciente ${execution?.display ?? '—'}; capacidad ejecutable ${capability?.display ?? '—'}.`;
  const cognitionSentence = cognitive?.state === 'OBSERVED'
    ? 'El runtime cognitivo presenta evidencia operativa suficiente para representarse como observado en este corte.'
    : `El runtime cognitivo está ${cognitive?.state ?? 'MISSING'}: registro, contrato y presencia de agentes no equivalen a ejecución reciente.`;
  const divergenceSentence = divergences.length
    ? `La divergencia dominante es: ${divergences[0].title.toLowerCase()}. ROOT debe tratarla como distancia operacional, no como defecto visual que deba ocultarse.`
    : 'No se detecta una divergencia crítica con los umbrales visuales actuales; esto no equivale a validación institucional total.';

  return [opening, healthSentence, cognitionSentence, divergenceSentence];
}

function metricRadius(value: number | null, max = 52) {
  return value === null ? 0 : Math.max(4, value * max);
}

function radarPoint(index: number, total: number, value: number | null, radius: number, cx: number, cy: number) {
  const angle = -Math.PI / 2 + index * (Math.PI * 2 / total);
  const r = (value ?? 0) * radius;
  return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r] as const;
}

export function RootInstitutionalSelfPerception({ state }: { state: RootSovereignState }) {
  const now = new Date(state.generatedAt).valueOf() || Date.now();
  const model = useMemo(() => {
    const health = readerHealth(state);
    const trace = traceabilityScore(state);
    const execution = executionScore(state, now);
    const capability = capabilityScore(state);
    const governance = governanceScore(state);
    const cognitive = cognitiveScore(state);
    const phi = clamp01(matrixNumber(state, ['phi_sf', 'phi']));
    const evidencePresence = state.evidence.data.entries.length + state.evidence.data.ledger.length > 0 ? 1 : null;

    const metrics: Metric[] = [
      { id: 'institution', label: 'LECTURA INSTITUCIONAL', value: phi, display: phi === null ? 'NO DETERMINADA' : `ΦSFI ${phi.toFixed(3)}`, state: phi === null ? 'MISSING' : 'DERIVED', note: 'Derivada; no sustituye IHG, NTI ni LDI.' },
      { id: 'health', label: 'SALUD DE FUENTES', value: health.score, display: `${health.healthy}/${health.total}`, state: scoreState(health.score, 0.9, 0.7), note: 'Lectores server-side sin error en el corte.' },
      { id: 'trace', label: 'TRAZABILIDAD', value: trace, display: fmtPercent(trace), state: scoreState(trace, 0.8, 0.5), note: 'Evidencia/linaje presente en nodos, relaciones y ledger.' },
      { id: 'execution', label: 'EJECUCIÓN 24H', value: execution, display: fmtPercent(execution), state: scoreState(execution, 0.7, 0.25), note: 'Agentes con ejecución observada dentro de 24 horas.' },
      { id: 'capability', label: 'CAPACIDAD EJECUTABLE', value: capability, display: fmtPercent(capability), state: scoreState(capability, 0.8, 0.5), note: 'Capacidades available/partial/gated, ponderadas sin zero-fill.' },
      { id: 'governance', label: 'GOBERNANZA / AUDIT', value: governance, display: governance === null ? 'SIN EVIDENCIA' : fmtPercent(governance), state: governance === null ? 'MISSING' : scoreState(governance, 0.8, 0.5), note: 'Eventos, mutaciones y auditoría persistidos.' },
      { id: 'cognitive', label: 'RUNTIME COGNITIVO', value: cognitive, display: state.cognitiveRuntime.data.status.toUpperCase(), state: canonicalStatus(state.cognitiveRuntime.data.status), note: 'Contrato, registro y ejecución se mantienen separados.' },
      { id: 'evidence', label: 'PRESENCIA DE EVIDENCIA', value: evidencePresence, display: String(state.evidence.data.entries.length + state.evidence.data.ledger.length), state: evidencePresence ? 'OBSERVED' : 'MISSING', note: 'Cantidad observada; no mide fuerza probatoria.' },
    ];

    const divergences: Divergence[] = [];
    if (health.score < 0.9) divergences.push({ severity: health.score < 0.7 ? 'CRITICAL' : 'HIGH', title: 'Fuentes institucionales degradadas', detail: `${health.total - health.healthy} de ${health.total} lectores reportan error o degradación.` });
    if (execution === null || execution < 0.25) divergences.push({ severity: 'CRITICAL', title: 'Continuidad cognitiva no demostrada', detail: 'La mayoría de agentes registrados no presenta una ejecución observada dentro de la ventana de 24 horas.' });
    else if (execution < 0.7) divergences.push({ severity: 'HIGH', title: 'Ejecución cognitiva parcial', detail: `Sólo ${Math.round(execution * 100)}% de los agentes tienen ejecución reciente observada.` });
    if (trace === null || trace < 0.5) divergences.push({ severity: 'HIGH', title: 'Trazabilidad insuficiente', detail: 'Nodos, relaciones o ledger todavía carecen de suficientes referencias de evidencia/linaje.' });
    if (capability === null || capability < 0.5) divergences.push({ severity: 'HIGH', title: 'Contratos sin ejecución suficiente', detail: 'La capacidad declarada todavía supera a la capacidad efectivamente disponible.' });
    if (!state.amv.data.attractors.length) divergences.push({ severity: 'MEDIUM', title: 'Atractor persistido no visible en este lector', detail: 'ROOT no debe inferir posición de convergencia mientras el lector AMV no exponga un atractor persistido.' });
    if (!state.evidence.data.nodes.length) divergences.push({ severity: 'MEDIUM', title: 'Grafo de evidencia vacío', detail: 'La topología no dispone de nodos persistidos para representar relaciones reales.' });
    if (phi === null) divergences.push({ severity: 'MEDIUM', title: 'Posición institucional indeterminada', detail: 'No existe ΦSFI suficiente para ubicar visualmente al Instituto respecto de su estado declarado.' });

    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;
    divergences.sort((a, b) => order[a.severity] - order[b.severity]);

    return { metrics, divergences, narrative: buildNarrative(state, metrics, divergences), activity: activityBins(state, now) };
  }, [now, state]);

  const radarMetrics = model.metrics.filter((item) => ['health', 'trace', 'execution', 'capability', 'governance', 'cognitive'].includes(item.id));
  const cx = 150; const cy = 150; const radius = 105;
  const polygon = radarMetrics.map((metric, index) => radarPoint(index, radarMetrics.length, metric.value, radius, cx, cy).join(',')).join(' ');
  const maxActivity = Math.max(1, ...model.activity);

  return (
    <section className="risp" aria-label="Autopercepción institucional de ROOT">
      <header className="risp-head">
        <div>
          <span>ROOT · AUTOPERCEPCIÓN INSTITUCIONAL</span>
          <h1>ESTADO TOTAL · DISTANCIA · TRAZABILIDAD · EJECUCIÓN</h1>
        </div>
        <div className="risp-cut">
          <span>CORTE OBSERVADO</span>
          <strong>{new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(state.generatedAt))}</strong>
          <small>NO MOCKS · NO ZERO-FILL · EVIDENCE BEFORE INFERENCE</small>
        </div>
      </header>

      <div className="risp-narrative">
        <div className="risp-orb" data-state={model.divergences[0]?.severity ?? 'LOW'} aria-hidden="true"><i/><i/><i/></div>
        <div>
          <span>LECTURA HUMANA DEL SISTEMA</span>
          {model.narrative.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        </div>
      </div>

      <div className="risp-metrics">
        {model.metrics.map((metric) => (
          <article key={metric.id} data-state={metric.state}>
            <header><span>{metric.label}</span><b>{metric.state}</b></header>
            <div className="risp-metric-line"><strong>{metric.display}</strong><i style={{ '--score': metric.value ?? 0 } as React.CSSProperties}/></div>
            <p>{metric.note}</p>
          </article>
        ))}
      </div>

      <div className="risp-visual-grid">
        <article className="risp-radar">
          <header><span>GRAMÁTICA VISUAL 01</span><h2>CAMPO DE COHERENCIA INSTITUCIONAL</h2></header>
          <div className="risp-radar-layout">
            <svg viewBox="0 0 300 300" role="img" aria-label="Radar institucional basado en salud, trazabilidad, ejecución, capacidad, gobernanza y runtime cognitivo">
              {[0.25, 0.5, 0.75, 1].map((ring) => <circle key={ring} cx={cx} cy={cy} r={radius * ring} className="grid"/>)}
              {radarMetrics.map((metric, index) => {
                const [x, y] = radarPoint(index, radarMetrics.length, 1, radius, cx, cy);
                const [mx, my] = radarPoint(index, radarMetrics.length, metric.value, radius, cx, cy);
                return <g key={metric.id}><line x1={cx} y1={cy} x2={x} y2={y} className="axis"/><circle cx={mx} cy={my} r={metricRadius(metric.value, 5)} className="point"/><text x={x} y={y} className="label" textAnchor={x < cx - 10 ? 'end' : x > cx + 10 ? 'start' : 'middle'}>{metric.label.split(' ')[0]}</text></g>;
              })}
              <polygon points={polygon} className="shape"/>
              <circle cx={cx} cy={cy} r="4" className="core"/>
            </svg>
            <div className="risp-radar-copy">
              <strong>La forma es función.</strong>
              <p>El polígono sólo se expande cuando el runtime aporta evidencia suficiente. Una concavidad no se rellena por estética: es una divergencia observada.</p>
              <small>UMBRAL · OBSERVED ≥80% · DEGRADED 50–79% · MISSING &lt;50% salvo reglas específicas de ejecución y salud.</small>
            </div>
          </div>
        </article>

        <article className="risp-pulse">
          <header><span>GRAMÁTICA VISUAL 02</span><h2>PULSO LONGITUDINAL · ÚLTIMAS 24H</h2></header>
          <div className="risp-bars" aria-label="Actividad persistida agrupada en ventanas de dos horas">
            {model.activity.map((value, index) => <i key={index} style={{ '--activity': value / maxActivity } as React.CSSProperties}><b>{value}</b></i>)}
          </div>
          <footer><span>−24H</span><span>EVENTOS / AUDIT / EVIDENCIA / RUNS · BINS DE 2H</span><span>AHORA</span></footer>
          <p>La actividad visual proviene de timestamps persistidos. Altura cero significa ausencia de registros en esa ventana, no “sistema sano”.</p>
        </article>

        <article className="risp-divergence">
          <header><span>GRAMÁTICA VISUAL 03</span><h2>VECTOR DE DIVERGENCIA</h2></header>
          {model.divergences.length ? model.divergences.slice(0, 6).map((item, index) => (
            <div key={`${item.title}-${index}`} data-severity={item.severity}>
              <b>{String(index + 1).padStart(2, '0')}</b><span><strong>{item.title}</strong><small>{item.detail}</small></span><em>{item.severity}</em>
            </div>
          )) : <p>Sin divergencias detectadas por esta gramática. Esto no constituye certificación.</p>}
        </article>
      </div>

      <footer className="risp-rule">
        <strong>REGLA VISUAL PERSISTENTE</strong>
        <span>La belleza no completa datos faltantes. Intensidad, expansión, densidad y movimiento sólo aumentan con trazabilidad y ejecución observables; degradación y ausencia deben permanecer visibles.</span>
      </footer>

      <style jsx>{`
        .risp{position:relative;border-bottom:1px solid rgba(188,158,79,.26);background:radial-gradient(circle at 18% 0%,rgba(173,137,45,.09),transparent 38%),linear-gradient(180deg,#080806,#050504);color:#e9dfc8;padding:22px 24px 26px;font-family:var(--sfi-font-mono),ui-monospace,SFMono-Regular,Menlo,monospace;overflow:hidden}.risp:before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(190,161,82,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(190,161,82,.025) 1px,transparent 1px);background-size:44px 44px;pointer-events:none}.risp>*{position:relative}.risp-head{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;padding-bottom:16px;border-bottom:1px solid rgba(188,158,79,.18)}.risp-head span,.risp-visual-grid header>span,.risp-narrative>div>span{color:#a98e4e;font-size:8px;letter-spacing:.18em}.risp-head h1{margin:7px 0 0;font:400 clamp(18px,2.1vw,31px)/1.1 Georgia,serif;color:#ead9b3;letter-spacing:-.02em}.risp-cut{text-align:right}.risp-cut strong{display:block;margin:5px 0;color:#cbb77e;font-size:10px}.risp-cut small{color:#665e4e;font-size:7px;letter-spacing:.08em}.risp-narrative{display:grid;grid-template-columns:120px minmax(0,1fr);gap:22px;align-items:center;padding:22px 0}.risp-narrative p{margin:5px 0;color:#aea28c;font:400 13px/1.55 Georgia,serif;max-width:1200px}.risp-orb{position:relative;width:96px;height:96px;border:1px solid rgba(210,178,92,.38);border-radius:50%;display:grid;place-items:center;box-shadow:0 0 70px rgba(191,154,60,.09)}.risp-orb:before,.risp-orb:after,.risp-orb i{content:'';position:absolute;border:1px solid rgba(203,170,82,.2);border-radius:50%}.risp-orb:before{inset:12px}.risp-orb:after{inset:27px}.risp-orb i:nth-child(1){width:8px;height:8px;background:#d5b86e;box-shadow:0 0 24px #aa8a43}.risp-orb i:nth-child(2){width:62px;height:1px;border:0;border-top:1px solid rgba(207,173,84,.26);border-radius:0;transform:rotate(41deg)}.risp-orb i:nth-child(3){width:62px;height:1px;border:0;border-top:1px solid rgba(207,173,84,.26);border-radius:0;transform:rotate(-41deg)}.risp-orb[data-state='CRITICAL']{box-shadow:0 0 70px rgba(190,73,73,.13);border-color:rgba(190,73,73,.55)}.risp-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.risp-metrics article{border:1px solid rgba(188,158,79,.16);background:rgba(10,9,6,.72);padding:11px;min-height:98px}.risp-metrics article header{display:flex;justify-content:space-between;gap:8px;color:#8c8068;font-size:7px;letter-spacing:.1em}.risp-metrics article header b{font-weight:500}.risp-metrics article[data-state='OBSERVED'] header b,.risp-metrics article[data-state='DERIVED'] header b{color:#b8b477}.risp-metrics article[data-state='DEGRADED'] header b{color:#c79b63}.risp-metrics article[data-state='MISSING'] header b,.risp-metrics article[data-state='GATED'] header b{color:#a56e66}.risp-metric-line{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:center;margin:12px 0 8px}.risp-metric-line strong{color:#e6d4a7;font-size:13px;white-space:nowrap}.risp-metric-line i{height:2px;background:linear-gradient(90deg,#b79a4f calc(var(--score)*100%),rgba(120,105,76,.18) 0)}.risp-metrics p{margin:0;color:#756e60;font-size:8px;line-height:1.45}.risp-visual-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:9px;margin-top:10px}.risp-visual-grid article{border:1px solid rgba(188,158,79,.16);background:rgba(8,8,5,.78);padding:14px}.risp-visual-grid header h2{margin:4px 0 0;color:#cdbb8b;font-size:10px;font-weight:500;letter-spacing:.11em}.risp-radar{grid-row:span 2}.risp-radar-layout{display:grid;grid-template-columns:minmax(260px,1fr) minmax(180px,.8fr);align-items:center;gap:10px}.risp-radar svg{width:100%;max-height:330px}.risp-radar .grid{fill:none;stroke:rgba(186,157,79,.11);stroke-width:.6}.risp-radar .axis{stroke:rgba(186,157,79,.12);stroke-width:.5}.risp-radar .shape{fill:rgba(186,157,79,.09);stroke:rgba(215,184,98,.72);stroke-width:1.1}.risp-radar .point{fill:#d5b86e;stroke:#f0d796;stroke-width:.6}.risp-radar .core{fill:#f3dfae}.risp-radar .label{fill:#746a54;font-size:7px;letter-spacing:.08em}.risp-radar-copy strong{display:block;color:#dbc78f;font:400 18px Georgia,serif}.risp-radar-copy p{color:#8b8272;font-size:9px;line-height:1.55}.risp-radar-copy small{display:block;color:#665f51;font-size:7px;line-height:1.6}.risp-bars{height:112px;display:flex;align-items:flex-end;gap:4px;margin-top:16px;border-bottom:1px solid rgba(188,158,79,.2)}.risp-bars i{position:relative;flex:1;min-width:3px;height:max(2px,calc(var(--activity)*100%));background:linear-gradient(180deg,rgba(224,193,111,.84),rgba(150,119,48,.24));transition:height .4s ease}.risp-bars i b{position:absolute;bottom:100%;left:50%;transform:translateX(-50%);font-size:6px;color:#6d6555;font-style:normal;font-weight:400}.risp-pulse footer{display:flex;justify-content:space-between;margin-top:6px;color:#5f584b;font-size:6px}.risp-pulse p,.risp-divergence>p{color:#766f61;font-size:8px;line-height:1.5}.risp-divergence>div{display:grid;grid-template-columns:24px 1fr auto;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid rgba(188,158,79,.09)}.risp-divergence>div>b{color:#756747;font-size:8px}.risp-divergence>div span strong{display:block;color:#bdb092;font-size:9px}.risp-divergence>div span small{display:block;margin-top:3px;color:#716a5c;font-size:7px;line-height:1.45}.risp-divergence>div em{font-style:normal;font-size:7px;color:#9e725d}.risp-divergence>div[data-severity='CRITICAL'] em{color:#bd7164}.risp-rule{display:grid;grid-template-columns:auto 1fr;gap:14px;margin-top:10px;padding:11px 13px;border-left:2px solid #9a7e3d;background:rgba(154,126,61,.055)}.risp-rule strong{color:#c4ad6c;font-size:8px;letter-spacing:.12em}.risp-rule span{color:#7f7768;font-size:8px;line-height:1.5}@media(max-width:1050px){.risp-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.risp-visual-grid{grid-template-columns:1fr}.risp-radar{grid-row:auto}}@media(max-width:720px){.risp{padding:16px 12px}.risp-head{display:block}.risp-cut{text-align:left;margin-top:12px}.risp-narrative{grid-template-columns:1fr}.risp-orb{display:none}.risp-metrics{grid-template-columns:1fr}.risp-radar-layout{grid-template-columns:1fr}.risp-rule{grid-template-columns:1fr}}
      `}</style>
    </section>
  );
}

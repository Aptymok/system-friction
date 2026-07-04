import type { StudioGoldState } from '@/lib/studio/gold/studioGoldState';

type EvaluationStatus = 'valid' | 'degraded' | 'blocked' | 'unavailable';

type EvaluationPoint = {
  id: string;
  label: string;
  status: EvaluationStatus;
  source: string;
  detail: string;
  value: string;
};

function dec(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : '0.00';
}

function pct(value: number) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function hasSource(state: StudioGoldState, source: string) {
  return state.provenance.basedOn.some((item) => item.toLowerCase().includes(source.toLowerCase()));
}

function hasDegraded(state: StudioGoldState, source: string) {
  return state.provenance.degradedSources.some((item) => item.toLowerCase().includes(source.toLowerCase()))
    || state.provenance.limits.some((item) => item.toLowerCase().includes(source.toLowerCase()));
}

function statusLabel(status: EvaluationStatus) {
  const labels: Record<EvaluationStatus, string> = {
    valid: 'VALIDA',
    degraded: 'DEGRADADA',
    blocked: 'BLOQUEADA',
    unavailable: 'SIN DATOS',
  };
  return labels[status];
}

function sourceStatus(state: StudioGoldState, source: string, hasData: boolean): EvaluationStatus {
  if (hasData) return hasDegraded(state, source) ? 'degraded' : 'valid';
  if (hasDegraded(state, source)) return 'degraded';
  return 'unavailable';
}

function buildEvaluationPoints(state: StudioGoldState): EvaluationPoint[] {
  const hasCase = Boolean(state.activeCase.id);
  const hasEvidence = state.activeCase.signals > 0 || state.observablesMatrix.totalObservables > 0;
  const hasCulturalVector = state.wsvLens.cultural > 0 || state.culturalWave.coherenceGlobal > 0 || state.culturalWave.symbolicDensity > 0;
  const hasWsv = state.wsvLens.global > 0 || hasSource(state, 'readWorldSpectVectorSnapshot');
  const hasScoreFriction = hasSource(state, 'buildScoreFrictionScopeState') || hasSource(state, 'buildOperationalCycle');
  const hasMihm = state.mihmModel.individual > 0 || state.mihmModel.systemic > 0;
  const hasPsiAmv = state.persistentSignals.length > 0 || state.longitudinalTracking.length > 0;
  const pmvBlocked = state.pmv.state === 'blocked';

  return [
    {
      id: 'EV-01',
      label: 'Evaluacion de evidencia',
      status: hasEvidence ? 'valid' : hasCase ? 'blocked' : 'unavailable',
      source: hasEvidence ? 'ScoreFriction evidence / active case' : 'NO_ACTIVE_EVIDENCE',
      detail: hasEvidence ? `${state.activeCase.signals} senales del caso; ${state.observablesMatrix.totalObservables} observables conectados.` : 'No hay evidencia activa suficiente para evaluar objeto cultural.',
      value: String(state.activeCase.signals),
    },
    {
      id: 'EV-02',
      label: 'Evaluacion cultural',
      status: sourceStatus(state, 'cultural', hasCulturalVector),
      source: hasCulturalVector ? 'Cultural Vector / culturalWave' : 'CULTURAL_VECTOR_UNAVAILABLE',
      detail: `Coherencia ${dec(state.culturalWave.coherenceGlobal)}, entropia ${dec(state.culturalWave.culturalEntropy)}, densidad ${dec(state.culturalWave.symbolicDensity)}.`,
      value: dec(state.wsvLens.cultural),
    },
    {
      id: 'EV-03',
      label: 'Evaluacion WSV / WorldSpect',
      status: sourceStatus(state, 'worldspect', hasWsv),
      source: hasWsv ? 'readWorldSpectVectorSnapshot' : 'DEGRADED_WORLDSPECT',
      detail: `WSV global ${dec(state.wsvLens.global)}; cobertura analitica ${pct(state.culturalWave.analyticCoverage)}.`,
      value: dec(state.wsvLens.global),
    },
    {
      id: 'EV-04',
      label: 'Evaluacion ScoreFriction',
      status: sourceStatus(state, 'scorefriction', hasScoreFriction),
      source: hasScoreFriction ? 'buildScoreFrictionScopeState / buildOperationalCycle' : 'SCOREFRICTION_SOURCE_UNAVAILABLE',
      detail: `Oportunidad/impacto ${dec(state.pmv.expectedImpact)}; alcance ${dec(state.pmv.reach)}; estado ${state.pmv.state}.`,
      value: dec(state.pmv.expectedImpact),
    },
    {
      id: 'EV-05',
      label: 'Evaluacion MIHM / PSI / AMV',
      status: hasMihm || hasPsiAmv ? (hasDegraded(state, 'mihm') ? 'degraded' : 'valid') : 'blocked',
      source: hasMihm || hasPsiAmv ? 'Operational cycle MIHM/PSI/AMV' : 'EVALUATION_BLOCKED',
      detail: `MIHM sistemico ${dec(state.mihmModel.systemic)}; senales persistentes ${state.persistentSignals.length}; trayectorias ${state.longitudinalTracking.length}.`,
      value: dec(state.mihmModel.systemic),
    },
    {
      id: 'EV-06',
      label: 'Evaluacion de PMV',
      status: pmvBlocked ? 'blocked' : state.pmv.state === 'ready' || state.pmv.state === 'running' || state.pmv.state === 'complete' ? 'valid' : 'degraded',
      source: pmvBlocked ? 'WAITING_FOR_ARTIFACT' : 'recommended_experiments[0]',
      detail: state.pmv.hypothesis,
      value: state.pmv.state.toUpperCase(),
    },
    {
      id: 'EV-07',
      label: 'Evaluacion de procedencia',
      status: state.provenance.basedOn.length ? (state.provenance.degradedSources.length ? 'degraded' : 'valid') : 'unavailable',
      source: state.provenance.basedOn.length ? state.provenance.basedOn.join(' + ') : 'SOURCE_UNAVAILABLE',
      detail: state.provenance.degradedSources.length ? `Fuentes degradadas: ${state.provenance.degradedSources.slice(0, 3).join(', ')}.` : 'Fuentes activas declaradas por el adaptador Studio Gold.',
      value: `${state.provenance.basedOn.length}/${state.provenance.basedOn.length + state.provenance.degradedSources.length}`,
    },
  ];
}

export function StudioEvaluationPanel({ state }: { state: StudioGoldState }) {
  const points = buildEvaluationPoints(state);
  const valid = points.filter((point) => point.status === 'valid').length;
  const blocked = points.filter((point) => point.status === 'blocked' || point.status === 'unavailable').length;

  return (
    <article className="sfi-studio-gold__panel sfi-studio-gold__evaluation">
      <div className="sfi-studio-gold__panel-title">
        <div><h2>EVALUACION</h2><p>LECTURA FUNCIONAL SIN DATOS FALSOS</p></div>
        <button type="button">{valid}/{points.length}</button>
      </div>
      <div className="sfi-studio-gold__evaluation-list">
        {points.map((point) => (
          <div className="sfi-studio-gold__evaluation-row" key={point.id}>
            <span>{point.id}</span>
            <div><strong>{point.label}</strong><em>{point.source}</em><p>{point.detail}</p></div>
            <b className={`is-${point.status}`}>{statusLabel(point.status)}</b>
          </div>
        ))}
      </div>
      <footer className="sfi-studio-gold__evaluation-foot">
        <span>VALIDAS <strong>{valid}</strong></span>
        <span>BLOQUEADAS/SIN DATOS <strong>{blocked}</strong></span>
      </footer>
    </article>
  );
}

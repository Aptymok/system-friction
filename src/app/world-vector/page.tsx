'use client';

import { useEffect, useMemo, useState } from 'react';

type Row = Record<string, unknown>;

const DOMAIN_ORDER = ['CULTURAL', 'ECONOMY', 'GEO_DIGITAL', 'GEOPOLITICAL', 'BIO', 'CLIMATE', 'INSTITUTIONAL', 'MEMETIC', 'TECH', 'AFFECTIVE'];
const FILTERS = ['WORLD', ...DOMAIN_ORDER];

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function values(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function num(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pct(value: unknown) {
  return `${Math.round(num(value) * 100)}%`;
}

function fixed(value: unknown, digits = 3) {
  return num(value).toFixed(digits);
}

function label(value: unknown, fallback = 'sin datos') {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function metricTone(value: unknown) {
  const n = num(value);
  if (n >= 0.7) return 'wv-good';
  if (n >= 0.45) return 'wv-watch';
  return 'wv-low';
}

async function safeJson<T>(response: Response, fallback: T): Promise<T> {
  const text = await response.text().catch(() => '');
  if (!text.trim()) return fallback;

  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}


function operatorLabel(state: Row) {
  return label(state.label, 'Sin lectura');
}

function operatorSummary(state: Row) {
  return label(state.summary, 'WorldSpect no tiene una lectura operativa disponible.');
}

function operatorAction(state: Row) {
  return label(state.action, 'No ejecutar decisiones apoyadas en WorldSpect hasta recuperar lectura mínima.');
}

function operatorDecisionUse(state: Row) {
  const value = label(state.decisionUse, 'hold');
  if (value === 'execute') return 'Puede orientar decisión';
  if (value === 'observe') return 'Usar para observar';
  if (value === 'internal_only') return 'Sólo lectura interna';
  return 'No ejecutar';
}

function operatorStatusClass(state: Row) {
  const status = label(state.status, 'sin_lectura');
  if (status === 'observacion_confiable') return 'wv-op-good';
  if (status === 'observacion_parcial') return 'wv-op-partial';
  if (status === 'observacion_interna') return 'wv-op-internal';
  return 'wv-op-hold';
}

function selectedVectorFrom(snapshot: Row | null, domain: string) {
  const vectors = rows(snapshot?.vectors);
  if (domain === 'WORLD') return null;
  return vectors.find((vector) => String(vector.domain) === domain) ?? null;
}

function sourceDetails(source: Row | null) {
  return rows(source?.source_details);
}

function opportunityScore(vector: Row) {
  const trust = num(vector.trust);
  const persistence = num(vector.persistence);
  const value = num(vector.value);
  const degradation = num(vector.degradation);
  return Number((trust * 0.28 + persistence * 0.34 + value * 0.2 + (1 - degradation) * 0.18).toFixed(4));
}

function signalClass(vector: Row) {
  const persistence = num(vector.persistence);
  const trust = num(vector.trust);
  const degradation = num(vector.degradation);
  if (degradation >= 0.55) return 'degradada';
  if (persistence >= 0.6 && trust >= 0.58) return 'persistente';
  if (persistence >= 0.45 && trust < 0.58) return 'emergente';
  return 'latente';
}

function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('file_read_failed'));
    reader.readAsText(file);
  });
}

export default function WorldVectorPage() {
  const [state, setState] = useState<Row | null>(null);
  const [history, setHistory] = useState<Row | null>(null);
  const [traceability, setTraceability] = useState<Row | null>(null);
  const [worldAttractors, setWorldAttractors] = useState<Row | null>(null);
  const [worldOpportunities, setWorldOpportunities] = useState<Row | null>(null);
  const [domain, setDomain] = useState('WORLD');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [objectText, setObjectText] = useState('');
  const [question, setQuestion] = useState('');
  const [evaluation, setEvaluation] = useState<Row | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function loadWorldSpect() {
    try {
      const [operational, longitudinal, evidenceTrace, attractors, canonicalOpportunities] = await Promise.all([
        fetch('/api/worldspect/operational-state', { cache: 'no-store' }).then((res) => safeJson<Row>(res, { ok: false, status: 'empty_worldspect_operational_state' })),
        fetch('/api/worldspect/longitudinal?limit=80', { cache: 'no-store' }).then((res) => safeJson<Row>(res, { ok: false, timeline: [] })),
        fetch('/api/worldspect/evidence-trace', { cache: 'no-store' }).then((res) => safeJson<Row>(res, { ok: false, traces: [] })),
        fetch('/api/worldspect/attractors?limit=80', { cache: 'no-store' }).then((res) => safeJson<Row>(res, { ok: false, attractors: [] })),
        fetch('/api/worldspect/opportunities?limit=80', { cache: 'no-store' }).then((res) => safeJson<Row>(res, { ok: false, opportunities: [] })),
      ]);

      setState(operational);
      setHistory(longitudinal);
      setTraceability(evidenceTrace);
      setWorldAttractors(attractors);
      setWorldOpportunities(canonicalOpportunities);
      const timeline = rows(longitudinal.timeline);
      setSelectedIndex(timeline.length ? timeline.length - 1 : null);
    } catch (error) {
      setState({ ok: false, status: 'unavailable', error: error instanceof Error ? error.message : 'worldspect_unavailable' });
      setHistory({ ok: false, timeline: [] });
      setTraceability({ ok: false, traces: [] });
      setWorldAttractors({ ok: false, attractors: [] });
      setWorldOpportunities({ ok: false, opportunities: [] });
    }
  }

  useEffect(() => {
    void loadWorldSpect();
  }, []);

  async function refreshRealWorldSpect() {
    setRefreshing(true);
    try {
      const ingest = await fetch('/api/cron/worldspect', { method: 'POST', cache: 'no-store' })
        .then((res) => safeJson<Row>(res, { ok: false, error: 'empty_worldspect_ingest_response' }));

      if (ingest.ok === false) {
        setState({ ok: false, status: 'ingest_failed', error: label(ingest.error ?? ingest.message, 'worldspect_ingest_failed'), ingest });
        return;
      }

      await loadWorldSpect();
    } catch (error) {
      setState({ ok: false, status: 'ingest_failed', error: error instanceof Error ? error.message : 'worldspect_ingest_failed' });
    } finally {
      setRefreshing(false);
    }
  }

  const timeline = rows(history?.timeline);
  const selectedSnapshot = selectedIndex !== null ? timeline[selectedIndex] ?? null : null;
  const latestSnapshot = selectedSnapshot ?? record(state?.snapshot);
  const latestVectors = rows(latestSnapshot?.vectors).length ? rows(latestSnapshot?.vectors) : rows(state?.vector_readout);
  const selectedVector = selectedVectorFrom({ vectors: latestVectors }, domain);
  const sourceHealth = rows(state?.source_health);
  const sourceMix = record(state?.source_mix);
  const operatorState = record(state?.operator_state);
  const operatorEvidence = record(operatorState.evidence);
  const selectedSource = domain === 'WORLD' ? null : sourceHealth.find((item) => String(item.vector) === domain) ?? null;
  const evidenceTraces = rows(traceability?.traces);
  const selectedTrace = domain === 'WORLD' ? null : evidenceTraces.find((trace) => String(trace.vector) === domain) ?? null;
  const canonicalAttractors = rows(worldAttractors?.attractors);
  const canonicalOpportunities = rows(worldOpportunities?.opportunities);

  const dominant = useMemo(() => [...latestVectors].sort((a, b) => num(b.persistence) - num(a.persistence))[0] ?? null, [latestVectors]);
  const emergent = useMemo(() => latestVectors.filter((vector) => signalClass(vector) === 'emergente'), [latestVectors]);
  const degraded = useMemo(() => latestVectors.filter((vector) => signalClass(vector) === 'degradada'), [latestVectors]);
  const opportunities = useMemo<Row[]>(() => latestVectors
    .map((vector) => ({ ...(vector as Row), opportunity: opportunityScore(vector) }))
    .sort((a, b) => num(b.opportunity) - num(a.opportunity)), [latestVectors]);

  async function runContrast() {
    if (!objectText.trim()) {
      setEvaluation({ ok: false, object_presence: 'missing', answer: 'Carga un objeto primero. Sin objeto solo existe lectura del mundo.' });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/scorefriction/operational-cycle', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          case_id: `WorldSpect-${Date.now().toString(36)}`,
          objective: question.trim() || `Contraste contra ${domain}`,
          scope: domain === 'WORLD' ? 'world' : domain === 'CULTURAL' ? 'culture' : 'custom',
          analysis_modes: ['MIHM', 'PSI', 'WorldSpect', 'SCOREFRICTION', 'AMV'],
          evaluated_object: objectText,
          run_contrast: true,
        }),
      }).then((res) => safeJson<Row>(res, { ok: false, error: 'empty_scorefriction_contrast_response' }));
      setEvaluation(record(response.state ?? response));
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(file: File | null) {
    if (!file) return;
    const content = await fileToText(file);
    setObjectText(content);
  }

  function downloadReport() {
    const payload = evaluation ?? { world: state, history };
    const report = `# WorldSpect Longitudinal Report\n\n` +
      `Generated: ${new Date().toISOString()}\n\n` +
      `## Current world\n\nRegime: ${label(latestSnapshot?.regime ?? state?.world_regime)}\n\nWSI: ${fixed(latestSnapshot?.wsi ?? record(state?.snapshot).wsi)}\n\nNTI: ${fixed(latestSnapshot?.nti ?? record(state?.snapshot).nti)}\n\nCoverage: ${pct(sourceMix.sourceCoverage ?? latestSnapshot?.sourceCoverage)}\n\nDominant attractor: ${label(dominant?.domain)} persistence ${fixed(dominant?.persistence)}\n\n` +
      `## Selected vector\n\n${domain}\n\n` +
      `## Evaluation\n\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\`\n`;
    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `worldvector-report-${Date.now().toString(36)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="wv-root">
      <header className="wv-header">
        <div>
          <div className="wv-kicker">WorldSpect Observatory</div>
          <h1>Regime timeline + signal field</h1>
        </div>
        <div className="wv-metrics">
          <div><span>regime</span><b>{label(latestSnapshot?.regime ?? state?.world_regime)}</b></div>
          <div><span>coverage</span><b>{pct(sourceMix.sourceCoverage ?? latestSnapshot?.sourceCoverage)}</b></div>
          <div><span>dominant attractor</span><b>{label(dominant?.domain)}</b></div>
          <div><span>degradation</span><b>{pct(state?.degradation)}</b></div>
          <div><span>snapshots</span><b>{timeline.length || '1'}</b></div>
        </div>
      </header>

      <section className={`wv-operator-card ${operatorStatusClass(operatorState)}`} aria-label="WorldSpect estado operativo">
        <div>
          <p className="wv-eyebrow">Estado operativo</p>
          <h2>{operatorLabel(operatorState)}</h2>
          <p>{operatorSummary(operatorState)}</p>
        </div>
        <div className="wv-operator-action">
          <span>{operatorDecisionUse(operatorState)}</span>
          <strong>{operatorAction(operatorState)}</strong>
        </div>
        <div className="wv-operator-evidence">
          <span>Cobertura: {String(operatorEvidence.sourceCoverage ?? sourceMix.sourceCoverage ?? 'n/d')}</span>
          <span>Fuentes vivas: {String(operatorEvidence.realInputCount ?? sourceMix.realInputCount ?? 'n/d')}</span>
          <span>Fuentes pendientes: {String(operatorEvidence.missingOrDegradedCount ?? sourceMix.missingOrDegradedCount ?? 'n/d')}</span>
          <span>Estado técnico: {String(state?.technical_status ?? state?.status ?? 'n/d')}</span>
        </div>
      </section>

      <section className="wv-layout">
        <aside className="wv-left">
          <div className="wv-panel-title">Vector filter</div>
          <div className="wv-filter-grid">
            {FILTERS.map((item) => (
              <button key={item} type="button" className={domain === item ? 'active' : ''} onClick={() => setDomain(item)}>{item}</button>
            ))}
          </div>

          <div className="wv-card">
            <span>Source mix</span>
            <div className="wv-mix">
              <b>{String(sourceMix.publicSourceCount ?? 0)}</b><small>public</small>
              <b>{String(sourceMix.internalSourceCount ?? 0)}</b><small>internal</small>
              <b>{String(sourceMix.realInputCount ?? 0)}</b><small>real input</small>
            </div>
          </div>

          <div className="wv-scroll-panel short">
            <div className="wv-panel-title">Sources for selected vector</div>
            {domain === 'WORLD' ? <p>World view uses all active vector sources.</p> : sourceDetails(selectedSource).length ? sourceDetails(selectedSource).map((source) => (
              <article key={String(source.id)}>
                <b>{label(source.provider)}</b>
                <span>{label(source.kind)} / {label(source.id)}</span>
              </article>
            )) : <p>Source detail is not exposed for this vector in the current snapshot.</p>}
          </div>
        </aside>

        <section className="wv-center">
          <div className="wv-map-header">
            <div>
              <div className="wv-kicker">Living attractor map</div>
              <h2>{domain === 'WORLD' ? 'WORLD FIELD' : domain}</h2>
              <p>{domain === 'WORLD' ? 'The center displays global regime pressure. Each vector is positioned by persistence, trust and degradation.' : `Selected vector: ${domain}. Use the orbit, timeline and opportunity panel to decide whether to observe, wait, or contrast an object.`}</p>
            </div>
            <button type="button" onClick={downloadReport}>Download report</button>
          </div>

          <div className="wv-regime-river" aria-label="Regime timeline">
            <svg viewBox="0 0 1000 180" preserveAspectRatio="none">
              <line x1="0" y1="140" x2="1000" y2="140" />
              <line x1="0" y1="90" x2="1000" y2="90" />
              <line x1="0" y1="40" x2="1000" y2="40" />
              <polyline points={timeline.map((snap, index) => {
                const x = timeline.length <= 1 ? 500 : (index / (timeline.length - 1)) * 1000;
                const y = 160 - num(snap.nti) * 120;
                return `${x},${y}`;
              }).join(' ')} />
              {timeline.map((snap, index) => {
                const x = timeline.length <= 1 ? 500 : (index / Math.max(1, timeline.length - 1)) * 1000;
                const y = 160 - num(snap.nti) * 120;
                return <circle key={String(snap.id ?? index)} cx={x} cy={y} r={selectedIndex === index ? 9 : 5} onClick={() => setSelectedIndex(index)} />;
              })}
            </svg>
            <div className="wv-river-caption">Timeline reads NTI/regime pressure from persisted snapshots. If there is only one point, the system is observed but not yet longitudinal.</div>
          </div>

          <div className="wv-field-orbit">
            <div className="wv-core">
              <span>{label(latestSnapshot?.regime ?? state?.world_regime)}</span>
              <b>{label(dominant?.domain)}</b>
              <small>world attractor</small>
            </div>
            {latestVectors.map((vector, index) => {
              const angle = (Math.PI * 2 * index) / Math.max(1, latestVectors.length);
              const distance = 28 + num(vector.persistence) * 28 - num(vector.degradation) * 8;
              const x = 50 + Math.cos(angle) * distance;
              const y = 50 + Math.sin(angle) * distance * 0.7;
              const size = 12 + num(vector.trust) * 18;
              return (
                <button key={String(vector.domain)} type="button" className={`wv-orbit-node ${domain === String(vector.domain) ? 'active' : ''}`} style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }} onClick={() => setDomain(String(vector.domain))} title={String(vector.domain)}>
                  <span>{String(vector.domain)}</span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="wv-right">
          <div className="wv-scroll-panel">
            <div className="wv-panel-title">Emerging signals</div>
            {emergent.length ? emergent.map((vector) => (
              <article key={String(vector.domain)}>
                <b>{String(vector.domain)}</b>
                <span>persistence {pct(vector.persistence)} / confidence {pct(vector.trust)}</span>
                <small>This is an emerging signal because persistence exists but trust is not yet high enough.</small>
              </article>
            )) : <p>No emergent signal in this snapshot.</p>}
          </div>

          <div className="wv-scroll-panel">
            <div className="wv-panel-title">Degraded signals</div>
            {degraded.length ? degraded.map((vector) => (
              <article key={String(vector.domain)}>
                <b>{String(vector.domain)}</b>
                <span>degradation {pct(vector.degradation)}</span>
                <small>Requires source improvement or more comparable evidence.</small>
              </article>
            )) : <p>No degraded vector above threshold.</p>}
          </div>

          <div className="wv-scroll-panel tall">
            <div className="wv-panel-title">Emergent opportunities</div>
            {(canonicalOpportunities.length ? canonicalOpportunities : opportunities.slice(0, 8)).map((vector) => (
              <article key={String(vector.id ?? vector.domain)}>
                <b>{String(vector.title ?? vector.domain)}</b>
                <span>score {pct(vector.score ?? vector.opportunity)} / risk {label(vector.risk, 'observacion')}</span>
                <small>{values(record(vector.basis).evidence_refs).length ? `basis refs: ${values(record(vector.basis).evidence_refs).length}` : label(vector.explanation, 'Derived from evidence and deltas. This is not an intervention recommendation.')}</small>
              </article>
            ))}
          </div>

          <div className="wv-scroll-panel tall">
            <div className="wv-panel-title">Attractor clusters</div>
            {canonicalAttractors.length ? canonicalAttractors.map((attractor) => (
              <article key={String(attractor.id)}>
                <b>{label(attractor.label)}</b>
                <span>{values(attractor.vectors).join(' + ') || String(attractor.vectors ?? '')}</span>
                <small>direction {label(attractor.direction)} / operational confidence {pct(attractor.confidence)} / evidence {values(attractor.evidence_basis).length}</small>
              </article>
            )) : <p>No evidence-based attractor cluster available yet.</p>}
          </div>
        </aside>
      </section>

      <section className="wv-trace">
        <div className="wv-panel-title">Evidence Trace Explorer</div>
        <div className="wv-trace-grid">
          {(domain === 'WORLD' ? evidenceTraces : selectedTrace ? [selectedTrace] : []).map((trace) => (
            <details key={String(trace.vector)} open={domain !== 'WORLD'}>
              <summary>
                <b>{String(trace.vector)}</b>
                <span>{label(trace.state)} / world claim {String(Boolean(trace.can_claim_world_reading))} / user claim {String(Boolean(trace.can_claim_user_reading))}</span>
              </summary>
              <p>{label(trace.explanation)}</p>
              {[
                ['WORLD EXTERNAL', rows(trace.world_external_evidence)],
                ['SFI INTERNAL', rows(trace.sfi_internal_evidence)],
                ['USER / CASE', [...rows(trace.user_internal_evidence), ...rows(trace.case_internal_evidence)]],
              ].map(([title, list]) => (
                <div key={String(title)} className="wv-trace-level">
                  <h3>{String(title)}</h3>
                  {Array.isArray(list) && list.length ? list.map((item) => (
                    <article key={String(item.id)}>
                      <b>{label(item.source_id ?? item.provider)}</b>
                      <span>{label(item.provider)} / {label(item.observed_at)} / trust {fixed(item.trust)}</span>
                      <small>{label(item.evidence_ref)} â€” {label(item.summary)}</small>
                    </article>
                  )) : <p>{String(title) === 'USER / CASE' ? 'User not calibrated yet. Upload/evaluate an object to build case evidence.' : 'No exact linked evidence for this level.'}</p>}
                </div>
              ))}
            </details>
          ))}
        </div>
      </section>

      <section className="wv-evaluator">
        <div>
          <div className="wv-panel-title">Object contrast</div>
          <p>Upload or paste an object. Then SFI compares object vs current world + selected filtered vector. Without object, the system must not recommend intervention.</p>
        </div>
        <input type="file" onChange={(event) => void handleUpload(event.target.files?.[0] ?? null)} />
        <textarea value={objectText} onChange={(event) => setObjectText(event.target.value)} placeholder="Paste text, lyrics, campaign, decision, script, observation..." />
        <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask the observatory what you need to know about this object vs the world..." />
        <button type="button" disabled={loading} onClick={() => void runContrast()}>{loading ? 'Analyzing...' : 'Run real contrast'}</button>
        {evaluation ? <pre>{JSON.stringify(evaluation, null, 2)}</pre> : null}
      </section>

      <style jsx>{`
        .wv-root { min-height: 100vh; background: #030302; color: #e7dcc4; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
        .wv-header { position: sticky; top: 0; z-index: 20; display: grid; grid-template-columns: 1fr 2fr; gap: 20px; padding: 18px 22px; border-bottom: 1px solid rgba(216,182,74,.18); background: rgba(3,3,2,.9); backdrop-filter: blur(18px); }
        .wv-kicker, .wv-panel-title { color: #e0c46c; font-size: 10px; letter-spacing: .22em; text-transform: uppercase; }
        h1, h2 { margin: 6px 0 0; letter-spacing: .12em; text-transform: uppercase; }
        .wv-metrics { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1px; }
        .wv-metrics div { border: 1px solid rgba(216,182,74,.12); padding: 10px; background: #070604; }
        .wv-metrics span { display: block; color: #8a8172; font-size: 9px; text-transform: uppercase; }
        .wv-metrics b { display: block; margin-top: 4px; font-size: 12px; color: #f5e7bd; }
        .wv-operator-card {
          margin: 16px;
          border: 1px solid rgba(141, 187, 165, 0.28);
          background: rgba(7, 14, 13, 0.72);
          padding: 16px;
          display: grid;
          gap: 12px;
        }
        .wv-operator-card h2 {
          margin: 4px 0 6px;
          color: #f5e7bd;
          font-size: clamp(24px, 3vw, 38px);
          line-height: 1;
          letter-spacing: .12em;
          text-transform: uppercase;
        }
        .wv-operator-card p {
          margin: 0;
          color: #9c9282;
          line-height: 1.6;
        }
        .wv-eyebrow {
          color: #e0c46c !important;
          font-size: 10px;
          letter-spacing: .22em;
          text-transform: uppercase;
        }
        .wv-operator-action {
          border-top: 1px solid rgba(141, 187, 165, 0.16);
          padding-top: 10px;
          display: grid;
          gap: 6px;
        }
        .wv-operator-action span {
          color: #e0c46c;
          font-size: 10px;
          letter-spacing: .18em;
          text-transform: uppercase;
        }
        .wv-operator-action strong {
          color: #e7dcc4;
          font-size: 13px;
          font-weight: 500;
          line-height: 1.5;
        }
        .wv-operator-evidence {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .wv-operator-evidence span {
          border: 1px solid rgba(141, 187, 165, 0.16);
          background: rgba(141, 187, 165, 0.055);
          color: #9c9282;
          padding: 6px 8px;
          font-size: 11px;
        }
        .wv-op-good { border-color: rgba(80, 220, 160, 0.36); }
        .wv-op-partial { border-color: rgba(245, 158, 11, 0.42); }
        .wv-op-internal { border-color: rgba(96, 165, 250, 0.38); }
        .wv-op-hold { border-color: rgba(248, 113, 113, 0.38); }

        .wv-layout { display: grid; grid-template-columns: 300px minmax(480px, 1fr) 360px; gap: 14px; padding: 16px; }
        .wv-left, .wv-right, .wv-center, .wv-evaluator { border: 1px solid rgba(216,182,74,.16); background: #070604; padding: 14px; }
        .wv-filter-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 12px; }
        button { border: 1px solid rgba(216,182,74,.22); background: #050504; color: #9c9282; padding: 8px 10px; text-transform: uppercase; letter-spacing: .1em; font-size: 10px; cursor: pointer; }
        button.active, button:hover { color: #f5e7bd; border-color: rgba(224,196,108,.7); background: rgba(224,196,108,.1); }
        button:disabled { opacity: .45; cursor: not-allowed; }
        .wv-card { margin-top: 14px; border: 1px solid rgba(216,182,74,.12); padding: 12px; }
        .wv-card span { color: #8a8172; font-size: 10px; text-transform: uppercase; }
        .wv-mix { display: grid; grid-template-columns: auto 1fr; gap: 6px 10px; margin-top: 10px; }
        .wv-mix b { color: #e0c46c; }
        .wv-mix small { color: #8a8172; }
        .wv-scroll-panel { max-height: 240px; overflow: auto; border: 1px solid rgba(216,182,74,.12); background: #050504; padding: 12px; margin-top: 14px; }
        .wv-scroll-panel.short { max-height: 210px; }
        .wv-scroll-panel.tall { max-height: 320px; }
        article { border-bottom: 1px solid rgba(216,182,74,.10); padding: 10px 0; }
        article b { display: block; color: #f5e7bd; font-size: 11px; }
        article span, article small, p { display: block; color: #9c9282; font-size: 10px; line-height: 1.6; }
        .wv-map-header { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; }
        .wv-map-header p { max-width: 720px; }
        .wv-regime-river { margin-top: 18px; border: 1px solid rgba(216,182,74,.12); background: #020201; padding: 12px; }
        .wv-regime-river svg { width: 100%; height: 160px; display: block; }
        .wv-regime-river line { stroke: rgba(216,182,74,.12); stroke-width: 1; }
        .wv-regime-river polyline { fill: none; stroke: #e0c46c; stroke-width: 3; filter: drop-shadow(0 0 8px rgba(224,196,108,.35)); }
        .wv-regime-river circle { fill: #050504; stroke: #e0c46c; stroke-width: 2; cursor: pointer; }
        .wv-river-caption { margin-top: 8px; color: #8a8172; font-size: 10px; }
        .wv-field-orbit { position: relative; height: 440px; margin-top: 14px; overflow: hidden; border: 1px solid rgba(216,182,74,.12); background: radial-gradient(circle at center, rgba(224,196,108,.13), transparent 34%), #020201; }
        .wv-field-orbit:before, .wv-field-orbit:after { content: ''; position: absolute; inset: 12%; border: 1px dashed rgba(216,182,74,.18); border-radius: 50%; }
        .wv-field-orbit:after { inset: 25%; border-style: solid; opacity: .65; }
        .wv-core { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); width: 170px; height: 170px; border: 1px solid rgba(224,196,108,.85); border-radius: 50%; display: grid; place-content: center; text-align: center; background: rgba(224,196,108,.08); box-shadow: 0 0 80px rgba(224,196,108,.16); }
        .wv-core span, .wv-core small { color: #8a8172; font-size: 10px; text-transform: uppercase; }
        .wv-core b { color: #f5e7bd; font-size: 18px; letter-spacing: .14em; }
        .wv-orbit-node { position: absolute; transform: translate(-50%,-50%); border-radius: 999px; padding: 0; background: #e0c46c; box-shadow: 0 0 22px rgba(224,196,108,.55); }
        .wv-orbit-node span { position: absolute; left: 50%; top: 120%; transform: translateX(-50%); color: #e7dcc4; font-size: 9px; white-space: nowrap; }
        .wv-orbit-node.active { background: #f5e7bd; box-shadow: 0 0 36px rgba(245,231,189,.85); }
        .wv-good { color: #d9f99d; } .wv-watch { color: #e0c46c; } .wv-low { color: #fca5a5; }
        .wv-evaluator { margin: 0 16px 18px; display: grid; grid-template-columns: 280px 220px 1fr 1fr 140px; gap: 12px; align-items: start; }
        .wv-trace { margin: 0 16px 16px; border: 1px solid rgba(216,182,74,.16); background: #070604; padding: 14px; }
        .wv-trace-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; max-height: 420px; overflow: auto; margin-top: 12px; }
        .wv-trace details { border: 1px solid rgba(216,182,74,.12); background: #050504; padding: 10px; }
        .wv-trace summary { cursor: pointer; color: #f5e7bd; }
        .wv-trace summary span { display: block; color: #9c9282; font-size: 10px; margin-top: 4px; }
        .wv-trace-level { margin-top: 12px; border-top: 1px solid rgba(216,182,74,.1); padding-top: 8px; }
        .wv-trace-level h3 { margin: 0 0 6px; color: #e0c46c; font-size: 10px; letter-spacing: .16em; }
        .wv-evaluator input, .wv-evaluator textarea { width: 100%; min-height: 72px; border: 1px solid rgba(216,182,74,.2); background: #030302; color: #e7dcc4; padding: 10px; font: inherit; font-size: 11px; }
        .wv-evaluator input { min-height: auto; }
        .wv-evaluator pre { grid-column: 1 / -1; max-height: 320px; overflow: auto; background: #020201; border: 1px solid rgba(216,182,74,.12); padding: 12px; color: #9c9282; font-size: 10px; white-space: pre-wrap; }
        @media (max-width: 1100px) { .wv-header, .wv-layout, .wv-evaluator, .wv-trace-grid { grid-template-columns: 1fr; } .wv-metrics { grid-template-columns: repeat(2, 1fr); } }
      `}</style>
    </main>
  );
}







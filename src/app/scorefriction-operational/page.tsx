'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface ScoreState {
  ihg: number | null;
  nti: number | null;
  ldi: number | null;
  phi: number | null;
  regime: string | null;
}

interface RuntimeFocus {
  vector?: string;
  direction?: string;
  world_spect_vector?: string;
  selected_domain?: string;
  confidence?: number;
  [key: string]: unknown;
}

interface ExecutionReadiness {
  capability_gap?: number;
  executable?: boolean;
  missing_capabilities?: string[];
}

interface OperationalCounts {
  perturbations?: number;
  capabilityChecks?: number;
  ledgerEntries?: number;
  mediaAssets?: number;
  outcomes?: number;
  lessons?: number;
}

interface OperationalState {
  ok: boolean;
  systemRegime?: string;
  organs?: unknown[];
  events?: unknown[];
  patterns?: unknown[];
  attractors?: unknown[];
  institutionalMemory?: unknown[];
  counts?: OperationalCounts;
  executionReadiness?: ExecutionReadiness;
  latestObservation?: any;
  runtimeFocus?: RuntimeFocus;
  [key: string]: unknown;
}

interface MediaAsset {
  id: string;
  asset_type: string;
  provider_used?: string;
  file_url?: string;
  file_path?: string;
  prompt?: string;
  created_at?: string;
}

type AssetRequest = {
  text: boolean;
  image: boolean;
  video: boolean;
  audio: boolean;
  markdown: boolean;
  json: boolean;
};

type ModalContent = {
  title: string;
  narrative: string;
  evidence: string;
  status: string;
  risk: string;
  nextAction: string;
};

const emptyScore: ScoreState = {
  ihg: null,
  nti: null,
  ldi: null,
  phi: null,
  regime: null,
};

function n(value: number | null | undefined, digits = 3) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '—';
}

function riskFromGap(gap?: number) {
  if (typeof gap !== 'number') return 'sin dato';
  if (gap >= 0.66) return 'alto';
  if (gap >= 0.33) return 'medio';
  return 'bajo';
}

function regimeClass(regime?: string | null) {
  if (!regime) return 'reg-unknown';
  const r = regime.toLowerCase();
  if (r.includes('home')) return 'reg-homeost';
  if (r.includes('entro')) return 'reg-entrop';
  return 'reg-critico';
}

function phiClass(phi?: number | null) {
  if (typeof phi !== 'number') return 'warn';
  if (phi < 0.22) return 'crit';
  if (phi > 0.58) return 'ok';
  return 'warn';
}

function buildDictamen(input: {
  title: string;
  score: ScoreState;
  operational: OperationalState | null;
  evidence?: unknown;
}) {
  const { title, score, operational } = input;
  const gap = operational?.executionReadiness?.capability_gap;
  const executable = operational?.executionReadiness?.executable;
  const focus = operational?.runtimeFocus;
  const phi = score.phi;
  const ldi = score.ldi;

  if (title.includes('Φ')) {
    if (typeof phi !== 'number') return 'No hay Φ disponible. El sistema todavía no puede leer el régimen.';
    if (phi < 0.22) return 'El sistema está en fricción crítica. La señal existe, pero la ejecución debe reducir ruido antes de expandirse.';
    if (phi > 0.58) return 'El sistema muestra coherencia operativa. La señal puede convertirse en acción con bajo costo de interpretación.';
    return 'El sistema está en zona intermedia. Hay dirección, pero todavía requiere selección clara de vector.';
  }

  if (title.includes('Fricción')) {
    if (typeof ldi !== 'number') return 'No hay LDI disponible. No se puede estimar tensión longitudinal.';
    if (ldi > 0.7) return 'La tensión longitudinal está elevada. Conviene ejecutar una acción mínima, medible y reversible.';
    return 'La fricción es observable pero no dominante. El sistema puede avanzar con control de evidencia.';
  }

  if (title.includes('World')) {
    const vector = focus?.world_spect_vector || focus?.vector || focus?.direction || focus?.selected_domain;
    return vector
      ? `El sistema está orientado al vector ${String(vector)}. La propuesta debe conservar coherencia con esa dirección.`
      : 'No hay vector externo fijado. La propuesta debe clasificarse antes de producir material.';
  }

  if (title.includes('Readiness')) {
    if (executable) return 'El sistema declara capacidad de ejecución. La acción puede correr y después cerrar ciclo con outcome y lesson.';
    return `El sistema no está listo. La brecha de capacidad es ${n(gap, 2)} y debe cerrarse antes de escalar.`;
  }

  if (title.includes('Counts')) {
    const c = operational?.counts;
    return `El sistema registra ${c?.perturbations ?? 0} perturbaciones, ${c?.capabilityChecks ?? 0} chequeos, ${c?.ledgerEntries ?? 0} entradas de ejecución y ${c?.mediaAssets ?? 0} assets. Esto mide actividad real, no intención.`;
  }

  if (title.includes('Media')) {
    return 'La galería muestra los artefactos generados por ejecución. Si no hay assets, no hay salida material registrada.';
  }

  if (title.includes('Bitácora')) {
    return operational?.latestObservation
      ? 'Existe una observación reciente. Debe tratarse como evidencia operativa y no como interpretación final.'
      : 'No hay observación reciente. El sistema necesita registrar un evento antes de inferir patrón.';
  }

  return 'El panel contiene señal operativa. Su significado depende de evidencia, régimen, vector y capacidad de ejecución.';
}

export default function ScoreFrictionOperationalPage() {
  const caseIdRef = useRef(`SFI-OP-${Math.random().toString(36).slice(2, 10).toUpperCase()}`);

  const [scoreState, setScoreState] = useState<ScoreState>(emptyScore);
  const [operational, setOperational] = useState<OperationalState | null>(null);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<ModalContent>({
    title: '',
    narrative: '',
    evidence: '',
    status: '',
    risk: '',
    nextAction: '',
  });

  const [campaignChannel, setCampaignChannel] = useState('');
  const [campaignObjective, setCampaignObjective] = useState('');
  const [campaignPrompt, setCampaignPrompt] = useState('');
  const [requestedAssets, setRequestedAssets] = useState<AssetRequest>({
    text: true,
    image: false,
    video: false,
    audio: false,
    markdown: false,
    json: false,
  });
  const [campaignResult, setCampaignResult] = useState<any>(null);
  const [campaignLoading, setCampaignLoading] = useState(false);

  const [outcomeText, setOutcomeText] = useState('');
  const [lessonText, setLessonText] = useState('');
  const [atlasUpdate, setAtlasUpdate] = useState(true);
  const [closureResult, setClosureResult] = useState<any>(null);
  const [closureLoading, setClosureLoading] = useState(false);

  const counts = operational?.counts ?? {};
  const readiness = operational?.executionReadiness ?? {};
  const runtimeFocus = operational?.runtimeFocus ?? {};
  const phiVal = n(scoreState.phi, 3);
  const currentRegime = scoreState.regime ?? operational?.systemRegime ?? 'sin régimen';

  const loadAllData = useCallback(async () => {
    setLoadError(null);

    try {
      const [scoreRes, opRes, execRes] = await Promise.all([
        fetch('/api/scorefriction/state', { cache: 'no-store' }),
        fetch(`/api/sfi/operational-state?case_id=${caseIdRef.current}`, { cache: 'no-store' }),
        fetch(`/api/sfi/execution-state?case_id=${caseIdRef.current}`, { cache: 'no-store' }),
      ]);

      const [scoreData, opData, execData] = await Promise.all([
        scoreRes.json().catch(() => null),
        opRes.json().catch(() => null),
        execRes.json().catch(() => null),
      ]);

      if (scoreData?.ok) {
        setScoreState({
          ihg: typeof scoreData.ihg === 'number' ? scoreData.ihg : null,
          nti: typeof scoreData.nti === 'number' ? scoreData.nti : null,
          ldi: typeof scoreData.ldi === 'number' ? scoreData.ldi : null,
          phi: typeof scoreData.phi === 'number' ? scoreData.phi : null,
          regime: typeof scoreData.regime === 'string' ? scoreData.regime : null,
        });
      }

      if (opData?.ok) {
        const lastCap = execData?.capabilityChecks?.[0];

        const derivedCounts: OperationalCounts = {
          perturbations: execData?.perturbations?.length ?? 0,
          capabilityChecks: execData?.capabilityChecks?.length ?? 0,
          ledgerEntries: execData?.ledgerEntries?.length ?? 0,
          mediaAssets: execData?.mediaAssets?.length ?? 0,
          outcomes: execData?.outcomes?.length ?? 0,
          lessons: execData?.lessons?.length ?? 0,
        };

        const derivedReadiness: ExecutionReadiness = lastCap
          ? {
              capability_gap:
                typeof lastCap.capability_gap === 'number' ? lastCap.capability_gap : undefined,
              executable: Boolean(lastCap.executable),
              missing_capabilities: Array.isArray(lastCap.capabilities_missing)
                ? lastCap.capabilities_missing
                : [],
            }
          : {};

        setOperational({
          ...opData,
          counts: derivedCounts,
          executionReadiness: derivedReadiness,
          runtimeFocus: (opData.runtimeFocus ?? opData.runtime_focus ?? {}) as RuntimeFocus,
        });
      }

      if (execData?.ok) {
        setMediaAssets(Array.isArray(execData.mediaAssets) ? execData.mediaAssets : []);
      }
    } catch (error: any) {
      setLoadError(error?.message ?? 'Error al cargar estado operacional.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
    const interval = window.setInterval(loadAllData, 10000);
    return () => window.clearInterval(interval);
  }, [loadAllData]);

  const openDictamen = useCallback(
    (title: string, evidence: unknown, status: string, risk: string, nextAction: string) => {
      const narrative = buildDictamen({
        title,
        score: scoreState,
        operational,
        evidence,
      });

      setModalContent({
        title,
        narrative,
        evidence: JSON.stringify(evidence ?? {}, null, 2),
        status,
        risk,
        nextAction,
      });
      setModalOpen(true);
    },
    [scoreState, operational],
  );

  const runCampaign = async () => {
    setCampaignLoading(true);
    setCampaignResult(null);

    try {
      const assetList = Object.entries(requestedAssets)
        .filter(([, value]) => value)
        .map(([key]) => key);

      const runRes = await fetch('/api/sfi/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: caseIdRef.current,
          minimal_action: campaignPrompt,
          expected_effect: `Campaña para ${campaignObjective} en ${campaignChannel}`,
          requested_assets: assetList,
          target_domain: campaignChannel || 'general',
          perturbation_type: 'campaign',
          runtime_focus: runtimeFocus,
        }),
      });

      const runData = await runRes.json();

      let renderData = null;
      if (assetList.length > 0) {
        const renderRes = await fetch('/api/sfi/media/render', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            case_id: caseIdRef.current,
            provider: 'auto',
            assets: assetList,
            prompt: campaignPrompt,
            runtime_focus: runtimeFocus,
            score_state: scoreState,
          }),
        });

        renderData = await renderRes.json();
      }

      setCampaignResult({ run: runData, render: renderData });
      await loadAllData();
    } catch (error: any) {
      setCampaignResult({ ok: false, error: error?.message ?? 'Error ejecutando campaña.' });
    } finally {
      setCampaignLoading(false);
    }
  };

  const closeExecutionCycle = async () => {
    if (!outcomeText.trim() || !lessonText.trim()) {
      setClosureResult({ ok: false, error: 'Falta Outcome o Lesson.' });
      return;
    }

    setClosureLoading(true);
    setClosureResult(null);

    try {
      const execRes = await fetch(`/api/sfi/execution-state?case_id=${caseIdRef.current}`, {
        cache: 'no-store',
      });
      const execData = await execRes.json();
      const lastLedger = execData?.ledgerEntries?.[0];

      if (!lastLedger?.id) {
        throw new Error('No hay ejecución previa registrada.');
      }

      const outcomeRes = await fetch('/api/sfi/outcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          execution_id: lastLedger.id,
          case_id: caseIdRef.current,
          outcome_status: 'success',
          observed_effect: { description: outcomeText },
          unexpected_effects: [],
          prediction_accuracy: 0.8,
        }),
      });

      const outcomeData = await outcomeRes.json();
      if (!outcomeData?.ok) throw new Error(outcomeData?.error ?? 'No se registró outcome.');

      const lessonRes = await fetch('/api/sfi/lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome_id: outcomeData.outcome.id,
          case_id: caseIdRef.current,
          lesson: lessonText,
          updates_direction_engine: true,
          updates_risk_engine: true,
          updates_capability_engine: true,
          atlas_update: atlasUpdate,
        }),
      });

      const lessonData = await lessonRes.json();
      if (!lessonData?.ok) throw new Error(lessonData?.error ?? 'No se registró lesson.');

      setClosureResult({ ok: true, outcome: outcomeData.outcome, lesson: lessonData.lesson });
      setOutcomeText('');
      setLessonText('');
      await loadAllData();
    } catch (error: any) {
      setClosureResult({ ok: false, error: error?.message ?? 'Error cerrando ciclo.' });
    } finally {
      setClosureLoading(false);
    }
  };

  const amvPanelNarrative = useMemo(() => {
    return buildDictamen({
      title: 'AMV',
      score: scoreState,
      operational,
    });
  }, [scoreState, operational]);

  if (loading) {
    return (
      <main className="screen center">
        <style jsx global>{globalCss}</style>
        Cargando Observatorio Operacional...
      </main>
    );
  }

  return (
    <main className="screen">
      <style jsx global>{globalCss}</style>

      <header id="hdr">
        <div className="hdr-brand">SFI</div>
        <div className="hdr-sep" />
        <div className="hdr-stat">
          SCORE FRICTION <span>OPERACIONAL</span>
        </div>
        <div className="hdr-sep" />
        <div className="hdr-phi">
          Φ_SF <em>{phiVal}</em>
        </div>
        <div className="hdr-sep" />
        <div className={`hdr-regime ${regimeClass(currentRegime)}`}>{currentRegime}</div>
        <div className="hdr-right">
          <div className="hdr-clock">{new Date().toISOString().slice(0, 19).replace('T', ' ')}</div>
        </div>
      </header>

      <section id="obs">
        {loadError && <div className="error-strip">{loadError}</div>}

        <div className="zone zone-a">
          <Panel
            title="Φ_SF · Régimen"
            topo="TOPO-II"
            onClick={() =>
              openDictamen(
                'Φ_SF · Régimen',
                scoreState,
                currentRegime,
                riskFromGap(readiness.capability_gap),
                'Leer régimen y ejecutar solo acción mínima verificable.',
              )
            }
          >
            <div className="phi-core">
              <div className={`phi-big ${phiClass(scoreState.phi)}`}>{phiVal}</div>
              <div className="phi-eq">IHG · NTI / (1 + LDI)</div>
              <div className={`phi-regime ${regimeClass(currentRegime)}`}>{currentRegime}</div>
            </div>
            <div className="phi-vars">
              <Metric label="IHG" value={n(scoreState.ihg, 2)} />
              <Metric label="NTI" value={n(scoreState.nti, 2)} />
              <Metric label="LDI" value={n(scoreState.ldi, 2)} />
            </div>
          </Panel>

          <Panel
            title="Campo de Fricción"
            topo="TOPO-II"
            onClick={() =>
              openDictamen(
                'Campo de Fricción',
                { phi: scoreState.phi, ldi: scoreState.ldi },
                'activo',
                riskFromGap(readiness.capability_gap),
                'Reducir ambigüedad antes de ampliar producción.',
              )
            }
          >
            <FieldView phi={scoreState.phi} ldi={scoreState.ldi} />
          </Panel>

          <Panel
            title="World Spectrum"
            topo="TOPO-III"
            onClick={() =>
              openDictamen(
                'World Spectrum',
                runtimeFocus,
                'integrado',
                runtimeFocus.vector || runtimeFocus.world_spect_vector ? 'bajo' : 'medio',
                'Fijar vector antes de producir material.',
              )
            }
          >
            <pre className="json-box">{JSON.stringify(runtimeFocus, null, 2)}</pre>
          </Panel>

          <Panel
            title="Execution Readiness"
            topo="TOPO-III"
            onClick={() =>
              openDictamen(
                'Execution Readiness',
                readiness,
                readiness.executable ? 'listo' : 'no listo',
                riskFromGap(readiness.capability_gap),
                'Ejecutar si está listo; si no, cerrar brecha de capacidad.',
              )
            }
          >
            <div className={`readiness ${readiness.executable ? 'ready' : 'blocked'}`}>
              {readiness.executable ? 'LISTO' : 'NO LISTO'}
            </div>
            <Metric label="capability_gap" value={n(readiness.capability_gap, 2)} />
            <pre className="json-box">
              {JSON.stringify({ missing: readiness.missing_capabilities ?? [] }, null, 2)}
            </pre>
          </Panel>
        </div>

        <div className="zone zone-b">
          <Panel
            title="Operational Counts"
            topo="TOPO-III"
            onClick={() =>
              openDictamen(
                'Operational Counts',
                counts,
                'activo',
                'bajo',
                'Revisar si la actividad produce outcomes y lessons.',
              )
            }
          >
            <Metric label="Perturbations" value={counts.perturbations ?? 0} />
            <Metric label="Capability Checks" value={counts.capabilityChecks ?? 0} />
            <Metric label="Execution Ledger" value={counts.ledgerEntries ?? 0} />
            <Metric label="Media Assets" value={counts.mediaAssets ?? 0} />
            <Metric label="Outcomes" value={counts.outcomes ?? 0} />
            <Metric label="Lessons" value={counts.lessons ?? 0} />
          </Panel>

          <Panel
            title="Bitácora Operacional"
            topo="TOPO-III"
            onClick={() =>
              openDictamen(
                'Bitácora Operacional',
                operational?.latestObservation,
                operational?.latestObservation ? 'activo' : 'vacío',
                'bajo',
                'Registrar evento o convertir observación en patrón.',
              )
            }
          >
            <pre className="json-box">{JSON.stringify(operational?.latestObservation ?? {}, null, 2)}</pre>
          </Panel>

          <Panel title="AMV · Dictamen Simple" topo="TOPO-I">
            <div className="amv-box">
              <div className="amv-title">Dictamen automático</div>
              <p>{amvPanelNarrative}</p>
              <p>
                El sistema no envía mensajes al chat. La lectura se genera localmente desde las métricas
                cargadas.
              </p>
            </div>
          </Panel>

          <Panel title="Media Asset Gallery" topo="TOPO-III">
            <div className="media-grid">
              {mediaAssets.length === 0 && <div className="empty">Sin assets registrados.</div>}
              {mediaAssets.map((asset) => (
                <div key={asset.id} className="asset-card">
                  {asset.asset_type === 'image' && asset.file_url && (
                    <img src={asset.file_url} alt={asset.prompt ?? 'asset'} />
                  )}
                  {asset.asset_type === 'video' && asset.file_url && (
                    <video src={asset.file_url} controls />
                  )}
                  {asset.asset_type === 'audio' && asset.file_url && (
                    <audio src={asset.file_url} controls />
                  )}
                  {!['image', 'video', 'audio'].includes(asset.asset_type) && (
                    <pre>{JSON.stringify(asset, null, 2)}</pre>
                  )}
                  <small>{asset.asset_type}</small>
                  <strong>{asset.provider_used ?? 'provider no registrado'}</strong>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="zone zone-c">
          <Panel title="Campaign Generator" topo="TOPO-III" wide>
            <label>Canal</label>
            <input
              value={campaignChannel}
              onChange={(event) => setCampaignChannel(event.target.value)}
              placeholder="medium / linkedin / tiktok / sitio"
            />

            <label>Objetivo</label>
            <input
              value={campaignObjective}
              onChange={(event) => setCampaignObjective(event.target.value)}
              placeholder="persistencia / autoridad / conversión / evidencia"
            />

            <label>Prompt</label>
            <textarea
              rows={4}
              value={campaignPrompt}
              onChange={(event) => setCampaignPrompt(event.target.value)}
              placeholder="Describe la pieza, el objeto o el vector de salida."
            />

            <div className="checkbox-row">
              {Object.entries(requestedAssets).map(([key, value]) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(event) =>
                      setRequestedAssets((prev) => ({ ...prev, [key]: event.target.checked }))
                    }
                  />
                  {key}
                </label>
              ))}
            </div>

            <button onClick={runCampaign} disabled={campaignLoading || !campaignPrompt.trim()}>
              {campaignLoading ? 'Ejecutando...' : 'Run Campaign'}
            </button>

            {campaignResult && <pre className="result-box">{JSON.stringify(campaignResult, null, 2)}</pre>}
          </Panel>

          <Panel title="Outcome + Lesson" topo="TOPO-III" wide>
            <label>Outcome</label>
            <textarea
              rows={3}
              value={outcomeText}
              onChange={(event) => setOutcomeText(event.target.value)}
              placeholder="Qué ocurrió después de la ejecución."
            />

            <label>Lesson</label>
            <textarea
              rows={3}
              value={lessonText}
              onChange={(event) => setLessonText(event.target.value)}
              placeholder="Qué aprendió el sistema."
            />

            <label className="inline">
              <input
                type="checkbox"
                checked={atlasUpdate}
                onChange={(event) => setAtlasUpdate(event.target.checked)}
              />
              atlas_update
            </label>

            <button onClick={closeExecutionCycle} disabled={closureLoading}>
              {closureLoading ? 'Cerrando...' : 'Close Institutional Cycle'}
            </button>

            {closureResult && <pre className="result-box">{JSON.stringify(closureResult, null, 2)}</pre>}
          </Panel>
        </div>
      </section>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setModalOpen(false)}>
              ✕
            </button>
            <h3>{modalContent.title}</h3>
            <p>
              <strong>Dictamen:</strong> {modalContent.narrative}
            </p>
            <p>
              <strong>Estado:</strong> {modalContent.status}
            </p>
            <p>
              <strong>Riesgo:</strong> {modalContent.risk}
            </p>
            <p>
              <strong>Siguiente acción:</strong> {modalContent.nextAction}
            </p>
            <pre>{modalContent.evidence}</pre>
          </div>
        </div>
      )}
    </main>
  );
}

function Panel(props: {
  title: string;
  topo: string;
  children: React.ReactNode;
  onClick?: () => void;
  wide?: boolean;
}) {
  return (
    <section className={`panel ${props.wide ? 'wide' : ''}`} onClick={props.onClick}>
      <div className="panel-label">{props.title}</div>
      <div className="panel-topo">{props.topo}</div>
      <div className="panel-body">{props.children}</div>
    </section>
  );
}

function Metric(props: { label: string; value: string | number }) {
  return (
    <div className="metric-row">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function FieldView(props: { phi?: number | null; ldi?: number | null }) {
  const phi = typeof props.phi === 'number' ? props.phi : 0;
  const ldi = typeof props.ldi === 'number' ? props.ldi : 0;

  return (
    <div className="field-view">
      <div className="field-line" style={{ width: `${Math.min(100, Math.max(0, phi * 100))}%` }} />
      <div className="field-line secondary" style={{ width: `${Math.min(100, Math.max(0, ldi * 100))}%` }} />
      <Metric label="Φ" value={n(props.phi, 3)} />
      <Metric label="LDI" value={n(props.ldi, 3)} />
    </div>
  );
}

const globalCss = `
:root {
  --void: #060605;
  --surface: #0d0d0c;
  --gold: #C8A951;
  --red: #b85050;
  --green: #3a8a5a;
  --text: #c8c4b8;
  --muted: rgba(200,196,184,0.48);
  --line: rgba(200,169,81,0.12);
  --mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --disp: 'Syncopate', ui-sans-serif, system-ui;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--void);
  overflow: hidden;
}

.screen {
  width: 100vw;
  height: 100vh;
  background: var(--void);
  color: var(--text);
  font-family: var(--mono);
}

.center {
  display: flex;
  align-items: center;
  justify-content: center;
}

#hdr {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 30px;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 12px;
  border-bottom: 1px solid var(--line);
  background: rgba(6,6,5,0.98);
  z-index: 10;
}

.hdr-brand {
  font-family: var(--disp);
  font-size: 10px;
  letter-spacing: .32em;
  color: var(--gold);
  font-weight: 700;
}

.hdr-sep {
  width: 1px;
  height: 14px;
  background: var(--line);
}

.hdr-stat,
.hdr-clock {
  font-size: 10px;
  color: var(--muted);
  letter-spacing: .16em;
  text-transform: uppercase;
}

.hdr-stat span,
.hdr-phi em {
  color: var(--gold);
  font-style: normal;
}

.hdr-phi {
  font-size: 11px;
  color: var(--muted);
}

.hdr-regime {
  font-size: 10px;
  letter-spacing: .18em;
  text-transform: uppercase;
}

.hdr-right {
  margin-left: auto;
}

.reg-homeost,
.ok,
.ready {
  color: var(--green);
}

.reg-entrop,
.crit,
.blocked {
  color: var(--red);
}

.reg-critico,
.warn,
.reg-unknown {
  color: var(--gold);
}

#obs {
  position: fixed;
  top: 30px;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.error-strip {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  padding: 6px 10px;
  color: var(--red);
  border-bottom: 1px solid rgba(184,80,80,0.3);
  background: rgba(184,80,80,0.08);
  font-size: 11px;
  z-index: 9;
}

.zone {
  display: flex;
  min-height: 0;
  overflow-x: auto;
  overflow-y: hidden;
  border-bottom: 1px solid rgba(200,169,81,0.06);
}

.zone-a {
  height: 34%;
}

.zone-b {
  height: 34%;
}

.zone-c {
  height: 32%;
}

.panel {
  position: relative;
  min-width: 330px;
  height: 100%;
  border-right: 1px solid rgba(200,169,81,0.08);
  background: radial-gradient(circle at 50% 0%, rgba(200,169,81,0.04), transparent 55%), var(--void);
  cursor: pointer;
  overflow: hidden;
}

.panel.wide {
  min-width: 460px;
}

.panel:hover {
  background: radial-gradient(circle at 50% 0%, rgba(200,169,81,0.08), transparent 55%), var(--void);
}

.panel-label {
  position: absolute;
  top: 10px;
  left: 12px;
  font-size: 10px;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: rgba(200,169,81,0.52);
  z-index: 2;
}

.panel-topo {
  position: absolute;
  top: 10px;
  right: 12px;
  font-size: 9px;
  letter-spacing: .16em;
  color: rgba(200,196,184,0.25);
  z-index: 2;
}

.panel-body {
  height: 100%;
  padding: 42px 14px 14px;
  overflow: auto;
}

.phi-core {
  height: calc(100% - 54px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.phi-big {
  font-family: var(--disp);
  font-size: 54px;
  font-weight: 700;
  letter-spacing: -0.06em;
}

.phi-eq {
  font-size: 10px;
  color: var(--muted);
}

.phi-regime {
  font-size: 10px;
  letter-spacing: .2em;
  text-transform: uppercase;
}

.phi-vars {
  display: flex;
  gap: 12px;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(200,169,81,0.08);
  font-size: 12px;
}

.metric-row span {
  color: var(--muted);
}

.metric-row strong {
  color: var(--gold);
}

.json-box,
.result-box,
.asset-card pre,
.modal-content pre {
  width: 100%;
  max-height: 170px;
  overflow: auto;
  white-space: pre-wrap;
  font-size: 10px;
  line-height: 1.5;
  color: rgba(200,196,184,0.76);
  background: rgba(0,0,0,0.28);
  border: 1px solid rgba(200,169,81,0.08);
  padding: 10px;
}

.readiness {
  font-family: var(--disp);
  font-size: 26px;
  margin-bottom: 16px;
}

.field-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.field-line {
  height: 2px;
  background: var(--gold);
  box-shadow: 0 0 24px rgba(200,169,81,0.5);
  margin: 12px 0;
}

.field-line.secondary {
  background: var(--red);
  box-shadow: 0 0 24px rgba(184,80,80,0.35);
}

.amv-box {
  font-size: 13px;
  line-height: 1.65;
  color: rgba(200,196,184,0.82);
}

.amv-title {
  color: var(--gold);
  text-transform: uppercase;
  letter-spacing: .16em;
  font-size: 10px;
  margin-bottom: 10px;
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
}

.asset-card {
  border: 1px solid rgba(200,169,81,0.12);
  padding: 10px;
  background: rgba(0,0,0,0.22);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.asset-card img,
.asset-card video {
  width: 100%;
  max-height: 130px;
  object-fit: cover;
}

.asset-card audio {
  width: 100%;
}

.asset-card small {
  color: var(--muted);
}

.asset-card strong {
  color: var(--gold);
  font-size: 11px;
}

.empty {
  color: var(--muted);
  font-size: 12px;
}

label {
  display: block;
  margin: 10px 0 5px;
  color: var(--muted);
  font-size: 11px;
  letter-spacing: .08em;
  text-transform: uppercase;
}

label.inline {
  display: flex;
  align-items: center;
  gap: 8px;
}

input,
textarea,
select {
  width: 100%;
  background: rgba(0,0,0,0.36);
  border: 1px solid rgba(200,169,81,0.18);
  color: var(--text);
  padding: 8px;
  font-family: var(--mono);
  font-size: 12px;
  outline: none;
}

input:focus,
textarea:focus {
  border-color: rgba(200,169,81,0.45);
}

.checkbox-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 12px 0;
}

.checkbox-row label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  text-transform: none;
}

.checkbox-row input,
.inline input {
  width: auto;
}

button {
  background: rgba(200,169,81,0.08);
  border: 1px solid rgba(200,169,81,0.4);
  color: var(--gold);
  padding: 8px 12px;
  font-family: var(--mono);
  cursor: pointer;
}

button:disabled {
  opacity: .35;
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  background: rgba(200,169,81,0.16);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.82);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  width: min(720px, 92vw);
  max-height: 86vh;
  overflow: auto;
  background: var(--surface);
  border: 1px solid rgba(200,169,81,0.38);
  padding: 24px;
  font-size: 13px;
  line-height: 1.65;
  box-shadow: 0 0 80px rgba(0,0,0,0.75);
}

.modal-content h3 {
  margin-top: 0;
  color: var(--gold);
  letter-spacing: .12em;
  text-transform: uppercase;
}

.modal-close {
  float: right;
  padding: 4px 8px;
}
`;
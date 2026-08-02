'use client';

import type { CSSProperties, ReactNode } from 'react';
import { Pause, Play, Repeat, ZoomIn, ZoomOut } from 'lucide-react';
import type { MetricValue, StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import { useStudioWorkspaceStore } from '@/stores/studioWorkspaceStore';
import { StudioWaveform } from './StudioWaveform';
import { formatMetricValue, metricAvailability, metricByKey, statusClass } from './workspaceModel';
import { ALL_STUDIO_LAYERS, type StudioLayerId } from '@/stores/studioWorkspaceStore';
import { StudioOperationalDeck } from './StudioOperationalDeck';

const acousticKeys = [
  ['RMS', 'rms_dbfs'],
  ['PEAK', 'peak_dbfs'],
  ['HEADROOM', 'headroom_db'],
  ['PEAK AMP', 'peak_amplitude'],
  ['DYNAMIC RANGE', 'dynamic_range_db'],
  ['CREST FACTOR', 'crest_factor_db'],
  ['SPECTRAL CENTROID', 'spectral_centroid_hz'],
  ['SPECTRAL ROLLOFF', 'spectral_rolloff_hz'],
  ['SPECTRAL BANDWIDTH', 'spectral_bandwidth_hz'],
  ['SPECTRAL FLUX', 'spectral_flux'],
  ['NOISE FLOOR', 'noise_floor_dbfs'],
  ['ZCR', 'zero_crossing_rate_spectral'],
  ['TRANSIENT DENSITY', 'transient_density'],
  ['PERCUSSIVE LOAD', 'percussive_load'],
  ['STEREO WIDTH', 'stereo_width'],
  ['PHASE CORRELATION', 'phase_correlation'],
  ['MID ENERGY', 'mid_energy'],
  ['SIDE ENERGY', 'side_energy'],
  ['CLIPPING RISK', 'clipping_risk'],
] as const;

const listeningKeys = [
  ['CENTER', 'key_estimate'],
  ['FIELD (HZ)', 'fundamental_frequency_hz'],
  ['DRIFT', 'tuning_offset_cents'],
  ['MEMORY', 'harmonic_stability'],
  ['POLARITY', 'tonal_ambiguity'],
  ['TEMPO (BPM)', 'tempo_global_bpm'],
] as const;

const layerLabels: Record<StudioLayerId, string> = {
  WAVEFORM: 'WAVEFORM',
  MOMENTARY_LUFS: 'MOMENTARY',
  SHORT_TERM_LUFS: 'SHORT TERM',
  TRUE_PEAK_EVENTS: 'TRUE PEAK',
  RMS: 'RMS',
  SPECTRAL_CENTROID: 'CENTROID',
  TRANSIENTS: 'TRANSIENTS',
  ONSETS: 'ONSETS',
  BEATS: 'BEATS',
  TEMPO: 'TEMPO',
  PITCH: 'PITCH',
  CHROMA: 'CHROMA',
  HARMONIC_CHANGES: 'HARMONY',
  SEGMENTS: 'SEGMENTS',
  EVIDENCE: 'EVIDENCE',
  PHENOMENA: 'PHENOMENA',
  ANNOTATIONS: 'ANNOTATIONS',
};

function metric(state: StudioProductionState, key: string) {
  return metricByKey(state, key);
}

function numericMetric(state: StudioProductionState, key: string) {
  const value = metric(state, key)?.value;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function textValue(value: unknown) {
  if (value === null || value === undefined || value === '') return 'NO_VALUE';
  if (typeof value === 'number') return Number(value.toFixed(3)).toString();
  return String(value);
}

function metricDisplay(item: MetricValue | null) {
  return item ? formatMetricValue(item) : 'MISSING';
}

function bytes(value: number | null) {
  if (!value || !Number.isFinite(value)) return 'NO_VALUE';
  const mb = value / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

function reportCode(state: StudioProductionState) {
  const title = state.activeObject.title || 'STUDIO OBJECT';
  const token = title.split(/\s+/).find(Boolean) ?? 'STUDIO';
  return token.replace(/[^a-z0-9_-]/gi, '').toUpperCase() || 'STUDIO';
}

function ReportPanel({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`studio-report-panel ${className}`} aria-label={title}>
      <header><span>{title}</span></header>
      {children}
    </section>
  );
}

function MiniValue({ label, metric }: { label: string; metric: MetricValue | null }) {
  return (
    <div className={`studio-report-mini ${statusClass(metric?.status ?? 'MISSING')}`}>
      <span>{label}</span>
      <strong>{metricDisplay(metric)}</strong>
      <em>{metric?.status ?? 'MISSING'}</em>
    </div>
  );
}

function ObjectIdentity({ state }: { state: StudioProductionState }) {
  return (
    <ReportPanel title="OBJECT IDENTITY" className="studio-report-identity">
      <h1>{state.activeObject.title}</h1>
      <p>{state.activeObject.type.toUpperCase()} OBJECT - {(state.activeObject.mimeType ?? 'UNKNOWN_MIME').toUpperCase()}</p>
      <dl>
        <div><dt>NAME</dt><dd>{state.activeObject.title}</dd></div>
        <div><dt>TYPE</dt><dd>{state.activeObject.type}</dd></div>
        <div><dt>MIME</dt><dd>{state.activeObject.mimeType ?? 'NO_MIME'}</dd></div>
        <div><dt>SIZE</dt><dd>{bytes(state.activeObject.sizeBytes)}</dd></div>
        <div><dt>DURATION</dt><dd>{metricDisplay(metric(state, 'duration_seconds'))}</dd></div>
        <div><dt>SAMPLE RATE</dt><dd>{metricDisplay(metric(state, 'sample_rate_hz'))}</dd></div>
        <div><dt>CHANNELS</dt><dd>{metricDisplay(metric(state, 'channel_count'))}</dd></div>
        <div><dt>BIT DEPTH</dt><dd>{metricDisplay(metric(state, 'bit_depth'))}</dd></div>
        <div><dt>VERSION TIMESTAMP</dt><dd>{state.activeObject.uploadedAt ?? state.generatedAt}</dd></div>
      </dl>
    </ReportPanel>
  );
}

function ReportHeader({ state }: { state: StudioProductionState }) {
  return (
    <header className="studio-report-top">
      <div>
        <strong>{reportCode(state)} OBJECT REPORT</strong>
        <span>PAYLOAD_SCHEMA: STUDIO_OBJECT_REAL_V1</span>
      </div>
      <span>GENERATED: {state.generatedAt}</span>
      <span>SESSION ID: {state.session.id ?? 'NO_SESSION'}</span>
    </header>
  );
}

function WaveformReport({ state }: { state: StudioProductionState }) {
  const isPlaying = useStudioWorkspaceStore((store) => store.isPlaying);
  const setPlaying = useStudioWorkspaceStore((store) => store.setPlaying);
  const zoom = useStudioWorkspaceStore((store) => store.zoom);
  const setZoom = useStudioWorkspaceStore((store) => store.setZoom);
  const loopEnabled = useStudioWorkspaceStore((store) => store.loopEnabled);
  const toggleLoop = useStudioWorkspaceStore((store) => store.toggleLoop);
  const selection = useStudioWorkspaceStore((store) => store.selection);
  const toggleLayer = useStudioWorkspaceStore((store) => store.toggleLayer);
  const activeLayers = useStudioWorkspaceStore((store) => store.activeLayers);
  const truePeak = metric(state, 'true_peak_dbtp');
  const tempo = metric(state, 'tempo_global_bpm');
  const zoomMode = zoom < 2.2 ? 'OVERVIEW' : zoom < 6 ? 'ANALYSIS' : 'MICRO';
  return (
    <ReportPanel title={`WAVEFORM OVERVIEW (${state.audioFeatures.waveform.length} BINS)`} className="studio-report-waveform-panel">
      <div className="studio-report-waveform-toolbar">
        <button type="button" onClick={() => setPlaying(!isPlaying)} aria-label={isPlaying ? 'Pause audio' : 'Play audio'}>
          {isPlaying ? <Pause size={14} aria-hidden /> : <Play size={14} aria-hidden />}
        </button>
        <button type="button" onClick={toggleLoop} aria-label="Toggle loop" aria-pressed={loopEnabled}><Repeat size={14} aria-hidden /></button>
        <button type="button" onClick={() => setZoom(zoom - 1)} aria-label="Zoom out"><ZoomOut size={14} aria-hidden /></button>
        <button type="button" onClick={() => setZoom(zoom + 1)} aria-label="Zoom in"><ZoomIn size={14} aria-hidden /></button>
        <span>{zoomMode} / {zoom.toFixed(1)}X</span>
        <span>{selection ? `${selection.startSeconds.toFixed(2)}S-${selection.endSeconds.toFixed(2)}S` : 'NO RANGE SELECTED'}</span>
        <span>TEMPO {metricDisplay(tempo)}</span>
      </div>
      <StudioWaveform state={state} />
      <div className="studio-report-event-lane" aria-label="Real evidence anchors">
        {state.evidence.slice(0, 36).map((item) => <span key={item.id} title={`${item.label} / ${item.source}`} />)}
      </div>
      {typeof truePeak?.value === 'number' && truePeak.value > 0 ? (
        <div className="studio-report-alert">TRANSICION INESTABLE / TRUE PEAK {metricDisplay(truePeak)} / {truePeak.warnings[0] ?? 'PEAK_EVENT'}</div>
      ) : null}
      <div className="studio-report-layer-strip">
        {ALL_STUDIO_LAYERS.map((layer) => {
          const availability = metricAvailability(state, layer);
          const active = activeLayers.includes(layer);
          return (
            <button key={layer} type="button" className={`${active ? 'is-active' : ''} ${statusClass(availability)}`} onClick={() => toggleLayer(layer)} aria-pressed={active}>
              <span>{layerLabels[layer]}</span>
              <em>{availability}</em>
            </button>
          );
        })}
      </div>
    </ReportPanel>
  );
}

function AcousticProfile({ state }: { state: StudioProductionState }) {
  const low = numericMetric(state, 'tonal_balance_low');
  const mid = numericMetric(state, 'tonal_balance_mid');
  const high = numericMetric(state, 'tonal_balance_high');
  const tonalBands: Array<[string, number | null]> = [
    ['LOW (<250 Hz)', low],
    ['MID (250 Hz - 4 kHz)', mid],
    ['HIGH (>4 kHz)', high],
  ];
  return (
    <ReportPanel title="ACOUSTIC PROFILE" className="studio-report-acoustics">
      <div className="studio-report-metric-grid">
        {acousticKeys.map(([label, key]) => <MiniValue key={key} label={label} metric={metric(state, key)} />)}
      </div>
      <div className="studio-report-tonal-bars">
        {tonalBands.map(([label, value]) => (
          <div key={String(label)}>
            <span>{label}</span>
            <strong>{value === null ? 'NO_VALUE' : value.toFixed(3)}</strong>
            <i style={{ '--value': String(value ?? 0) } as CSSProperties} />
          </div>
        ))}
      </div>
    </ReportPanel>
  );
}

function IdentitySeal({ state }: { state: StudioProductionState }) {
  const vector = numericMetric(state, 'cultural_resonance') ?? state.mihmReport.score ?? numericMetric(state, 'harmonic_stability');
  const normalized = Math.max(0, Math.min(1, vector ?? 0));
  const nodes = ['N01', 'N02', 'N03', 'N04', 'N05'];
  return (
    <ReportPanel title="SYSTEM OF EMERGENT IDENTITY" className="studio-report-seal">
      <svg className="studio-report-glyph" viewBox="0 0 128 128" role="img" aria-label="KXTXR identity geometry">
        <polygon points="64,10 112,38 112,90 64,118 16,90 16,38" />
        <polygon points="64,25 96,44 96,84 64,103 32,84 32,44" />
        <line x1="64" y1="10" x2="64" y2="118" />
        <line x1="16" y1="38" x2="112" y2="90" />
        <line x1="112" y1="38" x2="16" y2="90" />
        <circle cx="64" cy="64" r={8 + normalized * 8} />
      </svg>
      <strong>{reportCode(state)}</strong>
      <span>VECTOR CULTURAL</span>
      <b>{vector === null ? 'NO_VALUE' : vector.toFixed(4)}</b>
      <svg className="studio-report-compass" viewBox="0 0 320 320" role="img" aria-label="Cultural vector radar">
        {[44, 82, 120, 158].map((radius) => <circle key={radius} cx="160" cy="160" r={radius} />)}
        {Array.from({ length: 10 }, (_, index) => {
          const angle = (index * 36 - 90) * Math.PI / 180;
          return <line key={index} x1="160" y1="160" x2={160 + Math.cos(angle) * 150} y2={160 + Math.sin(angle) * 150} />;
        })}
        <polyline points={nodes.map((_, index) => {
          const angle = (index * 72 - 90) * Math.PI / 180;
          const radius = 58 + normalized * 82 * (0.72 + index * 0.05);
          return `${160 + Math.cos(angle) * radius},${160 + Math.sin(angle) * radius}`;
        }).join(' ')} />
        <circle cx="160" cy="160" r="10" />
        {nodes.map((node, index) => {
          const angle = (index * 72 - 90) * Math.PI / 180;
          return <text key={node} x={160 + Math.cos(angle) * 132} y={160 + Math.sin(angle) * 132}>{node}</text>;
        })}
      </svg>
    </ReportPanel>
  );
}

function ListeningReference({ state }: { state: StudioProductionState }) {
  return (
    <ReportPanel title="LISTENING REFERENCE" className="studio-report-listening">
      <dl>
        {listeningKeys.map(([label, key]) => <div key={key}><dt>{label}</dt><dd>{metricDisplay(metric(state, key))}</dd></div>)}
      </dl>
    </ReportPanel>
  );
}

function MihmVector({ state }: { state: StudioProductionState }) {
  const values = [
    ['ACTIVATION SCORE', state.mihmReport.score],
    ['COVERAGE', numericMetric(state, 'feature_coverage')],
    ['CORE MIHM', state.mihmReport.systemic],
    ['CULTURAL RESONANCE', numericMetric(state, 'cultural_resonance')],
  ];
  const missing = ['D_cog', 'E_r', 'V_i', 'R_sem', 'C_sem']
    .map((key) => `${key}:${metric(state, key)?.status ?? 'MISSING'}`)
    .filter((item) => item.includes(':MISSING') || item.includes(':REQUIRES') || item.includes(':NOT_APPLICABLE') || item.includes(':CALIBRATION_REQUIRED'));
  return (
    <ReportPanel title="MIHM - PHASE 1 VECTOR" className="studio-report-mihm">
      <div className="studio-report-radar">
        {Array.from({ length: 6 }, (_, index) => <i key={index} style={{ '--a': `${index * 60}deg` } as CSSProperties} />)}
        <b />
      </div>
      <dl>
        {values.map(([label, value]) => <div key={String(label)}><dt>{label}</dt><dd>{typeof value === 'number' ? value.toFixed(3) : 'NO_VALUE'}</dd></div>)}
      </dl>
      <p>MISSING VARIABLES: {missing.length ? missing.join(', ') : 'NONE'}</p>
    </ReportPanel>
  );
}

function FieldProjection({ state }: { state: StudioProductionState }) {
  const nodes = state.fieldGraph.nodes.slice(0, 24);
  return (
    <ReportPanel title="FIELD CONTEXT PROJECTION" className="studio-report-field">
      <dl>
        <div><dt>WORLD REGIME</dt><dd>{state.systemState.toUpperCase()}</dd></div>
        <div><dt>DOMINANT VECTOR</dt><dd>{metricDisplay(metric(state, 'key_estimate'))}</dd></div>
        <div><dt>DENSITY</dt><dd>{state.fieldGraph.nodes.length}</dd></div>
        <div><dt>CROSS-VECTOR TENSIONS</dt><dd>{state.fieldGraph.edges.length}</dd></div>
        <div><dt>ACCEPTANCE STATUS</dt><dd>{metric(state, 'E_r')?.status ?? 'REQUIRES_FIELD_EVIDENCE'}</dd></div>
      </dl>
      <div className="studio-report-orbit" aria-label="Field graph projection">
        {nodes.map((node, index) => (
          <span key={node.id} style={{ '--a': `${index * (360 / Math.max(1, nodes.length))}deg`, '--r': `${28 + node.confidence * 78}px` } as CSSProperties} title={`${node.label} / ${node.status}`} />
        ))}
      </div>
    </ReportPanel>
  );
}

function RoutingGuardrails({ state }: { state: StudioProductionState }) {
  const routeMetric = metric(state, 'tempo_global_bpm');
  const guardrails = [
    ['DURATION', metricDisplay(metric(state, 'duration_seconds'))],
    ['DYNAMIC RANGE', metricDisplay(metric(state, 'dynamic_range_db'))],
    ['SPECTRAL CENTROID', metricDisplay(metric(state, 'spectral_centroid_hz'))],
    ['CLIPPING RISK', metricDisplay(metric(state, 'clipping_risk'))],
    ['D_cog STATUS', metric(state, 'D_cog')?.status ?? 'CALIBRATION_REQUIRED'],
  ];
  return (
    <ReportPanel title="STRATEGIC ROUTING & GUARDRAILS" className="studio-report-routing">
      <div>
        <strong>SELECTED ROUTE</strong>
        <p>{state.nextAction.code}: {state.nextAction.action}</p>
        <em>{state.nextAction.reason}</em>
        <small>{routeMetric ? `tempo reference ${metricDisplay(routeMetric)}` : 'NO_TEMPO_REFERENCE'}</small>
      </div>
      <dl>
        {guardrails.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
    </ReportPanel>
  );
}

function SemanticSeed({ state }: { state: StudioProductionState }) {
  const key = metric(state, 'key_estimate');
  const chord = metric(state, 'chord_hypothesis');
  const seed = [key?.value, chord?.value].filter(Boolean).join(' - ');
  return (
    <ReportPanel title="SEMANTIC SEED & LISTENING REFERENCE" className="studio-report-seed">
      <p>DERIVED FROM: {state.evidence[0]?.source ?? 'NO_EVIDENCE_SOURCE'}</p>
      <p>SEED NOTES: {seed || 'NO_DEFENSIBLE_SEED'}</p>
      <div className="studio-report-staff" aria-label="Tonal reference line">
        {(seed || 'NO SEED').split(/\s+/).slice(0, 6).map((note, index) => <span key={`${note}-${index}`} style={{ '--x': `${10 + index * 16}%`, '--y': `${20 + (index % 3) * 18}%` } as CSSProperties}>{note}</span>)}
      </div>
    </ReportPanel>
  );
}

function AxiomsAndClosure({ state }: { state: StudioProductionState }) {
  const actions = [
    state.nextAction.action,
    state.nextAction.requirement ?? null,
    state.nextAction.disabledReason ?? null,
  ].filter(Boolean);
  return (
    <>
      <ReportPanel title="FOUNDING AXIOMS ACTIVATED" className="studio-report-axioms">
        {state.provenance.derivedFrom.slice(0, 3).map((item, index) => <p key={item}>AXIOMA {String(index + 1).padStart(2, '0')} / {item}</p>)}
        {!state.provenance.derivedFrom.length ? <p>NO_AXIOMS_RECONSTRUCTED</p> : null}
      </ReportPanel>
      <ReportPanel title="NEXT REQUIRED ACTIONS FOR CLOSURE" className="studio-report-actions">
        <strong>STATUS: {state.nextAction.disabledReason ? 'BLOCKED' : state.nextAction.code}</strong>
        {actions.length ? actions.map((item) => <label key={item}><input type="checkbox" readOnly /> {item}</label>) : <span>NO_ACTIONS_DECLARED</span>}
      </ReportPanel>
    </>
  );
}

function SystemTrace({ state }: { state: StudioProductionState }) {
  const coverage = numericMetric(state, 'feature_coverage');
  const evidenceCoverage = state.evidence.length;
  return (
    <ReportPanel title="SYSTEM TRACE" className="studio-report-trace">
      <dl>
        <div><dt>TRACE ID</dt><dd>{state.evidence[0]?.id ?? state.session.id ?? 'NO_TRACE'}</dd></div>
        <div><dt>HEALTH STATUS</dt><dd>{state.systemState.toUpperCase()}</dd></div>
        <div><dt>FEATURE COVERAGE</dt><dd>{coverage === null ? 'NO_VALUE' : `${(coverage * 100).toFixed(1)}%`}</dd></div>
        <div><dt>EVIDENCE COVERAGE</dt><dd>{evidenceCoverage}</dd></div>
        <div><dt>MAX CONFIDENCE</dt><dd>{Math.max(0, ...state.metricValues.map((item) => item.confidence)).toFixed(3)}</dd></div>
      </dl>
      <div className="studio-report-seal-mini">SFI</div>
    </ReportPanel>
  );
}

export function StudioObjectReport({ state }: { state: StudioProductionState }) {
  const report = (
    <div className="studio-report-grid">
      <div className="studio-report-left"><ObjectIdentity state={state} /></div>
      <div className="studio-report-center"><WaveformReport state={state} /></div>
      <div className="studio-report-right">
        <IdentitySeal state={state} />
        <ListeningReference state={state} />
      </div>
      <div className="studio-report-acoustic-row"><AcousticProfile state={state} /></div>
      <MihmVector state={state} />
      <FieldProjection state={state} />
      <RoutingGuardrails state={state} />
      <SemanticSeed state={state} />
      <AxiomsAndClosure state={state} />
      <SystemTrace state={state} />
    </div>
  );
  return (
    <main className="studio-report">
      <ReportHeader state={state} />
      <StudioOperationalDeck state={state} report={report} />
    </main>
  );
}

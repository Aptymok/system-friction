'use client';

import { useMemo, useState } from 'react';
import { useEffect } from 'react';
import type { SfiAsset } from '@/lib/types';
import { inferOperationalReading, type OperationalReading } from '@/lib/sfi/inference';

type LayerName = 'MUNDO' | 'REDES' | 'PROYECTO' | 'USUARIO';

const phases = ['SEÑAL', 'ANÁLISIS', 'INTERVENCIÓN', 'SEGUIMIENTO', 'EJECUCIÓN'];

type CalendarWindow = {
  label: string;
  starts_at: string;
  ends_at: string;
  execution_bias: string;
  risk: string;
  recommended_action: string;
};

type MediaDraft = {
  id: string;
  platform_target: string;
  content: string;
  status: string;
  created_at: string;
};

type OperationalLoopState = {
  amv: string;
  amvConfidence: number | null;
  bitacora: string;
  calendar: CalendarWindow[];
  drafts: MediaDraft[];
  social: string;
  loading: boolean;
  error: string;
};

function textFromRecord(record: Record<string, unknown> | undefined, key: string) {
  const value = record?.[key];
  return typeof value === 'string' ? value : '';
}

function numberFromRecord(record: Record<string, unknown> | undefined, key: string) {
  const value = record?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readingFromAsset(asset?: SfiAsset | null): OperationalReading {
  const metadataReading = asset?.metadata?.operational_reading as OperationalReading | undefined;
  if (metadataReading?.phenomenon) return metadataReading;

  const signal = textFromRecord(asset?.objective, 'observed_signal') || textFromRecord(asset?.objective, 'declaration') || textFromRecord(asset?.target_system, 'name');
  return inferOperationalReading({
    kind: (textFromRecord(asset?.metadata, 'signal_kind') as Parameters<typeof inferOperationalReading>[0]['kind']) || 'proyecto',
    signal: signal || 'Señal persistente sin contenido visible.',
    evidenceLabel: textFromRecord(asset?.metadata, 'evidence_name'),
  });
}

function assetName(asset?: SfiAsset | null) {
  return textFromRecord(asset?.target_system, 'name') || asset?.asset_id || 'Señal sin nombre';
}

function toneFor(value: number) {
  if (value > 0.68) return 'high';
  if (value > 0.38) return 'mid';
  return 'low';
}

function PulseField({ layers }: { layers: OperationalReading['pressureLayers'] }) {
  const layerMap = layers.reduce<Record<LayerName, number>>((acc, item) => {
    acc[item.layer] = item.pressure;
    return acc;
  }, { MUNDO: 0.2, REDES: 0.2, PROYECTO: 0.2, USUARIO: 0.2 });

  return (
    <div className="live-field" aria-label="Campo vivo de presion operacional">
      {(['MUNDO', 'REDES', 'PROYECTO', 'USUARIO'] as LayerName[]).map((layer, index) => {
        const pressure = layerMap[layer] ?? 0.2;
        return (
          <div
            key={layer}
            className={`pulse-orbit ${toneFor(pressure)}`}
            style={{
              ['--scale' as string]: String(0.55 + pressure * 0.9),
              ['--delay' as string]: `${index * 0.35}s`,
              ['--offset' as string]: `${index * 18}px`,
            }}
          >
            <span>{layer}</span>
          </div>
        );
      })}
      <div className="field-core" />
    </div>
  );
}

function ReadingBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="reading-block">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function TechnicalDisclosure({ reading }: { reading: OperationalReading }) {
  return (
    <details className="technical">
      <summary>Expandible técnico</summary>
      <div>
        <span>Φ_SF {reading.technical.PHI_SF.toFixed(3)}</span>
        <span>IHG {reading.technical.IHG.toFixed(3)}</span>
        <span>NTI {reading.technical.NTI_obs.toFixed(3)}</span>
        <span>LDI {reading.technical.LDI_hours}h</span>
      </div>
    </details>
  );
}

function LoopSurface({
  asset,
  nodeId,
  reading,
}: {
  asset?: SfiAsset | null;
  nodeId?: string | null;
  reading: OperationalReading;
}) {
  const [state, setState] = useState<OperationalLoopState>({
    amv: 'AMV interno en espera de señal activa.',
    amvConfidence: null,
    bitacora: 'Bitácora emergente pendiente.',
    calendar: [],
    drafts: [],
    social: 'Campo social sin retorno registrado.',
    loading: false,
    error: '',
  });

  const assetId = asset?.asset_id || null;
  const context = useMemo(() => ({
    entity: assetName(asset),
    phenomenon: reading.phenomenon,
    anomalies: [reading.risk.label, reading.latency.label],
    ihg: reading.technical.IHG,
    nti: reading.technical.NTI_obs,
    ldi: reading.technical.LDI_hours / 72,
    xi: reading.technical.xi_noise,
    phi: reading.technical.PHI_SF,
    regime: reading.technical.regime,
  }), [asset, reading]);

  const refreshLoop = async () => {
    if (!nodeId) {
      setState((current) => ({ ...current, error: 'sin nodo activo para loop operacional' }));
      return;
    }

    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const [amvRes, bitacoraRes, calendarRes, draftsRes] = await Promise.all([
        fetch('/api/liturgia/amv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            node_id: nodeId,
            session_id: assetId || undefined,
            message: `Leer asset activo y sostener presencia operacional: ${reading.nextAction}`,
            context,
          }),
        }),
        fetch('/api/bitacora/regenerate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ node_id: nodeId, mode: 'operational', asset_id: assetId }),
        }),
        fetch('/api/calendar/phenomenological', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ node_id: nodeId, horizon_days: 7, asset_id: assetId }),
        }),
        fetch(`/api/media/drafts?node_id=${encodeURIComponent(nodeId)}`, { cache: 'no-store' }),
      ]);

      const [amv, bitacora, calendar, drafts] = await Promise.all([
        amvRes.json().catch(() => null),
        bitacoraRes.json().catch(() => null),
        calendarRes.json().catch(() => null),
        draftsRes.json().catch(() => null),
      ]);

      setState((current) => ({
        ...current,
        amv: amv?.message || current.amv,
        amvConfidence: typeof amv?.reading?.confidence === 'number' ? amv.reading.confidence : current.amvConfidence,
        bitacora: bitacora?.fragment || current.bitacora,
        calendar: Array.isArray(calendar?.windows) ? calendar.windows : current.calendar,
        drafts: Array.isArray(drafts?.drafts) ? drafts.drafts : current.drafts,
        loading: false,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : 'loop_operational_failed',
      }));
    }
  };

  const createDraft = async () => {
    if (!nodeId) return;
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const res = await fetch('/api/media/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node_id: nodeId,
          source_type: 'sfi_asset',
          source_id: null,
          platform_target: 'field',
          content: `${reading.phenomenon}\n\n${reading.intervention}\n\n${reading.nextAction}`,
          metadata: { asset_id: assetId, operational_reading: reading },
        }),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok) throw new Error(result?.error || 'draft_create_failed');
      await refreshLoop();
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : 'draft_create_failed' }));
    }
  };

  const regeneratePublicFragment = async () => {
    if (!nodeId) return;
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const res = await fetch('/api/bitacora/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node_id: nodeId, mode: 'public_fragment', asset_id: assetId }),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok) throw new Error(result?.error || 'bitacora_public_failed');
      await refreshLoop();
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : 'bitacora_public_failed' }));
    }
  };

  const ingestResonance = async () => {
    if (!nodeId) return;
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const score = Number((reading.risk.score * 0.4 + reading.traceability.score * 0.6).toFixed(2));
      const res = await fetch('/api/social/resonance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node_id: nodeId,
          platform: 'field',
          resonance_score: score,
          comments_summary: `Retorno interno del asset ${assetId || 'activo'}: ${reading.continuity}`,
          raw_payload: { asset_id: assetId, risk: reading.risk, traceability: reading.traceability },
        }),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok) throw new Error(result?.error || 'social_resonance_failed');
      setState((current) => ({
        ...current,
        loading: false,
        social: `Resonancia registrada · score ${score.toFixed(2)} · ${reading.continuity}`,
      }));
      await refreshLoop();
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : 'social_resonance_failed' }));
    }
  };

  useEffect(() => {
    void refreshLoop();
  }, [nodeId, assetId]);

  return (
    <div className="loop-surface">
      <div className="loop-grid">
        <div className="loop-cell">
          <p>AMV Presence</p>
          <span>{state.amv}</span>
          {state.amvConfidence !== null && <small>confianza interna {state.amvConfidence.toFixed(2)}</small>}
        </div>
        <div className="loop-cell">
          <p>Bitácora emergente</p>
          <span>{state.bitacora}</span>
        </div>
        <div className="loop-cell">
          <p>Calendar Surface</p>
          {state.calendar.length ? state.calendar.slice(0, 2).map((window) => (
            <span key={`${window.starts_at}-${window.label}`}>
              {window.label} · {new Date(window.starts_at).toLocaleString('es-MX')} · {window.recommended_action}
            </span>
          )) : <span>Sin ventana calculada.</span>}
        </div>
        <div className="loop-cell">
          <p>Media Room</p>
          {state.drafts.length ? state.drafts.slice(0, 2).map((draft) => (
            <span key={draft.id}>{draft.status} · {draft.platform_target} · {draft.content.slice(0, 110)}</span>
          )) : <span>Sin borradores pendientes.</span>}
        </div>
        <div className="loop-cell wide">
          <p>Social Field</p>
          <span>{state.social}</span>
        </div>
      </div>
      <div className="loop-actions">
        <button type="button" onClick={refreshLoop} disabled={state.loading}>actualizar loop</button>
        <button type="button" onClick={regeneratePublicFragment} disabled={state.loading || !nodeId}>fragmento público</button>
        <button type="button" onClick={createDraft} disabled={state.loading || !nodeId}>crear residuo</button>
        <button type="button" onClick={ingestResonance} disabled={state.loading || !nodeId}>registrar resonancia</button>
      </div>
      {state.error && <p className="loop-error">{state.error}</p>}
    </div>
  );
}

function Seguimiento({ reading, asset }: { reading: OperationalReading; asset?: SfiAsset | null }) {
  const logbook = asset?.logbook || [];
  const entries = logbook.length
    ? logbook.slice(0, 5).map((entry) => ({
        time: entry.created_at,
        text: entry.event_type === 'MEASUREMENT_CREATED'
          ? `Cambio detectado · ${reading.risk.label} · ajuste sugerido: ${reading.nextAction}`
          : `Impacto observado · ${entry.event_type.toLowerCase().replace(/_/g, ' ')}`,
      }))
    : [
        { time: asset?.created_at || new Date().toISOString(), text: `Cambio detectado · ${reading.risk.label} · ${reading.intervention}` },
        { time: new Date().toISOString(), text: `Ajuste sugerido · ${reading.nextAction}` },
      ];

  return (
    <div className="timeline">
      {entries.map((entry, index) => (
        <div key={`${entry.time}-${index}`}>
          <time>{new Date(entry.time).toLocaleString('es-MX')}</time>
          <p>{entry.text}</p>
        </div>
      ))}
    </div>
  );
}

export function LiturgiaDiagnosticPanel({ asset, nodeId }: { asset?: SfiAsset | null; nodeId?: string | null }) {
  const [active, setActive] = useState(0);
  const reading = useMemo(() => readingFromAsset(asset), [asset]);
  const signalKind = textFromRecord(asset?.metadata, 'signal_kind');
  const sourceSignal = textFromRecord(asset?.objective, 'observed_signal') || textFromRecord(asset?.objective, 'declaration');
  const evidence = textFromRecord(asset?.metadata, 'evidence_name');
  const evalAssetActive = Boolean(asset?.metadata?.eval_asset_active);
  const layerNotes = reading.pressureLayers.map((item) => `${item.layer}: ${item.note}`).join(' · ');
  const currentPhase = asset?.current_phase || 'SIGNAL_ANALYZED';

  return (
    <section className="op-root" aria-label="Sistema operativo SFI">
      <nav className="op-nav">
        <div className="op-brand">SFI · OBSERVATORIO LONGITUDINAL</div>
        <div className="op-phases">
          {phases.map((phase, index) => (
            <button
              key={phase}
              type="button"
              className={active === index ? 'active' : active > index ? 'visited' : ''}
              onClick={() => setActive(index)}
            >
              <i />
              {phase}
            </button>
          ))}
        </div>
      </nav>

      <div className="op-atlas" style={{ transform: `translateX(-${active * 100}vw)` }}>
        <section className="op-panel p-signal">
          <p className="kicker">Entrada observada</p>
          <h2>SEÑAL</h2>
          <p className="subtitle">El sistema recibió una superficie de fricción. No requiere configuración manual.</p>
          <div className="signal-card">
            <span>{signalKind || 'señal'}</span>
            <h3>{assetName(asset)}</h3>
            <p>{sourceSignal || 'Señal persistida sin transcripción visible.'}</p>
            {evidence && <small>Evidencia adjunta: {evidence}</small>}
          </div>
          <ReadingBlock label="Fenómeno observado" value={reading.phenomenon} />
          <ReadingBlock label="Contexto de aplicación" value={reading.applicationContext} />
          <ReadingBlock label="Posición del observador" value={reading.observerPosition} />
        </section>

        <section className="op-panel p-analysis">
          <p className="kicker">Lectura operacional</p>
          <h2>ANÁLISIS</h2>
          <div className="reading-grid">
            <ReadingBlock label="Estabilidad operativa" value={`${reading.stability.label} · ${reading.stability.detail}`} />
            <ReadingBlock label="Trazabilidad" value={`${reading.traceability.label} · ${reading.traceability.detail}`} />
            <ReadingBlock label="Latencia" value={`${reading.latency.label} · ${reading.latency.detail}`} />
            <ReadingBlock label="Riesgo operativo" value={`${reading.risk.label} · ${reading.risk.detail}`} />
          </div>
          <PulseField layers={reading.pressureLayers} />
          <p className="continuity">{reading.continuity}</p>
          <TechnicalDisclosure reading={reading} />
        </section>

        <section className="op-panel p-intervention">
          <p className="kicker">Resolución mínima</p>
          <h2>INTERVENCIÓN</h2>
          <div className="intervention">
            <p>{reading.intervention}</p>
          </div>
          <div className="evidence">
            <p>Evidencia requerida</p>
            {reading.requiredEvidence.map((item) => <span key={item}>{item}</span>)}
          </div>
          {evalAssetActive && (
            <div className="social-reading">
              <p>SFI-EVAL-ASSET activo</p>
              <span>resonancia · saturación · coherencia narrativa · fricción perceptual</span>
            </div>
          )}
        </section>

        <section className="op-panel p-follow">
          <p className="kicker">Observación automática</p>
          <h2>SEGUIMIENTO DEL PROCESO</h2>
          <p className="subtitle">El sistema observará cambios y ajustará la intervención.</p>
          <Seguimiento reading={reading} asset={asset} />
          <LoopSurface asset={asset} nodeId={nodeId} reading={reading} />
          <div className="layer-line">{layerNotes}</div>
        </section>

        <section className="op-panel p-execution">
          <p className="kicker">Acción verificable</p>
          <h2>EJECUCIÓN</h2>
          <div className="next-action">
            <span>Siguiente acción</span>
            <p>{reading.nextAction}</p>
          </div>
          <div className="execution-state">
            <ReadingBlock label="fase persistente" value={currentPhase} />
            <ReadingBlock label="impacto esperado" value={reading.risk.label === 'Alto' ? 'reducción inmediata de latencia' : 'aumento de trazabilidad y continuidad'} />
          </div>
          <TechnicalDisclosure reading={reading} />
        </section>
      </div>

      <style jsx>{`
        .op-root {
          height: calc(100vh - 4.1rem);
          min-height: 720px;
          overflow: hidden;
          background: #060605;
          color: #c8c4b8;
          border-top: 1px solid rgba(200,169,81,0.08);
          font-family: var(--font-serif), Georgia, serif;
        }
        .op-nav {
          height: 2.7rem;
          display: flex;
          border-bottom: 1px solid rgba(200,169,81,0.08);
          background: rgba(6,6,5,0.98);
        }
        .op-brand {
          display: flex;
          align-items: center;
          padding: 0 1.2rem;
          border-right: 1px solid rgba(200,169,81,0.08);
          color: #C8A951;
          font-family: var(--font-mono), monospace;
          font-size: 0.48rem;
          letter-spacing: 0.26em;
          white-space: nowrap;
        }
        .op-phases {
          display: flex;
          flex: 1;
        }
        .op-phases button {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          border: 0;
          border-right: 1px solid rgba(200,169,81,0.05);
          background: transparent;
          color: #2e2e2a;
          font-family: var(--font-mono), monospace;
          font-size: 0.44rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          cursor: pointer;
        }
        .op-phases button.active { color: #C8A951; background: rgba(200,169,81,0.04); }
        .op-phases button.visited { color: #5c5c52; }
        .op-phases i {
          width: 5px;
          height: 5px;
          border-radius: 999px;
          border: 1px solid currentColor;
        }
        .op-atlas {
          display: flex;
          width: 500vw;
          height: calc(100% - 2.7rem);
          transition: transform 520ms ease;
        }
        .op-panel {
          width: 100vw;
          height: 100%;
          overflow-y: auto;
          padding: 2rem clamp(1.5rem, 4vw, 4rem);
          border-right: 1px solid rgba(200,169,81,0.06);
        }
        .p-signal { background: #050504; }
        .p-analysis { background: #070706; }
        .p-intervention { background: #090908; }
        .p-follow { background: #080807; }
        .p-execution { background: #0a0a09; }
        .kicker {
          margin: 0;
          color: #C8A951;
          opacity: 0.55;
          font-family: var(--font-mono), monospace;
          font-size: 0.5rem;
          letter-spacing: 0.34em;
          text-transform: uppercase;
        }
        h2 {
          margin: 0.7rem 0 0;
          color: #C8A951;
          font-family: var(--font-display), Syncopate, sans-serif;
          font-size: clamp(2rem, 6vw, 5rem);
          line-height: 0.9;
          letter-spacing: 0;
        }
        .subtitle {
          max-width: 46rem;
          color: #5c5c52;
          font-size: 1rem;
          line-height: 1.7;
          font-style: italic;
        }
        .signal-card, .reading-block, .intervention, .evidence, .social-reading, .next-action, .execution-state, .technical, .layer-line, .loop-cell {
          border: 1px solid rgba(200,169,81,0.08);
          background: rgba(0,0,0,0.26);
        }
        .signal-card {
          max-width: 62rem;
          margin: 1.6rem 0;
          padding: 1.2rem;
        }
        .signal-card span, .signal-card small, .reading-block p, .evidence p, .social-reading p, .next-action span, .technical summary {
          color: #2e2e2a;
          font-family: var(--font-mono), monospace;
          font-size: 0.48rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }
        .signal-card h3 {
          margin: 0.4rem 0;
          color: #C8A951;
          font-family: var(--font-mono), monospace;
          font-size: 0.9rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .signal-card p {
          max-height: 12rem;
          overflow: auto;
          color: #5c5c52;
          font-family: var(--font-mono), monospace;
          font-size: 0.72rem;
          line-height: 1.7;
          white-space: pre-wrap;
        }
        .reading-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.8rem;
          max-width: 64rem;
          margin-top: 1.6rem;
        }
        .reading-block {
          padding: 1rem;
        }
        .reading-block strong {
          display: block;
          margin-top: 0.35rem;
          color: #c8c4b8;
          font-size: 1rem;
          font-weight: 400;
          line-height: 1.65;
        }
        .live-field {
          position: relative;
          width: min(78vw, 620px);
          height: 260px;
          margin: 2rem 0;
          border: 1px solid rgba(200,169,81,0.05);
          background:
            radial-gradient(circle at 50% 50%, rgba(200,169,81,0.08), transparent 28%),
            repeating-linear-gradient(90deg, transparent, transparent 3.5rem, rgba(200,169,81,0.018) 3.6rem);
        }
        .pulse-orbit {
          position: absolute;
          left: calc(50% - 95px + var(--offset));
          top: 50%;
          width: 190px;
          height: 58px;
          transform: translate(-50%, -50%) scale(var(--scale));
          border: 1px solid rgba(200,169,81,0.16);
          border-radius: 50%;
          animation: pulse 3.8s ease-in-out infinite;
          animation-delay: var(--delay);
        }
        .pulse-orbit span {
          position: absolute;
          right: -0.8rem;
          top: -0.6rem;
          color: #5c5c52;
          font-family: var(--font-mono), monospace;
          font-size: 0.46rem;
          letter-spacing: 0.18em;
        }
        .pulse-orbit.high { border-color: rgba(184,80,80,0.38); }
        .pulse-orbit.mid { border-color: rgba(200,169,81,0.32); }
        .pulse-orbit.low { border-color: rgba(58,138,90,0.28); }
        .field-core {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 9px;
          height: 9px;
          transform: translate(-50%, -50%);
          border-radius: 999px;
          background: #C8A951;
          box-shadow: 0 0 22px rgba(200,169,81,0.3);
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.85; }
        }
        .continuity {
          max-width: 40rem;
          color: #C8A951;
          font-family: var(--font-mono), monospace;
          font-size: 0.72rem;
          letter-spacing: 0.08em;
        }
        .technical {
          max-width: 34rem;
          margin-top: 1.2rem;
          padding: 0.8rem 1rem;
          color: #5c5c52;
        }
        .technical div {
          display: flex;
          flex-wrap: wrap;
          gap: 0.8rem;
          margin-top: 0.8rem;
          font-family: var(--font-mono), monospace;
          font-size: 0.58rem;
          color: #C8A951;
        }
        .intervention, .next-action {
          max-width: 56rem;
          margin-top: 1.8rem;
          padding: 1.4rem;
        }
        .intervention p, .next-action p {
          margin: 0;
          color: #c8c4b8;
          font-size: 1.35rem;
          line-height: 1.5;
        }
        .evidence, .social-reading, .execution-state, .layer-line {
          max-width: 56rem;
          margin-top: 1rem;
          padding: 1rem;
        }
        .evidence span {
          display: inline-block;
          margin: 0.5rem 0.4rem 0 0;
          border: 1px solid rgba(200,169,81,0.14);
          padding: 0.35rem 0.55rem;
          color: #5c5c52;
          font-family: var(--font-mono), monospace;
          font-size: 0.54rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .social-reading span, .layer-line {
          color: #5c5c52;
          font-family: var(--font-mono), monospace;
          font-size: 0.62rem;
          line-height: 1.7;
          letter-spacing: 0.08em;
        }
        .timeline {
          max-width: 60rem;
          margin-top: 1.8rem;
        }
        .timeline div {
          display: grid;
          grid-template-columns: 12rem 1fr;
          gap: 1rem;
          border-bottom: 1px solid rgba(200,169,81,0.07);
          padding: 0.8rem 0;
        }
        .timeline time {
          color: rgba(200,169,81,0.42);
          font-family: var(--font-mono), monospace;
          font-size: 0.55rem;
        }
        .timeline p {
          margin: 0;
          color: #5c5c52;
          font-family: var(--font-mono), monospace;
          font-size: 0.7rem;
          line-height: 1.6;
        }
        .loop-surface {
          max-width: 76rem;
          margin-top: 1.4rem;
        }
        .loop-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.75rem;
        }
        .loop-cell {
          min-height: 8rem;
          padding: 1rem;
        }
        .loop-cell.wide {
          grid-column: 1 / -1;
          min-height: 5rem;
        }
        .loop-cell p {
          margin: 0 0 0.65rem;
          color: #2e2e2a;
          font-family: var(--font-mono), monospace;
          font-size: 0.48rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }
        .loop-cell span, .loop-cell small {
          display: block;
          margin-top: 0.35rem;
          color: #5c5c52;
          font-family: var(--font-mono), monospace;
          font-size: 0.66rem;
          line-height: 1.6;
        }
        .loop-cell small {
          color: rgba(200,169,81,0.45);
        }
        .loop-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
          margin-top: 0.75rem;
        }
        .loop-actions button {
          border: 1px solid rgba(200,169,81,0.18);
          background: rgba(200,169,81,0.04);
          color: #C8A951;
          padding: 0.55rem 0.8rem;
          font-family: var(--font-mono), monospace;
          font-size: 0.48rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          cursor: pointer;
        }
        .loop-actions button:disabled {
          opacity: 0.35;
          cursor: default;
        }
        .loop-error {
          border-left: 1px solid #b85050;
          background: rgba(184,80,80,0.08);
          padding: 0.7rem;
          color: #b85050;
          font-family: var(--font-mono), monospace;
          font-size: 0.62rem;
          letter-spacing: 0.08em;
        }
        .execution-state {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.8rem;
          border: 0;
          background: transparent;
          padding: 0;
        }
        @media (max-width: 900px) {
          .op-brand { display: none; }
          .op-phases button { font-size: 0.36rem; letter-spacing: 0.08em; }
          .reading-grid, .execution-state { grid-template-columns: 1fr; }
          .loop-grid { grid-template-columns: 1fr; }
          .loop-cell.wide { grid-column: auto; }
          .timeline div { grid-template-columns: 1fr; }
          h2 { font-size: 2.2rem; }
        }
      `}</style>
    </section>
  );
}

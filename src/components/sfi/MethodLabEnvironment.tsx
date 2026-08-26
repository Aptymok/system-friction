'use client';

import Link from 'next/link';
import { useState, type CSSProperties } from 'react';
import './MethodLabEnvironment.css';

type ProtocolView = { id: string; status: string };
type SessionView = { status: string };
type DecisionTransferView = { status: string; totalEvaluations: number };

type Props = {
  status: string;
  contractVersion: string;
  protocols: ProtocolView[];
  sessions: SessionView[];
  evidenceCount: number;
  evidenceWarningCount: number;
  researchObjectCount: number;
  researchWarningCount: number;
  decisionTransfer: DecisionTransferView;
};

type ZoneTone = 'ready' | 'attention' | 'gated' | 'degraded' | 'boundary' | 'idle';
type LabZoneId = 'method' | 'observatory' | 'signal' | 'tests' | 'root' | 'simulation' | 'field';
type LabZone = {
  id: LabZoneId;
  label: string;
  state: string;
  tone: ZoneTone;
  detail: string;
  target: string;
  desktop: [number, number];
  tablet: [number, number];
  mobile: [number, number];
};
type BoardMetric = { label: string; value: string | number; detail?: string };

function toneFromStatus(status: string, fallback: ZoneTone = 'attention'): ZoneTone {
  const normalized = status.toUpperCase();
  if (normalized.includes('DEGRADED') || normalized.includes('FAIL') || normalized.includes('ERROR')) return 'degraded';
  if (normalized.includes('GATED') || normalized.includes('BLOCK')) return 'gated';
  if (normalized.includes('OPERATIONAL') || normalized.includes('READY') || normalized.includes('PASS') || normalized.includes('OPEN')) return 'ready';
  if (normalized.includes('CLOSED') || normalized.includes('IDLE')) return 'idle';
  return fallback;
}

function zoneStyle(zone: LabZone) {
  return {
    '--mlenv-x-d': `${zone.desktop[0]}%`,
    '--mlenv-y-d': `${zone.desktop[1]}%`,
    '--mlenv-x-t': `${zone.tablet[0]}%`,
    '--mlenv-y-t': `${zone.tablet[1]}%`,
    '--mlenv-x-m': `${zone.mobile[0]}%`,
    '--mlenv-y-m': `${zone.mobile[1]}%`,
  } as CSSProperties;
}

export function MethodLabEnvironment({
  status,
  contractVersion,
  protocols,
  sessions,
  evidenceCount,
  evidenceWarningCount,
  researchObjectCount,
  researchWarningCount,
  decisionTransfer,
}: Props) {
  const [selectedId, setSelectedId] = useState<LabZoneId>('method');
  const operationalProtocols = protocols.filter((item) => item.status === 'OPERATIONAL').length;
  const simulationProtocols = protocols.filter((item) => ['sociotechnical_simulation', 'economic_simulation'].includes(item.id));
  const simulationOperational = simulationProtocols.filter((item) => item.status === 'OPERATIONAL').length;
  const activeSessions = sessions.filter((item) => !['CLOSED', 'REJECTED'].includes(item.status)).length;
  const reviewWarnings = evidenceWarningCount + researchWarningCount;

  const zones: LabZone[] = [
    {
      id: 'method', label: 'CÁMARA DE MÉTODO', state: `${operationalProtocols}/${protocols.length} OPERATIONAL`,
      tone: operationalProtocols > 0 ? 'ready' : 'gated',
      detail: 'Instrumentos, contratos y protocolos disponibles. La selección conserva clase epistémica, dependencias, validación y regla de promoción.',
      target: '.mlh-protocol-grid', desktop: [20, 7], tablet: [18, 28], mobile: [18, 31],
    },
    {
      id: 'observatory', label: 'OBSERVATORIO', state: `${researchObjectCount} RESEARCH OBJECTS`,
      tone: reviewWarnings > 0 ? 'attention' : researchObjectCount > 0 ? 'ready' : 'idle',
      detail: 'Objetos de investigación, findings, métricas, lineage y publication packages. Observar no equivale a promover.',
      target: '.mlr-shell', desktop: [52, 10], tablet: [53, 14], mobile: [50, 10],
    },
    {
      id: 'signal', label: 'LAB DE SEÑAL', state: evidenceWarningCount > 0 ? `${evidenceWarningCount} READER WARNINGS` : `${evidenceCount} EVIDENCE OPTIONS`,
      tone: evidenceWarningCount > 0 ? 'attention' : evidenceCount > 0 ? 'ready' : 'idle',
      detail: 'Entrada de evidencia persistida. Fuente, caso, claim boundary y provenance permanecen visibles antes del run.',
      target: '.mlh-evidence-list', desktop: [92, 12], tablet: [78, 22], mobile: [76, 25],
    },
    {
      id: 'tests', label: 'MESA DE PRUEBAS', state: activeSessions > 0 ? `${activeSessions} ACTIVE CRL` : `${sessions.length} CRL SESSIONS`,
      tone: activeSessions > 0 ? 'ready' : sessions.length > 0 ? 'idle' : 'gated',
      detail: 'CRL opera sesión → eventos → BLIND → lectura del fundador → contraste. La lectura del fundador entra después del BLIND.',
      target: '.mlh-three-col', desktop: [94, 39], tablet: [84, 49], mobile: [73, 49],
    },
    {
      id: 'root', label: 'ROOT CONSOLE', state: `DT ${decisionTransfer.status}`,
      tone: toneFromStatus(decisionTransfer.status),
      detail: 'Autoridad y Decision Transfer. El laboratorio puede producir resultados; canon, publicación y autoridad permanecen gobernados.',
      target: '.mlh-status-section', desktop: [46, 59], tablet: [21, 80], mobile: [50, 88],
    },
    {
      id: 'simulation', label: 'SIMULACIÓN', state: `${simulationOperational}/${simulationProtocols.length} RUNNERS OPERATIONAL`,
      tone: simulationOperational === simulationProtocols.length && simulationProtocols.length > 0 ? 'ready' : simulationOperational > 0 ? 'attention' : 'gated',
      detail: 'Runner sociotécnico/económico aislado. El output permanece SIMULATED y nunca se convierte en observación por persistencia.',
      target: '.mlh-two-col', desktop: [66, 67], tablet: [51, 82], mobile: [28, 72],
    },
    {
      id: 'field', label: 'NODO DE CAMPO', state: 'RETURN BOUNDARY', tone: 'boundary',
      detail: 'El laboratorio no declara mundo observado. Un RETURN de Field es otro estado, con evidencia y contraste propios.',
      target: '.mlh-status-section', desktop: [93, 71], tablet: [80, 80], mobile: [73, 73],
    },
  ];

  const selected = zones.find((zone) => zone.id === selectedId) ?? zones[0];

  const boardMetrics: Record<LabZoneId, BoardMetric[]> = {
    method: [
      { label: 'PROTOCOLS', value: protocols.length, detail: `${operationalProtocols} operational` },
      { label: 'CONTRACT', value: contractVersion },
      { label: 'LAB STATE', value: status },
    ],
    observatory: [
      { label: 'RESEARCH OBJECTS', value: researchObjectCount },
      { label: 'REVIEW WARNINGS', value: researchWarningCount },
      { label: 'BOUNDARY', value: 'OBSERVE ≠ PROMOTE' },
    ],
    signal: [
      { label: 'EVIDENCE OPTIONS', value: evidenceCount },
      { label: 'READER WARNINGS', value: evidenceWarningCount },
      { label: 'PERSISTENCE', value: 'CANONICAL WRITER' },
    ],
    tests: [
      { label: 'ACTIVE CRL', value: activeSessions },
      { label: 'TOTAL SESSIONS', value: sessions.length },
      { label: 'SEQUENCE', value: 'BLIND → CONTRAST' },
    ],
    root: [
      { label: 'DECISION TRANSFER', value: decisionTransfer.status },
      { label: 'EVALUATIONS', value: decisionTransfer.totalEvaluations },
      { label: 'CANON', value: 'ROOT ONLY' },
    ],
    simulation: [
      { label: 'SIM RUNNERS', value: `${simulationOperational}/${simulationProtocols.length}` },
      { label: 'EPISTEMIC CLASS', value: 'SIMULATED' },
      { label: 'OBSERVATION', value: 'SEPARATE' },
    ],
    field: [
      { label: 'SURFACE', value: 'FIELD' },
      { label: 'EXPECTED', value: 'OBSERVED RETURN' },
      { label: 'BOUNDARY', value: 'REALITY CONTRAST' },
    ],
  };

  function openZone(zone: LabZone) {
    const node = document.querySelector(zone.target);
    if (node instanceof HTMLElement) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <section className="mlenv" aria-label="SFI Method Lab spatial interface">
      <header className="mlenv-topbar">
        <Link href="/root" className="mlenv-brand">SFI.</Link>
        <div><small>CONTROLLED EXPERIMENTATION</small><strong>METHOD LAB</strong></div>
        <div className="mlenv-contract"><small>CONTRACT</small><b>{contractVersion}</b></div>
        <div className="mlenv-system" data-tone={toneFromStatus(status, 'ready')}><i />{status}</div>
      </header>

      <div className="mlenv-frame" data-selected={selected.id}>
        <div className="mlenv-stage">
          <picture className="mlenv-art" aria-hidden="true">
            <source media="(max-width: 640px)" srcSet="/method-lab/lab-mobile.avif" />
            <source media="(max-width: 1100px)" srcSet="/method-lab/lab-tablet.avif" />
            <img src="/method-lab/lab-desktop.avif" alt="" />
          </picture>
          <video className="mlenv-video" autoPlay muted loop playsInline preload="metadata" aria-hidden="true">
            <source src="/method-lab/lab-ambient.mp4" type="video/mp4" />
          </video>

          {zones.map((zone) => (
            <button
              key={zone.id}
              className="mlenv-hotspot"
              data-tone={zone.tone}
              data-selected={selected.id === zone.id}
              style={zoneStyle(zone)}
              onClick={() => setSelectedId(zone.id)}
              aria-label={`${zone.label}: ${zone.state}`}
            >
              <i /><span>{zone.label}</span>
            </button>
          ))}
        </div>

        <section className="mlenv-board" data-tone={selected.tone} aria-live="polite">
          <div className="mlenv-board-head">
            <span>LIVE LAB CONTEXT</span>
            <b>{selected.label}</b>
            <small>{selected.state}</small>
          </div>
          <p>{selected.detail}</p>
          <div className="mlenv-board-grid">
            {boardMetrics[selected.id].map((metric) => <article key={metric.label}>
              <small>{metric.label}</small><strong>{metric.value}</strong>{metric.detail ? <span>{metric.detail}</span> : null}
            </article>)}
          </div>
          <div className="mlenv-board-boundary">
            <span>MOTION ≠ ACTIVITY</span><span>SIMULATED ≠ OBSERVED</span>
          </div>
          <div className="mlenv-board-actions">
            <button onClick={() => openZone(selected)}>OPEN DEEP CONTROL ↓</button>
            {selected.id === 'field' ? <Link href="/field">OPEN FIELD ↗</Link> : null}
          </div>
        </section>

        <div className="mlenv-hint">SELECT A LAB BAY · THE BOARD LOADS REAL CONTEXT</div>
      </div>
    </section>
  );
}

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

type LabZone = {
  id: 'method' | 'observatory' | 'signal' | 'tests' | 'root' | 'simulation' | 'field';
  label: string;
  state: string;
  tone: ZoneTone;
  detail: string;
  target: string;
  desktop: [number, number];
  tablet: [number, number];
  mobile: [number, number];
};

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
  const [selectedId, setSelectedId] = useState<LabZone['id']>('method');

  const operationalProtocols = protocols.filter((item) => item.status === 'OPERATIONAL').length;
  const simulationProtocols = protocols.filter((item) => ['sociotechnical_simulation', 'economic_simulation'].includes(item.id));
  const simulationOperational = simulationProtocols.filter((item) => item.status === 'OPERATIONAL').length;
  const activeSessions = sessions.filter((item) => !['CLOSED', 'REJECTED'].includes(item.status)).length;
  const reviewWarnings = evidenceWarningCount + researchWarningCount;

  const zones: LabZone[] = [
    {
      id: 'method',
      label: 'CÁMARA DE MÉTODO',
      state: `${operationalProtocols}/${protocols.length} OPERATIONAL`,
      tone: operationalProtocols > 0 ? 'ready' : 'gated',
      detail: 'Registro de instrumentos. Cada protocolo conserva clase epistémica, dependencias, validación y regla de promoción.',
      target: '.mlh-protocol-grid',
      desktop: [19, 31], tablet: [18, 28], mobile: [18, 31],
    },
    {
      id: 'observatory',
      label: 'OBSERVATORIO',
      state: `${researchObjectCount} RESEARCH OBJECTS`,
      tone: reviewWarnings > 0 ? 'attention' : researchObjectCount > 0 ? 'ready' : 'idle',
      detail: 'Revisión de objetos, auditorías, findings, métricas, lineage y paquetes de publicación. Observar no equivale a promover.',
      target: '.mlr-shell',
      desktop: [53, 14], tablet: [53, 14], mobile: [50, 10],
    },
    {
      id: 'signal',
      label: 'LAB DE SEÑAL',
      state: evidenceWarningCount > 0 ? `${evidenceWarningCount} READER WARNINGS` : `${evidenceCount} EVIDENCE OPTIONS`,
      tone: evidenceWarningCount > 0 ? 'attention' : evidenceCount > 0 ? 'ready' : 'idle',
      detail: 'Entrada de evidencia persistida al experimento. La selección conserva fuente, caso y claim boundary antes del run.',
      target: '.mlh-evidence-list',
      desktop: [79, 22], tablet: [78, 22], mobile: [76, 25],
    },
    {
      id: 'tests',
      label: 'MESA DE PRUEBAS',
      state: activeSessions > 0 ? `${activeSessions} ACTIVE CRL` : `${sessions.length} CRL SESSIONS`,
      tone: activeSessions > 0 ? 'ready' : sessions.length > 0 ? 'idle' : 'gated',
      detail: 'CRL opera sesión → eventos → BLIND → lectura del fundador → contraste. La lectura del fundador entra después del BLIND.',
      target: '.mlh-three-col',
      desktop: [86, 49], tablet: [84, 49], mobile: [73, 49],
    },
    {
      id: 'root',
      label: 'ROOT CONSOLE',
      state: `DT ${decisionTransfer.status}`,
      tone: toneFromStatus(decisionTransfer.status),
      detail: 'Autoridad y Decision Transfer. El laboratorio puede producir resultados; canon, publicación y autoridad permanecen gobernados.',
      target: '.mlh-status-section',
      desktop: [43, 72], tablet: [21, 80], mobile: [50, 88],
    },
    {
      id: 'simulation',
      label: 'SIMULACIÓN',
      state: `${simulationOperational}/${simulationProtocols.length} RUNNERS OPERATIONAL`,
      tone: simulationOperational === simulationProtocols.length && simulationProtocols.length > 0 ? 'ready' : simulationOperational > 0 ? 'attention' : 'gated',
      detail: 'Runner sociotécnico/económico aislado. El output permanece SIMULATED y no puede mutar evidencia observada.',
      target: '.mlh-two-col',
      desktop: [65, 78], tablet: [51, 82], mobile: [28, 72],
    },
    {
      id: 'field',
      label: 'NODO DE CAMPO',
      state: 'RETURN BOUNDARY',
      tone: 'boundary',
      detail: 'El laboratorio no declara mundo observado. Un RETURN de Field es otro estado, con evidencia y contraste propios.',
      target: '.mlh-status-section',
      desktop: [88, 76], tablet: [80, 80], mobile: [73, 73],
    },
  ];

  const selected = zones.find((zone) => zone.id === selectedId) ?? zones[0];

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
        <div className="mlenv-drift">
          <picture className="mlenv-art" aria-hidden="true">
            <source media="(max-width: 640px)" srcSet="/method-lab/lab-mobile.avif" />
            <source media="(max-width: 1100px)" srcSet="/method-lab/lab-tablet.avif" />
            <img src="/method-lab/lab-desktop.avif" alt="" />
          </picture>

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
              <i />
              <span><b>{zone.label}</b><small>{zone.state}</small></span>
            </button>
          ))}
        </div>

        <div className="mlenv-vignette" aria-hidden="true" />
        <div className="mlenv-scan" aria-hidden="true" />

        <div className="mlenv-title">
          <span>PROTOCOL · EVIDENCE · RUN · RETURN · CONTRAST</span>
          <h1>Laboratorio SFI</h1>
          <p>La imagen es una superficie de navegación. El movimiento ambiental no constituye actividad, ejecución ni evidencia.</p>
        </div>

        <aside className="mlenv-inspector" data-tone={selected.tone}>
          <span>SELECTED BAY</span>
          <h2>{selected.label}</h2>
          <b>{selected.state}</b>
          <p>{selected.detail}</p>
          <button onClick={() => openZone(selected)}>ABRIR ÁREA ↓</button>
          {selected.id === 'field' ? <Link href="/field">OPEN FIELD SURFACE ↗</Link> : null}
        </aside>

        <div className="mlenv-truth">
          <span>MOTION ≠ ACTIVITY</span>
          <span>SIMULATED ≠ OBSERVED</span>
          <span>PUBLICATION REQUIRES GOVERNANCE</span>
        </div>
      </div>

      <div className="mlenv-telemetry" aria-label="Method Lab telemetry">
        <div><small>PROTOCOLS</small><strong>{protocols.length}</strong><span>{operationalProtocols} operational</span></div>
        <div><small>EVIDENCE</small><strong>{evidenceCount}</strong><span>{evidenceWarningCount} reader warnings</span></div>
        <div><small>CRL</small><strong>{activeSessions}</strong><span>active / {sessions.length} total</span></div>
        <div><small>RESEARCH</small><strong>{researchObjectCount}</strong><span>{researchWarningCount} warnings</span></div>
        <div><small>DECISION TRANSFER</small><strong>{decisionTransfer.status}</strong><span>{decisionTransfer.totalEvaluations} evaluations</span></div>
      </div>
    </section>
  );
}

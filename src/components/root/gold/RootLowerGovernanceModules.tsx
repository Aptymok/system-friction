'use client';

import type { RootGovernanceState } from '@/lib/root/gold/rootGovernanceState';

function metric(value: number | null) {
  return value === null ? 'NULL' : value > 1 ? String(value) : `${Math.round(value * 100)}%`;
}

function MiniWorld({ nodes }: { nodes: Array<{ lat: number; lon: number; value: number }> }) {
  return (
    <svg className="sfi-root-gold__mini-world" viewBox="0 0 260 112" aria-hidden="true">
      <path d="M16 55 C52 28 88 29 122 50 C155 72 196 76 242 43" />
      <path d="M20 76 C72 90 110 82 144 68 C178 54 206 58 240 74" />
      {nodes.map((node, index) => {
        const x = 130 + (node.lon / 180) * 112;
        const y = 56 - (node.lat / 90) * 42;
        return <circle key={index} cx={x} cy={y} r={4 + node.value * 8} />;
      })}
    </svg>
  );
}

function VectorPreview({ nodes }: { nodes: Array<{ x: number; y: number; value: number }> }) {
  return (
    <svg className="sfi-root-gold__vector-preview" viewBox="0 0 260 112" aria-hidden="true">
      {[0, 1, 2, 3].map((line) => <path key={line} d={`M12 ${28 + line * 16} C72 ${12 + line * 7} 130 ${96 - line * 12} 248 ${38 + line * 13}`} />)}
      {nodes.map((node, index) => <circle key={index} cx={node.x * 2.4 + 10} cy={node.y + 44} r={4 + node.value * 7} />)}
    </svg>
  );
}

export function RootLowerGovernanceModules({ state }: { state: RootGovernanceState }) {
  return (
    <section className="sfi-root-gold__lower-grid">
      <article className="sfi-root-gold__panel">
        <h2>INVESTIGACIONES PROPUESTAS</h2>
        <MiniWorld nodes={state.proposedInvestigations.wsvPreview?.nodes ?? []} />
        <div className="sfi-root-gold__module-data">
          <span>ESCENARIO<strong>{state.proposedInvestigations.scenarioId ?? 'NULL'}</strong></span>
          <span>ESTADO<strong>{state.proposedInvestigations.state}</strong></span>
          <span>PROGRESO<strong>{metric(state.proposedInvestigations.progress)}</strong></span>
        </div>
        <p>{state.proposedInvestigations.title}</p>
      </article>
      <article className="sfi-root-gold__panel">
        <h2>LABORATORIO DE SIMULACION SOCIAL</h2>
        <VectorPreview nodes={state.socialSimulationLab.vectorPreview} />
        <div className="sfi-root-gold__module-data">
          <span>DIMENSIONES<strong>{state.socialSimulationLab.dimensions ?? 'NULL'}</strong></span>
          <span>RESOLUCION<strong>{state.socialSimulationLab.resolution ?? 'NULL'}</strong></span>
          <span>ESTADO<strong>{state.socialSimulationLab.state}</strong></span>
        </div>
      </article>
      <article className="sfi-root-gold__panel">
        <h2>ATLAS</h2>
        <MiniWorld nodes={state.atlas.mapNodes} />
        <div className="sfi-root-gold__atlas-list">
          {state.atlas.ingestion.map((source) => <div key={source.source}><span>{source.source}</span><strong>{source.count ?? 'NULL'}</strong><i>{source.status}</i></div>)}
        </div>
        <button>VER ATLAS COMPLETO {'->'}</button>
        <div className="sfi-root-gold__module-data">
          <span>COBERTURA<strong>{metric(state.atlas.globalCoverage)}</strong></span>
          <span>FUENTES ACTIVAS<strong>{state.atlas.activeSources ?? 'NULL'}</strong></span>
        </div>
      </article>
      <article className="sfi-root-gold__panel">
        <h2>HERRAMIENTAS DE EJECUCION</h2>
        <div className="sfi-root-gold__tools-list">
          {state.executionTools.map((tool) => <div key={tool.id}><span>{tool.label}</span><em>{tool.description}</em><strong>{tool.state}</strong></div>)}
        </div>
        <button>IR A HERRAMIENTAS {'->'}</button>
      </article>
    </section>
  );
}

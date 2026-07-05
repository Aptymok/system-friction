'use client';

import { Menu } from 'lucide-react';
import type { RootGovernanceState } from '@/lib/root/gold/rootGovernanceState';
import { RootGovernanceFieldRenderer } from './visual/RootGovernanceFieldRenderer';

function metric(value: number | null) {
  return value === null ? 'NULL' : value > 1 ? String(value) : value.toFixed(2);
}

export function RootMobileGovernance({ state }: { state: RootGovernanceState }) {
  return (
    <div className="sfi-root-gold__mobile">
      <header className="sfi-root-gold__mobile-header"><div><span>SFI / ROOT</span><strong>GOBERNANZA</strong></div><Menu size={18} /></header>
      <section className="sfi-root-gold__mobile-panel">
        <div className="sfi-root-gold__mobile-kicker">RESUMEN DE GOBERNANZA</div>
        <div className="sfi-root-gold__mobile-summary">
          <span>FRICCION<strong>{metric(state.governanceSummary.systemicFriction)}</strong></span>
          <span>COHERENCIA<strong>{metric(state.governanceSummary.coherence)}</strong></span>
          <span>NODOS<strong>{state.governanceSummary.activeNodes ?? 'NULL'}</strong></span>
        </div>
      </section>
      <section className="sfi-root-gold__mobile-panel sfi-root-gold__mobile-topology">
        <div className="sfi-root-gold__mobile-kicker">TOPOLOGIA</div>
        <RootGovernanceFieldRenderer field={state.governanceField} mode="topologia" playing />
      </section>
      <section className="sfi-root-gold__mobile-panel">
        <div className="sfi-root-gold__mobile-kicker">AGENTES</div>
        {state.agents.slice(0, 5).map((agent) => <div className="sfi-root-gold__mobile-row" key={agent.id}><span>{agent.id}</span><em>{agent.role}</em><strong>{agent.state}</strong></div>)}
      </section>
      <section className="sfi-root-gold__mobile-panel">
        <div className="sfi-root-gold__mobile-kicker">PROYECCIONES</div>
        {state.projections.activeHypotheses.slice(0, 4).map((item) => <div className="sfi-root-gold__mobile-row" key={item.id}><span>{item.id}</span><em>{item.label}</em><strong>{metric(item.probability)}</strong></div>)}
      </section>
      <section className="sfi-root-gold__mobile-panel"><div className="sfi-root-gold__mobile-kicker">INVESTIGACIONES</div><p>{state.proposedInvestigations.title}</p><strong>{state.proposedInvestigations.state}</strong></section>
      <section className="sfi-root-gold__mobile-panel"><div className="sfi-root-gold__mobile-kicker">SIMULACION SOCIAL</div><p>Dimensiones: {state.socialSimulationLab.dimensions ?? 'NULL'} / Resolucion: {state.socialSimulationLab.resolution ?? 'NULL'}</p></section>
      <section className="sfi-root-gold__mobile-panel"><div className="sfi-root-gold__mobile-kicker">ATLAS</div>{state.atlas.ingestion.map((item) => <div className="sfi-root-gold__mobile-row" key={item.source}><span>{item.source}</span><em>{item.status}</em><strong>{item.count ?? 'NULL'}</strong></div>)}</section>
      <section className="sfi-root-gold__mobile-panel"><div className="sfi-root-gold__mobile-kicker">HERRAMIENTAS</div>{state.executionTools.slice(0, 5).map((tool) => <div className="sfi-root-gold__mobile-row" key={tool.id}><span>{tool.label}</span><em>{tool.state}</em><strong>{tool.available ? 'ON' : 'OFF'}</strong></div>)}</section>
      <nav className="sfi-root-gold__mobile-nav">{['GOBERNANZA', 'AGENTES', 'PROYECCIONES', 'ATLAS', 'EJECUCION'].map((item) => <span key={item}>{item}</span>)}</nav>
    </div>
  );
}

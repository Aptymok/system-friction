'use client';

import { useState } from 'react';
import type { RootGovernanceState } from '@/lib/root/gold/rootGovernanceState';

function pct(value: number | null) {
  return value === null ? 'NULL' : `${Math.round(value * 100)}%`;
}

export function RootAgentsRail({ state }: { state: RootGovernanceState }) {
  const [tab, setTab] = useState<'health' | 'propuestas' | 'registros'>('health');
  return (
    <aside className="sfi-root-gold__left-rail">
      <section className="sfi-root-gold__panel">
        <div className="sfi-root-gold__panel-title"><h2>AGENTES</h2><span>{state.agents.length}</span></div>
        <div className="sfi-root-gold__tabs">
          {(['health', 'propuestas', 'registros'] as const).map((item) => <button className={tab === item ? 'active' : ''} onClick={() => setTab(item)} key={item}>{item.toUpperCase()}</button>)}
        </div>
        {tab === 'health' && <div className="sfi-root-gold__agent-list">{state.agents.length ? state.agents.map((agent) => (
          <div key={agent.id}><span>{agent.id}</span><em>{agent.role}</em><strong>{pct(agent.health)}</strong><i className={`is-${agent.state}`}>{agent.state}</i></div>
        )) : <p className="sfi-root-gold__empty">SOURCE_UNAVAILABLE</p>}</div>}
        {tab === 'propuestas' && <div className="sfi-root-gold__agent-list">{state.activeProposals.slice(0, 5).map((item) => (
          <div key={item.id}><span>{item.id}</span><em>{item.title}</em><strong>{pct(item.confidence)}</strong><i>{item.state}</i></div>
        ))}</div>}
        {tab === 'registros' && <div className="sfi-root-gold__agent-list">{state.recentRecords.slice(0, 5).map((item) => (
          <div key={`${item.time}-${item.label}`}><span>{item.time.slice(11, 16)}</span><em>{item.label}</em><strong>{item.actor}</strong><i>{item.severity}</i></div>
        ))}</div>}
      </section>
      <section className="sfi-root-gold__panel">
        <div className="sfi-root-gold__panel-title"><h2>PROPUESTAS ACTIVAS</h2><span>{state.activeProposals.length}</span></div>
        <div className="sfi-root-gold__compact-list">{state.activeProposals.length ? state.activeProposals.slice(0, 6).map((proposal) => (
          <div key={proposal.id}><span>{proposal.id}</span><em>{proposal.title}</em><strong>{pct(proposal.confidence)}</strong><i>{proposal.state}</i></div>
        )) : <p className="sfi-root-gold__empty">SOURCE_UNAVAILABLE</p>}</div>
      </section>
      <section className="sfi-root-gold__panel">
        <div className="sfi-root-gold__panel-title"><h2>REGISTROS RECIENTES</h2><span>TRACE</span></div>
        <div className="sfi-root-gold__compact-list">{state.recentRecords.length ? state.recentRecords.slice(0, 7).map((record) => (
          <div key={`${record.time}-${record.label}`}><span>{record.time.slice(11, 16) || '--:--'}</span><em>{record.label}</em><strong>{record.actor}</strong><i>{record.severity} {'->'}</i></div>
        )) : <p className="sfi-root-gold__empty">SOURCE_UNAVAILABLE</p>}</div>
      </section>
    </aside>
  );
}

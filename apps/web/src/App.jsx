// apps/web/src/App.jsx
import React from 'react'
import { StoreProvider, useStore, statusClass } from './store.jsx'

import Dashboard    from './panels/Dashboard.jsx'
import Campo        from './panels/Campo.jsx'
import Observatorio from './panels/Observatorio.jsx'
import Salon        from './panels/Salon.jsx'
import MathExtender from './panels/MathExtender.jsx'
import Repositorio  from './panels/Repositorio.jsx'
import Laboratorio  from './panels/Laboratorio.jsx'
import Anchor       from './panels/Anchor.jsx'

const TABS = [
  { id: 'dashboard',    label: 'DASHBOARD' },
  { id: 'campo',        label: 'CAMPO Φ' },
  { id: 'observatorio', label: 'OBSERVATORIO' },
  { id: 'salon',        label: 'SALA EIDOLÓN' },
  { id: 'math',         label: 'MATH EXTENDER' },
  { id: 'repo',         label: 'REPOSITORIO' },
  { id: 'lab',          label: 'LABORATORIO' },
  { id: 'anchor',       label: 'ANCHOR' },
]

function Shell() {
  const { store, dispatch } = useStore()
  const { mihm, socsim, tab } = store

  const dotCls = mihm.status === 'OK' ? 'on' : mihm.status === 'DEGRADED' ? 'warn' : 'crit'
  const kpiCls = (v, inv) => !inv ? (v > 0.6 ? 'ok' : v < 0.3 ? 'al' : 'wa')
                                  : (v < 0.3 ? 'ok' : v > 0.6 ? 'al' : 'wa')
  const fsoc = +(socsim.T * 0.4 + socsim.P * 0.3 + socsim.X * 0.3).toFixed(2)

  return (
    <>
      <header className="hdr">
        <span className="hdr-brand">SF² · EIDELON</span>
        <div className="hdr-div" />
        <span className="hdr-mod">MIHM PERSONAL v2</span>

        <div className="hdr-right">
          <div className="hdr-live">
            <span className={`hdr-dot ${dotCls}`} />
            <span className="hdr-live-txt">{mihm.status}</span>
          </div>
          <div className="hdr-kpi">
  {[
    { label: "MIHM", value: mihm.value },
    { label: "SOCSIM", value: socsim.T }
  ].map((kpi, i) => (
    <span key={i} className="hdr-kpi-item">
      {kpi.label}: {kpi.value}
    </span>
  ))}
</div>
        </div>
      </header>

      <nav className="tabs-bar">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab-btn${tab === t.id ? ' active' : ''}`}
            onClick={() => dispatch({ type: 'SET_TAB', tab: t.id })}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="page-shell">
        <div className="wrap">
          {tab === 'dashboard'    && <Dashboard />}
          {tab === 'campo'        && <Campo />}
          {tab === 'observatorio' && <Observatorio />}
          {tab === 'salon'        && <Salon />}
          {tab === 'math'         && <MathExtender />}
          {tab === 'repo'         && <Repositorio />}
          {tab === 'lab'          && <Laboratorio />}
          {tab === 'anchor'       && <Anchor />}
        </div>
      </div>
    </>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
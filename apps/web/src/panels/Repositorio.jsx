import React from 'react'
import { useStore, fmt2 } from '../store.jsx'
import { computeFSoc, computeFractureRisk } from '../socsim.js'

export default function Repositorio() {
  const { store } = useStore()
  const { snapshots } = store

  const doDownload = (snap) => {
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `sf2-snap-${snap.id}.json`
    a.click()
  }

  return (
    <>
      <div className="sec">
        <div className="sec-hd">
          <span className="sec-n">01</span>
          <span className="sec-t">Repositorio de Sesiones</span>
          <span className="pnl-st" style={{marginLeft:'auto'}}>{snapshots.length} snapshots</span>
        </div>
        <div className="sec-d">
          Historial de snapshots guardados en el Laboratorio. Cada entrada incluye estado MIHM + Ψ + parámetros.
        </div>
      </div>

      {snapshots.length === 0 ? (
        <div className="pnl">
          <div className="pnl-body">
            <div className="narr-box">
              <div className="narr-lbl">VACÍO</div>
              <div className="narr-txt">
                No hay snapshots guardados. Ve al Laboratorio y presiona SAVE para guardar el estado actual.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="repo-list">
          {/* Header */}
          <div className="repo-row" style={{background:'var(--bg2)',borderBottom:'.5px solid var(--bdr2)'}}>
            {['ID', 'TICK', 'IHG', 'NTI', 'R', 'FSoc', 'FR', ''].map((h, i) => (
              <span key={i} style={{fontSize:7,letterSpacing:'.12em',fontFamily:'monospace',color:'var(--t3)',flex: i === 7 ? '0 0 60px' : 1}}>
                {h}
              </span>
            ))}
          </div>

          {snapshots.map((snap, i) => {
            const fsoc = computeFSoc(snap.psi)
            const fr   = computeFractureRisk(snap.psi)
            return (
              <div key={snap.id} className="repo-row">
                <div style={{flex:1}}>
                  <div className="repo-row-main" style={{fontSize:9}}>{snap.id.slice(-8)}</div>
                  <div className="repo-row-sub">{new Date(snap.t).toLocaleTimeString()}</div>
                </div>
                <span className="repo-row-meta" style={{flex:1}}>{snap.tick}</span>
                <span className="repo-row-meta" style={{flex:1,color: snap.mihm.IHG > 0.4 ? 'var(--verde)' : snap.mihm.IHG > 0 ? 'var(--oro)' : 'var(--rojo)'}}>
                  {fmt2(snap.mihm.IHG)}
                </span>
                <span className="repo-row-meta" style={{flex:1,color: snap.mihm.NTI < 0.3 ? 'var(--verde)' : snap.mihm.NTI < 0.6 ? 'var(--oro)' : 'var(--rojo)'}}>
                  {fmt2(snap.mihm.NTI)}
                </span>
                <span className="repo-row-meta" style={{flex:1,color: snap.mihm.R > 0.6 ? 'var(--verde)' : snap.mihm.R > 0.3 ? 'var(--oro)' : 'var(--rojo)'}}>
                  {fmt2(snap.mihm.R)}
                </span>
                <span className="repo-row-meta" style={{flex:1,color: fsoc < 0.3 ? 'var(--verde)' : fsoc < 0.6 ? 'var(--oro)' : 'var(--rojo)'}}>
                  {fmt2(fsoc)}
                </span>
                <span className="repo-row-meta" style={{flex:1,color: fr < 0.3 ? 'var(--verde)' : fr < 0.6 ? 'var(--oro)' : 'var(--rojo)'}}>
                  {fmt2(fr)}
                </span>
                <button
                  className="btn btn-g"
                  style={{flex:'0 0 60px',padding:'3px 8px',fontSize:7}}
                  onClick={() => doDownload(snap)}
                >
                  EXPORT
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Current session summary */}
      <div className="sec" style={{marginTop:'2rem'}}>
        <div className="sec-hd">
          <span className="sec-n">02</span>
          <span className="sec-t">Sesión Actual</span>
        </div>
        <div className="row3">
          {[
            { l: 'Estado MIHM',  v: store.mihm.status },
            { l: 'Ticks Ψ',      v: store.socsimTick },
            { l: 'Timeline pts', v: store.timeline.length },
            { l: 'Mensajes',     v: store.chat.length },
            { l: 'Snapshots',    v: snapshots.length },
            { l: 'Escenarios',   v: store.futureScenarios.length },
          ].map(k => (
            <div key={k.l} className="cell">
              <div className="cell-lbl">{k.l}</div>
              <div className="cell-v">{k.v}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

import React from 'react'
import { useStore, fmt2, statusClass } from '../store.jsx'
import { computeFSoc, computeRSoc, computeFractureRisk, PSI_LABELS } from '../socsim.js'

export default function Observatorio() {
  const { store } = useStore()
  const { mihm, socsim, timeline, socsimHistory, socsimTick } = store

  const fsoc = computeFSoc(socsim)
  const rsoc = computeRSoc(socsim)
  const fr   = computeFractureRisk(socsim)
  const phi  = (mihm.R + mihm.ETE + (mihm.IHG + 1) / 2) / 3

  // Trend: compare last 10 vs first 10 of timeline
  const trend = (key) => {
    if (timeline.length < 5) return 0
    const half = Math.max(2, Math.floor(timeline.length / 2))
    const recent = timeline.slice(-half)
    const early  = timeline.slice(0, half)
    const avg = arr => arr.reduce((s, pt) => s + (pt[key] ?? 0), 0) / arr.length
    return avg(recent) - avg(early)
  }

  const trendArrow = v => v > 0.03 ? '↑' : v < -0.03 ? '↓' : '→'
  const trendColor = (v, inv) => {
    const good = inv ? v < -0.02 : v > 0.02
    const bad  = inv ? v >  0.02 : v < -0.02
    return good ? 'var(--verde)' : bad ? 'var(--rojo)' : 'var(--t3)'
  }

  return (
    <>
      <div className="sec">
        <div className="sec-hd">
          <span className="sec-n">01</span>
          <span className="sec-t">Observatorio de Sistema</span>
          <span className={`tag ${statusClass(mihm.status)}`} style={{marginLeft:'auto'}}>
            {mihm.status}
          </span>
        </div>
        <div className="sec-d">
          Vista consolidada del estado MIHM + Ψ. Tendencias sobre historial acumulado.
        </div>
      </div>

      <div className="obs-grid">

        {/* MIHM snapshot */}
        <div className="obs-cell">
          <div className="obs-cell-ttl">MIHM — Estado Actual</div>
          {[
            { l: 'IHG  Homeostasis Global', v: mihm.IHG,          inv: false, t: trend('IHG') },
            { l: 'NTI  Tensión Interna',    v: mihm.NTI,           inv: true,  t: trend('NTI') },
            { l: 'R    Resiliencia',         v: mihm.R,             inv: false, t: trend('R')   },
            { l: 'IAD  Atención Distrib.',   v: mihm.IAD,           inv: false, t: null },
            { l: 'ETE  Ef. Transición',      v: mihm.ETE,           inv: false, t: null },
            { l: 'Fric Fricción Sistémica',  v: mihm.frictionScore, inv: true,  t: null },
          ].map(m => (
            <div key={m.l} className="obs-metric-row">
              <span className="obs-metric-l">{m.l}</span>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span className="obs-metric-v">{fmt2(m.v)}</span>
                {m.t !== null && (
                  <span style={{fontSize:10,color: trendColor(m.t, m.inv)}}>
                    {trendArrow(m.t)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Ψ snapshot */}
        <div className="obs-cell">
          <div className="obs-cell-ttl">SocSim Ψ — Estado Actual</div>
          {Object.entries(PSI_LABELS).map(([k, l]) => (
            <div key={k} className="obs-metric-row">
              <span className="obs-metric-l">{k} — {l}</span>
              <span className="obs-metric-v">{fmt2(socsim[k])}</span>
            </div>
          ))}
        </div>

        {/* Indices derivados */}
        <div className="obs-cell">
          <div className="obs-cell-ttl">Índices Derivados</div>
          {[
            { l: 'Φ Integrado',   v: phi,  inv: false },
            { l: 'FSoc',          v: fsoc, inv: true  },
            { l: 'RSoc',          v: rsoc, inv: false },
            { l: 'FractureRisk',  v: fr,   inv: true  },
          ].map(m => (
            <div key={m.l} className="obs-metric-row">
              <span className="obs-metric-l">{m.l}</span>
              <span className="obs-metric-v" style={{
                color: m.inv
                  ? (m.v > 0.6 ? 'var(--rojo)' : m.v > 0.35 ? 'var(--oro)' : 'var(--verde)')
                  : (m.v > 0.6 ? 'var(--verde)' : m.v > 0.35 ? 'var(--oro)' : 'var(--rojo)'),
              }}>
                {fmt2(m.v)}
              </span>
            </div>
          ))}
          <div className="obs-metric-row" style={{marginTop:8,paddingTop:8,borderTop:'.5px solid var(--bdr)'}}>
            <span className="obs-metric-l">Ticks Ψ</span>
            <span className="obs-metric-v">{socsimTick}</span>
          </div>
          <div className="obs-metric-row">
            <span className="obs-metric-l">Historial MIHM</span>
            <span className="obs-metric-v">{timeline.length} pts</span>
          </div>
          <div className="obs-metric-row">
            <span className="obs-metric-l">Historial Ψ</span>
            <span className="obs-metric-v">{socsimHistory.length} pts</span>
          </div>
        </div>

        {/* Interpretación narrativa */}
        <div className="obs-cell">
          <div className="obs-cell-ttl">Interpretación del Sistema</div>
          <div style={{marginTop:'.5rem'}}>
            {[
              mihm.status === 'COLLAPSE' &&
                'Sistema en COLAPSO. IHG extremadamente bajo. Intervención inmediata requerida.',
              mihm.status === 'CRITICAL' &&
                'Estado CRÍTICO. Fricción y tensión superan umbrales. Reducir carga cognitiva.',
              mihm.status === 'DEGRADED' &&
                'Sistema DEGRADADO. Resiliencia comprometida. Monitorear NTI de cerca.',
              mihm.status === 'OK' && mihm.frictionScore < 0.3 &&
                'Sistema ÓPTIMO. Todos los indicadores dentro de rangos nominales.',
              mihm.status === 'OK' &&
                'Sistema OK. Operar con precaución en zonas de alta demanda.',
              fr > 0.6 &&
                'Riesgo de fractura elevado (FractureRisk > 0.6). Ψ inestable.',
              fsoc > 0.5 && 'Fricción social alta. Polarización P o Tensión T dominantes.',
              rsoc > 0.7 && 'Resiliencia social alta. Sistema Ψ resiliente y coherente.',
              phi > 0.65 && 'Campo Φ integrado favorable. Alta coherencia sistémica.',
            ].filter(Boolean).map((txt, i) => (
              <div key={i} className="narr-box" style={{marginBottom:8}}>
                <div className="narr-txt">{txt}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  )
}

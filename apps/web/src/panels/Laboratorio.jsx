import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useStore, fmt2 } from '../store.jsx'
import { step as psiStep, retroStep, textToFeatures, computeFSoc, computeRSoc, computeFractureRisk, PSI_KEYS, PSI_LABELS } from '../socsim.js'
import { drawHeatmap } from '../heatmap.js'
import { postMetrics } from '../api.js'

// ── SocSim chart (canvas A/P/C/T) ─────────────────────────────────────────────

function SocSimChart({ history }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || history.length < 2) return
    const W = canvas.offsetWidth || 500
    const H = 120
    canvas.width  = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, W, H)

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)'
    ctx.lineWidth = 0.5
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath(); ctx.moveTo(0, H * i / 4); ctx.lineTo(W, H * i / 4); ctx.stroke()
    }

    const SERIES = [
      { k: 'A', color: '#C8A951' },
      { k: 'P', color: '#BE3A3A' },
      { k: 'C', color: '#177A5E' },
      { k: 'T', color: '#2A6FAA' },
    ]

    SERIES.forEach(({ k, color }) => {
      ctx.beginPath()
      ctx.strokeStyle = color
      ctx.lineWidth = 1.2
      ctx.shadowColor = color
      ctx.shadowBlur  = 3
      history.forEach((pt, i) => {
        const x = (i / (history.length - 1)) * W
        const y = H - pt[k] * H * 0.85 - H * 0.075
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.stroke()
      ctx.shadowBlur = 0
    })

    // Legend
    SERIES.forEach(({ k, color }, i) => {
      ctx.fillStyle = color
      ctx.font = '8px Courier New'
      ctx.fillText(k, 8 + i * 26, 11)
    })
  }, [history])

  return <canvas ref={canvasRef} id="socsim-chart" />
}

// ── Laboratorio ────────────────────────────────────────────────────────────────

export default function Laboratorio() {
  const { store, dispatch }        = useStore()
  const heatmapRef                 = useRef(null)
  const intervalRef                = useRef(null)
  const [retro, setRetro]          = useState(false)
  const [narrative, setNarrative]  = useState('')

  const { socsim, socsimHistory, socsimRunning, socsimTick, socsimParams } = store

  // Draw heatmap whenever Ψ or retro mode changes
  useEffect(() => {
    if (heatmapRef.current) {
      drawHeatmap(heatmapRef.current, socsim, { retro, seed: socsimTick, scale: 8 })
    }
  }, [socsim, retro, socsimTick])

  // Tick loop
  useEffect(() => {
    if (socsimRunning) {
      intervalRef.current = setInterval(() => {
        dispatch({
          type: 'SOCSIM_STEP',
          psi: psiStep(
            store.socsim,
            {},
            { ...store.socsimParams, seed: Date.now() }
          ),
        })
      }, (socsimParams.tickSeconds ?? 2) * 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [socsimRunning, socsimParams.tickSeconds])

  const doStep = useCallback(() => {
    dispatch({
      type: 'SOCSIM_STEP',
      psi: psiStep(socsim, {}, { ...socsimParams, seed: Date.now() }),
    })
  }, [socsim, socsimParams])

  const doRetroStep = useCallback(() => {
    dispatch({
      type: 'SOCSIM_STEP',
      psi: retroStep(socsim, socsimHistory),
    })
  }, [socsim, socsimHistory])

  const doExport = () => {
    const blob = new Blob([JSON.stringify({ socsim, socsimHistory, socsimParams, tick: socsimTick }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `sf2-lab-${Date.now()}.json`
    a.click()
  }

  const doImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result)
        if (data.socsim) {
          dispatch({ type: 'SOCSIM_STEP', psi: data.socsim })
          dispatch({ type: 'SET_SOCSIM_PARAMS', params: data.socsimParams ?? {} })
        }
      } catch {}
    }
    reader.readAsText(file)
  }

  const fsoc  = computeFSoc(socsim)
  const rsoc  = computeRSoc(socsim)
  const fr    = computeFractureRisk(socsim)

  return (
    <>
      <div className="sec">
        <div className="sec-hd">
          <span className="sec-n">01</span>
          <span className="sec-t">Laboratorio — SocSim Ψ</span>
          <span className={`tag ${socsimRunning ? 'ok' : 'na'}`} style={{marginLeft:'auto'}}>
            {socsimRunning ? 'CORRIENDO' : 'PAUSADO'} · t={socsimTick}
          </span>
        </div>
      </div>

      <div className="lab-wrap">
        {/* Controls column */}
        <div className="lab-controls">

          <div className="lab-ctrl-section">
            <div className="lab-ctrl-ttl">CONTROLES</div>
            <div className="lab-btn-row">
              <button className="btn btn-n" onClick={() => dispatch({ type: 'SET_SOCSIM_RUNNING', running: true })}>
                START
              </button>
              <button className="btn btn-g" onClick={() => dispatch({ type: 'SET_SOCSIM_RUNNING', running: false })}>
                PAUSE
              </button>
              <button className="btn" onClick={doStep}>STEP →</button>
              <button className="btn btn-g" onClick={doRetroStep}>← RETRO</button>
              <button className="btn btn-r" onClick={() => dispatch({ type: 'RESET_SOCSIM' })}>
                RESET
              </button>
            </div>
          </div>

          <div className="lab-ctrl-section">
            <div className="lab-ctrl-ttl">RETRO MODE B</div>
            <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
              <input
                type="checkbox"
                checked={retro}
                onChange={e => setRetro(e.target.checked)}
                style={{accentColor:'var(--oro)'}}
              />
              <span style={{fontSize:9,fontFamily:'monospace',color: retro ? 'var(--neon)' : 'var(--t3)'}}>
                {retro ? 'ACTIVO' : 'INACTIVO'}
              </span>
            </label>
            {retro && (
              <div style={{marginTop:6,fontSize:8,fontFamily:'monospace',color:'var(--t3)',lineHeight:1.7}}>
                1) Inversión<br/>2) Perturbación<br/>3) φ inversion
              </div>
            )}
          </div>

          <div className="lab-ctrl-section">
            <div className="lab-ctrl-ttl">PARÁMETROS</div>
            {[
              { l: 'Fricción',   k: 'frictionCoef',    min: 0, max: 1,   step: 0.01 },
              { l: 'Choque',     k: 'shockAmplitude',  min: 0, max: 1,   step: 0.01 },
              { l: 'Ruido',      k: 'noiseLevel',      min: 0, max: 0.2, step: 0.005 },
              { l: 'Tick (s)',   k: 'tickSeconds',     min: 0.5, max:10, step: 0.5 },
            ].map(p => (
              <div key={p.k} className="slider-row">
                <span className="slider-lbl">{p.l}</span>
                <input
                  type="range"
                  min={p.min} max={p.max} step={p.step}
                  value={socsimParams[p.k] ?? 0}
                  onChange={e => dispatch({ type: 'SET_SOCSIM_PARAMS', params: { [p.k]: +e.target.value } })}
                />
                <span className="slider-val">{(socsimParams[p.k] ?? 0).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="lab-ctrl-section">
            <div className="lab-ctrl-ttl">SESIÓN</div>
            <div className="lab-btn-row">
              <button className="btn" onClick={() => {
                dispatch({ type: 'SAVE_SNAPSHOT' })
                postMetrics({ mihm: store.mihm, psi: socsim, tick: socsimTick })
              }}>SAVE</button>
              <button className="btn btn-g" onClick={doExport}>EXPORT</button>
              <label className="btn btn-g" style={{cursor:'pointer'}}>
                IMPORT
                <input type="file" accept=".json" onChange={doImport} style={{display:'none'}} />
              </label>
            </div>
            <div style={{marginTop:8,fontSize:8,fontFamily:'monospace',color:'var(--t3)'}}>
              {store.snapshots.length} snaps guardados
            </div>
          </div>

        </div>

        {/* Main view */}
        <div className="lab-main">

          {/* KPIs */}
          <div className="lab-kpis">
            {[
              { l: 'FSoc',         v: fsoc, inv: true  },
              { l: 'RSoc',         v: rsoc, inv: false },
              { l: 'FractureRisk', v: fr,   inv: true  },
            ].map(k => (
              <div key={k.l} className="lab-kpi-cell">
                <div className="lab-kpi-lbl">{k.l}</div>
                <div className={`lab-kpi-v ${k.inv ? (k.v > 0.6 ? 'al' : k.v > 0.3 ? 'wa' : 'ok') : (k.v > 0.6 ? 'ok' : k.v > 0.3 ? 'wa' : 'al')}`}
                     style={{color: k.inv ? (k.v > 0.6 ? 'var(--rojo)' : k.v > 0.3 ? 'var(--oro)' : 'var(--verde)') : (k.v > 0.6 ? 'var(--verde)' : k.v > 0.3 ? 'var(--oro)' : 'var(--rojo)')}}>
                  {fmt2(k.v)}
                </div>
              </div>
            ))}
          </div>

          {/* Heatmap */}
          <div>
            <div style={{fontSize:8,letterSpacing:'.16em',color:'var(--oro)',fontFamily:'monospace',marginBottom:8}}>
              HEATMAP 32×32 {retro ? '· RETRO MODE B' : '· NORMAL'}
            </div>
            <div className="lab-heatmap-wrap">
              <canvas ref={heatmapRef} id="heatmap-c" />
              <div style={{display:'flex',flexDirection:'column',gap:4,flex:1}}>
                {PSI_KEYS.map(k => (
                  <div key={k} className="bar-row" style={{marginBottom:0}}>
                    <span className="bar-lbl" style={{minWidth:100}}>{k} — {PSI_LABELS[k]}</span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{
                        width: `${socsim[k] * 100}%`,
                        background: socsim[k] > 0.7 ? 'var(--neon)' : socsim[k] > 0.4 ? 'var(--oro)' : 'var(--azul)',
                      }} />
                    </div>
                    <span className="bar-val">{fmt2(socsim[k])}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Timeline A/P/C/T */}
          <div>
            <div style={{fontSize:8,letterSpacing:'.16em',color:'var(--oro)',fontFamily:'monospace',marginBottom:8}}>
              TIMELINE A / P / C / T ({socsimHistory.length} pts)
            </div>
            <SocSimChart history={socsimHistory} />
          </div>

          {/* Narrative input */}
          <div>
            <div style={{fontSize:8,letterSpacing:'.16em',color:'var(--oro)',fontFamily:'monospace',marginBottom:8}}>
              NARRATIVA (afecta próximo step)
            </div>
            <div style={{display:'flex',gap:'.5px',background:'var(--bdr)'}}>
              <textarea
                className="txa"
                value={narrative}
                onChange={e => setNarrative(e.target.value)}
                placeholder="Describe el estado del sistema o contexto actual…"
                style={{border:'none',borderRadius:0,minHeight:48}}
              />
              <button className="btn" style={{borderRadius:0,whiteSpace:'nowrap',padding:'0 14px'}}
                onClick={() => {
                  if (!narrative.trim()) return
                  const features = textToFeatures(narrative)
                  dispatch({ type: 'SOCSIM_STEP', psi: psiStep(socsim, features, socsimParams) })
                  setNarrative('')
                }}>
                APPLY
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}

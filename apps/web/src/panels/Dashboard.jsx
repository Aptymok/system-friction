import React, { useEffect, useRef, useState } from 'react'
import { useStore, valClass, fmt2 } from '../store.jsx'
import { checkHealth, fetchCommits } from '../api.js'

// ── ECG animation ────────────────────────────────────────────────────────────

function useEcg(canvasRef, mihm) {
  const phaseRef = useRef(0)
  const rafRef   = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    function draw() {
      const W = canvas.offsetWidth
      const H = canvas.offsetHeight
      canvas.width  = W
      canvas.height = H

      ctx.clearRect(0, 0, W, H)

      // Grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.03)'
      ctx.lineWidth = 0.5
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
      for (let y = 0; y < H; y += 20) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }

      // ECG-style waveform based on IHG/NTI
      const amp   = H * 0.28 * (0.4 + mihm.R * 0.6)
      const freq  = 0.018 + mihm.NTI * 0.012
      const phase = phaseRef.current

      ctx.beginPath()
      ctx.strokeStyle = mihm.status === 'OK' ? '#177A5E' :
                        mihm.status === 'DEGRADED' ? '#C8A951' : '#BE3A3A'
      ctx.lineWidth = 1.2
      ctx.shadowColor = ctx.strokeStyle
      ctx.shadowBlur  = 4

      for (let x = 0; x < W; x++) {
        const t  = (x + phase) * freq * Math.PI * 2
        // QRS complex approximation
        const qrs = Math.exp(-Math.pow((t % (2 * Math.PI) - Math.PI) * 1.5, 2)) * 1.4
        const p   = Math.sin(t * 0.3) * 0.15
        const val = (qrs + p - 0.3) * amp + H / 2 - mihm.IHG * H * 0.12
        x === 0 ? ctx.moveTo(x, val) : ctx.lineTo(x, val)
      }
      ctx.stroke()
      ctx.shadowBlur = 0

      phaseRef.current += 1.8
      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [mihm.IHG, mihm.NTI, mihm.R, mihm.status])
}

// ── Timeline chart (canvas) ──────────────────────────────────────────────────

function TimelineChart({ timeline }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || timeline.length < 2) return
    const W = canvas.offsetWidth || 600
    const H = 160
    canvas.width  = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, W, H)

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 4; i++) {
      const y = H * i / 4
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
    }

    const drawLine = (key, color, yMin, yRange) => {
      ctx.beginPath()
      ctx.strokeStyle = color
      ctx.lineWidth = 1.2
      ctx.shadowColor = color
      ctx.shadowBlur = 3
      timeline.forEach((pt, i) => {
        const x = (i / (timeline.length - 1)) * W
        const y = H - ((pt[key] - yMin) / yRange) * H * 0.8 - H * 0.1
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.stroke()
      ctx.shadowBlur = 0
    }

    drawLine('IHG', '#177A5E', -1, 2)
    drawLine('NTI', '#C8A951',  0, 1)
    drawLine('R',   '#2A6FAA',  0, 1)

    // Legend
    const legend = [['IHG','-1→1','#177A5E'],['NTI','0→1','#C8A951'],['R','0→1','#2A6FAA']]
    legend.forEach(([lbl, range, col], i) => {
      ctx.fillStyle = col
      ctx.font = '8px Courier New'
      ctx.fillText(`${lbl} ${range}`, 8 + i * 90, 12)
    })
  }, [timeline])

  return <canvas ref={canvasRef} id="timeline-c" />
}

// ── Backend status + commits ──────────────────────────────────────────────────

function BackendPanel() {
  const [online, setOnline]   = useState(null)   // null=checking, true, false
  const [commits, setCommits] = useState([])

  useEffect(() => {
    checkHealth().then(setOnline)
    fetchCommits().then(setCommits)
  }, [])

  return (
    <div className="sec">
      <div className="sec-hd">
        <span className="sec-n">06</span>
        <span className="sec-t">Backend · Railway</span>
        <span className={`tag ${online === null ? 'na' : online ? 'ok' : 'al'}`} style={{marginLeft:'auto'}}>
          {online === null ? 'VERIFICANDO…' : online ? 'ONLINE' : 'OFFLINE'}
        </span>
      </div>
      <div className="row2">
        <div className="pnl">
          <div className="pnl-hd">
            <span className="pnl-lbl">ENDPOINT</span>
          </div>
          <div className="pnl-body">
            <div className="bar-row" style={{marginBottom:6}}>
              <span className="bar-lbl">URL</span>
              <span style={{fontSize:9,fontFamily:'monospace',color:'var(--oro)'}}>
                system-friction-production.up.railway.app
              </span>
            </div>
            {['/health','/api/metrics','/api/commits','/api/llm/narrative'].map(r => (
              <div key={r} className="bar-row" style={{marginBottom:4}}>
                <span className="bar-lbl" style={{color:'var(--t3)'}}>{r}</span>
                <span className={`tag ${online ? 'ok' : 'na'}`}>{online ? 'UP' : '—'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pnl">
          <div className="pnl-hd">
            <span className="pnl-lbl">COMMITS RECIENTES</span>
            <span className="pnl-st">{commits.length} resultados</span>
          </div>
          <div className="pnl-body" style={{padding:'0'}}>
            {commits.length === 0 ? (
              <div style={{padding:'1rem 1.25rem',fontSize:9,color:'var(--t3)',fontFamily:'monospace'}}>
                {online === false ? 'Backend offline — no se pueden cargar commits.' : 'Cargando…'}
              </div>
            ) : commits.map(c => (
              <div key={c.sha} style={{padding:'.6rem 1.25rem',borderBottom:'.5px solid var(--bdr)',display:'flex',gap:10,alignItems:'flex-start'}}>
                <span style={{fontSize:8,fontFamily:'monospace',color:'var(--oro)',flexShrink:0}}>{c.sha}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:10,color:'var(--t1)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.message}</div>
                  <div style={{fontSize:8,color:'var(--t3)',marginTop:2}}>{c.author} · {c.date ? new Date(c.date).toLocaleDateString() : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Patterns panel ────────────────────────────────────────────────────────────

const PATTERNS = [
  { label: 'Disipación tensional',    cond: m => m.NTI > 0.6,              sev: 'al' },
  { label: 'Baja resiliencia',         cond: m => m.R < 0.35,              sev: 'al' },
  { label: 'Transición lenta',         cond: m => m.ETE < 0.4,             sev: 'wa' },
  { label: 'Atención fragmentada',     cond: m => m.IAD < 0.4,             sev: 'wa' },
  { label: 'Homeostasis comprometida', cond: m => m.IHG < 0.1,             sev: 'wa' },
  { label: 'Sistema equilibrado',      cond: m => m.IHG > 0.5 && m.R > 0.6, sev: 'ok' },
  { label: 'Alta fricción',            cond: m => m.frictionScore > 0.55,  sev: 'al' },
]

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { store } = useStore()
  const { mihm, timeline } = store
  const ecgRef = useRef(null)
  useEcg(ecgRef, mihm)

  const kpis = [
    { l: 'IHG',           v: mihm.IHG,          inv: false, range: '-1→1' },
    { l: 'NTI',           v: mihm.NTI,           inv: true,  range: '0→1'  },
    { l: 'R',             v: mihm.R,             inv: false, range: '0→1'  },
    { l: 'IAD',           v: mihm.IAD,           inv: false, range: '0→1'  },
    { l: 'ETE',           v: mihm.ETE,           inv: false, range: '0→1'  },
    { l: 'Fricción',      v: mihm.frictionScore, inv: true,  range: '0→1'  },
  ]

  const activePatterns = PATTERNS.filter(p => p.cond(mihm))

  return (
    <>
      {/* KPI row */}
      <div className="sec">
        <div className="sec-hd">
          <span className="sec-n">01</span>
          <span className="sec-t">Estado MIHM</span>
          <span className={`tag ${mihm.status === 'OK' ? 'ok' : mihm.status === 'DEGRADED' ? 'wa' : 'al'}`} style={{marginLeft:'auto'}}>
            {mihm.status}
          </span>
        </div>
        <div className="row3" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
          {kpis.map(k => (
            <div key={k.l} className="cell">
              <div className="cell-lbl">{k.l}</div>
              <div className={`cell-v ${valClass(k.v, !k.inv)}`}>{fmt2(k.v)}</div>
              <div className="cell-sub">{k.range}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="sec">
        <div className="sec-hd">
          <span className="sec-n">02</span>
          <span className="sec-t">Timeline IHG / NTI / R</span>
          <span className="pnl-st" style={{marginLeft:'auto'}}>{timeline.length} pts</span>
        </div>
        <TimelineChart timeline={timeline} />
      </div>

      {/* ECG */}
      <div className="sec">
        <div className="sec-hd">
          <span className="sec-n">03</span>
          <span className="sec-t">ECG Cognitivo</span>
        </div>
        <div className="ecg-box">
          <div className="ecg-meta">
            <span className="ecg-id">SF²·ECG·{mihm.status}</span>
            <span className="ecg-cur">{fmt2(mihm.IHG)}</span>
          </div>
          <canvas id="ecg-c" ref={ecgRef} />
        </div>
      </div>

      {/* Patrones */}
      <div className="sec">
        <div className="sec-hd">
          <span className="sec-n">04</span>
          <span className="sec-t">Patrones Activos</span>
          <span className="pnl-st" style={{marginLeft:'auto'}}>{activePatterns.length} detectados</span>
        </div>
        {activePatterns.length === 0 ? (
          <div className="narr-box">
            <div className="narr-lbl">SISTEMA</div>
            <div className="narr-txt">No se detectan patrones críticos. Sistema operando dentro de rangos nominales.</div>
          </div>
        ) : (
          <div className="notif-list">
            {activePatterns.map((p, i) => (
              <div key={i} className="notif-row">
                <div>
                  <div className="notif-ttl">{p.label}</div>
                  <div className="notif-dsc">
                    {p.sev === 'al' ? 'Requiere atención inmediata.' : p.sev === 'ok' ? 'Estado favorable.' : 'Monitorear.'}
                    {' '}Detectado en t={fmt2(timeline.at(-1)?.t ?? 0)}.
                  </div>
                </div>
                <span className={`tag ${p.sev}`} style={{marginLeft:'auto',flexShrink:0}}>{p.sev.toUpperCase()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MIHM bars */}
      <div className="sec">
        <div className="sec-hd">
          <span className="sec-n">05</span>
          <span className="sec-t">Perfiles de Métricas</span>
        </div>
        <div className="pnl">
          <div className="pnl-body">
            {[
              { l: 'IHG — Homeostasis Global', v: (mihm.IHG + 1) / 2, color: '#177A5E' },
              { l: 'NTI — Tensión Interna',    v: mihm.NTI,           color: '#C8A951' },
              { l: 'R — Resiliencia',           v: mihm.R,             color: '#2A6FAA' },
              { l: 'IAD — Atención Distrib.',   v: mihm.IAD,           color: '#8A887E' },
              { l: 'ETE — Ef. Transición',      v: mihm.ETE,           color: '#4A4844' },
              { l: 'Fricción Sistémica',        v: mihm.frictionScore, color: '#BE3A3A' },
            ].map(b => (
              <div key={b.l} className="bar-row">
                <span className="bar-lbl">{b.l}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${b.v * 100}%`, background: b.color }} />
                </div>
                <span className="bar-val">{(b.v * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BackendPanel />
    </>
  )
}

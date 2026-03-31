import React, { useState, useRef, useEffect } from 'react'
import { useStore, fmt2 } from '../store.jsx'
import {
  textToFeatures, step as psiStep, generateFutureScenarios, inferRetroactivity,
} from '../socsim.js'
import { snapshotToState, computeMetrics } from '../engine.js'
import { fetchNarrative } from '../api.js'

// ── Chat pipeline ──────────────────────────────────────────────────────────────

function processInput(text, store) {
  const features = textToFeatures(text)

  // Update Ψ from text
  const newPsi = psiStep(store.socsim, features, store.socsimParams)

  // Update MIHM from features
  const snap = {
    valence: features.coherence * 0.6 - features.tension * 0.4,
    arousal: features.intensity,
    tension: features.tension,
    focus: features.coherence,
  }
  const newMihm = computeMetrics(snapshotToState(snap))

  // Retroactivity
  const retroItems = inferRetroactivity(text, newPsi, features)

  // Future scenarios
  const scenarios = generateFutureScenarios(newPsi, features)

  // Eidolón response
  const response = buildResponse(text, features, newPsi, newMihm, scenarios, store.selectedNode)

  return { features, newPsi, newMihm, retroItems, scenarios, response }
}

function buildResponse(text, features, psi, mihm, scenarios, selectedNode) {
  const f = v => v.toFixed(2)
  const nodeCtx = selectedNode
    ? `Tienes "${selectedNode.label}" activo en Campo Φ. `
    : ''

  const status = mihm.status
  const dominant = scenarios[0]

  let body = ''
  if (features.tension > 0.6) {
    body = `${nodeCtx}Detecto tensión elevada (T=${f(psi.T)}, NTI=${f(mihm.NTI)}). ` +
      `El sistema está bajo presión. Resiliencia actual: R=${f(mihm.R)}. ` +
      `Escenario más probable: "${dominant.label}" (P=${f(dominant.probability)}). ` +
      `Atractor recomendado: ${dominant.attractor}`
  } else if (features.coherence > 0.65 && features.tension < 0.3) {
    body = `${nodeCtx}Estado coherente detectado (C=${f(psi.C)}, IHG=${f(mihm.IHG)}). ` +
      `El sistema está en zona favorable. Φ integrado=${f((mihm.R + mihm.ETE + (mihm.IHG + 1) / 2) / 3)}. ` +
      `Proyección dominante: "${dominant.label}". ` +
      `Puedes capitalizar esta ventana con: ${dominant.attractor}`
  } else if (features.novelty > 0.7) {
    body = `${nodeCtx}Alta novedad narrativa detectada (N=${f(psi.N)}). ` +
      `El sistema procesa señales nuevas. ETE=${f(mihm.ETE)} determina la velocidad de integración. ` +
      `Escenario wildcard activo: "${scenarios[2]?.label}". `
  } else {
    body = `${nodeCtx}Procesando estado actual: IHG=${f(mihm.IHG)}, NTI=${f(mihm.NTI)}, R=${f(mihm.R)}. ` +
      `Sistema en estado ${status}. ` +
      `Φ integrado=${f((mihm.R + mihm.ETE + (mihm.IHG + 1) / 2) / 3)}. ` +
      `Escenario de mayor probabilidad: "${dominant.label}" (P=${f(dominant.probability)}).`
  }

  return body
}

// ── Salon component ────────────────────────────────────────────────────────────

export default function Salon() {
  const { store, dispatch } = useStore()
  const [input, setInput]   = useState('')
  const [elected, setElected] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [store.chat])

  async function send() {
    const text = input.trim()
    if (!text) return
    setInput('')

    const { features, newPsi, newMihm, retroItems, scenarios, response } = processInput(text, store)

    // Add user message immediately
    dispatch({ type: 'ADD_CHAT', messages: [{ role: 'user', text }] })
    dispatch({ type: 'SOCSIM_STEP', psi: newPsi })
    dispatch({ type: 'UPDATE_MIHM', mihm: newMihm })
    dispatch({ type: 'SET_RETRO',   items: retroItems })
    dispatch({ type: 'SET_FUTURE',  scenarios })
    dispatch({ type: 'SET_ATTRACTOR', attractor: scenarios[0]?.attractor ?? null })

    // Try Railway LLM; fall back to local
    const nodeCtx = store.selectedNode
      ? `Nodo activo en Campo Φ: ${store.selectedNode.label} (${store.selectedNode.desc ?? ''}).` : ''
    const railwayNarrative = await fetchNarrative({
      text,
      mihm: newMihm,
      psi:  newPsi,
      context: nodeCtx,
    })

    dispatch({ type: 'ADD_CHAT', messages: [
      { role: 'eidolon', text: railwayNarrative ?? response },
    ]})
  }

  function handleBackcast(scenario) {
    setElected(scenario.type)
    dispatch({ type: 'SET_ATTRACTOR', attractor: scenario.attractor })
    dispatch({ type: 'ADD_CHAT', messages: [
      { role: 'eidolon', text:
        `Backcasting activado hacia "${scenario.label}". ` +
        `Para alcanzar ese futuro desde el estado actual, el atractor es: ${scenario.attractor} ` +
        `Pasos inmediatos: (1) ${scenario.attractor.split('.')[0]}. ` +
        `(2) Monitorear FSoc cada 2 ticks. (3) Sincronizar S y C antes de próxima captura.`
      }
    ]})
  }

  const scColors = { consensus: 'a', efficiency: 'b', wildcard: 'c' }

  return (
    <div>
      <div className="sec">
        <div className="sec-hd">
          <span className="sec-n">01</span>
          <span className="sec-t">Sala Eidolón</span>
          {store.selectedNode && (
            <span className="tag wa" style={{marginLeft:'auto'}}>
              CTX: {store.selectedNode.label}
            </span>
          )}
        </div>
        <div className="sec-d">
          Chat cognitivo con pipeline real: texto → features → actualiza Ψ → recalcula MIHM → patrones → retroactividad + proyección futura.
        </div>
      </div>

      <div className="salon-wrap">
        {/* Chat */}
        <div className="salon-chat">
          <div className="salon-msgs">
            {store.chat.map((m, i) => (
              <div key={i} className={`salon-msg ${m.role}`}>
                <div className="salon-msg-role">
                  {m.role === 'user' ? 'TÚ' : 'EIDOLÓN'}
                </div>
                <div className="salon-msg-txt">{m.text}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="salon-input-row">
            <textarea
              className="txa"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="Escribe aquí… (Enter para enviar, Shift+Enter para nueva línea)"
              style={{borderRadius:0,border:'none'}}
            />
            <button className="salon-send" onClick={send}>ENVIAR →</button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="salon-sidebar">

          {/* Retroactivity */}
          <div className="salon-panel">
            <div className="salon-panel-ttl">PASADO INFERIDO</div>
            {store.retroactivity.length === 0 ? (
              <div style={{fontSize:9,color:'var(--t3)',fontFamily:'monospace'}}>
                Envía un mensaje para inferir el pasado.
              </div>
            ) : store.retroactivity.map((item, i) => (
              <div key={i} className="retro-item">{item}</div>
            ))}
          </div>

          {/* Future scenarios */}
          <div className="salon-panel">
            <div className="salon-panel-ttl">PROYECCIÓN FUTURA</div>
            {store.futureScenarios.length === 0 ? (
              <div style={{fontSize:9,color:'var(--t3)',fontFamily:'monospace'}}>
                Envía un mensaje para generar escenarios.
              </div>
            ) : store.futureScenarios.map((sc, i) => (
              <div key={sc.type} className="future-card">
                <div className={`future-card-lbl ${scColors[sc.type]}`}>{sc.label}</div>
                <div className="future-card-txt">{sc.desc}</div>
                <div style={{marginTop:6,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:9,fontFamily:'monospace',color:'var(--t3)'}}>
                    P={fmt2(sc.probability)}
                  </span>
                  <button
                    className={`btn${elected === sc.type ? ' btn-g' : ''}`}
                    style={{fontSize:7,padding:'3px 8px'}}
                    onClick={() => handleBackcast(sc)}
                  >
                    {elected === sc.type ? 'ELEGIDO' : 'BACKCASTING'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Attractor */}
          {store.attractor && (
            <div className="salon-panel">
              <div className="salon-panel-ttl">ATRACTOR ACTIVO</div>
              <div className="attractor-item">{store.attractor}</div>
            </div>
          )}

          {/* Current Ψ metrics */}
          <div className="salon-panel">
            <div className="salon-panel-ttl">ESTADO Ψ ACTUAL</div>
            {[['A','C','T'],['P','S','R'],['N','X','']].map((row, ri) => (
              <div key={ri} style={{display:'flex',gap:4,marginBottom:4}}>
                {row.filter(Boolean).map(k => (
                  <div key={k} style={{flex:1,background:'var(--bg2)',padding:'4px 6px',border:'.5px solid var(--bdr)'}}>
                    <div style={{fontSize:7,fontFamily:'monospace',color:'var(--t3)',letterSpacing:'.1em'}}>{k}</div>
                    <div style={{fontSize:12,fontFamily:'monospace',color:'var(--t1)'}}>{fmt2(store.socsim[k])}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

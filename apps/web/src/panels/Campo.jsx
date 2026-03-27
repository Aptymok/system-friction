import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { useStore, fmt2 } from '../store.jsx'

// ── Graph data ────────────────────────────────────────────────────────────────

const INIT_NODES = [
  { id: 'IHG',  label: 'IHG',          group: 'mihm',    desc: 'Índice de Homeostasis Global. Eje central del sistema MIHM.' },
  { id: 'NTI',  label: 'NTI',          group: 'mihm',    desc: 'Nivel de Tensión Interna. Antagonista de IHG.' },
  { id: 'R',    label: 'Resiliencia',  group: 'mihm',    desc: 'Capacidad de recuperación ante perturbaciones.' },
  { id: 'IAD',  label: 'IAD',          group: 'mihm',    desc: 'Índice de Atención Distribuida.' },
  { id: 'ETE',  label: 'ETE',          group: 'mihm',    desc: 'Eficiencia de Transición de Estado.' },
  { id: 'Φ',    label: 'Φ Integrado',  group: 'phi',     desc: 'Campo cognitivo integrado. Síntesis de IHG, R y ETE.' },
  { id: 'foco', label: 'Foco',         group: 'pattern', desc: 'Patrón de concentración sostenida. Correlaciona con IAD.' },
  { id: 'stress',label: 'Estrés',      group: 'pattern', desc: 'Activación de respuesta al estresor. Eleva NTI.' },
  { id: 'flow', label: 'Flujo',        group: 'pattern', desc: 'Estado de alta eficiencia. Requiere R > 0.6 y NTI < 0.4.' },
  { id: 'fatiga',label: 'Fatiga',      group: 'pattern', desc: 'Reducción de R. Correlaciona negativamente con ETE.' },
  { id: 'claridad',label:'Claridad',   group: 'pattern', desc: 'Alta coherencia cognitiva. Alimenta Φ.' },
  { id: 'A',    label: 'Activación Ψ', group: 'psi',     desc: 'Activación en SocSim Ψ. Sincroniza con IHG.' },
  { id: 'P',    label: 'Polarización', group: 'psi',     desc: 'Divergencia de perspectivas. Tensiona NTI.' },
  { id: 'C',    label: 'Coherencia Ψ', group: 'psi',     desc: 'Coherencia narrativa. Nutre Claridad y Φ.' },
  { id: 'T',    label: 'Tensión Ψ',   group: 'psi',     desc: 'Tensión social. Eleva Estrés y NTI.' },
]

const LINKS = [
  { source: 'IHG',  target: 'NTI',     strength: 0.8 },
  { source: 'NTI',  target: 'R',       strength: 0.6 },
  { source: 'R',    target: 'ETE',     strength: 0.7 },
  { source: 'ETE',  target: 'IAD',     strength: 0.5 },
  { source: 'IAD',  target: 'IHG',     strength: 0.4 },
  { source: 'IHG',  target: 'Φ',       strength: 0.9 },
  { source: 'R',    target: 'Φ',       strength: 0.7 },
  { source: 'ETE',  target: 'Φ',       strength: 0.5 },
  { source: 'IHG',  target: 'foco',    strength: 0.6 },
  { source: 'NTI',  target: 'stress',  strength: 0.8 },
  { source: 'R',    target: 'flow',    strength: 0.7 },
  { source: 'ETE',  target: 'claridad',strength: 0.6 },
  { source: 'NTI',  target: 'fatiga',  strength: 0.7 },
  { source: 'foco', target: 'flow',    strength: 0.5 },
  { source: 'stress',target:'fatiga',  strength: 0.6 },
  { source: 'flow', target: 'claridad',strength: 0.5 },
  { source: 'claridad',target:'Φ',     strength: 0.6 },
  { source: 'A',    target: 'IHG',     strength: 0.5 },
  { source: 'T',    target: 'NTI',     strength: 0.7 },
  { source: 'C',    target: 'claridad',strength: 0.6 },
  { source: 'P',    target: 'stress',  strength: 0.5 },
]

const GROUP_COLORS = {
  mihm:    '#C8A951',
  phi:     '#E6FF00',
  pattern: '#2A6FAA',
  psi:     '#177A5E',
}

// ── Campo component ───────────────────────────────────────────────────────────

export default function Campo() {
  const { store, dispatch } = useStore()
  const svgRef   = useRef(null)
  const simRef   = useRef(null)
  const [search, setSearch] = useState('')
  const [hovered, setHovered] = useState(null)

  const { mihm, socsim } = store

  // Build node values from live store
  const nodeValues = {
    IHG: (mihm.IHG + 1) / 2,
    NTI: mihm.NTI,
    R:   mihm.R,
    IAD: mihm.IAD,
    ETE: mihm.ETE,
    Φ:   (mihm.R + mihm.ETE + (mihm.IHG + 1) / 2) / 3,
    A: socsim.A, P: socsim.P, C: socsim.C, T: socsim.T,
  }

  const getR = useCallback(id => {
    const v = nodeValues[id] ?? 0.55
    return 6 + v * 14
  }, [mihm, socsim])

  useEffect(() => {
    const svgEl = svgRef.current
    if (!svgEl) return

    const W = svgEl.clientWidth  || 700
    const H = svgEl.clientHeight || 480

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()

    // Defs: glow filter
    const defs = svg.append('defs')
    const filter = defs.append('filter').attr('id', 'glow')
    filter.append('feGaussianBlur').attr('stdDeviation', 3).attr('result', 'coloredBlur')
    const feMerge = filter.append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'coloredBlur')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Grid background
    const defs2 = svg.append('g').attr('class', 'grid-bg')
    for (let x = 0; x < W; x += 40) {
      svg.append('line').attr('x1',x).attr('y1',0).attr('x2',x).attr('y2',H)
         .attr('stroke','rgba(255,255,255,0.025)').attr('stroke-width',0.5)
    }
    for (let y = 0; y < H; y += 40) {
      svg.append('line').attr('x1',0).attr('y1',y).attr('x2',W).attr('y2',y)
         .attr('stroke','rgba(255,255,255,0.025)').attr('stroke-width',0.5)
    }

    const nodes = INIT_NODES.map(n => ({ ...n, value: nodeValues[n.id] ?? 0.5 }))
    const links = LINKS.map(l => ({ ...l }))

    // Force simulation
    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(d => 80 - d.strength * 30).strength(d => d.strength * 0.5))
      .force('charge', d3.forceManyBody().strength(-180))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide(d => getR(d.id) + 8))

    simRef.current = sim

    // Links
    const linkSel = svg.append('g').selectAll('line').data(links).enter().append('line')
      .attr('stroke', d => {
        const src = nodes.find(n => n.id === d.source.id || n.id === d.source)
        return GROUP_COLORS[src?.group] ?? '#2A2825'
      })
      .attr('stroke-opacity', d => 0.15 + d.strength * 0.25)
      .attr('stroke-width', d => d.strength * 1.5)

    // Node groups
    const nodeSel = svg.append('g').selectAll('g').data(nodes).enter().append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (event, d) => { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
        .on('drag',  (event, d) => { d.fx = event.x; d.fy = event.y })
        .on('end',   (event, d) => { if (!event.active) sim.alphaTarget(0); d.fx = null; d.fy = null })
      )
      .on('click', (event, d) => {
        dispatch({ type: 'SELECT_NODE', node: d })
      })
      .on('mouseenter', (event, d) => setHovered(d.id))
      .on('mouseleave', () => setHovered(null))

    nodeSel.append('circle')
      .attr('r', d => getR(d.id))
      .attr('fill', d => GROUP_COLORS[d.group] + '22')
      .attr('stroke', d => GROUP_COLORS[d.group])
      .attr('stroke-width', 0.8)
      .attr('filter', d => d.group === 'phi' ? 'url(#glow)' : null)

    nodeSel.append('text')
      .text(d => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', d => GROUP_COLORS[d.group])
      .attr('font-size', d => d.id === 'Φ' ? 11 : 8)
      .attr('font-family', 'Courier New, monospace')
      .attr('pointer-events', 'none')

    sim.on('tick', () => {
      linkSel
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
      nodeSel.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    return () => sim.stop()
  }, []) // Only once on mount; values update via nodeValues

  // Highlight searched node
  useEffect(() => {
    if (!svgRef.current || !search) return
    const match = INIT_NODES.find(n =>
      n.label.toLowerCase().includes(search.toLowerCase()) ||
      n.id.toLowerCase().includes(search.toLowerCase())
    )
    if (match && simRef.current) {
      const node = simRef.current.nodes().find(n => n.id === match.id)
      if (node) {
        node.fx = (svgRef.current.clientWidth || 700) / 2
        node.fy = (svgRef.current.clientHeight || 480) / 2
        simRef.current.alpha(0.5).restart()
        setTimeout(() => { if (node) { node.fx = null; node.fy = null } }, 1200)
        dispatch({ type: 'SELECT_NODE', node: { ...match, value: nodeValues[match.id] ?? 0.5 } })
      }
    }
  }, [search])

  const sel = store.selectedNode

  return (
    <>
      <div className="sec">
        <div className="sec-hd">
          <span className="sec-n">01</span>
          <span className="sec-t">Campo Cognitivo Φ</span>
        </div>
        <div className="sec-d">
          Grafo de relaciones entre métricas MIHM, patrones cognitivos y variables Ψ.
          Selecciona un nodo para ver detalles y actualizar el contexto de Sala Eidolón.
        </div>
      </div>

      <div className="campo-wrap">
        <div className="campo-graph">
          <svg ref={svgRef} id="campo-svg" />
        </div>

        <div className="campo-sidebar">
          <label className="inp-lbl">BUSCAR NODO</label>
          <input
            className="inp"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="IHG, Flujo, Tensión…"
          />

          {/* Legend */}
          <div style={{marginTop:'1rem'}}>
            {Object.entries(GROUP_COLORS).map(([g, c]) => (
              <div key={g} style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:c,border:`1px solid ${c}`}} />
                <span style={{fontSize:8,fontFamily:'monospace',color:'var(--t3)',letterSpacing:'.1em'}}>
                  {g.toUpperCase()}
                </span>
              </div>
            ))}
          </div>

          {sel && (
            <div className="node-detail">
              <div className="node-detail-ttl">{sel.label}</div>
              <div className="node-detail-sub">{sel.desc}</div>
              <div style={{marginTop:'.75rem'}}>
                {[
                  { l: 'GRUPO', v: sel.group?.toUpperCase() },
                  { l: 'VALOR Φ', v: fmt2(nodeValues[sel.id] ?? sel.value) },
                  { l: 'ID', v: sel.id },
                ].map(m => (
                  <div key={m.l} className="node-metric">
                    <span className="node-metric-l">{m.l}</span>
                    <span className="node-metric-v">{m.v}</span>
                  </div>
                ))}
              </div>
              <div style={{marginTop:'1rem'}}>
                <div className="narr-box">
                  <div className="narr-lbl">CONTEXTO ACTIVO</div>
                  <div className="narr-txt">
                    Nodo "{sel.label}" seleccionado. Sala Eidolón responderá considerando
                    el estado actual de este componente en el campo cognitivo.
                  </div>
                </div>
              </div>
            </div>
          )}

          {!sel && (
            <div style={{marginTop:'1.25rem'}}>
              <div className="narr-box">
                <div className="narr-lbl">INSTRUCCIÓN</div>
                <div className="narr-txt">
                  Haz click en un nodo para ver detalles y activar contexto en Sala Eidolón.
                  Arrastra para reposicionar. Usa la búsqueda para centrar un nodo.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

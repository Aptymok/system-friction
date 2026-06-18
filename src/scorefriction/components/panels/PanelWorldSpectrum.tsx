'use client'

import { useMemo, useState } from 'react'
import { WorldSpectPolygon } from '@/components/worldspect/WorldSpectPolygon'
import { WorldSpectTimeline } from '@/components/worldspect/WorldSpectTimeline'
import { PanelFrame } from './PanelFrame'
import type { Row, ScoreFrictionPanelContext } from './panel-types'
import { n, s } from './panel-types'

const MISSING = 'FALTA INGESTA DE DATOS'

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : []
}

function neuralGraph(context: ScoreFrictionPanelContext) {
  const runtime = record(context.operationalState?.rootNeuralGraphRuntime ?? context.operationalState?.neuralGraphRuntime)
  return {
    nodes: rows(runtime.nodes ?? runtime.graphNodes ?? context.operationalState?.nodes),
    edges: rows(runtime.edges ?? runtime.graphEdges ?? context.operationalState?.edges),
  }
}

export function PanelWorldSpectrum({ context }: { context: ScoreFrictionPanelContext }) {
  const [filter, setFilter] = useState<'all' | 'worldspect' | 'scorefriction' | 'high'>('all')
  const snapshots = context.world ? [context.world] : []
  const graph = useMemo(() => neuralGraph(context), [context])
  const filteredNodes = graph.nodes.filter((node) => {
    const source = `${s(node.source ?? node.module ?? node.scope, '')} ${s(node.label ?? node.name ?? node.id, '')}`.toLowerCase()
    if (filter === 'all') return true
    if (filter === 'worldspect') return source.includes('world') || source.includes('spectrum')
    if (filter === 'scorefriction') return source.includes('scorefriction') || source.includes('sfi')
    return n(node.score ?? node.weight ?? node.activation ?? node.phi, 0) >= 0.5
  })

  return (
    <PanelFrame title="WORLD SPECTRUM / NODOS DEL MUNDO" topo="ZONE-A" className="w-[390px]">
      <div className="grid h-full grid-cols-[minmax(280px,0.9fr)_minmax(360px,1.1fr)] gap-3 p-3">
        <div className="grid min-h-0 grid-rows-[1fr_auto] gap-3">
          <WorldSpectPolygon snapshot={context.world} className="min-h-0" />
          <WorldSpectTimeline snapshots={snapshots} />
        </div>
        <div className="grid min-h-0 grid-rows-[auto_1fr_auto] gap-2">
          <div className="flex flex-wrap gap-2">
            {(['all', 'worldspect', 'scorefriction', 'high'] as const).map((item) => (
              <button key={item} onClick={() => setFilter(item)} className={filter === item ? 'border border-[#d8b64a66] bg-[#d8b64a18] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[#e0c46c]' : 'border border-[#d8b64a24] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[#8a8172]'}>
                {item}
              </button>
            ))}
          </div>
          <div className="min-h-0 overflow-auto border border-[#d8b64a12] bg-[#080706]/80 p-2 font-mono text-[9px] leading-5 text-[#9c9282]">
            {filteredNodes.length ? filteredNodes.slice(0, 32).map((node, index) => (
              <div key={`${s(node.id, String(index))}-${index}`} className="mb-2 border-b border-[#d8b64a12] pb-2">
                <div className="text-[#e0c46c]">{s(node.label ?? node.name ?? node.id, MISSING)}</div>
                <div>scope {s(node.scope ?? node.module ?? node.source, 'world')}</div>
                <div>activation {n(node.activation ?? node.score ?? node.weight ?? node.phi, 0).toFixed(2)}</div>
              </div>
            )) : MISSING}
          </div>
          <div className="grid grid-cols-3 gap-2 font-mono text-[8px] uppercase tracking-[0.13em] text-[#8a8172]">
            <div className="border border-[#d8b64a18] bg-[#080706] p-2">nodes<br /><span className="text-[#e0c46c]">{graph.nodes.length || MISSING}</span></div>
            <div className="border border-[#d8b64a18] bg-[#080706] p-2">edges<br /><span className="text-[#e0c46c]">{graph.edges.length || MISSING}</span></div>
            <div className="border border-[#d8b64a18] bg-[#080706] p-2">filter<br /><span className="text-[#e0c46c]">{filter}</span></div>
          </div>
        </div>
      </div>
    </PanelFrame>
  )
}

'use client'

import { WorldSpectPolygon } from '@/components/worldspect/WorldSpectPolygon'
import { WorldSpectTimeline } from '@/components/worldspect/WorldSpectTimeline'
import { PanelFrame } from './PanelFrame'
import type { ScoreFrictionPanelContext } from './panel-types'

export function PanelWorldSpectrum({ context }: { context: ScoreFrictionPanelContext }) {
  const snapshots = context.world ? [context.world] : []
  return (
    <PanelFrame title="WORLD SPECTRUM" topo="ZONE-A" className="w-[390px]">
      <div className="grid h-full grid-rows-[1fr_auto] gap-3">
        <WorldSpectPolygon snapshot={context.world} className="min-h-0" />
        <WorldSpectTimeline snapshots={snapshots} />
      </div>
    </PanelFrame>
  )
}

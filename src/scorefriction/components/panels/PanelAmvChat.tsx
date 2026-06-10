'use client'

import { AmvChat } from '@/components/amv/AmvChat'
import { PanelFrame } from './PanelFrame'
import type { ScoreFrictionPanelContext } from './panel-types'

export function PanelAmvChat({ context }: { context: ScoreFrictionPanelContext }) {
  return (
    <PanelFrame title="AMV CHAT" topo="ZONE-C" className="w-[430px]">
      <AmvChat
        module="scorefriction"
        sessionId={context.caseId}
        title="AMV / ScoreFriction"
        context={{
          caseId: context.caseId,
          metrics: context.metrics,
          world: context.world,
          pipeline: context.pipeline,
        }}
        compact
      />
    </PanelFrame>
  )
}

import type { AmvGraphState } from './amvGraphTypes'

export type AmvMessagePassingResult = {
  scope: string
  propagated: Array<{ nodeId: string; message: string }>
  sandboxOnly: true
}

export function passAmvGraphMessages(graph: AmvGraphState): AmvMessagePassingResult {
  return {
    scope: graph.globalU.scope,
    sandboxOnly: true,
    propagated: graph.nodes.map((node) => ({
      nodeId: node.id,
      message: `${node.label}: ${node.evidenceTrust}/${node.archiveLayer}`,
    })),
  }
}

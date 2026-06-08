import { rootDashboardSpec } from '../scopes/root/rootDashboardSpec'
import { governanceRealityDashboardSpec } from '../scopes/governance-reality/governance-realityDashboardSpec'
import { scorefrictionDashboardSpec } from '../scopes/scorefriction/scorefrictionDashboardSpec'
import { clusterAtlasDashboardSpec } from '../scopes/cluster-atlas/cluster-atlasDashboardSpec'
import { signalVaneDashboardSpec } from '../scopes/signal-vane/signal-vaneDashboardSpec'
import { cognitiveTwinEngineDashboardSpec } from '../scopes/cognitive-twin-engine/cognitive-twin-engineDashboardSpec'
import type { AmvInstrumentDefinition } from '../core/instrumentTypes'

const AMV_INSTRUMENTS: Record<string, AmvInstrumentDefinition> = {
  [rootDashboardSpec.instrument.id]: rootDashboardSpec.instrument,
  [governanceRealityDashboardSpec.instrument.id]: governanceRealityDashboardSpec.instrument,
  [scorefrictionDashboardSpec.instrument.id]: scorefrictionDashboardSpec.instrument,
  [clusterAtlasDashboardSpec.instrument.id]: clusterAtlasDashboardSpec.instrument,
  [signalVaneDashboardSpec.instrument.id]: signalVaneDashboardSpec.instrument,
  [cognitiveTwinEngineDashboardSpec.instrument.id]: cognitiveTwinEngineDashboardSpec.instrument,
}

export function getAmvInstrument(id: string) {
  return AMV_INSTRUMENTS[id]
}

export function getAmvInstrumentByScope(scope: string) {
  return Object.values(AMV_INSTRUMENTS).find((instrument) => instrument.scope === scope)
}

export function listAmvInstruments() {
  return Object.values(AMV_INSTRUMENTS)
}

import { rootDashboardSpec } from '../scopes/root/rootDashboardSpec'
import { governanceRealityDashboardSpec } from '../scopes/governance-reality/governance-realityDashboardSpec'
import { scorefrictionDashboardSpec } from '../scopes/scorefriction/scorefrictionDashboardSpec'
import { clusterAtlasDashboardSpec } from '../scopes/cluster-atlas/cluster-atlasDashboardSpec'
import { signalVaneDashboardSpec } from '../scopes/signal-vane/signal-vaneDashboardSpec'
import { cognitiveTwinEngineDashboardSpec } from '../scopes/cognitive-twin-engine/cognitive-twin-engineDashboardSpec'
import type { AmvDashboardSpec } from '../core/dashboardSpecTypes'

const AMV_DASHBOARDS: Record<string, AmvDashboardSpec> = {
  [rootDashboardSpec.id]: rootDashboardSpec,
  [governanceRealityDashboardSpec.id]: governanceRealityDashboardSpec,
  [scorefrictionDashboardSpec.id]: scorefrictionDashboardSpec,
  [clusterAtlasDashboardSpec.id]: clusterAtlasDashboardSpec,
  [signalVaneDashboardSpec.id]: signalVaneDashboardSpec,
  [cognitiveTwinEngineDashboardSpec.id]: cognitiveTwinEngineDashboardSpec,
}

export function getAmvDashboard(id: string) {
  return AMV_DASHBOARDS[id]
}

export function getAmvDashboardByScope(scope: string) {
  return Object.values(AMV_DASHBOARDS).find((dashboard) => dashboard.scope === scope)
}

export function listAmvDashboards() {
  return Object.values(AMV_DASHBOARDS)
}

import { clusterAtlasDashboardSpec } from '../scopes/cluster-atlas/cluster-atlasDashboardSpec'

export const clusterAtlasAgent = {
  id: 'cluster-atlas-agent',
  scope: clusterAtlasDashboardSpec.scope,
  canExecuteExternal: false,
  briefing: clusterAtlasDashboardSpec.instrument.amvBriefing,
}

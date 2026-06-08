import { governanceRealityDashboardSpec } from '../scopes/governance-reality/governance-realityDashboardSpec'

export const governanceRealityAgent = {
  id: 'governance-reality-agent',
  scope: governanceRealityDashboardSpec.scope,
  canExecuteExternal: false,
  briefing: governanceRealityDashboardSpec.instrument.amvBriefing,
}

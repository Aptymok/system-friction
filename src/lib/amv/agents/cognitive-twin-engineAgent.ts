import { cognitiveTwinEngineDashboardSpec } from '../scopes/cognitive-twin-engine/cognitive-twin-engineDashboardSpec'

export const cognitiveTwinEngineAgent = {
  id: 'cognitive-twin-engine-agent',
  scope: cognitiveTwinEngineDashboardSpec.scope,
  canExecuteExternal: false,
  python: 'available_not_invoked',
  briefing: cognitiveTwinEngineDashboardSpec.instrument.amvBriefing,
}

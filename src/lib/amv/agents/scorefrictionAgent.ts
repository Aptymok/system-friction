import { scorefrictionDashboardSpec } from '../scopes/scorefriction/scorefrictionDashboardSpec'

export const scorefrictionAgent = {
  id: 'scorefriction-agent',
  scope: scorefrictionDashboardSpec.scope,
  canExecuteExternal: false,
  briefing: scorefrictionDashboardSpec.instrument.amvBriefing,
}

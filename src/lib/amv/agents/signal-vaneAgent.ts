import { signalVaneDashboardSpec } from '../scopes/signal-vane/signal-vaneDashboardSpec'

export const signalVaneAgent = {
  id: 'signal-vane-agent',
  scope: signalVaneDashboardSpec.scope,
  canExecuteExternal: false,
  briefing: signalVaneDashboardSpec.instrument.amvBriefing,
}

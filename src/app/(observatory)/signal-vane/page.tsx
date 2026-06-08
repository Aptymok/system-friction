import { signalVaneDashboardSpec } from '@/lib/amv/scopes/signal-vane/signal-vaneDashboardSpec'
import { ScopedDashboardShell } from '@/observatory/components/amv/ScopedDashboardShell'

export default function SignalVanePage() {
  return <ScopedDashboardShell spec={signalVaneDashboardSpec} />
}

import { governanceRealityDashboardSpec } from '@/lib/amv/scopes/governance-reality/governance-realityDashboardSpec'
import { ScopedDashboardShell } from '@/observatory/components/amv/ScopedDashboardShell'

export default function GovernanceRealityPage() {
  return <ScopedDashboardShell spec={governanceRealityDashboardSpec} />
}

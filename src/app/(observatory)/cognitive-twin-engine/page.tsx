import { cognitiveTwinEngineDashboardSpec } from '@/lib/amv/scopes/cognitive-twin-engine/cognitive-twin-engineDashboardSpec'
import { ScopedDashboardShell } from '@/observatory/components/amv/ScopedDashboardShell'

export default function CognitiveTwinEnginePage() {
  return <ScopedDashboardShell spec={cognitiveTwinEngineDashboardSpec} />
}

import { clusterAtlasDashboardSpec } from '@/lib/amv/scopes/cluster-atlas/cluster-atlasDashboardSpec'
import { ScopedDashboardShell } from '@/observatory/components/amv/ScopedDashboardShell'

export default function ClusterAtlasPage() {
  return <ScopedDashboardShell spec={clusterAtlasDashboardSpec} />
}

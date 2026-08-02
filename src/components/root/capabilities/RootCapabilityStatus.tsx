import type { StudioCapabilityState } from '@/lib/studio/capabilities/studioCapabilityInventory';

export function RootCapabilityStatus({ status }: { status: StudioCapabilityState }) {
  return <span className={`root-capability-status is-${status.toLowerCase().replace(/_/g, '-')}`}>{status}</span>;
}

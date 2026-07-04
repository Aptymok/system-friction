import 'server-only';
import { readGovernanceRuntime } from '@/lib/governance/governanceRuntime';

export type RootHudGovernanceSnapshot = {
  acpStatus: 'active' | 'blind' | 'degraded';
  blindMode: boolean;
  acpLastSeenAt: string | null;
  acpTimeoutHours: number;
  acpExpired: boolean;
  sourceState: 'observed' | 'inferred' | 'missing';
  warning: string | null;
  source: string;
};

export const ROOT_HUD_GOVERNANCE_PENDING: RootHudGovernanceSnapshot = {
  acpStatus: 'degraded',
  blindMode: true,
  acpLastSeenAt: null,
  acpTimeoutHours: 48,
  acpExpired: true,
  sourceState: 'missing',
  warning: 'governance_snapshot_not_loaded',
  source: 'DATA GATED: governance runtime not loaded in ROOT shell props',
};

export async function getRootHudGovernanceSnapshot(): Promise<RootHudGovernanceSnapshot> {
  const runtime = await readGovernanceRuntime();
  return {
    acpStatus: runtime.status === 'active' ? 'active' : runtime.blindMode ? 'blind' : 'degraded',
    blindMode: runtime.blindMode,
    acpLastSeenAt: runtime.acpLastSeenAt,
    acpTimeoutHours: runtime.acpTimeoutHours,
    acpExpired: runtime.acpExpired,
    sourceState: runtime.sourceState,
    warning: runtime.warning,
    source: 'readGovernanceRuntime()',
  };
}

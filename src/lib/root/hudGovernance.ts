export type RootHudGovernanceStatus = 'active' | 'degraded' | 'blind';

export type RootHudGovernanceSnapshot = {
  acpStatus: RootHudGovernanceStatus;
  acpLastSeenAt: string | null;
  source: string;
};

export const ROOT_HUD_GOVERNANCE_PENDING: RootHudGovernanceSnapshot = {
  acpStatus: 'degraded',
  acpLastSeenAt: null,
  source: 'DATA GATED: governance runtime not loaded in ROOT shell props',
};

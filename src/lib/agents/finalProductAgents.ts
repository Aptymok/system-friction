export type FinalAgentScope = 'public' | 'authenticated_user' | 'studio' | 'root';

export type FinalAgentContract = {
  scope: FinalAgentScope;
  may: string[];
  mustNot: string[];
  writeBoundary: string;
};

export const FINAL_AGENT_CONTRACTS: FinalAgentContract[] = [
  {
    scope: 'public',
    may: ['observe public sources', 'verify public links', 'index public documentation', 'prepare recommendations and drafts'],
    mustNot: ['write private DB', 'read private evidence', 'access ROOT or STUDIO data', 'close tasks', 'publish externally'],
    writeBoundary: 'read_only_without_safe_public_write_contract',
  },
  {
    scope: 'authenticated_user',
    may: ['evaluate own objective', 'propose minimal perturbation tasks', 'evaluate uploaded evidence', 'recommend attractor candidates'],
    mustNot: ['change global SFI state', 'read another user evidence', 'approve root mutations', 'access studio data'],
    writeBoundary: 'owned_user_event_only_when_existing_safe_contract_exists',
  },
  {
    scope: 'studio',
    may: ['evaluate registered music metadata', 'propose producer tasks', 'track manual Instagram signals', 'summarize project memory', 'force decision gates'],
    mustNot: ['publish automatically', 'send client messages automatically', 'delete material without confirmation', 'mutate global SFI state'],
    writeBoundary: 'local_only_until_studio_event_contract_is_approved',
  },
  {
    scope: 'root',
    may: ['propose mutations', 'prepare system actions', 'approve or reject safe proposals after confirmation', 'propose repository ingestion', 'register safe outcomes'],
    mustNot: ['bypass founder confirmation', 'expose service-role to client', 'use ungated SFI write endpoints', 'publish private evidence publicly'],
    writeBoundary: 'root_gated_safe_endpoints_only',
  },
];

export function publicAgentSummary() {
  return FINAL_AGENT_CONTRACTS.map((contract) => ({
    scope: contract.scope,
    may: contract.may,
    must_not: contract.mustNot,
    write_boundary: contract.writeBoundary,
  }));
}

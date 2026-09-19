export const SFI_CAPABILITY_PACKAGE_CATALOG_CONTRACT = 'SFI-CAPABILITY-PACKAGE-CATALOG-1.0' as const;

export type SfiCapabilityPackageDistributionState =
  | 'LIVE_MCP'
  | 'LIVE_API_MCP_PENDING'
  | 'INSTITUTIONAL_ONLY';

export type SfiCapabilityPackage = Readonly<{
  id: string;
  label: string;
  summary: string;
  separatelyPackageable: boolean;
  distributionState: SfiCapabilityPackageDistributionState;
  pluginPackageId: string | null;
  mcp: Readonly<{
    serverId: string | null;
    endpoint: string | null;
    toolNames: readonly string[];
  }>;
  oauthScopes: readonly string[];
  authorityBoundary: string;
  existingSurfaces: readonly string[];
  commercialization: Readonly<{
    pricing: 'UNSET';
    listingState: 'NOT_SUBMITTED';
  }>;
}>;

export const SFI_CAPABILITY_PACKAGES: readonly SfiCapabilityPackage[] = Object.freeze([
  {
    id: 'sfi-observatory',
    label: 'SFI Observatory',
    summary: 'Public governed observation, world-state and institutional evidence surfaces.',
    separatelyPackageable: true,
    distributionState: 'LIVE_MCP',
    pluginPackageId: 'sfi-observatory',
    mcp: {
      serverId: 'org.systemfriction/public',
      endpoint: '/api/mcp/public',
      toolNames: ['get_public_world_state', 'get_public_evidence', 'get_public_return'],
    },
    oauthScopes: [],
    authorityBoundary: 'PUBLIC_READ_ONLY; no private state, no canon mutation, no execution.',
    existingSurfaces: ['/field', '/api/mcp/public'],
    commercialization: { pricing: 'UNSET', listingState: 'NOT_SUBMITTED' },
  },
  {
    id: 'sfi-research',
    label: 'SFI Research Graph',
    summary: 'Public research graph, methods, concepts, instruments and evidence projections.',
    separatelyPackageable: true,
    distributionState: 'LIVE_MCP',
    pluginPackageId: 'sfi-research',
    mcp: {
      serverId: 'org.systemfriction/public',
      endpoint: '/api/mcp/public',
      toolNames: ['get_public_research', 'search_concepts', 'get_concept', 'search_methods', 'get_method', 'search_instruments'],
    },
    oauthScopes: [],
    authorityBoundary: 'PUBLIC_READ_ONLY; public canonical projections only.',
    existingSurfaces: ['/repository', '/api/mcp/public'],
    commercialization: { pricing: 'UNSET', listingState: 'NOT_SUBMITTED' },
  },
  {
    id: 'sfi-studio',
    label: 'SFI Studio',
    summary: 'Owner-scoped audio/video context, inspection, analysis, attachment intake and bounded material production.',
    separatelyPackageable: true,
    distributionState: 'LIVE_MCP',
    pluginPackageId: 'sfi-studio',
    mcp: {
      serverId: 'org.systemfriction/studio',
      endpoint: '/api/mcp/studio',
      toolNames: [
        'studio_context',
        'studio_list',
        'studio_inspect',
        'studio_features',
        'studio_content',
        'studio_analyze',
        'studio_ingest_analyze',
        'studio_produce',
      ],
    },
    oauthScopes: ['studio:read', 'studio:content', 'studio:run'],
    authorityBoundary: 'OWNER_SCOPED; OAuth subject binds owner_id; rights transfer=false; canonical promotion=false.',
    existingSurfaces: ['/studio', '/api/external/v1/studio', '/api/mcp/studio'],
    commercialization: { pricing: 'UNSET', listingState: 'NOT_SUBMITTED' },
  },
  {
    id: 'sfi-cases',
    label: 'SFI Cases',
    summary: 'Owner-scoped case intake, reading, creation and governed transition surfaces.',
    separatelyPackageable: true,
    distributionState: 'LIVE_API_MCP_PENDING',
    pluginPackageId: 'sfi-cases',
    mcp: { serverId: null, endpoint: null, toolNames: [] },
    oauthScopes: ['cases:read', 'cases:write'],
    authorityBoundary: 'OWNER_OR_INSTITUTION_SCOPED; case operations do not imply canon authority.',
    existingSurfaces: ['/api/external/v1/cases', '/api/external/v1/cases/intake', '/api/external/v1/cases/create'],
    commercialization: { pricing: 'UNSET', listingState: 'NOT_SUBMITTED' },
  },
  {
    id: 'sfi-method-lab',
    label: 'SFI Method Lab',
    summary: 'Bounded personal or institutional method-lab state, structured records and supported runtime execution.',
    separatelyPackageable: true,
    distributionState: 'LIVE_API_MCP_PENDING',
    pluginPackageId: 'sfi-method-lab',
    mcp: { serverId: null, endpoint: null, toolNames: [] },
    oauthScopes: ['lab:read', 'lab:write', 'lab:run'],
    authorityBoundary: 'OWNER_OR_INSTITUTION_SCOPED; runtime execution does not inherit ROOT or canon authority.',
    existingSurfaces: ['/api/external/v1/lab', '/api/external/v1/personal-lab'],
    commercialization: { pricing: 'UNSET', listingState: 'NOT_SUBMITTED' },
  },
  {
    id: 'sfi-governed-execution',
    label: 'SFI Governed Execution',
    summary: 'Institutional capability invocation through the existing authenticated governed-machine adapter.',
    separatelyPackageable: false,
    distributionState: 'INSTITUTIONAL_ONLY',
    pluginPackageId: null,
    mcp: {
      serverId: 'org.systemfriction/authenticated',
      endpoint: '/api/mcp/authenticated',
      toolNames: ['invoke_cognitive_capability'],
    },
    oauthScopes: ['observe', 'execute'],
    authorityBoundary: 'INSTITUTIONAL_ONLY; ACTIVE capability grant and possession proof required; no authority inheritance.',
    existingSurfaces: ['/api/mcp/authenticated', '/api/external/v1/cognitive-runtime'],
    commercialization: { pricing: 'UNSET', listingState: 'NOT_SUBMITTED' },
  },
]);

export function publicCapabilityPackageProjection() {
  return {
    contract: SFI_CAPABILITY_PACKAGE_CATALOG_CONTRACT,
    count: SFI_CAPABILITY_PACKAGES.length,
    packages: SFI_CAPABILITY_PACKAGES,
    boundaries: {
      rootIsProduct: false,
      canonAuthorityForSale: false,
      capabilityImpliesAuthority: false,
      pricingDeclared: false,
      pluginListingSubmitted: false,
    },
  } as const;
}

export const SFI_DISCOVERY_CRAWLER_POLICY_CONTRACT = 'SFI-DISCOVERY-CRAWLER-POLICY-1.0' as const;

export const SFI_PUBLIC_DISCOVERY_PATHS = Object.freeze([
  '/',
  '/institution',
  '/field',
  '/systems',
  '/archive',
  '/falsification',
  '/optionality',
  '/governance',
  '/authority',
  '/agents',
  '/identity',
  '/models',
  '/genai',
  '/concepts/',
  '/methods/',
  '/instruments/',
  '/feed.xml',
  '/feed.atom',
  '/feed.json',
  '/llms.txt',
  '/llms-full.txt',
  '/ai-index.json',
  '/ai-policy',
  '/field-schema.json',
  '/openapi.json',
  '/api/external/v1/manifest',
  '/api/public/history',
] as const);

export const SFI_PRIVATE_DISCOVERY_PREFIXES = Object.freeze([
  '/root',
  '/login',
  '/api/root',
  '/api/oauth',
  '/api/external/v1/observe',
  '/api/external/v1/propose',
  '/api/external/v1/execute',
  '/api/external/v1/lab',
  '/api/external/v1/result',
  '/api/external/v1/cognitive',
  '/api/external/v1/cases',
] as const);

export const SFI_SEARCH_DISCOVERY_BOTS = Object.freeze([
  'Googlebot',
  'Bingbot',
  'OAI-SearchBot',
  'PerplexityBot',
] as const);

export const SFI_TRAINING_REUSE_BOTS = Object.freeze([
  'GPTBot',
  'CCBot',
  'ClaudeBot',
  'Google-Extended',
] as const);

export const SFI_DISCOVERY_CRAWLER_POLICY = Object.freeze({
  contract: SFI_DISCOVERY_CRAWLER_POLICY_CONTRACT,
  searchDiscovery: {
    state: 'ALLOWED_PUBLIC_ONLY' as const,
    bots: SFI_SEARCH_DISCOVERY_BOTS,
    allow: SFI_PUBLIC_DISCOVERY_PATHS,
    disallow: SFI_PRIVATE_DISCOVERY_PREFIXES,
    purpose: 'Permit search/retrieval discovery of already-public SFI canonical representations.',
  },
  modelTrainingDataReuse: {
    state: 'DISALLOWED_BY_POLICY' as const,
    bots: SFI_TRAINING_REUSE_BOTS,
    disallow: ['/'] as const,
    purpose: 'Discovery permission is not blanket permission for model training or bulk data reuse.',
  },
  private: {
    state: 'NEVER_PUBLIC_DISCOVERY' as const,
    prefixes: SFI_PRIVATE_DISCOVERY_PREFIXES,
  },
  authorityBoundary: {
    crawlerAccessIsNotPublicationAuthority: true,
    crawlerAccessIsNotCanon: true,
    crawlerAccessIsNotTrainingConsent: true,
    privateMaterialNeverPromotedByCrawlerPolicy: true,
  },
});

export function sfiRobotsRules() {
  return [
    {
      userAgent: '*',
      allow: [...SFI_PUBLIC_DISCOVERY_PATHS],
      disallow: ['/root', '/login', '/api/'],
    },
    {
      userAgent: [...SFI_SEARCH_DISCOVERY_BOTS],
      allow: [...SFI_PUBLIC_DISCOVERY_PATHS],
      disallow: [...SFI_PRIVATE_DISCOVERY_PREFIXES],
    },
    {
      userAgent: [...SFI_TRAINING_REUSE_BOTS],
      disallow: ['/'],
    },
  ];
}

export const SFI_ENTITY_COHERENCE_CONTRACT = 'SFI-ENTITY-COHERENCE-1.0' as const;

export const SFI_CANONICAL_IDENTITY_FINGERPRINT = Object.freeze({
  name: 'System Friction Institute',
  abbreviation: 'SFI',
  canonicalUrl: 'https://systemfriction.org',
  entityId: 'https://systemfriction.org/#sfi',
  preferredHandle: 'systemfriction',
  secondaryHandle: 'systemfrictioninstitute',
  avoidName: 'Systemic Friction Institute',
});

export type SfiExternalIdentityState = 'UNCLAIMED' | 'CLAIMED' | 'VERIFIED' | 'DEGRADED' | 'LOST';
export type SfiExternalIdentityClass = 'INSTITUTION_PROFILE' | 'CONTROLLED_ASSET' | 'RELATED_PERSON';

export type SfiExternalIdentityNode = Readonly<{
  key: string;
  url: string;
  state: SfiExternalIdentityState;
  identityClass: SfiExternalIdentityClass;
  relationship: string;
}>;

export const SFI_EXTERNAL_IDENTITY_NODES = Object.freeze([
  {
    key: 'github-repository',
    url: 'https://github.com/Aptymok/system-friction',
    state: 'VERIFIED',
    identityClass: 'CONTROLLED_ASSET',
    relationship: 'CONTROLLED_SOFTWARE_SOURCE_ASSET',
  },
  {
    key: 'medium-profile',
    url: 'https://medium.com/@systemfriction',
    state: 'CLAIMED',
    identityClass: 'INSTITUTION_PROFILE',
    relationship: 'EXTERNAL_DISTRIBUTION_PROFILE',
  },
  {
    key: 'linkedin-person-reference',
    url: 'https://es.linkedin.com/posts/juanliera_en-febrero-escrib%C3%AD-que-la-resiliencia-real-activity-7462671453969104896-xsQt',
    state: 'CLAIMED',
    identityClass: 'RELATED_PERSON',
    relationship: 'RELATED_PERSON_PUBLIC_REFERENCE',
  },
] satisfies readonly SfiExternalIdentityNode[]);

export const SFI_DISAMBIGUATION_RISKS = Object.freeze([
  {
    key: 'systemic-friction-institute',
    name: 'Systemic Friction Institute, Inc',
    url: 'https://www.systemfrictioninstitute.com/',
    classification: 'COLLISION_CANDIDATE / DISAMBIGUATION_RISK',
    observedCollision: false,
  },
] as const);

export type SfiSameAsDisposition = Readonly<{
  eligible: boolean;
  reason: 'ELIGIBLE' | 'STATE_NOT_VERIFIED' | 'NOT_ENTITY_EQUIVALENT' | 'INVALID_EXTERNAL_URL' | 'SELF_CANONICAL_URL';
}>;

function normalizedExternalUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null;
    parsed.hash = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

export function institutionalSameAsDisposition(node: SfiExternalIdentityNode): SfiSameAsDisposition {
  if (node.state !== 'VERIFIED') return { eligible: false, reason: 'STATE_NOT_VERIFIED' };
  if (node.identityClass !== 'INSTITUTION_PROFILE') return { eligible: false, reason: 'NOT_ENTITY_EQUIVALENT' };

  const normalized = normalizedExternalUrl(node.url);
  if (!normalized) return { eligible: false, reason: 'INVALID_EXTERNAL_URL' };

  const canonical = normalizedExternalUrl(SFI_CANONICAL_IDENTITY_FINGERPRINT.canonicalUrl);
  if (normalized === canonical) return { eligible: false, reason: 'SELF_CANONICAL_URL' };

  return { eligible: true, reason: 'ELIGIBLE' };
}

export function verifiedInstitutionSameAs(
  nodes: readonly SfiExternalIdentityNode[] = SFI_EXTERNAL_IDENTITY_NODES,
): readonly string[] {
  const eligible = nodes
    .filter((node) => institutionalSameAsDisposition(node).eligible)
    .map((node) => normalizedExternalUrl(node.url))
    .filter((value): value is string => Boolean(value));

  return Object.freeze([...new Set(eligible)].sort());
}

const VERIFIED_INSTITUTION_SAME_AS = verifiedInstitutionSameAs();

export const SFI_PUBLIC_PROFILE = {
  contract: 'SFI-PUBLIC-INSTITUTION-PROFILE-1.0',
  generatedFrom: ['README.md', 'public/ai-index.json', 'src/app/api/external/v1/manifest/route.ts', 'public GitHub history'],
  institution: {
    name: SFI_CANONICAL_IDENTITY_FINGERPRINT.name,
    abbreviation: SFI_CANONICAL_IDENTITY_FINGERPRINT.abbreviation,
    canonicalUrl: SFI_CANONICAL_IDENTITY_FINGERPRINT.canonicalUrl,
    entityId: SFI_CANONICAL_IDENTITY_FINGERPRINT.entityId,
    verifiedSameAs: VERIFIED_INSTITUTION_SAME_AS,
    type: 'independent structural-field research institute',
    primaryDefinition: 'System Friction Institute makes visible the friction that systems learn to normalize.',
    operationalDefinition: 'An evidence-governed instrument for observing a signal inside a changing field, proposing a minimal intervention and learning from the documented difference between prediction and outcome.',
    canonicalQuestion: 'What structural configuration of a signal, under what world state and field conditions, produces particular patterns of propagation, persistence, transformation or disappearance?',
  },
  operatingPrinciple: 'Observation, evidence, inference, authorization, execution, return and memory remain distinguishable and traceable.',
  instruments: [
    { key: 'MIHM', name: 'Marco Integrado de Homeostasis Multivariable', role: 'Structural measurement and friction/homeostasis conditions with explicit evidence and missing-data handling.' },
    { key: 'MOP-H', name: 'Minimal Observation and Perturbation Protocol', role: 'Governed minimal-intervention hypothesis, return preservation and later comparison against T0.' },
    { key: 'WorldSpect', name: 'World Spectrum Observation', role: 'Persist world-state snapshots, source health, confidence and longitudinal domain observations.' },
    { key: 'World Vector', name: 'World Vector', role: 'Represent current domain values, tensions, dominant signals and observed context.' },
    { key: 'AMV', name: 'Adaptive Meta-Observer', role: 'Accumulate signal measurements, evidence, provisional predictions, interventions, outcomes and governed learning.' },
    { key: 'Atlas', name: 'Atlas / SFI Reference Bank', role: 'Normalize observable cases and connect evidence, prediction-at-T0, outcomes and model versions.' },
    { key: 'Cognitive Twin', name: 'Cognitive Twin', role: 'Governed longitudinal reconstruction, interpretation and proposal layer; not autonomous institutional authority.' },
    { key: 'Method Lab', name: 'Method Lab', role: 'Governed experimental and simulation environment that preserves SIMULATED/DERIVED apart from OBSERVED/VERIFIED_CONTRAST.' },
  ],
  lifecycle: [
    'OBSERVATION',
    'EVIDENCE',
    'INFERENCE',
    'HYPOTHESIS / PREDICTION',
    'METHOD LAB / MINIMAL INTERVENTION',
    'PROPOSAL',
    'ROOT AUTHORIZATION',
    'EXECUTION',
    'RETURN / OUTCOME',
    'REALITY CALIBRATION',
    'GOVERNED MEMORY',
  ],
  epistemicClasses: ['OBSERVED', 'DECLARED', 'DERIVED', 'INFERRED', 'PROJECTED', 'SIMULATED', 'WEAK_SIGNAL', 'MISSING', 'ARCHIVED'],
  invariants: [
    'MISSING remains MISSING; absence is not converted to zero.',
    'MODEL OUTPUT is not OBSERVATION.',
    'SIMULATION is not OBSERVATION.',
    'RELATION is not CAUSALITY.',
    'PUBLICATION or ENGAGEMENT is not validation.',
    'GOVERNANCE is not truth.',
    'Cognitive Twin proposal is not institutional authorization.',
    'Canonical promotion requires the applicable governed authority.',
  ],
  publicSurfaces: [
    { path: '/', role: 'Live institutional observation threshold / FIELD' },
    { path: '/field', role: 'Live geospatial and multiscale field' },
    { path: '/systems', role: 'System boundaries, relations, exchange and persistence' },
    { path: '/archive', role: 'Source, archive, indexing, provenance and context loss' },
    { path: '/falsification', role: 'Hypotheses, instruments, thresholds and rival explanations' },
    { path: '/optionality', role: 'Reserve, redundancy, reversibility and open futures' },
    { path: '/governance', role: 'Governance cycle from observation to memory' },
    { path: '/authority', role: 'Authority, evidence and recovery as longitudinal variables' },
    { path: '/agents', role: 'Agent authority envelopes, identity, scopes, tools and consequences' },
    { path: '/identity', role: 'Task, profession, identity, machine capability and context' },
    { path: '/models', role: 'Observable generative-model processes' },
    { path: '/genai', role: 'Operational anatomy of governed GenAI applications' },
    { path: '/history', role: 'Observed institutional history with provenance' },
    { path: '/privacy', role: 'Privacy and external-agent data policy' },
  ],
  externalAi: {
    discovery: '/api/external/v1/manifest',
    openapi: '/openapi.json',
    console: '/api/external/v1/console',
    operations: ['observe', 'propose', 'execute', 'lab'],
    authentication: 'X-SFI-Token or Bearer token with explicit scopes',
    governance: 'External agents may operate only inside their granted scopes; ROOT approval and canonical promotion remain separate governed decisions.',
  },
  machineResources: ['/llms.txt', '/llms-full.txt', '/ai-index.json', '/field-schema.json', '/openapi.json', '/api/external/v1/manifest', '/api/public/history'],
  calibration: {
    minimumClosedCasesDeclaredByCurrentPublicIndex: 30,
    automaticActiveModelMutation: false,
    promotionAuthority: 'ROOT explicit human confirmation',
    note: 'The threshold is a declared calibration contract, not evidence that 30 eligible cases are already closed.',
  },
} as const;

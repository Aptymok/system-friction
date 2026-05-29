export type FieldAccessMode = 'viewer' | 'account' | 'licensed' | 'root';

export type FieldNodeCatalogItem = {
  nodeKey: string;
  label: string;
  nodeType: 'sf' | 'module' | 'twin' | 'document' | 'pattern' | 'execution';
  variables: string[];
  patterns: string[];
  linkedSfNodes: string[];
  linkedDocuments: string[];
  activationConditions: string[];
  runtimeState: 'static' | 'observed' | 'degraded' | 'missing';
};

export type FieldDocumentCatalogItem = {
  documentId: string;
  title: string;
  source: string;
  status: string;
  visibility: 'public' | 'licensed' | 'acp' | 'private';
  linkedNodes: string[];
  linkedPatterns: string[];
  attractors: string[];
  evidenceWeight: number;
  confidence: number;
  interpretationLimit: string;
};

export type PatternCatalogItem = {
  patternId: string;
  label: string;
  triggerTerms: string[];
  variables: string[];
  linkedNodes: string[];
  suggestedExecutions: string[];
  riskLevel: 'low' | 'medium' | 'high';
  evidenceRequirement: string;
};

export type ExecutionCatalogItem = {
  executionId: string;
  title: string;
  applicablePatterns: string[];
  requiredApproval: boolean;
  expectedFieldDelta: Record<string, unknown>;
  riskLevel: string;
  verificationCriterion: string;
  source: 'action_proposals' | 'delta_decisions' | 'policy_decisions' | 'static';
};

export type MihmRuntimeMatrix = {
  ihg: number | null;
  nti: number | null;
  ldi: number | null;
  phi: number | null;
  regime: string;
  sourceState: 'observed' | 'derived' | 'fallback' | 'missing';
  contributingNodes: string[];
  contributingEvidence: string[];
  warnings: string[];
};

export type CognitiveTwinSeed = {
  accessMode: FieldAccessMode;
  profile: Record<string, unknown> | null;
  node: Record<string, unknown> | null;
  nodeCatalog: FieldNodeCatalogItem[];
  documentCatalog: FieldDocumentCatalogItem[];
  patternCatalog: PatternCatalogItem[];
  executionCatalog: ExecutionCatalogItem[];
  mihmRuntimeMatrix: MihmRuntimeMatrix;
  recentEvents: unknown[];
  recentKernelCycles: unknown[];
  latestWorldSpect: unknown | null;
};

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function stringValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return null;
}

export function numberValue(value: unknown, fallback: number | null = null) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function clamp01(value: unknown, fallback = 0) {
  const number = numberValue(value, fallback) ?? fallback;
  return Math.max(0, Math.min(1, number));
}

export function deriveAccessMode(input: {
  user?: unknown;
  profile?: unknown;
  entitlements?: unknown;
}): FieldAccessMode {
  if (!input.user) return 'viewer';
  const profile = asRecord(input.profile);
  const entitlements = asRecord(input.entitlements);
  const moduleAccess = asRecord(profile.module_access);
  const role = String(profile.role || '').toLowerCase();
  const tier = String(profile.subscription_tier || '').toLowerCase();
  const isRoot = role === 'root'
    || role === 'system'
    || moduleAccess.root_access === true
    || moduleAccess.acp === true
    || entitlements.root_access === true;
  if (isRoot) return 'root';
  const isLicensed = tier === 'pro'
    || tier === 'enterprise'
    || moduleAccess.simulator === true
    || moduleAccess.executor === true
    || moduleAccess.planner === true;
  return isLicensed ? 'licensed' : 'account';
}

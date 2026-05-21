export type NodeBootstrapResponseV1 = {
  contractVersion: 'node-bootstrap.v1';
  node: Record<string, unknown> | null;
  node_error: string | null;
  user: { id: string; email?: string | null } | null;
  profile: Record<string, unknown> | null;
  audits: unknown[];
  memoryFacts: unknown[];
  memory_facts: unknown[];
  actions: unknown[];
  license: Record<string, unknown> | null;
  entitlements: Record<string, unknown>;
  sfi_assets: unknown[];
  sfi_assets_error: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function normalizeUser(value: unknown): NodeBootstrapResponseV1['user'] {
  if (!isRecord(value) || typeof value.id !== 'string') return null;
  return {
    id: value.id,
    email: typeof value.email === 'string' ? value.email : null,
  };
}

export function normalizeNodeBootstrapResponse(input: unknown): NodeBootstrapResponseV1 {
  const source = isRecord(input) ? input : {};
  const memoryFacts = arrayValue(source.memoryFacts);
  const memoryFactsSnake = arrayValue(source.memory_facts);
  const normalizedMemoryFacts = memoryFacts.length ? memoryFacts : memoryFactsSnake;

  return {
    contractVersion: 'node-bootstrap.v1',
    node: recordValue(source.node),
    node_error: stringOrNull(source.node_error),
    user: normalizeUser(source.user),
    profile: recordValue(source.profile),
    audits: arrayValue(source.audits),
    memoryFacts: normalizedMemoryFacts,
    memory_facts: memoryFactsSnake.length ? memoryFactsSnake : normalizedMemoryFacts,
    actions: arrayValue(source.actions),
    license: recordValue(source.license),
    entitlements: recordValue(source.entitlements) ?? {},
    sfi_assets: arrayValue(source.sfi_assets),
    sfi_assets_error: stringOrNull(source.sfi_assets_error),
  };
}

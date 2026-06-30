import 'server-only';

export type AgentTrace = {
  trace_id: string;
  source_inputs: string[];
  tools_used: string[];
  provider_used: string;
  graph_nodes_used: string[];
  evidence_used: string[];
  confidence: number;
  generated_at: string;
  human_approval_status: 'required' | 'not_required';
  persistence_status: 'not_persisted' | 'local_fallback' | 'persisted' | 'blocked';
};

export function nowIso() {
  return new Date().toISOString();
}

export function traceId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function rows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : [];
}

export function text(value: unknown, fallback = '') {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
}

export function number01(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(1, parsed));
}

export function compactText(value: unknown, max = 260) {
  const raw = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  return raw.replace(/\s+/g, ' ').trim().slice(0, max);
}

export function tokenize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((item) => item.length > 2)
    .filter((item) => !['para', 'como', 'with', 'from', 'that', 'this', 'the', 'and', 'del', 'las', 'los', 'una', 'uno'].includes(item));
}

export function textScore(query: string, candidate: string) {
  const queryTokens = new Set(tokenize(query));
  if (queryTokens.size === 0) return 0;
  const candidateTokens = new Set(tokenize(candidate));
  let hits = 0;
  for (const token of queryTokens) {
    if (candidateTokens.has(token)) hits += 1;
  }
  return hits / queryTokens.size;
}

export function unique<T>(values: T[]) {
  return [...new Set(values)];
}

export function createTrace(input: {
  prefix: string;
  sourceInputs: string[];
  toolsUsed: string[];
  providerUsed?: string | null;
  graphNodesUsed?: string[];
  evidenceUsed?: string[];
  confidence?: number;
  humanApproval?: AgentTrace['human_approval_status'];
  persistence?: AgentTrace['persistence_status'];
}): AgentTrace {
  return {
    trace_id: traceId(input.prefix),
    source_inputs: unique(input.sourceInputs.filter(Boolean)),
    tools_used: unique(input.toolsUsed.filter(Boolean)),
    provider_used: input.providerUsed ?? 'degraded',
    graph_nodes_used: unique(input.graphNodesUsed ?? []),
    evidence_used: unique(input.evidenceUsed ?? []),
    confidence: number01(input.confidence, 0.45),
    generated_at: nowIso(),
    human_approval_status: input.humanApproval ?? 'required',
    persistence_status: input.persistence ?? 'not_persisted',
  };
}

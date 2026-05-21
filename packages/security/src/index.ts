export type ActorRole = 'observer' | 'operator' | 'controller' | 'root' | 'system';

export type Scope =
  | 'field:read'
  | 'field:write'
  | 'node:read'
  | 'node:write'
  | 'logs:read'
  | 'logs:write'
  | 'sources:read'
  | 'sources:write'
  | 'admin:read'
  | 'admin:write';

export type ActorContext = {
  actorId: string;
  role: ActorRole;
  scopes?: Scope[];
  nodeId?: string;
  sessionId?: string;
};

export type SecurityDecision = {
  allowed: boolean;
  reason: string;
  auditRequired: boolean;
};

export type PolicyDecision = SecurityDecision;

export type AuditEvent = {
  id: string;
  actorId: string;
  action: string;
  resource: string;
  decision: PolicyDecision;
  createdAt: string;
};

const roleScopes: Record<ActorRole, Scope[]> = {
  observer: ['field:read', 'node:read', 'logs:read', 'sources:read'],
  operator: ['field:read', 'field:write', 'node:read', 'logs:read', 'logs:write', 'sources:read'],
  controller: ['field:read', 'field:write', 'node:read', 'node:write', 'logs:read', 'logs:write', 'sources:read', 'sources:write'],
  root: ['field:read', 'field:write', 'node:read', 'node:write', 'logs:read', 'logs:write', 'sources:read', 'sources:write', 'admin:read', 'admin:write'],
  system: ['field:read', 'field:write', 'node:read', 'node:write', 'logs:read', 'logs:write', 'sources:read', 'sources:write', 'admin:read', 'admin:write'],
};

export function requireScope(actor: ActorContext, scope: Scope): SecurityDecision {
  const explicitScopes = actor.scopes || [];
  const inheritedScopes = roleScopes[actor.role] || [];
  const allowed = explicitScopes.includes(scope) || inheritedScopes.includes(scope);

  return {
    allowed,
    reason: allowed ? 'scope_granted' : `missing_scope:${scope}`,
    auditRequired: scope.endsWith(':write') || scope.startsWith('admin:'),
  };
}

export function isValidIdempotencyKey(value: unknown): boolean {
  return typeof value === 'string'
    && value.length >= 16
    && value.length <= 128
    && /^[a-zA-Z0-9._:-]+$/.test(value);
}

export function isValidCorrelationId(value: unknown): boolean {
  return typeof value === 'string'
    && value.length >= 8
    && value.length <= 128
    && /^[a-zA-Z0-9._:-]+$/.test(value);
}

export function sanitizeError(error: unknown): { message: string; code: string } {
  if (typeof error === 'string') {
    return { message: 'Operation failed', code: normalizeErrorCode(error) };
  }

  if (error instanceof Error) {
    return { message: 'Operation failed', code: normalizeErrorCode(error.name || error.message) };
  }

  return { message: 'Operation failed', code: 'unknown_error' };
}

function normalizeErrorCode(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);

  return normalized || 'unknown_error';
}

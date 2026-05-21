export type ActorRole = 'observer' | 'operator' | 'controller' | 'root' | 'system';

export type ActorContext = {
  actorId: string;
  role: ActorRole;
  nodeId?: string;
  sessionId?: string;
};

export type PolicyDecision = {
  allowed: boolean;
  reason: string;
  auditRequired: boolean;
};

export type AuditEvent = {
  id: string;
  actorId: string;
  action: string;
  resource: string;
  decision: PolicyDecision;
  createdAt: string;
};


export type RepositoryName =
  | 'field-state'
  | 'node-state'
  | 'logs'
  | 'source-health'
  | 'agent-memory'
  | 'audit';

export type RepositoryBoundary = {
  name: RepositoryName;
  allowsDirectAppAccess: false;
  requiresPolicyDecision: true;
};


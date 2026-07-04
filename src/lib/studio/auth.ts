export function requireStudioActor() {
  return {
    ok: true as const,
    actor: {
      id: 'studio-local-operator',
      role: 'studio',
    },
  };
}

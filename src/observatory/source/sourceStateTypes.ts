export type ObservationSourceState =
  | 'LOCAL_CONTEXT'
  | 'INTERNAL_PATTERN'
  | 'MIHM_INTERNAL'
  | 'VECTOR_MATRIX'
  | 'WORLDSPECT_LOCAL'
  | 'WORLDSPECT_EXTERNAL'
  | 'SOCIAL_RETURN'
  | 'SIMULATED'
  | 'MISSING_SOURCE'
  | 'STALE_SOURCE';

export type ObservationSourceConfidence = 'limited' | 'moderate' | 'high' | 'missing' | 'stale';

export type ObservationSourceDescriptor = {
  sourceState: ObservationSourceState;
  label: string;
  visibleLabel: string;
  confidence: ObservationSourceConfidence;
  isExternal: boolean;
  isSimulated: boolean;
  timestamp: string;
  sourceUrl?: string;
  expiresAt?: string;
};

export function createObservationSourceDescriptor(input: {
  sourceState: ObservationSourceState;
  label?: string;
  visibleLabel?: string;
  confidence?: ObservationSourceConfidence;
  isExternal?: boolean;
  isSimulated?: boolean;
  timestamp?: string;
  sourceUrl?: string;
  expiresAt?: string;
}): ObservationSourceDescriptor {
  const stateLabels: Record<ObservationSourceState, { label: string; visibleLabel: string }> = {
    LOCAL_CONTEXT: { label: 'local_context', visibleLabel: 'Lectura local.' },
    INTERNAL_PATTERN: { label: 'internal_pattern', visibleLabel: 'Patron interno.' },
    MIHM_INTERNAL: { label: 'mihm_internal', visibleLabel: 'MIHM interno.' },
    VECTOR_MATRIX: { label: 'vector_matrix', visibleLabel: 'Matriz vectorial.' },
    WORLDSPECT_LOCAL: { label: 'worldspect_local', visibleLabel: 'Lectura local. Fuente externa no conectada.' },
    WORLDSPECT_EXTERNAL: { label: 'worldspect_external', visibleLabel: 'Fuente externa.' },
    SOCIAL_RETURN: { label: 'social_return', visibleLabel: 'Retorno real.' },
    SIMULATED: { label: 'simulated', visibleLabel: 'Simulacion.' },
    MISSING_SOURCE: { label: 'missing_source', visibleLabel: 'Origen faltante.' },
    STALE_SOURCE: { label: 'stale_source', visibleLabel: 'Dato vencido.' },
  };
  const defaults = stateLabels[input.sourceState];
  const isExternal = input.isExternal ?? (input.sourceState === 'WORLDSPECT_EXTERNAL' || input.sourceState === 'SOCIAL_RETURN');

  return {
    sourceState: input.sourceState,
    label: input.label || defaults.label,
    visibleLabel: input.visibleLabel || defaults.visibleLabel,
    confidence: input.confidence || (input.sourceState === 'MISSING_SOURCE' ? 'missing' : 'limited'),
    isExternal,
    isSimulated: input.isSimulated ?? input.sourceState === 'SIMULATED',
    timestamp: input.timestamp || new Date().toISOString(),
    sourceUrl: input.sourceUrl,
    expiresAt: input.expiresAt,
  };
}

import type { PatternRankResult } from '@/observatory/field/patternActivation';
import { assertObservationClaim } from '@/observatory/source/assertObservationClaim';
import { createObservationSourceDescriptor } from '@/observatory/source/sourceStateTypes';
import type { WorldSpectReading, WorldSpectVariable, WorldSpectVector } from './worldSpectTypes';
import { worldSpectSymbols } from './worldSpectTypes';
import type { WorldSpectTrigger } from './worldSpectTriggers';

type BuildWorldSpectReadingInput = {
  trigger: WorldSpectTrigger;
  variables?: WorldSpectVariable[];
  rankedPatterns?: PatternRankResult | null;
  activeNode?: { id?: string | null; label?: string | null; commandMode?: string | null } | string | null;
  intent?: string | null;
  mihmState?: {
    PHI_SF?: number | null;
    NTI_obs?: number | null;
    LDI_hours?: number | null;
    regime?: string | null;
  } | null;
  recentEvents?: Array<{ event_name?: string; event_type?: string; payload?: Record<string, unknown> }>;
};

const variableCopy: Record<WorldSpectVariable, { reading: string; action: string }> = {
  macro: {
    reading: 'El contexto amplio puede cambiar la lectura.',
    action: 'Validar antes de fijar posicion.',
  },
  social: {
    reading: 'La respuesta de otros nodos puede alterar el resultado.',
    action: 'Observar retorno antes de amplificar.',
  },
  cultural: {
    reading: 'La interpretacion depende del marco compartido.',
    action: 'Reducir ambiguedad de lenguaje.',
  },
  semantic: {
    reading: 'El sentido puede desplazarse al salir del campo.',
    action: 'Hacer visible la intencion.',
  },
  factual: {
    reading: 'La decision necesita origen verificable.',
    action: 'Anclar evidencia minima.',
  },
  platform: {
    reading: 'La plataforma puede modificar alcance y lectura.',
    action: 'Ajustar formato antes de publicar.',
  },
  risk: {
    reading: 'Hay costo si la accion avanza sin validacion.',
    action: 'Bajar impacto antes de mover.',
  },
  attention: {
    reading: 'La atencion disponible condiciona el retorno.',
    action: 'Elegir una ventana de observacion.',
  },
};

function nodeLabel(node: BuildWorldSpectReadingInput['activeNode']) {
  if (!node) return 'campo';
  if (typeof node === 'string') return node.split('.').pop() || 'campo';
  return node.label || node.id || 'campo';
}

function needsObservationWindow(trigger: WorldSpectTrigger, variables: WorldSpectVariable[]) {
  return trigger.id === 'TR_PUBLICATION_INTENT'
    || trigger.id === 'TR_CAMPAIGN_INTENT'
    || trigger.id === 'TR_PUBLIC_DECISION'
    || variables.includes('platform')
    || variables.includes('attention');
}

export function buildWorldSpectReading(input: BuildWorldSpectReadingInput): WorldSpectReading {
  const variables = input.variables?.length ? input.variables : input.trigger.activatesVariables;
  const primaryPattern = input.rankedPatterns?.primaryPattern?.pattern || null;
  const activeNode = nodeLabel(input.activeNode);
  const symbols = variables.map((variable) => worldSpectSymbols[variable]);
  const stabilityLow = input.mihmState?.regime === 'CRITICAL'
    || (typeof input.mihmState?.PHI_SF === 'number' && input.mihmState.PHI_SF < 0.3);
  const patternMeaning = primaryPattern?.oracion_visible || 'La senal depende del contexto donde va a operar.';
  const suggestedAction = primaryPattern?.accion_sugerida
    || (variables.includes('factual') ? 'Validar origen' : 'Observar antes de mover');
  const sourceDescriptor = createObservationSourceDescriptor({
    sourceState: 'LOCAL_CONTEXT',
    label: 'contexto local',
    confidence: 'limited',
    isExternal: false,
    isSimulated: false,
  });
  const requestedScope = variables.includes('platform')
    ? ['platform' as const, 'social' as const]
    : variables.includes('macro')
      ? ['world' as const]
      : variables.includes('factual')
        ? ['external' as const]
        : ['local_context' as const];
  const assertedMeaning = assertObservationClaim({
    claim: `${patternMeaning} Nodo observado: ${activeNode}.`,
    sourceDescriptor,
    requestedScope,
  });

  const vectors: WorldSpectVector[] = variables.map((variable) => ({
    variable,
    symbol: worldSpectSymbols[variable],
    state: stabilityLow || variable === 'risk' ? 'watch' : 'active',
    reading: variableCopy[variable].reading,
    suggestedAction: variableCopy[variable].action,
  }));

  return {
    triggerId: input.trigger.id,
    triggerSymbol: input.trigger.symbol,
    triggerSummary: input.trigger.visibleSummary,
    variables,
    symbols,
    source: 'local_context',
    sourceState: 'LOCAL_CONTEXT',
    sourceDescriptor,
    confidence: 'limited',
    state: stabilityLow ? 'watch' : 'reading',
    summary: input.trigger.visibleSummary,
    meaning: assertedMeaning.visibleNotice
      ? `${assertedMeaning.visibleNotice} ${assertedMeaning.claim}`
      : assertedMeaning.claim,
    suggestedAction,
    vectors,
    observationWindow: needsObservationWindow(input.trigger, variables)
      ? {
          visibleSummary: 'Conviene observar antes de fijar hora.',
          options: ['ahora', 'hoy', 'proxima ventana', 'revisar despues'],
        }
      : undefined,
  };
}

export function formatWorldSpectAmvReading(reading: WorldSpectReading) {
  return `Veo:\n${reading.triggerSummary}\n\nSignifica:\n${reading.meaning}\n\nSigue:\n${reading.suggestedAction}`;
}

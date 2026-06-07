import { translateRootState, type RootStateTranslation } from './rootStateTranslator';

export type RootMihmIndicatorTranslation = {
  key: 'IHG' | 'NTI' | 'LDI' | 'PHI';
  value: string;
  reading: string;
};

export type RootMihmTranslation = {
  label: string;
  state: RootStateTranslation;
  observedObject: string | null;
  indicators: RootMihmIndicatorTranslation[];
  resultingRegime: string;
  direction: string;
  confidence: string;
  missing: string;
  decisionGrade: boolean;
};

type VisibleRecord = Record<string, unknown>;

function record(value: unknown): VisibleRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as VisibleRecord : {};
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function arrayText(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function fmt(value: unknown) {
  const number = numberValue(value);
  return number === undefined ? 'sin valor visible' : number.toFixed(3);
}

function band(value: unknown, low: string, medium: string, high: string) {
  const number = numberValue(value);
  if (number === undefined) return 'sin lectura suficiente';
  if (number >= 0.66) return high;
  if (number >= 0.33) return medium;
  return low;
}

function confidenceFor(input: VisibleRecord, hasObject: boolean) {
  const warnings = arrayText(input.warnings);
  const sourceState = text(input.sourceState) || text(input.source_state) || 'missing';
  if (!hasObject) return 'baja: falta objeto observado';
  if (sourceState === 'observed' && warnings.length === 0) return 'media-alta: fuente observada sin advertencias visibles';
  if (sourceState === 'derived') return 'media-baja: lectura derivada, requiere objeto y evidencia';
  if (warnings.length) return `degradada: ${warnings.slice(0, 3).join(', ')}`;
  return 'sin confianza suficiente';
}

function directionFor(input: VisibleRecord) {
  const explicit = text(input.direction) || text(input.vectorDirection) || text(input.vector_direction);
  if (explicit) return explicit;
  const regime = text(input.regime);
  if (regime === 'critical') return 'reducir tension antes de decidir';
  if (regime === 'homeostatic') return 'mantener estabilidad y verificar continuidad';
  if (regime === 'transition') return 'observar transicion antes de cerrar';
  return 'sin direccion interpretable';
}

export function translateRootMihm(value: unknown): RootMihmTranslation {
  const input = record(value);
  const observedObject = text(input.object)
    || text(input.observedObject)
    || text(input.observed_object)
    || text(input.target)
    || text(input.targetObject)
    || null;
  const state = translateRootState(text(input.sourceState) || text(input.source_state) || text(input.regime) || 'missing');
  const hasValues = ['ihg', 'nti', 'ldi', 'phi'].some((key) => numberValue(input[key]) !== undefined);
  const missing: string[] = [];
  if (!observedObject) missing.push('objeto observado');
  if (!hasValues) missing.push('indicadores MIHM');
  if (!arrayText(input.contributingEvidence).length) missing.push('evidencia contribuyente visible');

  return {
    label: 'MIHM / lectura homeostatica',
    state,
    observedObject,
    indicators: [
      { key: 'IHG', value: fmt(input.ihg), reading: band(input.ihg, 'integracion baja', 'integracion parcial', 'integracion alta') },
      { key: 'NTI', value: fmt(input.nti), reading: band(input.nti, 'tension baja', 'tension observable', 'tension alta') },
      { key: 'LDI', value: fmt(input.ldi), reading: band(input.ldi, 'latencia baja', 'latencia media', 'latencia alta') },
      { key: 'PHI', value: fmt(input.phi), reading: band(input.phi, 'coherencia fragil', 'coherencia parcial', 'coherencia fuerte') },
    ],
    resultingRegime: observedObject
      ? text(input.regime) || state.label
      : hasValues
        ? 'lectura incompleta: hay valores sin objeto observado'
        : 'sin regimen interpretable',
    direction: observedObject ? directionFor(input) : 'no puede orientar decision sin objeto observado',
    confidence: confidenceFor(input, Boolean(observedObject)),
    missing: missing.length ? `falta ${missing.join(', ')}` : 'sin faltante critico visible',
    decisionGrade: Boolean(observedObject) && hasValues,
  };
}

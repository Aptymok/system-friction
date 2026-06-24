import { translateRootState, type RootStateTranslation } from './rootStateTranslator';

export type RootWsvTranslation = {
  label: string;
  state: RootStateTranslation;
  worldToday: string;
  activeSources: string;
  degradedSource: string;
  dominantField: string;
  lastRealReading: string;
  integrity: string;
  implicationForAptymok: string;
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

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function sourceLabel(value: unknown) {
  const source = record(value);
  return text(source.label) || text(source.key) || text(source.sourceId) || 'fuente sin nombre';
}

function isoDate(value: unknown) {
  const raw = text(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isSameUtcDay(left: string | null, right = new Date()) {
  if (!left) return false;
  const date = new Date(left);
  return date.getUTCFullYear() === right.getUTCFullYear()
    && date.getUTCMonth() === right.getUTCMonth()
    && date.getUTCDate() === right.getUTCDate();
}

function sourceHealth(input: VisibleRecord) {
  return array(input.sourceHealth ?? input.source_health).map(record);
}

function sourceStatus(source: VisibleRecord) {
  return text(source.status) ?? text(source.health) ?? 'unknown';
}

function isActiveSource(source: VisibleRecord) {
  const status = sourceStatus(source);
  return ['healthy', 'real input', 'observed', 'active'].includes(status);
}

function dominantField(input: VisibleRecord) {
  const signal = record(input.fieldStateSignal ?? input.field_state_signal);
  const sourceIds = array(signal.sourceIds).filter((item): item is string => typeof item === 'string');
  if (sourceIds.length) return `campo sostenido por ${sourceIds.slice(0, 3).join(', ')}`;
  const sources = array(input.sources).map(record).filter((source) => source.simulated !== true && !text(source.error));
  if (sources.length) return `campo observado por ${sources.slice(0, 3).map(sourceLabel).join(', ')}`;
  return 'sin campo dominante suficiente';
}

function integrityFor(input: VisibleRecord, health: VisibleRecord[]) {
  const confidence = numberValue(input.confidence);
  const degraded = health.filter((source) => ['degraded', 'missing', 'simulated', 'not_ready'].includes(sourceStatus(source))).length
    + array(input.degraded_sources).length;
  if (confidence === undefined) return degraded ? 'integridad operativa pendiente: hay fuente degradada; confianza no consolidada en esta lectura' : 'integridad operativa pendiente: confianza no expuesta en esta lectura';
  const confidenceText = `confianza ${confidence.toFixed(3)}`;
  if (degraded > 0) return `integridad degradada (${confidenceText})`;
  if (confidence >= 0.75) return `integridad alta (${confidenceText})`;
  if (confidence >= 0.4) return `integridad media (${confidenceText})`;
  return `integridad baja (${confidenceText})`;
}

export function translateRootWsv(value: unknown, now = new Date()): RootWsvTranslation {
  const input = record(value);
  const sourceState = text(input.sourceState) || text(input.source_state) || 'missing';
  const state = translateRootState(sourceState);
  const observedAt = isoDate(input.ts ?? input.observedAt ?? input.observed_at ?? record(input.snapshot).observedAt);
  const health = sourceHealth(input);
  const active = health.filter(isActiveSource);
  const degraded = [
    ...array(input.degraded_sources).filter((item): item is string => typeof item === 'string'),
    ...health.filter((source) => ['degraded', 'missing', 'simulated', 'not_ready'].includes(sourceStatus(source))).map(sourceLabel),
  ];
  const hasReading = Object.keys(input).length > 0 && state.normalizedState !== 'missing';
  const dayText = isSameUtcDay(observedAt, now)
    ? 'Hay lectura del dia para el mundo observado.'
    : observedAt
      ? 'No hay lectura del dia; uso la ultima lectura disponible.'
      : 'Lectura WorldSpect pendiente: no hay timestamp real visible.';

  return {
    label: 'WorldSpect / mundo observado',
    state,
    worldToday: hasReading ? `${dayText} Estado traducido: ${state.label}` : 'WorldSpect sin lectura suficiente; no se usa como OK.',
    activeSources: active.length
      ? active.map(sourceLabel).slice(0, 5).join(', ')
      : array(input.sources).length
        ? 'hay fuentes declaradas; confirmar estado saludable en source_health'
        : 'fuentes activas no expuestas en esta lectura',
    degradedSource: degraded.length ? degraded.slice(0, 5).join(', ') : 'sin fuente degradada declarada',
    dominantField: dominantField(input),
    lastRealReading: observedAt ? observedAt : 'sin lectura real fechada',
    integrity: integrityFor(input, health),
    implicationForAptymok: degraded.length
      ? 'Usar WorldSpect con cautela: una fuente degradada baja fuerza operativa y no debe sostener cierre fuerte.'
      : hasReading
        ? 'Puede orientar contexto externo si se conserva fecha, fuente y estado.'
        : 'No tomar decisiones apoyadas en WorldSpect hasta tener lectura real.',
  };
}









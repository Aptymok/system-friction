import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';

export type StudioPixiModule = typeof import('pixi.js');

export type StudioPixiRendererInput = {
  PIXI: StudioPixiModule;
  app: import('pixi.js').Application;
  state: StudioProductionState;
  width: number;
  height: number;
  time: number;
};

export type StudioPixiRenderer = (input: StudioPixiRendererInput) => void;

export function safeValue(value: number | string | null | undefined, fallback = 0) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(1, parsed > 1 ? parsed / 100 : parsed));
}

export function featureValues(state: StudioProductionState) {
  return state.objectFeatures.metrics
    .map((metric) => safeValue(metric.value, NaN))
    .filter((value) => Number.isFinite(value));
}

import { clamp01 } from './math';

export const WORLDSPECT_VECTOR_KEYS = [
  'CULTURAL',
  'ECONOMY',
  'GEO_DIGITAL',
  'GEOPOLITICAL',
  'BIO',
  'CLIMATE',
  'INSTITUTIONAL',
  'MEMETIC',
  'TECH',
  'AFFECTIVE',
] as const;

export type WorldSpectVectorKey = typeof WORLDSPECT_VECTOR_KEYS[number];

export type WorldSpectVectorCell = {
  key: WorldSpectVectorKey;
  value: number;
  velocity: number;
  volatility: number;
  persistence: number;
  sourceCount: number;
  trust: number;
  lastObservedAt: string | null;
  degradation: number;
};

export type WorldSpectSnapshot = {
  id?: string;
  observedAt: string;
  vectors: Record<WorldSpectVectorKey, WorldSpectVectorCell>;
  wsi: number;
  nti: number;
  regime: 'LOW' | 'TENSION' | 'CRITICAL';
};

export function emptyWorldSpectCell(key: WorldSpectVectorKey): WorldSpectVectorCell {
  return {
    key,
    value: 0,
    velocity: 0,
    volatility: 0,
    persistence: 0,
    sourceCount: 0,
    trust: 0,
    lastObservedAt: null,
    degradation: 1,
  };
}

export function calculateWorldSpectCell(cell: Partial<WorldSpectVectorCell> & { key: WorldSpectVectorKey }): WorldSpectVectorCell {
  return {
    key: cell.key,
    value: clamp01(cell.value ?? 0),
    velocity: clamp01(Math.abs(cell.velocity ?? 0)),
    volatility: clamp01(cell.volatility ?? 0),
    persistence: clamp01(cell.persistence ?? 0),
    sourceCount: Math.max(0, Math.floor(cell.sourceCount ?? 0)),
    trust: clamp01(cell.trust ?? 0),
    lastObservedAt: cell.lastObservedAt ?? null,
    degradation: clamp01(cell.degradation ?? 0),
  };
}

export function calculateWorldSpectSnapshot(cells: WorldSpectVectorCell[]): WorldSpectSnapshot {
  const vectors = Object.fromEntries(
    WORLDSPECT_VECTOR_KEYS.map((key) => {
      const found = cells.find((cell) => cell.key === key);
      return [key, found ? calculateWorldSpectCell(found) : emptyWorldSpectCell(key)];
    })
  ) as Record<WorldSpectVectorKey, WorldSpectVectorCell>;

  const values = Object.values(vectors);
  const wsi = clamp01(values.reduce((sum, cell) => sum + cell.value * cell.trust * (1 - cell.degradation), 0) / Math.max(1, values.length));
  const nti = clamp01(values.reduce((sum, cell) => sum + (cell.volatility + cell.velocity) / 2, 0) / Math.max(1, values.length));
  const regime = wsi >= 0.65 || nti >= 0.70 ? 'CRITICAL' : wsi >= 0.38 || nti >= 0.42 ? 'TENSION' : 'LOW';

  return {
    observedAt: new Date().toISOString(),
    vectors,
    wsi,
    nti,
    regime,
  };
}

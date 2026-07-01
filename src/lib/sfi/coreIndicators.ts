import type { SfiWorldInterfaceNodeState, SfiWorldInterfaceState } from './worldInterfaceState';

export type SfiCoreIndicators = {
  ihg: number;
  nti: number;
  ldi: number;
  wsv: number;
};

export type SfiCoreIndicatorsInput = Pick<SfiWorldInterfaceState, 'signalState' | 'frictionLevel' | 'nodes' | 'sfiIndex'>;

const WSV_NODES = new Set(['sfi-hq', 'world-vector', 'field', 'system-health', 'scorefriction']);

function clamp(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function metric(value: string | number | null | undefined) {
  if (typeof value === 'number') return clamp(value > 1 ? value / 100 : value);
  const parsed = Number(String(value ?? '').replace('%', '').trim());
  return Number.isFinite(parsed) ? clamp(parsed > 1 ? parsed / 100 : parsed) : 0;
}

function nodeIntensity(_state: SfiWorldInterfaceNodeState, intensity: number) {
  return clamp(intensity);
}

export function deriveCoreIndicators(state: SfiCoreIndicatorsInput): SfiCoreIndicators {
  const usableNodes = (() => {
    const filtered = state.nodes.filter((node) => WSV_NODES.has(node.id));
    return filtered.length >= 3 ? filtered : state.nodes.slice(0, 5);
  })();

  const signal = metric(state.signalState.value);
  const ldi = metric(state.frictionLevel.value);
  const nti = usableNodes.length
    ? usableNodes.reduce((sum, node) => sum + nodeIntensity(node.state, node.intensity), 0) / usableNodes.length
    : 0;
  const ihg = metric(state.sfiIndex.value) || clamp((signal + (1 - ldi) + nti) / 3);
  const wsv = clamp((signal + nti + (1 - ldi)) / 3);

  return { ihg, nti, ldi, wsv };
}

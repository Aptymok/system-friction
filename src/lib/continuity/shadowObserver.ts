// MIHM research shadow capture. Pure, synchronous and observational.
// No promise, no I/O, no raw proposal body, no side effects or authority.
export type ShadowBatch = {
  contract: 'SFI-MIHM-SHADOW-A-0.2';
  recordedAt: string;
  candidateIds: string[];
  processingWindowIds: string[];
  eligibilityKnown: false;
};
export type ShadowResult = {
  contract: 'SFI-MIHM-SHADOW-B-0.2';
  recordedAt: string;
  position: number;
  proposalId: string;
  stage: string | null;
  ok: boolean | null;
  admitted: 'NOT_CERTIFIED';
};
export type ShadowObserver = {
  onBatch?: (capture: Readonly<ShadowBatch>) => void;
  onResult?: (capture: Readonly<ShadowResult>) => void;
};
function id(row: Record<string, unknown>): string {
  return typeof row.id === 'string' ? row.id : 'unknown';
}
function emit<T>(fn: ((capture: Readonly<T>) => void) | undefined, capture: T): void {
  if (!fn) return;
  // Any returned promise is ignored; async observers are forbidden by contract.
  // Input consists solely of immutable primitives and frozen ID arrays.
  try { fn(Object.freeze(capture)); } catch { /* shadow never blocks operations */ }
}
export function captureShadowBatch(
  observer: ShadowObserver | undefined,
  pool: Record<string, unknown>[],
  window: Record<string, unknown>[],
): void {
  if (!observer?.onBatch) return;
  emit(observer.onBatch, {
    contract: 'SFI-MIHM-SHADOW-A-0.2' as const,
    recordedAt: new Date().toISOString(),
    candidateIds: Object.freeze(pool.map(id)) as unknown as string[],
    processingWindowIds: Object.freeze(window.map(id)) as unknown as string[],
    eligibilityKnown: false as const,
  });
}
export function captureShadowResult(
  observer: ShadowObserver | undefined,
  row: Record<string, unknown>,
  position: number,
  result: { stage?: unknown; ok?: unknown },
): void {
  if (!observer?.onResult) return;
  emit(observer.onResult, {
    contract: 'SFI-MIHM-SHADOW-B-0.2' as const,
    recordedAt: new Date().toISOString(),
    proposalId: id(row),
    position,
    stage: typeof result.stage === 'string' ? result.stage : null,
    ok: typeof result.ok === 'boolean' ? result.ok : null,
    admitted: 'NOT_CERTIFIED' as const,
  });
}

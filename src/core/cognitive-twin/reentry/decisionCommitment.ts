import type { DecisionTrace } from './decisionTransfer';

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .filter((key) => record[key] !== undefined)
        .map((key) => [key, canonicalValue(record[key])]),
    );
  }
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalValue(value));
}

export function decisionTraceCommitmentMaterial(target: DecisionTrace, salt: string): string {
  return canonicalJson({
    protocol: 'SFI-DT-TARGET-COMMITMENT-1.0',
    salt,
    target,
  });
}

import type { SfiCanonicalRef } from '../contracts/sfi';

export const SFI_CASE_SOURCE_INTAKE_CONTRACT = 'SFI-CASE-SOURCE-INTAKE-1.0' as const;

export type SfiCaseSourceIntakeInput = {
  id: string;
  sourceType: string;
  label: string;
  externalRef?: string | null;
  observedAt?: string | null;
  contentHash?: string | null;
  metadata?: Record<string, unknown>;
};

export type NormalizedSfiCaseSource = {
  contract: typeof SFI_CASE_SOURCE_INTAKE_CONTRACT;
  sourceRef: SfiCanonicalRef;
  sourceType: string;
  label: string;
  externalRef: string | null;
  observedAt: string | null;
  metadata: Record<string, unknown>;
  rawContentPersisted: false;
};

function requireText(value: string, field: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`SFI_CASE_SOURCE_INVALID:${field}`);
  return normalized;
}

export function normalizeSfiCaseSourceIntake(input: SfiCaseSourceIntakeInput): NormalizedSfiCaseSource {
  const id = requireText(input.id, 'id');
  const sourceType = requireText(input.sourceType, 'sourceType');
  const label = requireText(input.label, 'label');
  const observedAt = input.observedAt?.trim() || null;
  if (observedAt && Number.isNaN(Date.parse(observedAt))) {
    throw new Error('SFI_CASE_SOURCE_INVALID:observedAt');
  }
  const contentHash = input.contentHash?.trim() || null;
  if (contentHash && contentHash.length < 16) {
    throw new Error('SFI_CASE_SOURCE_INVALID:contentHash');
  }

  return {
    contract: SFI_CASE_SOURCE_INTAKE_CONTRACT,
    sourceRef: {
      id: `case-source:${id}`,
      version: '1.0',
      hash: contentHash,
    },
    sourceType,
    label,
    externalRef: input.externalRef?.trim() || null,
    observedAt,
    metadata: input.metadata ?? {},
    rawContentPersisted: false,
  };
}

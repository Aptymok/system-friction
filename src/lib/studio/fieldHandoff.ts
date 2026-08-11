import { createHash, randomUUID } from 'node:crypto';

export const STUDIO_FIELD_HANDOFF_CONTRACT = 'SFI-STUDIO-FIELD-HANDOFF-1.0' as const;

export type StudioFieldHandoff = {
  contractVersion: typeof STUDIO_FIELD_HANDOFF_CONTRACT;
  handoffId: string;
  sourceObjectId: string;
  interventionId: string;
  predictionSeal: string;
  returnWindow: '72h' | '7d' | '30d' | 'CUSTOM';
  evidenceRefs: string[];
  createdAt: string;
  immutableHash: string;
};

function canonical(input: Omit<StudioFieldHandoff,'immutableHash'>) {
  return JSON.stringify({
    contractVersion: input.contractVersion,
    handoffId: input.handoffId,
    sourceObjectId: input.sourceObjectId,
    interventionId: input.interventionId,
    predictionSeal: input.predictionSeal,
    returnWindow: input.returnWindow,
    evidenceRefs: [...input.evidenceRefs].sort(),
    createdAt: input.createdAt,
  });
}

export function createStudioFieldHandoff(input: {
  sourceObjectId: string;
  interventionId: string;
  predictionSeal: string;
  returnWindow: StudioFieldHandoff['returnWindow'];
  evidenceRefs: string[];
  handoffId?: string;
  createdAt?: string;
}): StudioFieldHandoff {
  if (!input.sourceObjectId.trim()) throw new Error('HANDOFF_SOURCE_OBJECT_REQUIRED');
  if (!input.interventionId.trim()) throw new Error('HANDOFF_INTERVENTION_REQUIRED');
  if (!input.predictionSeal.trim()) throw new Error('HANDOFF_PREDICTION_SEAL_REQUIRED');
  if (!input.evidenceRefs.length) throw new Error('HANDOFF_EVIDENCE_REQUIRED');
  const base = {
    contractVersion: STUDIO_FIELD_HANDOFF_CONTRACT,
    handoffId: input.handoffId?.trim() || `SFI-HANDOFF-${randomUUID()}`,
    sourceObjectId: input.sourceObjectId.trim(),
    interventionId: input.interventionId.trim(),
    predictionSeal: input.predictionSeal.trim(),
    returnWindow: input.returnWindow,
    evidenceRefs: Array.from(new Set(input.evidenceRefs.map((item)=>item.trim()).filter(Boolean))),
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
  return { ...base, immutableHash: createHash('sha256').update(canonical(base)).digest('hex') };
}

export function verifyStudioFieldHandoff(handoff: StudioFieldHandoff) {
  const { immutableHash, ...base } = handoff;
  return createHash('sha256').update(canonical(base)).digest('hex') === immutableHash;
}

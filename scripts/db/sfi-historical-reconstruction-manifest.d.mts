export type SfiHistoricalEvidence = {
  key: string;
  title: string;
  module: string;
  kind: string;
  sourceName: string;
  sourceUrl: string | null;
  privateRef: string | null;
  caseId: string | null;
  summary: string;
  observedAt: string;
  publicWeight: number;
  dateBasis: string;
  epistemicClass: 'IMPORTED_PROVENANCE';
  claimBoundary: string;
};

export const SFI_WORLD_DAY_ORIGIN: string;
export const SFI_RECONSTRUCTED_HISTORY_END: string;
export const SFI_CLEAN_GENESIS_DATE: string;
export const SFI_HISTORICAL_RECONSTRUCTION_SEED: string;
export const SFI_HISTORICAL_EVIDENCE: SfiHistoricalEvidence[];

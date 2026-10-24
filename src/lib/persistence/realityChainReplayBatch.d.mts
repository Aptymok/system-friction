export type CaseReplayPacketEntry = {
  operation_id?: string;
  source_txid?: string | number;
  table_name?: string;
  operation?: 'UPSERT' | 'DELETE';
  row_data?: Record<string, unknown>;
  before_data?: Record<string, unknown> | null;
};
export type CaseReplayAssessment = {
  validated: boolean;
  blockers: string[];
  caseCount: number;
};
export type CaseMirrorDeliveryAssessment = {
  allowed: boolean;
  enforced: boolean;
  blockers: string[];
  caseCount: number;
};
export declare function assessCaseRevisionReplayBatch(
  entries: readonly CaseReplayPacketEntry[],
  options?: { requireTouchedCase?: boolean },
): CaseReplayAssessment;
export declare function assessCaseMirrorDelivery(
  entries: readonly CaseReplayPacketEntry[],
  options?: { strict?: boolean },
): CaseMirrorDeliveryAssessment;

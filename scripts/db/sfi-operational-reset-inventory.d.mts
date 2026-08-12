export type OperationalResetLayer = {
  id: string;
  reason: string;
  tables: string[];
};

export const HISTORICAL_PRESERVE_TABLES: string[];
export const PROTECTED_TABLES: string[];
export const OPERATIONAL_RESET_LAYERS: OperationalResetLayer[];
export const OPERATIONAL_DELETE_ORDER: string[];

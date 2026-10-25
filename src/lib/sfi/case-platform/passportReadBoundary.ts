/**
 * C19 - public contract for the consistency boundary of a private Passport.
 * Even a PRIMARY case read is not evidence that a second provider agrees.
 * A branch-only implementation must never mint a mirror certificate.
 */
export type PassportReadBoundary = {
  readPlane: 'SUPABASE_PRIMARY' | 'NEON_CONTINUITY' | 'UNVERIFIED';
  dataPlaneMode: 'PRIMARY' | 'CONTINUITY' | 'RECOVERY' | 'UNKNOWN';
  sourceInventoryComplete: false;
  crossProviderParity: 'NOT_VERIFIED';
  warning: 'PRIMARY_SNAPSHOT_NOT_CROSS_PROVIDER_CERTIFIED'
    | 'CONTINUITY_SNAPSHOT_MAY_LAG_PRIMARY_WRITES_OR_DIVERGE'
    | 'DATA_PLANE_STATE_UNAVAILABLE';
  humanWarning: string;
};

export function describePassportReadBoundary(mode: unknown): PassportReadBoundary {
  if (mode === 'PRIMARY') {
    return {
      readPlane: 'SUPABASE_PRIMARY',
      dataPlaneMode: 'PRIMARY',
      sourceInventoryComplete: false,
      crossProviderParity: 'NOT_VERIFIED',
      warning: 'PRIMARY_SNAPSHOT_NOT_CROSS_PROVIDER_CERTIFIED',
      humanWarning: 'Lectura de PRIMARY. Integridad entre proveedores no certificada; este informe no acredita paridad con Neon.',
    };
  }
  if (mode === 'CONTINUITY' || mode === 'RECOVERY') {
    return {
      readPlane: 'NEON_CONTINUITY',
      dataPlaneMode: mode,
      sourceInventoryComplete: false,
      crossProviderParity: 'NOT_VERIFIED',
      warning: 'CONTINUITY_SNAPSHOT_MAY_LAG_PRIMARY_WRITES_OR_DIVERGE',
      humanWarning: 'Lectura de continuidad Neon. Puede omitir escrituras de PRIMARY o contener revisiones divergentes; no es inventario completo ni certificacion de resultados.',
    };
  }
  return {
    readPlane: 'UNVERIFIED',
    dataPlaneMode: 'UNKNOWN',
    sourceInventoryComplete: false,
    crossProviderParity: 'NOT_VERIFIED',
    warning: 'DATA_PLANE_STATE_UNAVAILABLE',
    humanWarning: 'Estado de las bases no verificable. Esta lectura puede ser incompleta o contradictoria; no certifica el expediente.',
  };
}

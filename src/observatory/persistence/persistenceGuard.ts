export type PersistenceBoundaryContext = {
  authenticated?: boolean;
  licenseActive?: boolean;
  paymentActive?: boolean;
  crossedAccountPaywall?: boolean;
};

export function canPersistToSupabase(context: PersistenceBoundaryContext) {
  return Boolean(
    context.authenticated &&
    context.crossedAccountPaywall &&
    (context.licenseActive || context.paymentActive),
  );
}

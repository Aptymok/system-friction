export type UniversalObservationIdentity = {
  objectKey: string;
  objectHash: string;
  objectHashBasis: string;
  assetRef: string | null;
};

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function structuredResultMatchesSignalIdentity(
  payloadValue: unknown,
  normalized: UniversalObservationIdentity,
  resumeCycleId: string | null,
) {
  const payload = row(payloadValue);
  const object = row(payload.object);
  const eventCycleId = text(payload.cycleId);
  const eventHash = text(payload.objectHash)
    ?? text(object.objectHash)
    ?? text(object.contentHash)
    ?? text(object.fingerprint);
  const eventKey = text(payload.objectKey) ?? text(object.objectKey);
  const eventAssetRef = text(payload.assetRef) ?? text(object.assetRef);

  // objectKey is the stable methodological identity. A material content hash may
  // legitimately differ from an earlier REFERENCE_IDENTITY hash once the actual
  // file is inspected, so any one explicit compatible identity is sufficient.
  const identityMatches = Boolean(eventKey && eventKey === normalized.objectKey)
    || Boolean(eventHash && normalized.objectHashBasis !== 'REFERENCE_IDENTITY' && eventHash === normalized.objectHash)
    || Boolean(eventAssetRef && normalized.assetRef && eventAssetRef === normalized.assetRef);

  // A resumeCycleId is only a cycle constraint, never a substitute for object
  // identity. This prevents a structured result posted under the right cycle id
  // but for a different object from becoming material observation for the cycle.
  if (resumeCycleId) return eventCycleId === resumeCycleId && identityMatches;
  return identityMatches;
}

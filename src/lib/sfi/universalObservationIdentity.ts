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

  // Once the signal has a real material fingerprint, an explicitly conflicting
  // result fingerprint is a hard identity mismatch. Stable names/keys cannot
  // override known content divergence between different versions of an object.
  const materialHashConflict = normalized.objectHashBasis !== 'REFERENCE_IDENTITY'
    && Boolean(eventHash)
    && eventHash !== normalized.objectHash;
  if (materialHashConflict) return false;

  // With only a reference-identity hash, the later verified material hash may
  // legitimately differ; a stable objectKey/assetRef can reconnect that result.
  const identityMatches = Boolean(eventHash && normalized.objectHashBasis !== 'REFERENCE_IDENTITY' && eventHash === normalized.objectHash)
    || Boolean(eventKey && eventKey === normalized.objectKey)
    || Boolean(eventAssetRef && normalized.assetRef && eventAssetRef === normalized.assetRef);

  // A resumeCycleId is only a cycle constraint, never a substitute for object
  // identity. This prevents a structured result posted under the right cycle id
  // but for a different object from becoming material observation for the cycle.
  if (resumeCycleId) return eventCycleId === resumeCycleId && identityMatches;
  return identityMatches;
}
